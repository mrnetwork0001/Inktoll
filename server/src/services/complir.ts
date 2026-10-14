import { config } from '../config.js';

// CompliR — counterparty-risk oracle for USDC on Arc mainnet.
// Docs: https://trycomplir.xyz/docs
//
// One entry point, checkAddress(), used at every point where USDC moves to an
// address we did not create, or arrives from an outside payer. When
// COMPLIR_URL is empty the module is disabled and every call returns
// allowed:true, so existing behaviour is untouched.
//
// Cost note: a fresh screen costs ~0.01 USDC, while an Inktoll read costs
// 0.02 and earns the protocol 0.0002. Paying for a screen on the read path
// would cost 50x the platform's take, so only `allowPaidScreen` call sites
// (withdrawals, onboarding) may trigger POST /screen. Everything else reads
// the free cached verdict.

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CheckResult {
  allowed: boolean;
  tier: Tier | null;
  /** Per-transaction ceiling CompliR recommends, when it caps rather than blocks. */
  maxUsdc: number | null;
  reason: string | null;
  decisionId: string | null;
  /** Enhanced due diligence link, when CompliR offers one. */
  eddUrl: string | null;
}

interface Verdict {
  address: string;
  score: number;
  tier: Tier;
  decisionId?: string;
  attestation?: { signature: string; validUntil: number | string; registryTx?: string };
  recommendedLimits?: { maxPerTxUsdc?: number; maxPerDayUsdc?: number };
  reasons?: { code: string; weight: number }[];
  rationale?: string;
  eddRequested?: string[];
  edd?: { url?: string };
}

const GET_TIMEOUT_MS = 10_000;
const POST_TIMEOUT_MS = 120_000; // a fresh screen traces funders and runs an analyst

const ALLOW: CheckResult = { allowed: true, tier: null, maxUsdc: null, reason: null, decisionId: null, eddUrl: null };

const enabled = () => Boolean(config.complir.url);

function reasonText(v: Verdict): string {
  const codes = (v.reasons || []).map((r) => r.code).filter(Boolean);
  if (codes.length) return codes.join(', ');
  return v.rationale || `tier ${v.tier}`;
}

function isExpired(v: Verdict): boolean {
  const until = v.attestation?.validUntil;
  if (until === undefined || until === null) return true;
  const ms = typeof until === 'number'
    ? (until < 1e12 ? until * 1000 : until) // seconds or milliseconds
    : Date.parse(String(until));
  return !Number.isFinite(ms) || ms < Date.now();
}

async function request<T>(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Latest stored verdict. Free, and 404 when the address has never been screened. */
async function fetchVerdict(address: string): Promise<Verdict | null> {
  const res = await request(
    `${config.complir.url}/api/v1/attestation/${address}`,
    { headers: { accept: 'application/json' } },
    GET_TIMEOUT_MS,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CompliR attestation lookup failed: HTTP ${res.status}`);
  return (await res.json()) as Verdict;
}

/**
 * Fresh screen. Costs ~0.01 USDC over x402 and returns HTTP 402 with payment
 * requirements until paid. We do not hold a payer key by default, so an
 * unpaid 402 is reported as "no fresh verdict available" rather than an error:
 * the caller then falls back to the stored verdict or the fail mode.
 */
async function freshScreen(address: string, amountUsdc: number): Promise<Verdict | null> {
  const res = await request(
    `${config.complir.url}/api/v1/screen`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ address, amountUsdc, clientId: config.complir.clientId }),
    },
    POST_TIMEOUT_MS,
  );
  if (res.status === 402) {
    console.warn('[CompliR] Fresh screen requires payment (402) and no payer is configured; using stored verdict.');
    return null;
  }
  if (!res.ok) throw new Error(`CompliR screen failed: HTTP ${res.status}`);
  return (await res.json()) as Verdict;
}

/** Register an address for continuous re-grading. Failure is never fatal. */
export async function watchAddress(address: string, webhookUrl: string): Promise<boolean> {
  if (!enabled() || !webhookUrl) return false;
  try {
    const res = await request(
      `${config.complir.url}/api/v1/watch`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address: address.toLowerCase(), webhookUrl }),
      },
      GET_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (error: any) {
    console.warn(`[CompliR] Could not register watch for ${address}: ${error.message}`);
    return false;
  }
}

export interface CheckOptions {
  amountUsdc?: number;
  direction: 'outbound' | 'inbound';
  /** Only withdrawals and onboarding may pay for a fresh screen. */
  allowPaidScreen?: boolean;
}

/**
 * The single screening entry point.
 *
 * HIGH blocks in both directions. MEDIUM caps an outbound payment at
 * recommendedLimits.maxPerTxUsdc and blocks anything larger. LOW passes.
 */
export async function checkAddress(address: string, options: CheckOptions): Promise<CheckResult> {
  if (!enabled()) return ALLOW;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { ...ALLOW, allowed: false, reason: 'A valid 0x address is required for screening' };
  }

  const target = address.toLowerCase();
  const amount = options.amountUsdc ?? 0;

  let verdict: Verdict | null = null;
  try {
    verdict = await fetchVerdict(target);
    // Pay for a fresh screen only where the economics justify it.
    if (options.allowPaidScreen && (!verdict || isExpired(verdict))) {
      verdict = (await freshScreen(target, amount)) ?? verdict;
    }
  } catch (error: any) {
    const failClosed = config.complir.failMode === 'closed';
    console.warn(`[CompliR] Unreachable for ${target}: ${error.message}. Failing ${failClosed ? 'closed' : 'open'}.`);
    return failClosed
      ? { ...ALLOW, allowed: false, reason: 'Counterparty screening is unavailable; payment blocked by policy' }
      : ALLOW;
  }

  // Never screened and we may not pay to find out: treat as unknown, not risky.
  if (!verdict) return ALLOW;

  const decisionId = verdict.decisionId ?? null;
  const eddUrl = verdict.edd?.url ?? null;

  if (verdict.tier === 'HIGH') {
    return {
      allowed: false,
      tier: 'HIGH',
      maxUsdc: null,
      reason: `This address is flagged as high risk by CompliR: ${reasonText(verdict)}`,
      decisionId,
      eddUrl,
    };
  }

  if (verdict.tier === 'MEDIUM') {
    const cap = verdict.recommendedLimits?.maxPerTxUsdc;
    if (options.direction === 'outbound' && typeof cap === 'number' && amount > cap) {
      return {
        allowed: false,
        tier: 'MEDIUM',
        maxUsdc: cap,
        reason: `CompliR limits this address to ${cap} USDC per transaction (requested ${amount})`,
        decisionId,
        eddUrl,
      };
    }
    return { allowed: true, tier: 'MEDIUM', maxUsdc: cap ?? null, reason: null, decisionId, eddUrl };
  }

  return { allowed: true, tier: verdict.tier ?? null, maxUsdc: null, reason: null, decisionId, eddUrl };
}
