import { complir } from '../config.js';

// Counterparty screening for the agent's outbound payments.
// Docs: https://trycomplir.xyz/docs
//
// The agent pays a couple of cents thousands of times, and a fresh screen costs
// ~0.01 USDC, so this side only ever reads CompliR's free cached verdict. The
// backend pays for fresh screens at the points that justify it (creator
// onboarding and withdrawals), which is what populates this cache.
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
const GET_TIMEOUT_MS = 10_000;

export async function checkPayee(address: string, amountUsdc: number): Promise<CheckResult> {
  if (!complir.url) return ALLOW;
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { ...ALLOW, allowed: false, reason: 'A valid 0x payee address is required for screening' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GET_TIMEOUT_MS);
  try {
    const res = await fetch(`${complir.url}/api/v1/attestation/${address.toLowerCase()}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    // Never screened: unknown is not the same as risky.
    if (res.status === 404) return ALLOW;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const v: any = await res.json();
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
    const failClosed = complir.failMode === 'closed';
    console.warn(`[CompliR] Unreachable for ${address}: ${error.message}. Failing ${failClosed ? 'closed' : 'open'}.`);
    return failClosed
      ? { ...ALLOW, allowed: false, reason: 'Counterparty screening is unavailable; payment blocked by policy' }
      : ALLOW;
  } finally {
    clearTimeout(timer);
  }
}
