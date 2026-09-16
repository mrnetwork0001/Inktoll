import { getCircleClient } from './pay.js';
import { arc } from '../config.js';

export async function autoDepositToGateway(walletAddress: string, amountUsdcStr: string) {
  const client = getCircleClient();
  if (!client) throw new Error('Circle Client not initialized');

  const GATEWAY_WALLET_ADDRESS = arc.verifyingContract;
  const USDC_ADDRESS = arc.usdcAddress;
  const BLOCKCHAIN = arc.blockchainName as any;
  
  const [whole, decimal = ""] = amountUsdcStr.split(".");
  const parsedAmount = (whole || "0") + (decimal + "000000").slice(0, 6);

  async function waitTx(txId: string, label: string) {
    const terminalStates = new Set(["COMPLETE", "CONFIRMED", "FAILED", "DENIED", "CANCELLED"]);
    while (true) {
      const { data } = await client.getTransaction({ id: txId });
      const state = data?.transaction?.state;
      if (state && terminalStates.has(state)) {
        if (state !== "COMPLETE" && state !== "CONFIRMED") {
          throw new Error(label + " failed with state: " + state);
        }
        return data.transaction;
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
  }

  console.log("[Gateway Auto-Deposit] Approving " + amountUsdcStr + " USDC for Gateway...");
  const approveTx = await client.createContractExecutionTransaction({
    walletAddress,
    blockchain: BLOCKCHAIN,
    contractAddress: USDC_ADDRESS,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [GATEWAY_WALLET_ADDRESS, parsedAmount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  if (!approveTx.data?.id) throw new Error("Approve Tx failed to initialize.");
  await waitTx(approveTx.data.id, "Gateway Approve");

  console.log("[Gateway Auto-Deposit] Depositing " + amountUsdcStr + " USDC into Gateway...");
  const depositTx = await client.createContractExecutionTransaction({
    walletAddress,
    blockchain: BLOCKCHAIN,
    contractAddress: GATEWAY_WALLET_ADDRESS,
    abiFunctionSignature: "deposit(address,uint256)",
    abiParameters: [USDC_ADDRESS, parsedAmount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });
  if (!depositTx.data?.id) throw new Error("Deposit Tx failed to initialize.");
  await waitTx(depositTx.data.id, "Gateway Deposit");
  
  console.log("[Gateway Auto-Deposit] Successfully deposited " + amountUsdcStr + " USDC into Gateway!");
}
