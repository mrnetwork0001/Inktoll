// Counterparty screening tests. Run: npx tsx src/complir.test.ts
// All HTTP is stubbed, so these never touch the network or spend USDC.
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';

const realFetch = globalThis.fetch;
let passed = 0;
let failed = 0;

function stubFetch(handler: (url: string, init?: any) => { status: number; body?: any }) {
  globalThis.fetch = (async (input: any, init?: any) => {
    const { status, body } = handler(String(input), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body ?? ''),
    } as Response;
  }) as typeof fetch;
}

// The module reads config at call time, so env is set before each import.
async function loadModule() {
  const mod = await import(`./services/complir.js?t=${Date.now()}`);
  return mod as typeof import('./services/complir.js');
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
    passed++;
  } catch (error: any) {
    console.error(`  FAIL ${name}: ${error.message}`);
    failed++;
  } finally {
    globalThis.fetch = realFetch;
  }
}

const verdict = (tier: string, extra: Record<string, unknown> = {}) => ({
  address: '0xabc', score: 10, tier,
  attestation: { signature: '0x', validUntil: Date.now() + 86_400_000 },
  decisionId: 'dec_test',
  ...extra,
});

const ADDR = '0x098b716b8aaf21512996dc57eb0615e2383e2f96';

/** Runs one assertion in a fresh process, so config.ts picks up the given env. */
function runCase(body: string, env: Record<string, string>): any {
  // Wrapped in an async IIFE: tsx compiles --eval as cjs, where top-level await
  // is not supported.
  const script = `(async () => {
    let called = false;
    globalThis.fetch = (async () => { called = true; return { ok: true, status: 200, json: async () => ({ tier: 'HIGH' }) }; });
    const { checkAddress } = await import('./src/services/complir.js');
    ${body}
  })();`;
  const out = execFileSync('npx', ['tsx', '--eval', script], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out.trim().split('\n').pop()!);
}

async function run() {
  console.log('=== CompliR screening ===');

  await test('HIGH blocks an outbound payment', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 200, body: verdict('HIGH', { reasons: [{ code: 'OFAC_MATCH', weight: 1 }] }) }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 5, direction: 'outbound' });
    assert.equal(r.allowed, false);
    assert.equal(r.tier, 'HIGH');
    assert.match(r.reason!, /high risk/i);
    assert.match(r.reason!, /OFAC_MATCH/);
    assert.equal(r.decisionId, 'dec_test');
  });

  await test('HIGH refuses an inbound payer', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 200, body: verdict('HIGH') }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 0.02, direction: 'inbound' });
    assert.equal(r.allowed, false);
  });

  await test('MEDIUM caps: over the limit is blocked', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 200, body: verdict('MEDIUM', { recommendedLimits: { maxPerTxUsdc: 10 } }) }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 25, direction: 'outbound' });
    assert.equal(r.allowed, false);
    assert.equal(r.maxUsdc, 10);
    assert.match(r.reason!, /limits this address to 10 USDC/);
  });

  await test('MEDIUM caps: at or under the limit passes', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 200, body: verdict('MEDIUM', { recommendedLimits: { maxPerTxUsdc: 10 } }) }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 4, direction: 'outbound' });
    assert.equal(r.allowed, true);
    assert.equal(r.maxUsdc, 10);
  });

  await test('LOW passes', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 200, body: verdict('LOW') }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 1000, direction: 'outbound' });
    assert.equal(r.allowed, true);
    assert.equal(r.tier, 'LOW');
  });

  await test('never screened (404) is treated as unknown, not risky', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch(() => ({ status: 404 }));
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 1, direction: 'outbound' });
    assert.equal(r.allowed, true);
  });

  // config.ts builds a static object at import time, so env-dependent cases run
  // in their own process rather than trying to mutate env between imports.
  await test('disabled (empty url) is a no-op and makes no request', async () => {
    const out = runCase(
      `const r = await checkAddress('${ADDR}', { amountUsdc: 1, direction: 'outbound' });
       console.log(JSON.stringify({ allowed: r.allowed, tier: r.tier, called }));`,
      { COMPLIR_URL: '' },
    );
    assert.equal(out.allowed, true);
    assert.equal(out.tier, null);
    assert.equal(out.called, false, 'disabled module must not call the API');
  });

  await test('unreachable + fail mode open allows', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    process.env.COMPLIR_FAIL_MODE = 'open';
    globalThis.fetch = (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch;
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 1, direction: 'outbound' });
    assert.equal(r.allowed, true);
  });

  await test('unreachable + fail mode closed blocks', async () => {
    const out = runCase(
      `globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
       const r = await checkAddress('${ADDR}', { amountUsdc: 1, direction: 'outbound' });
       console.log(JSON.stringify({ allowed: r.allowed, reason: r.reason }));`,
      { COMPLIR_URL: 'https://trycomplir.xyz', COMPLIR_FAIL_MODE: 'closed' },
    );
    assert.equal(out.allowed, false);
    assert.match(out.reason, /unavailable/i);
  });

  await test('an invalid address is rejected without a request', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    process.env.COMPLIR_FAIL_MODE = 'open';
    let called = false;
    stubFetch(() => { called = true; return { status: 200, body: verdict('LOW') }; });
    const { checkAddress } = await loadModule();
    const r = await checkAddress('not-an-address', { amountUsdc: 1, direction: 'outbound' });
    assert.equal(r.allowed, false);
    assert.equal(called, false);
  });

  await test('a stale attestation triggers a paid screen only when permitted', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    const stale = verdict('LOW', { attestation: { signature: '0x', validUntil: Date.now() - 1000 } });
    let posted = false;
    stubFetch((url, init) => {
      if (init?.method === 'POST') { posted = true; return { status: 200, body: verdict('HIGH') }; }
      return { status: 200, body: stale };
    });
    const { checkAddress } = await loadModule();

    // Hot path: no paid screen, so the stale LOW stands.
    const hot = await checkAddress(ADDR, { amountUsdc: 0.02, direction: 'inbound' });
    assert.equal(posted, false, 'read path must not pay for a screen');
    assert.equal(hot.allowed, true);

    // Withdrawal path: pays, and the fresh HIGH blocks.
    const payout = await checkAddress(ADDR, { amountUsdc: 50, direction: 'outbound', allowPaidScreen: true });
    assert.equal(posted, true, 'withdrawal path should refresh a stale verdict');
    assert.equal(payout.allowed, false);
  });

  await test('an unpaid 402 falls back to the stored verdict', async () => {
    process.env.COMPLIR_URL = 'https://trycomplir.xyz';
    stubFetch((url, init) => {
      if (init?.method === 'POST') return { status: 402, body: { error: 'payment required' } };
      return { status: 200, body: verdict('LOW', { attestation: { signature: '0x', validUntil: Date.now() - 1 } }) };
    });
    const { checkAddress } = await loadModule();
    const r = await checkAddress(ADDR, { amountUsdc: 50, direction: 'outbound', allowPaidScreen: true });
    assert.equal(r.allowed, true, 'an unpaid 402 must not block the payout');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
