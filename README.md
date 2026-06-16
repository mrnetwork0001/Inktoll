# 🔖 Inktoll

**The first AI-powered knowledge economy where creators get paid every time their work is read — and every time it is cited.**

> Readers pay once. Creators earn forever. Built for the Canteen × Circle Lepton Agents Hackathon.

---

## 📖 The Vision

Every day, LLMs and AI reader agents consume millions of blogs, newsletters, and publications. The original creators of this research get zero credit and zero compensation. 

**Inktoll** solves this by establishing a two-layer value-reinforcing payment protocol:

1. **Layer 1 — Pay-Per-Read:** Blog creators connect their Ghost blog. They set per-article prices (e.g. $0.005 USDC). An autonomous AI Reader Agent discovers new articles, scores their quality/relevance, and executes gasless EIP-3009 nanopayments on Arc Testnet to retrieve and summarize content.
2. **Layer 2 — Citation Tolls:** When a reader queries the agent, the agent grounds its answers in previously purchased articles. It computes cosine similarity across its vector index. If similarity crosses `0.75`, a **Citation Toll ($0.0001 USDC)** is automatically paid back to the creator. Good content earns perpetual royalties.

---

## 🛠️ Circle & Arc Tool Integration

- **x402 Protocol:** Implemented HTTP 402 Paywall headers (`X-Payment-Required`, `X-Payment-Amount`, `X-Payment-Recipient`, `X-Payment-Gateway`) to protect articles. The server serves free previews (first 200 words) and requires cryptographic payment signatures to unlock full articles.
- **Circle Programmable Wallets:** Dynamically provisions developer-controlled wallets for creators (to receive reads/tolls) and reader agents (to hold spendable budgets).
- **Circle Gateway:** Manages batched, off-chain EIP-3009 signature collections, settling payments periodically on-chain.
- **Arc Testnet:** Settles sub-cent stablecoin payments gaslessly.
- **App Kit:** Integrated App Kit's Send module mockup in the creator dashboard for instant USDC withdrawals.

---

## 🏗️ Project Structure

```
Inktoll/
├── package.json         # Workspace configuration
├── tsconfig.json        # Shared TypeScript settings
├── .env.example         # Environment variables template
├── server/              # Express backend server & x402 payment validator
│   ├── src/db/          # File-backed JSON DB (bypasses Windows C++ compiling issues)
│   ├── src/middleware/  # x402 payment validation logic
│   └── src/services/    # Circle wallet & mock Ghost API services
├── agent/               # LangChain AI agent loop & Q&A microservice
│   ├── src/tools/       # Discovery, evaluation, pay, and summary tools
│   └── src/citation.ts  # Cosine similarity matching & toll trigger
└── dashboard/           # Next.js 14 Web UI (Inter & JetBrains Mono, glassmorphic CSS)
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20.18.2+
- npm (Node Package Manager)

### 1. Installation
Clone the repository and install all dependencies in one step using workspaces:
```bash
npm install
```

### 2. Compilation
Compile TypeScript sources:
```bash
npm run build:server
npm run build:agent
```

### 3. Running Backend Services
Start the Express API server (port 3001) and the Agent Service (port 3002) in separate terminals:
```bash
# Terminal 1: Run Express Server
npm run dev:server

# Terminal 2: Run AI Agent service
npm run dev:agent
```

### 4. Running the Dashboard
Start the Next.js development server (port 3000):
```bash
# Terminal 3: Run Next.js App
npm run dev:dashboard
```
Open [http://localhost:3000](http://localhost:3000) to browse the dashboard!

---

## 🧪 Testing and Verification
Run the backend transaction verification suite:
```bash
npm run test --workspace=server
```
Expected output:
```
=== Starting Backend Integration Verification ===
[DB] JSON Database Engine initialized successfully at C:\Users\IFEANYICHUKWU\OneDrive\Desktop\Inktoll\data\inktoll.json
[Test] Database cleaned.
[Wallet Service] [MOCK] Created creator wallet: 0x3210b0454...
[Test] Creator successfully registered in database.
[Ghost Service] Running in mock mode, returning sample articles.
[Test] Imported 3 articles into SQLite.
[Test] Seeded agent wallet 0xAgentWalletAddress123 with 10.0 USDC.
[Gateway Service] Submitting payment to Circle Gateway...
[Gateway Service] Payment settled on Arc Testnet.
=== Backend Integration Verification PASSED! ===
```

---

## ✍️ Builder
- **MrNetwork** (mrnetwork0001 / @mrnetwork0001)
