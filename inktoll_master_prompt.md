# Inktoll — Master Build Prompt

## CONTEXT: What Is This?

**Inktoll** is the first AI-powered knowledge economy where **creators get paid every time their work is read — and every time it is cited.** Built for the **Lepton Agents Hackathon** (Canteen × Circle, June 15–29, 2026, $50K prize pool).

> **"Readers pay once. Creators earn forever."**

**Two co-primary features:**
1. **Pay-Per-Read** — Ghost blog creators monetize individual articles via USDC nanopayments. An autonomous AI reader agent discovers, evaluates, budgets, and pays for articles on behalf of readers.
2. **Citation Tolls** — When the AI agent later uses a purchased article to answer a question, the original author earns again. Every future citation becomes a new revenue stream. Knowledge becomes an appreciating asset.

**Settlement:** All payments settle gaslessly on **Arc** (Circle's stablecoin-native L1) via Circle Gateway batched nanopayments.

**Why this wins:** This directly builds the "LLM Citation Toll Layer" that Canteen themselves highlighted as a key idea. Nobody else has shipped it. Combined with Ghost CMS integration (54K GitHub stars) for easy creator onboarding, this scores high across all four judging criteria.

---

## THE HACKATHON

- **Event:** Lepton Agents Hackathon by Canteen × Circle
- **Dates:** June 15–29, 2026 (2 weeks)
- **Prize:** $50K total — 1st: $10K, 2nd: $7.5K×2, 3rd: $5K×3, + standout teams + easter eggs
- **Theme:** AI agents that pay, receive, and orchestrate nanopayments on Arc
- **Submission:** Public GitHub repo + video demo (under 3 min) + live deployed link (encouraged)
- **Judging (async, no live demo day):**
  - 30% Agentic Sophistication (how much does the AI actually decide vs. just automate?)
  - 30% Traction (real users, real payments, real volume during the event window)
  - 20% Circle Tool Usage (creative use of Wallets, Gateway, Nanopayments, App Kit, x402, USDC)
  - 20% Innovation (novel approaches, new territory)

**RFBs we target:**
- **RFB 06 (Co-Primary):** Creator & Publisher Monetization — monetize a single article without forcing readers into a monthly commitment
- **RFB 01 (Co-Primary):** Autonomous Paying Agents — agents that discover, evaluate, and pay for paywalled content on a budget
- **RFB 03:** Agent-to-Agent Nanopayment Networks — citation tolls when an agent grounds an answer in a paid source

**Positioning (use this language everywhere — README, demo, pitch):**
> "The first AI-powered knowledge economy where creators get paid every time their work is read — and every time it is cited."

---

## WHAT TO BUILD

### Layer 1: Pay-Per-Read (The Traction Engine)

**Creator flow:**
1. Creator signs up on Inktoll dashboard
2. Enters their Ghost blog URL + Ghost Content API key
3. Inktoll auto-imports all their posts (title, excerpt, slug, HTML content, metadata)
4. Creator sets per-article pricing ($0.001 to $0.10 USDC) — simple fixed price, no complex pricing logic
5. Each article gets a unique Inktoll proxy URL
6. When anyone hits that URL:
   - Free preview: first ~200 words + article metadata
   - Full content: requires x402 nanopayment
7. Creator dashboard shows real-time animated earnings counter, article list with read counts, and citation earnings

**Reader/Agent flow:**
1. Reader signs up, funds their agent wallet with testnet USDC
2. Sets preferences: topics of interest, max budget per article, daily spending cap
3. The LangChain AI agent autonomously:
   - Discovers new articles by polling RSS feeds from registered Ghost blogs
   - Scores each article for quality and relevance to reader interests (using LLM)
   - Decides whether to pay based on score vs. price vs. remaining budget
   - Signs an EIP-3009 authorization via `@circle-fin/x402-batching` SDK
   - Retrieves the full article content
   - Generates a brief summary for the reader
4. Reader sees a feed of purchased articles + summaries in their dashboard

### Layer 2: Citation Tolls (The Innovation Differentiator)

This is NOT secondary — it's the feature that judges will remember. It directly builds the "LLM Citation Toll Layer" that Canteen highlighted as a key idea.

When the AI agent is asked to answer a question and it uses content from a previously purchased article as a source:
1. The agent detects that its answer is grounded in a specific paid article (via semantic similarity between the generated answer and stored article embeddings)
2. A citation nanopayment ($0.0001–$0.001 USDC) is automatically triggered to the original author
3. The citation is logged — author can see "X citations earned Y USDC" in their dashboard
4. This creates a recursive value chain: good content keeps earning long after it's first purchased

**The narrative shift this creates:**
- Without citations: "We built pay-per-read for Ghost" (boring, sounds like another paywall)
- With citations: "We built the first self-reinforcing economy where AI pays creators twice" (novel, memorable, aligned with judges' vision)

**Implementation:** Store article embeddings when purchased, compare against agent responses via cosine similarity, trigger payment if similarity exceeds threshold.

### SCOPE BOUNDARIES — What to Cut

To ship in 2 weeks, deliberately CUT these features:
- ❌ Revenue charts / analytics graphs
- ❌ Withdrawal flow / wallet management UI
- ❌ Creator settings pages
- ❌ Escrow contracts
- ❌ AI-suggested pricing
- ❌ Complex RSS feed generation

KEEP these (they're the demo's money shots):
- ✅ Animated real-time earnings counter (the single most impressive UI element)
- ✅ Full agent autonomous loop (discover → evaluate → pay → summarize)
- ✅ Citation detection + payment visualization
- ✅ Creator onboarding (connect Ghost → import articles → set price)
- ✅ Reader agent setup (fund wallet → set interests → start agent)
- ✅ Ask-the-agent chat with citation toll display

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                       Inktoll                           │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────────┐  │
│  │   CREATOR SIDE       │    │   READER / AGENT SIDE      │  │
│  │                      │    │                             │  │
│  │  Ghost Blog          │    │  🤖 Reader Agent            │  │
│  │  (any existing       │    │  (LangChain + GPT-4o-mini) │  │
│  │   Ghost instance)    │    │                             │  │
│  │       │              │    │  ┌─ Interest profiling      │  │
│  │       ▼              │    │  ├─ RSS feed discovery      │  │
│  │  Ghost Content API   │    │  ├─ Quality/relevance       │  │
│  │  (read-only key)     │    │  │  scoring (LLM)          │  │
│  │       │              │    │  ├─ Budget management       │  │
│  │       ▼              │    │  ├─ Autonomous x402 payment │  │
│  │  Inktoll Server  │◄──┤  ├─ Article summarization   │  │
│  │  (Express + x402     │    │  └─ Citation detection      │  │
│  │   middleware)         │    │       │                     │  │
│  │       │              │    │       ▼                     │  │
│  │       ▼              │    │  Circle Wallet              │  │
│  │  x402 Paywall        │    │  (per-reader agent)         │  │
│  │  ├─ 402 response     │    │       │                     │  │
│  │  │  with payment     │    │       ▼                     │  │
│  │  │  instructions     │    │  @circle-fin/x402-batching  │  │
│  │  └─ Verify auth →    │    │  (off-chain signatures)     │  │
│  │     return content   │    │       │                     │  │
│  │       │              │    │       ▼                     │  │
│  │       ▼              │    │  Circle Gateway             │  │
│  │  Creator Dashboard   │    │  (batched settlement)       │  │
│  │  (real-time earnings,│    │       │                     │  │
│  │   per-article stats, │    │       ▼                     │  │
│  │   withdrawal)        │    │  Arc Testnet                │  │
│  │       │              │    │  (sub-second finality)      │  │
│  │       ▼              │    │                             │  │
│  │  Circle Wallet       │    │  Reader Dashboard           │  │
│  │  (per-creator,       │    │  (purchased articles,       │  │
│  │   auto-receive)      │    │   summaries, spend history) │  │
│  └─────────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## TECH STACK (STRICT)

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Runtime** | Node.js | 20.18.2+ | Required for Circle CLI |
| **Language** | TypeScript | 5.x | Type safety, same as reference repos |
| **Server** | Express.js | 4.x | Lightweight, perfect for x402 middleware |
| **Agent Framework** | LangChain.js | latest | Same pattern as `circlefin/arc-nanopayments` |
| **LLM** | OpenAI GPT-4o-mini | latest | Cost-effective for evaluation + summarization |
| **Payment SDK** | `@circle-fin/x402-batching` | latest | Official Circle SDK for nanopayments |
| **Wallets** | Circle Programmable Wallets API | v1 | Per-creator and per-agent wallets |
| **Settlement** | Circle Gateway → Arc Testnet | — | Batched nanopayment settlement |
| **Frontend** | Next.js | 14+ | SSR, great DX, fast deployment |
| **Styling** | Vanilla CSS (dark mode, glassmorphism) | — | Premium aesthetic |
| **Database** | SQLite via better-sqlite3 | latest | Zero-config, portable |
| **Embeddings** | OpenAI text-embedding-3-small | latest | For citation detection similarity |
| **RSS Parsing** | rss-parser | latest | Feed discovery |
| **Deployment** | Vercel (frontend) + Railway (server) | — | Fast, free tier |

---

## PROJECT STRUCTURE

```
Inktoll/
├── package.json                 # Root workspace config
├── tsconfig.json                # Shared TypeScript config
├── .env.example                 # Environment variable template
├── README.md                    # Hackathon submission README
│
├── server/                      # x402 Paywall Proxy + API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # Express server entry point
│   │   ├── config.ts            # Environment config loader
│   │   │
│   │   ├── middleware/
│   │   │   └── x402.ts          # x402 Payment Required middleware
│   │   │                        #   - Returns 402 with payment instructions
│   │   │                        #   - Verifies EIP-3009 signed authorizations
│   │   │                        #   - Forwards valid payments to Gateway
│   │   │
│   │   ├── routes/
│   │   │   ├── articles.ts      # GET /articles/:slug — paywall-protected
│   │   │   │                    #   - Free: returns preview (200 words + metadata)
│   │   │   │                    #   - Paid: returns full HTML content
│   │   │   ├── creators.ts      # POST /creators — register Ghost blog
│   │   │   │                    #   - Store Ghost URL + API key + pricing
│   │   │   │                    #   - Auto-import articles
│   │   │   ├── feed.ts          # GET /feed/:creatorId — RSS feed of articles
│   │   │   ├── payments.ts      # GET /payments — payment history + analytics
│   │   │   └── citations.ts     # POST /citations — log citation + trigger toll
│   │   │
│   │   ├── services/
│   │   │   ├── ghost.ts         # Ghost Content API client
│   │   │   │                    #   - Fetch posts, pages, metadata
│   │   │   │                    #   - Uses ghost Content API key (read-only)
│   │   │   │                    #   - Endpoint: https://{blog}/ghost/api/content/posts/
│   │   │   ├── gateway.ts       # Circle Gateway nanopayment settlement
│   │   │   │                    #   - Initialize Gateway client
│   │   │   │                    #   - Submit batched payment authorizations
│   │   │   │                    #   - Query settlement status
│   │   │   ├── wallet.ts        # Circle Programmable Wallets
│   │   │   │                    #   - Create wallet per creator
│   │   │   │                    #   - Create wallet per reader agent
│   │   │   │                    #   - Check balances
│   │   │   │                    #   - Process withdrawals via App Kit Send
│   │   │   └── stats.ts         # Simple analytics queries
│   │   │                        #   - Total earnings per creator
│   │   │                        #   - Read count + citation count per article
│   │   │
│   │   └── db/
│   │       ├── schema.ts        # SQLite schema definitions
│   │       │                    #   Tables: creators, articles, payments,
│   │       │                    #   reader_agents, citations, embeddings
│   │       └── index.ts         # Database initialization + queries
│   │
│   └── data/                    # SQLite database file (gitignored)
│       └── Inktoll.db
│
├── agent/                       # LangChain AI Reader Agent
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # Agent entry point + CLI interface
│   │   │                        #   - "Start agent" command to begin autonomous loop
│   │   │                        #   - "Ask" command for Q&A with citation tolls
│   │   │
│   │   ├── agent.ts             # LangChain agent configuration
│   │   │                        #   - System prompt defining agent behavior
│   │   │                        #   - Tool binding (discover, evaluate, pay, summarize)
│   │   │                        #   - Autonomous loop: discover → evaluate → pay → summarize
│   │   │
│   │   ├── tools/
│   │   │   ├── discover.ts      # RSS feed discovery tool
│   │   │   │                    #   - Poll registered feeds for new articles
│   │   │   │                    #   - Return list of unread article previews
│   │   │   │                    #   - Filter by reader interests
│   │   │   │
│   │   │   ├── evaluate.ts      # Content quality scoring tool
│   │   │   │                    #   - LLM scores article preview (0-100)
│   │   │   │                    #   - Considers: relevance to interests, quality
│   │   │   │                    #     of writing, novelty, price-to-value ratio
│   │   │   │                    #   - Returns: score, reasoning, buy recommendation
│   │   │   │
│   │   │   ├── pay.ts           # x402 payment authorization tool
│   │   │   │                    #   - Check budget constraints before paying
│   │   │   │                    #   - Sign EIP-3009 authorization via x402-batching
│   │   │   │                    #   - Submit to Inktoll server
│   │   │   │                    #   - Return full article content on success
│   │   │   │
│   │   │   └── summarize.ts     # Article summarization tool
│   │   │                        #   - Generate concise summary of purchased article
│   │   │                        #   - Store article embedding for citation detection
│   │   │                        #   - Save summary to reader's feed
│   │   │
│   │   ├── citation.ts          # Citation toll detection
│   │   │                        #   - When agent answers a question:
│   │   │                        #   - Compute embedding of the answer
│   │   │                        #   - Compare against stored article embeddings
│   │   │                        #   - If cosine similarity > 0.75 threshold:
│   │   │                        #     trigger citation payment to original author
│   │   │                        #   - Log citation via POST /citations endpoint
│   │   │
│   │   ├── budget.ts            # Budget enforcement
│   │   │                        #   - Per-article max price
│   │   │                        #   - Daily spending cap
│   │   │                        #   - Remaining balance check
│   │   │                        #   - Auto-pause when budget exhausted
│   │   │
│   │   └── profile.ts           # Reader interest profiling
│   │                            #   - Store reader's declared interests
│   │                            #   - Learn from reading history
│   │                            #   - Used by evaluate.ts for relevance scoring
│   │
│   └── data/                    # Agent local state (gitignored)
│       ├── reading_history.json
│       └── embeddings.json
│
├── dashboard/                   # Next.js Frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── public/
│   │   └── favicon.ico
│   ├── app/
│   │   ├── layout.tsx           # Root layout (dark mode, fonts, global styles)
│   │   ├── page.tsx             # Landing page (hero, how it works, CTA)
│   │   │
│   │   ├── creator/
│   │   │   ├── onboard/
│   │   │   │   └── page.tsx     # Ghost blog connection wizard
│   │   │   │                    #   Step 1: Enter Ghost URL
│   │   │   │                    #   Step 2: Enter Content API key
│   │   │   │                    #   Step 3: Set pricing defaults
│   │   │   │                    #   Step 4: Review imported articles
│   │   │   │
│   │   │   └── dashboard/
│   │   │       └── page.tsx     # Creator dashboard (SINGLE PAGE — keep it focused)
│   │   │                        #   - Real-time animated earnings counter (HERO element)
│   │   │                        #   - Article list with read count + citation count
│   │   │                        #   - Citation earnings breakdown
│   │   │                        #   - Wallet balance display
│   │   │                        #   NOTE: No settings page, no revenue charts,
│   │   │                        #   no withdrawal flow. Keep it lean.
│   │   │
│   │   └── reader/
│   │       ├── setup/
│   │       │   └── page.tsx     # Reader agent setup wizard
│   │       │                    #   Step 1: Create agent wallet + fund it
│   │       │                    #   Step 2: Set interests / topics
│   │       │                    #   Step 3: Set budget limits
│   │       │                    #   Step 4: Start agent
│   │       │
│   │       ├── feed/
│   │       │   └── page.tsx     # Reader's purchased article feed
│   │       │                    #   - List of purchased articles + summaries
│   │       │                    #   - Full article viewer
│   │       │                    #   - Agent activity log
│   │       │
│   │       └── ask/
│   │           └── page.tsx     # Ask agent a question (citation toll demo)
│   │                            #   - Chat-like interface
│   │                            #   - Agent answers using purchased articles
│   │                            #   - Shows citation toll payments triggered
│   │
│   ├── components/
│   │   ├── EarningsCounter.tsx  # Animated real-time USDC counter
│   │   ├── ArticleCard.tsx      # Article preview card
│   │   ├── PaymentFlow.tsx      # x402 payment visualization
│   │   ├── AgentStatus.tsx      # Agent running/paused/budget status
│   │   ├── CitationBadge.tsx    # Shows citation count + revenue
│   │   └── WalletWidget.tsx     # Balance display + fund/withdraw
│   │
│   └── styles/
│       └── globals.css          # Global styles (see DESIGN section below)
```

---

## ENVIRONMENT VARIABLES

```env
# .env.example

# Circle
CIRCLE_API_KEY=               # From console.circle.com
CIRCLE_GATEWAY_URL=           # Gateway endpoint for nanopayments
CIRCLE_WALLET_SET_ID=         # Wallet set for managing creator/reader wallets

# Arc Testnet
ARC_RPC_URL=                  # From Canteen-hosted Arc testnet (via ARC CLI)
ARC_CHAIN_ID=                 # Arc testnet chain ID

# Ghost (for demo blog)
GHOST_BLOG_URL=               # e.g., https://your-blog.ghost.io
GHOST_CONTENT_API_KEY=        # Read-only Content API key

# OpenAI
OPENAI_API_KEY=               # For LangChain agent (GPT-4o-mini)

# Server
PORT=3001
DATABASE_PATH=./data/Inktoll.db

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## CIRCLE TOOL INTEGRATION — EXACT USAGE

### 1. Circle Gateway + Nanopayments (CORE)
```typescript
// server/src/services/gateway.ts
// Uses Circle Gateway for batched settlement of per-article payments
// Payments as small as $0.001 USDC, settled gaslessly on Arc
//
// Reference: https://developers.circle.com/gateway/nanopayments
// Reference repo: https://github.com/circlefin/arc-nanopayments
//
// Key SDK: @circle-fin/x402-batching
// - Buyer (agent) signs EIP-3009 authorizations off-chain
// - Gateway collects signed authorizations
// - Gateway batches and settles on-chain periodically
```

### 2. x402 Protocol (CORE)
```typescript
// server/src/middleware/x402.ts
// Implements HTTP 402 "Payment Required" on article endpoints
//
// Flow:
// 1. Agent requests GET /articles/:slug
// 2. Server returns 402 with headers:
//    - X-Payment-Required: true
//    - X-Payment-Amount: 0.005 (USDC)
//    - X-Payment-Token: USDC
//    - X-Payment-Network: arc-testnet
//    - X-Payment-Recipient: <creator-wallet-address>
//    - X-Payment-Gateway: <gateway-url>
// 3. Agent signs authorization via x402-batching SDK
// 4. Agent retries request with X-Payment-Authorization header
// 5. Server verifies authorization → returns full content
//
// Reference: https://x402.org
```

### 3. Circle Programmable Wallets (CORE)
```typescript
// server/src/services/wallet.ts
// One wallet per creator (receives payments)
// One wallet per reader agent (sends payments)
//
// API: POST /v1/w3s/developer/wallets
// Reference: https://developers.circle.com/w3s/programmable-wallets
```

### 4. App Kit — Send (SUPPORTING)
```typescript
// Used in creator dashboard for USDC withdrawals
// Creator clicks "Withdraw" → transfers USDC from Inktoll wallet to personal wallet
//
// SDK: @circle-fin/app-kit
// Reference: https://developers.circle.com/app-kit/send
```

### 5. Circle CLI (SUPPORTING)
```typescript
// Used during project setup for:
// - Wallet provisioning
// - Testnet USDC faucet
// - Arc RPC configuration
//
// Install: npm install -g @circle-fin/cli
// Reference: https://developers.circle.com/agent-stack/circle-cli
```

### 6. ARC CLI (SUPPORTING)
```bash
# Install: uv tool install git+https://github.com/the-canteen-dev/ARC-cli
# Provides:
# - RPC access to Canteen-hosted Arc testnet
# - Arc repos and docs pre-bundled as agent context
# Reference: arc-node.thecanteenapp.com
```

---

## CRITICAL REFERENCE REPOS

Study these before building:

1. **`circlefin/arc-nanopayments`** — THE primary reference. Shows end-to-end x402 flow with LangChain buyer agent + Next.js seller dashboard + Gateway batching. Fork this as your starting scaffold.
   - GitHub: https://github.com/circlefin/arc-nanopayments
   - Key files: `agent.mts` (buyer agent), `app/` (seller dashboard)

2. **`the-canteen-dev/circle-agent`** — Canteen's companion explainer for arc-nanopayments. Simpler, good for understanding the x402 flow.
   - GitHub: https://github.com/the-canteen-dev/circle-agent

3. **`circlefin/arc-escrow`** — AI-powered work validation and USDC settlement. Good patterns for escrow logic if implementing the citation toll as an escrow.
   - GitHub: https://github.com/circlefin/arc-escrow

4. **Ghost Content API docs** — For fetching blog posts programmatically.
   - Docs: https://ghost.org/docs/content-api/

---

## DESIGN REQUIREMENTS

The dashboard must be **stunning at first glance**. Follow these rules:

### Color Palette
```css
:root {
  /* Primary — Circle blue tones */
  --primary: #0073C3;
  --primary-light: #90D2FF;
  --primary-dark: #004A7C;

  /* Accent — warm gold for earnings/money */
  --accent: #F5A623;
  --accent-light: #FFD78A;

  /* Backgrounds — dark mode first */
  --bg-primary: #0A0E17;
  --bg-secondary: #111827;
  --bg-card: rgba(17, 24, 39, 0.8);
  --bg-glass: rgba(255, 255, 255, 0.05);

  /* Text */
  --text-primary: #F9FAFB;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);

  /* Status */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
}
```

### Typography
- **Headings:** Inter (700 weight) from Google Fonts
- **Body:** Inter (400 weight)
- **Mono/numbers:** JetBrains Mono (for earnings counters, code)

### Visual Effects
- Glassmorphism cards: `backdrop-filter: blur(12px); background: var(--bg-glass); border: 1px solid var(--border);`
- Subtle gradient borders on hover
- Animated earnings counter (counting up in real-time)
- Smooth page transitions
- Micro-animations on interactive elements (buttons, cards)
- Pulsing green dot for "agent running" status
- Payment flow visualization: animated dots flowing from reader to creator

### Key UI Components
1. **Earnings Counter** — Large, prominent, animated number showing total USDC earned. Use `requestAnimationFrame` for smooth counting. Gold/accent color.
2. **Article Cards** — Glassmorphism cards showing title, excerpt, price, reads, revenue. Hover to reveal "Edit pricing" action.
3. **Agent Status Widget** — Shows agent state (Running/Paused/Budget Exhausted), articles discovered today, USDC spent today.
4. **Payment Flow Viz** — Animated visualization showing the x402 flow: article request → 402 → payment → content delivery.
5. **Citation Badge** — Small badge on articles showing citation count + citation revenue.

---

## GHOST CONTENT API INTEGRATION

### How to connect a Ghost blog:

```typescript
// 1. Creator provides their Ghost blog URL and Content API key
// Ghost Admin > Settings > Integrations > Add Custom Integration
// This gives a Content API key (read-only, safe to use)

// 2. Fetch posts via Content API
const ghostUrl = 'https://your-blog.ghost.io';
const apiKey = 'your-content-api-key';

// Fetch all posts
const response = await fetch(
  `${ghostUrl}/ghost/api/content/posts/?key=${apiKey}&include=tags,authors&formats=html,plaintext&limit=all`
);
const { posts } = await response.json();

// Each post has:
// - id, slug, title, html, plaintext, excerpt
// - feature_image, published_at, reading_time
// - tags[], authors[]
// - custom_excerpt (if set by creator)

// 3. For the paywall, use the plaintext version to extract preview
// First 200 words = free preview
// Full html = behind paywall
```

### RSS Feed Generation
```typescript
// Generate an RSS feed for each registered creator's articles
// The AI agent polls these feeds to discover new content
// Use the 'feed' package to generate valid RSS XML
```

---

## x402 PAYMENT FLOW — DETAILED

```
STEP 1: Agent discovers article via RSS
  Agent → GET /feed/:creatorId
  ← Returns RSS with article previews

STEP 2: Agent evaluates article
  Agent calls LLM with article preview
  LLM returns: { score: 85, reasoning: "...", shouldBuy: true }

STEP 3: Agent requests full article
  Agent → GET /articles/:slug
  ← 402 Payment Required
     Headers:
       X-Payment-Amount: 0.005
       X-Payment-Token: USDC
       X-Payment-Recipient: 0xCreatorWallet
       X-Payment-Gateway: https://gateway.circle.com/...

STEP 4: Agent signs payment authorization
  Using @circle-fin/x402-batching:
  const auth = await signAuthorization({
    amount: 0.005,
    token: 'USDC',
    recipient: '0xCreatorWallet',
    signer: agentWallet,
  });

STEP 5: Agent retries with payment
  Agent → GET /articles/:slug
     Header: X-Payment-Authorization: <signed-auth>
  Server verifies auth → forwards to Gateway
  ← 200 OK + full article HTML

STEP 6: Gateway batches settlement
  Circle Gateway collects multiple signed authorizations
  Settles net positions in bulk on Arc
  Creator's wallet balance increases
```

---

## CITATION TOLL FLOW — DETAILED

```
STEP 1: Agent purchases article (normal pay-per-read flow above)
  After receiving full article, agent:
  - Stores article content
  - Generates embedding via OpenAI text-embedding-3-small
  - Saves embedding to local storage keyed by article ID + author wallet

STEP 2: Reader asks agent a question
  Reader → "What are the latest trends in AI payments?"

STEP 3: Agent generates answer using purchased knowledge
  Agent uses LLM to answer, drawing on purchased articles

STEP 4: Citation detection
  - Generate embedding of the agent's answer
  - Compute cosine similarity against all stored article embeddings
  - For each article with similarity > 0.75:
    - This article was "cited" in the answer

STEP 5: Citation toll payment
  For each cited article:
  - Agent signs x402 authorization for citation toll amount ($0.0001)
  - POST /citations with { articleId, authorWallet, amount, similarity }
  - Payment settles via Gateway

STEP 6: Display
  - Reader sees: "This answer cited 2 articles. Citation tolls: $0.0002 USDC"
  - Creator dashboard shows: "Article X earned 15 citations → $0.0015 USDC"
```

---

## DATABASE SCHEMA

```sql
-- Creators who register their Ghost blogs
CREATE TABLE creators (
  id TEXT PRIMARY KEY,
  ghost_url TEXT NOT NULL,
  ghost_api_key TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  default_price_usdc REAL DEFAULT 0.005,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Articles imported from Ghost
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creators(id),
  ghost_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  preview_text TEXT,         -- First ~200 words for free preview
  full_html TEXT NOT NULL,
  word_count INTEGER,
  price_usdc REAL NOT NULL,
  published_at DATETIME,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment records
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id),
  reader_agent_id TEXT NOT NULL,
  amount_usdc REAL NOT NULL,
  payment_type TEXT NOT NULL,   -- 'read' or 'citation'
  tx_hash TEXT,                 -- Arc settlement tx hash (from Gateway)
  status TEXT DEFAULT 'pending', -- pending, settled, failed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reader agent configurations
CREATE TABLE reader_agents (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  interests TEXT,              -- JSON array of topic strings
  max_price_per_article REAL DEFAULT 0.05,
  daily_budget_usdc REAL DEFAULT 1.00,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Article embeddings for citation detection
CREATE TABLE embeddings (
  article_id TEXT PRIMARY KEY REFERENCES articles(id),
  embedding BLOB NOT NULL,      -- Float32 array stored as blob
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Citation records
CREATE TABLE citations (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL REFERENCES articles(id),
  reader_agent_id TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  toll_amount_usdc REAL NOT NULL,
  payment_id TEXT REFERENCES payments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## README TEMPLATE (FOR SUBMISSION)

The repo README must immediately impress judges who are reviewing async. Lead with the narrative, not the tech:

```markdown
# 🔖 Inktoll

**The first AI-powered knowledge economy where creators get paid every time their work is read — and every time it is cited.**

> Readers pay once. Creators earn forever.

## 🎬 Demo Video
[▶️ Watch the 3-minute demo](link-to-loom-or-youtube)

## 🌐 Live Product
[→ Try Inktoll](link-to-deployed-app)

## The Problem
Every day, AI agents read millions of articles, blogs, and newsletters.
The original creators earn nothing.

## The Solution
Inktoll creates a two-layer payment economy for content:

**Layer 1 — Pay-Per-Read:** Creators connect their Ghost blog. An autonomous AI reader agent discovers articles, evaluates quality, and pays per-read via x402 nanopayments.

**Layer 2 — Citation Tolls:** When the agent later uses a purchased article to answer a question, the original author earns *again*. Knowledge becomes an appreciating asset.

## How It Works
[Architecture diagram]

## Circle Tools Used
[Table showing each Circle tool and how it's integrated]

## Traction (During Hackathon)
- X creators onboarded
- Y articles monetized  
- Z USDC in nanopayments processed
- W citations detected and paid

## Tech Stack
[Table]

## Getting Started
[Setup instructions]

## Builder
MrNetwork · @mrnetwork0001
```

---

## VIDEO DEMO SCRIPT (3 MINUTES — THE MOST IMPORTANT DELIVERABLE)

The video demo is what judges actually watch. Script it precisely:

```
[0:00–0:30] THE PROBLEM
"Every day, AI agents read millions of articles. Blogs, newsletters, 
research. The original creators earn nothing. Inktoll changes that."

[0:30–1:00] LAYER 1 — CREATOR CONNECTS
Show: Creator connects Ghost blog → articles import automatically → 
sets price ($0.005 per article). "Three clicks. Your blog now earns 
per read."

[1:00–1:45] LAYER 1 — AGENT DISCOVERS AND PAYS
Show: AI reader agent starts → discovers articles via RSS → evaluates 
quality → decides to buy → x402 payment flows → full article retrieved.
SHOW THE EARNINGS COUNTER TICKING UP ON CREATOR DASHBOARD.
"The agent just read and paid for 3 articles autonomously. The creator 
earned $0.015 in 30 seconds."

[1:45–2:30] LAYER 2 — CITATION TOLLS (THE WOW MOMENT)
"Now watch what happens when someone asks the agent a question."
Show: User types question → agent answers using purchased articles → 
citation detected → author gets paid AGAIN.
SHOW CITATION TOLL PAYMENT HITTING THE DASHBOARD.
"The author just earned again — without anyone reading the article. 
Their knowledge is now an appreciating asset."

[2:30–3:00] CLOSE
"Readers pay once. Creators earn forever. Every read is a payment. 
Every citation is a royalty. Built on Arc with Circle nanopayments."
Show traction numbers: X creators, Y articles, Z USDC processed.
End on the tagline and GitHub link.
```

---

## TRACTION STRATEGY (DAYS 8–14)

Since traction is 30% of the score, this is critical:

**Your traction edge:** You're based in Nigeria. The African tech/crypto creator community (Nigerian writers on Ghost, Hashnode, Substack, crypto newsletters) is massive, passionate, and underserved by Western platforms. DM them — they'll try it *today*. This is a distribution advantage no Silicon Valley builder has.

1. **Day 8:** DM 20 African tech/crypto bloggers on Twitter. Message: "I built a way for your blog to earn USDC per article read — no subscription, just nanopayments. Your AI citations pay you too. Can I set it up for you in 5 minutes? Free during beta."

2. **Day 9–10:** Post on r/Ghost, Ghost community forum, Indie Hackers, Nigerian tech Twitter. Show the creator dashboard with the earnings counter ticking live.

3. **Day 11:** Post viral tweet: "I built an AI agent that reads blog posts and pays the author. Then when someone asks it a question, it pays the author AGAIN for every citation. The first economy where AI pays its sources. Live demo ↓"

4. **Day 12:** Engage in Canteen Discord — share progress, help others, post screenshots of real payments flowing.

5. **Day 13:** Compile metrics. Screenshot everything. Run the agent continuously to maximize payment volume.

6. **Day 14:** Final submission with traction data. Submit early in the day, then keep the agent running.

---

## DEVELOPER FEEDBACK FOR CIRCLE (FOR $500 BONUS)

Document friction points as you build:
- SDK installation issues
- API documentation gaps
- Error messages that weren't helpful
- Features you wished existed
- DX improvements you'd suggest
- What worked really well

Submit this feedback through the hackathon form. The $500 Feedback Incentive rewards "the most useful product feedback on Circle's developer tooling."

---

## FINAL CHECKLIST BEFORE SUBMISSION

- [ ] Public GitHub repo with clean code and README
- [ ] Video demo under 3 minutes (Loom or YouTube)
- [ ] Live deployed URL (Vercel + Railway)
- [ ] Real traction metrics documented
- [ ] Circle developer feedback submitted
- [ ] Project submitted via: forms.gle/SMqLaw2pMGDe58LFA
- [ ] Discord presence maintained throughout
- [ ] Code: INKTOLL entered on Luma registration
