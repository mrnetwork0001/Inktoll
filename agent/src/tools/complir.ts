import { complir } from '../config.js';

// Counterparty screening for the agent's outbound payments.
// Docs: https://trycomplir.xyz/docs
//
// This side only ever reads the free GET, which returns the full verdict and
// screens an unseen address on demand. First-sight screens run 20-60s
// server-side, so we ask CompliR to hold the request and it replies 202 +
// Retry-After instead of hanging; 5xx and timeouts get backoff retries, so one
// transient blip cannot be mistaken for an outage and wave a payment through.
//
// This matters because in the MCP flow the payee is taken from the server's
// `payment-recipient` response header: screening it means the agent will not
// pay an address a compromised or hostile endpoint nominated.

export type Tier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CheckResult {
  allowed: boolean;
  tier: Tier | null;
  maxUsdc: number | null;
  reason: string | null;
  decisionId: string | null;
}

const ALLOW: CheckResult = { allowed: true, tier: null, maxUsdc: null, reason: null, decisionId: null };
const GET_TIMEOUT_MS = 15_000;
const FIRST_SIGHT_WAIT_S = 8;
const MAX_RETRIES = 3;
const BACKOFF_MS = [200, 600, 1500];
const RETRY_AFTER_CAP_S = 20;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function checkPayee(address: string, amountUsdc: number): Promise<CheckResult> {
  if (!complir.url) return ALLOW;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { ...ALLOW, allowed: false, reason: 'A valid 0x payee address is required for screening' };
  }

  const url = `${complir.url}/api/v1/attestation/${address.toLowerCase()}?wait=${FIRST_SIGHT_WAIT_S}`;
  try {
    let v: any = null;
    let lastError = 'unknown';

    for (let attempt = 0; attempt <= MAX_RETRIES && !v; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
      } catch (err: any) {
        lastError = err?.name === 'AbortError' ? `timeout after ${GET_TIMEOUT_MS}ms` : err.message;
        await sleep(BACKOFF_MS[attempt] ?? 1500);
        continue;
      } finally {
        clearTimeout(timer);
      }

      // 202 (running), 503 (SCREENING_IN_PROGRESS) and 429 (first-sight rate
      // limit) all carry Retry-After; honour it instead of backing off fast.
      if (res.status === 202 || res.status === 503 || res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitS = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5, RETRY_AFTER_CAP_S);
        lastError = res.status === 429 ? 'rate limited' : 'first-sight screen still running';
        await sleep(waitS * 1000);
        continue;
      }
      if (res.status === 404) return ALLOW; // documented not to happen
      if (res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        await sleep(BACKOFF_MS[attempt] ?? 1500);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      v = await res.json();
    }

    if (!v) throw new Error(`no verdict after ${MAX_RETRIES + 1} attempts: ${lastError}`);
    const decisionId = v.decisionId ?? null;

    if (v.tier === 'HIGH') {
      const reasons = (v.reasons || []).map((r: any) => r.code).filter(Boolean).join(', ');
      return {
        allowed: false,
        tier: 'HIGH',
        maxUsdc: null,
        reason: `This address is flagged as high risk by CompliR: ${reasons || v.rationale || 'tier HIGH'}`,
        decisionId,
      };
    }

    if (v.tier === 'MEDIUM') {
      const cap = v.recommendedLimits?.maxPerTxUsdc;
      if (typeof cap === 'number' && amountUsdc > cap) {
        return {
          allowed: false,
          tier: 'MEDIUM',
          maxUsdc: cap,
          reason: `CompliR limits this address to ${cap} USDC per transaction (requested ${amountUsdc})`,
          decisionId,
        };
      }
      return { allowed: true, tier: 'MEDIUM', maxUsdc: cap ?? null, reason: null, decisionId };
    }

    return { allowed: true, tier: v.tier ?? null, maxUsdc: null, reason: null, decisionId };
  } catch (error: any) {
    // Every call here screens an outbound payment, which CompliR recommends
    // failing closed: not paying is recoverable, paying an unscreened payee is
    // not. COMPLIR_FAIL_MODE=open still applies to the backend's inbound checks.
    const failClosed = true;
    console.warn(`[CompliR] Unreachable for ${address}: ${error.message}. Failing ${failClosed ? 'closed' : 'open'}.`);
    return failClosed
      ? { ...ALLOW, allowed: false, reason: 'Counterparty screening is unavailable; payment blocked by policy' }
      : ALLOW;
  }
}
