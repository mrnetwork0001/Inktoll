import { config } from '../config.js';

// CompliR — counterparty-risk oracle for USDC on Arc mainnet.
// Docs: https://trycomplir.xyz/docs
//
// One entry point, checkAddress(), used at every point where USDC moves to an
// address we did not create, or arrives from an outside payer. When
// COMPLIR_URL is empty the module is disabled and every call returns
// allowed:true, so existing behaviour is untouched.
//
// The free GET returns the full verdict (tier, reasons, recommendedLimits,
// nextRescreenAt) and never 404s: a first sight of an address is screened on
// demand. A paid POST /screen (~0.0081 USDC) therefore buys depth, not
// coverage, and is reserved for `allowPaidScreen` call sites.
//
// First-sight screens take 20-60s server-side. We ask CompliR to wait, and it
// answers 202 + Retry-After rather than hanging. We honour that, and retry 5xx
// and timeouts with backoff, because one transient failure must not be mistaken
// for "the oracle is down" and silently wave a payment through.

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

const GET_TIMEOUT_MS = 15_000;
const POST_TIMEOUT_MS = 120_000; // a fresh screen traces funders and runs an analyst
// Seconds CompliR may hold a first-sight request before replying 202.
const FIRST_SIGHT_WAIT_S = 8;
const MAX_RETRIES = 3;
const BACKOFF_MS = [200, 600, 1500];

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Latest verdict, free. Asks CompliR to hold the request for up to
 * FIRST_SIGHT_WAIT_S while a first-sight screen runs; a 202 means it is still
 * going and carries Retry-After. 5xx and timeouts are retried with backoff.
 */
async function fetchVerdict(address: string): Promise<Verdict | null> {
  const url = `${config.complir.url}/api/v1/attestation/${address}?wait=${FIRST_SIGHT_WAIT_S}`;
  let lastError = 'unknown';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS[attempt - 1] ?? 1500);

    let res: Response;
    try {
      res = await request(url, { headers: { accept: 'application/json' } }, GET_TIMEOUT_MS);
    } catch (error: any) {
      // Aborted on timeout, or the connection dropped: both retryable.
      lastError = error?.name === 'AbortError' ? `timeout after ${GET_TIMEOUT_MS}ms` : error.message;
      continue;
    }

    if (res.status === 202) {
      // Screen is running server-side; come back for it when told to.
      const retryAfter = Number(res.headers.get('retry-after')) || 5;
      lastError = 'first-sight screen still running';
      await sleep(Math.min(retryAfter, 10) * 1000);
      continue;
    }

    if (res.status === 404) return null; // documented not to happen; handled anyway
    if (res.status >= 500) {
      lastError = `HTTP ${res.status}`;
      continue;
    }
    if (!res.ok) throw new Error(`CompliR attestation lookup failed: HTTP ${res.status}`);
    return (await res.json()) as Verdict;
  }

  throw new Error(`CompliR attestation lookup failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
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
    // CompliR recommends failing closed for outbound payments: refusing to pay is
    // recoverable, paying an unscreened counterparty is not. Inbound still honours
    // the configured mode so readers are not locked out by an oracle outage.
    const failClosed = config.complir.failMode === 'closed' || options.direction === 'outbound';
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
