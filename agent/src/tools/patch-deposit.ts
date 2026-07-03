import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { autoDepositToGateway } from "./gatewayDeposit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../../.env") });

async function run() {
  const address = "0xd9c38a5933ee459a322cdd56d022b47ebbf17683";
  try {
    console.log("Fixing stuck balance for " + address + "...");
    await autoDepositToGateway(address, "0.95");
    console.log("Done!");
  } catch (err) {
    console.error(err);
  }
}

run();
