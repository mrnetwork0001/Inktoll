import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const BLOCKCHAIN = "ARC-TESTNET";
const DEPOSIT_AMOUNT_USDC = "5";

const API_KEY = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;
const DEPOSITOR_ADDRESS = "0xefe7ec896b0a7cc3d7c6863ded2612d2cb262eb1"; // agent wallet

if (!API_KEY || !ENTITY_SECRET || !DEPOSITOR_ADDRESS) {
  throw new Error(
    "Missing required env vars: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, DEPOSITOR_ADDRESS",
  );
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey: API_KEY,
  entitySecret: ENTITY_SECRET,
});

function parseBalance(value: string): string {
  const [whole, decimal = ""] = value.split(".");
  return (whole || "0") + (decimal + "000000").slice(0, 6);
}

async function waitForTxCompletion(txId: string, label: string) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    if (state && terminalStates.has(state)) {
      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(label + " did not complete successfully (state=" + state + ")");
      }
      return data.transaction;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

async function main() {
  const amount = parseBalance(DEPOSIT_AMOUNT_USDC);

  console.log("Approving " + DEPOSIT_AMOUNT_USDC + " USDC...");

  const approveTx = await client.createContractExecutionTransaction({
    walletAddress: DEPOSITOR_ADDRESS,
    blockchain: BLOCKCHAIN as any,
    contractAddress: USDC_ADDRESS,
    abiFunctionSignature: "approve(address,uint256)",
    abiParameters: [GATEWAY_WALLET_ADDRESS, amount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const approveTxId = approveTx.data?.id;
  if (!approveTxId) {
    throw new Error("Failed to create approve transaction");
  }
  await waitForTxCompletion(approveTxId, "USDC approve");
  console.log("Approve successful.");

  console.log("Depositing " + DEPOSIT_AMOUNT_USDC + " USDC to Gateway Wallet...");

  const depositTx = await client.createContractExecutionTransaction({
    walletAddress: DEPOSITOR_ADDRESS,
    blockchain: BLOCKCHAIN as any,
    contractAddress: GATEWAY_WALLET_ADDRESS,
    abiFunctionSignature: "deposit(address,uint256)",
    abiParameters: [USDC_ADDRESS, amount],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  const depositTxId = depositTx.data?.id;
  if (!depositTxId) {
    throw new Error("Failed to create deposit transaction");
  }
  await waitForTxCompletion(depositTxId, "Gateway deposit");

  console.log("Deposit successful!");
  console.log("Block confirmation may take additional time before the unified balance updates.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
