import { ethers } from 'ethers';
import { getCircleClient } from './pay.js';
import { arc } from '../config.js';

// Shared balance reads for the agent service. Balance polling used to hit the
// public Arc RPC on every status call, which burned through the node's request
// quota (-32011 "request limit reached"). Circle's API is authoritative for
// our custodial wallets and doesn't touch the Arc RPC; results are cached
// briefly because both the dashboard and MCP clients poll. RPC remains a
// last-resort fallback.
const balanceCache = new Map<string, { value: number; fetchedAt: number }>();
const BALANCE_CACHE_TTL_MS = 30_000;

export function invalidateBalance(address: string): void {
  balanceCache.delete(address);
}

export async function getAgentUsdcBalance(wallet: { id: string; address: string }): Promise<number> {
  const cached = balanceCache.get(wallet.address);
  if (cached && Date.now() - cached.fetchedAt < BALANCE_CACHE_TTL_MS) {
    return cached.value;
  }

  let balance = 0.00;
  try {
    const circle = getCircleClient();
    if (!circle) throw new Error('Circle client not initialized');
    const balanceResponse = await circle.getWalletTokenBalance({ id: wallet.id });
    const usdcToken = balanceResponse.data?.tokenBalances?.find((t: any) => t.token?.symbol === 'USDC');
    balance = usdcToken ? parseFloat(usdcToken.amount) : 0;
  } catch (circleErr: any) {
    try {
      const provider = new ethers.JsonRpcProvider(arc.rpcUrl);
      const usdcAbi = ["function balanceOf(address owner) view returns (uint256)"];
      const usdcContract = new ethers.Contract(arc.usdcAddress, usdcAbi, provider);
      const balStr = await usdcContract.balanceOf(wallet.address);
      balance = Number(ethers.formatUnits(balStr, 6)); // USDC has 6 decimals
    } catch (rpcErr) {
      console.warn('[Balance] Unavailable from both Circle API and Arc RPC, using default.');
    }
  }

  balanceCache.set(wallet.address, { value: balance, fetchedAt: Date.now() });
  return balance;
}

export async function getGatewayBalance(address: string): Promise<number> {
  try {
    let gatewayApi = arc.gatewayUrl;
    if (!gatewayApi.endsWith('/v1')) gatewayApi += '/v1';
    const res = await fetch(`${gatewayApi}/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'USDC',
        sources: [{ domain: arc.gatewayDomain, depositor: address }] // Arc = domain 26 on both networks
      })
    });
    if (!res.ok) return 0;
    const data: any = await res.json();
    return parseFloat(data.balances?.[0]?.balance ?? '0');
  } catch (err: any) {
    console.warn('[Balance] Failed to fetch gateway balance:', err.message);
    return 0;
  }
}
