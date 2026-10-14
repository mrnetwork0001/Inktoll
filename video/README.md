# Inktoll demo film

A 2:12 film about Inktoll: autonomous AI agents paying human writers in USDC for
reads and citations, settled on Arc mainnet.

- `out/inktoll-demo-1080p.mp4` — the film (1920x1080, 30 fps)
- `out/inktoll-thumbnail.png` — 1920x1080 poster

## What is real

Everything on screen came from the live product or its live API. Nothing was
mocked up, and no statistic was invented.

**The first mainnet payment.** On 2026-10-14 at 19:44:14 UTC an autonomous agent
discovered a real article, scored it 85/100 against its stated interests, paid
$0.02 USDC to the author, and skipped a second article at 10/100. That run was
not scripted: the score and the decision came from the agent's own evaluation.
Every number in scenes 8 and 9 is that payment.

- Agent wallet: `0x69167ae8F6F7f8FE71B7eE09F76DA9cEaAd42b66`
- Creator wallet: `0x0df42e5cb2b9e6385178d423acbec8b3d789c4af`
- Article: "The Unit of Account Problem: Why Machine Payments Need USDC-Native Gas"
- Receipt: https://www.inktoll.xyz/receipt/48cba8af-eaab-412e-bd04-7f750294fc8f
- Agent Gateway balance moved 1.900000 -> 1.880000 USDC; the creator's 0.020000
  sits in Circle Gateway's pending batch, independently checkable through
  Circle's public balances API.

**Scene 7, the HTTP 402.** Copied verbatim from the live response to
`GET /api/articles/the-unit-of-account-problem-why-machine-payments-need-usdc-native-gas`.
The decoded `payment-required` header carries `network: eip155:5042` (Arc
mainnet), asset `0x3600…0000`, amount `20000` (0.02 USDC at 6dp), and
verifying contract `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` under the
`GatewayWalletBatched` v1 domain.

**Product footage.** Scenes 6, 8 and 9 are headless-Chrome screencasts of
https://www.inktoll.xyz recorded against live production data, not a dev server
and not seeded data. Scene 11's MCP tool listing is the server's real tool set.

**Settlement, stated accurately.** The film says payments are "settled on Arc"
and the receipt on screen says the rest: nanopayments are batched off-chain via
Circle Gateway and net-settled on Arc L1. At the time of filming this payment
had not yet been net-settled, so there is no Arc explorer transaction for it.
The film makes no claim that there is one.

**Logos.** The Arc and Circle marks in scene 10 and the close are the official
assets from arc.io and circle.com, used to credit the networks the claims rest
on. Inktoll is not affiliated with or endorsed by either. Those two files are
trademarks of their owners and are deliberately not committed: run
`node scripts/logos.mjs` to fetch them before rendering.

**The ElevenLabs key** is read from the environment, from `video/.env`
(gitignored), or from a file named by `ELEVENLABS_ENV_FILE`. It is never
committed or logged.

**Voices.** Narration is ElevenLabs "Brian"; the question in the cold open is
ElevenLabs "Jessica". The score and all 17 sound effects are generated. No real
person is impersonated, and no quote is attributed to anyone.

## Build it

```bash
npm install
node scripts/logos.mjs       # fetch the Arc and Circle marks (not vendored)
node scripts/voices.mjs      # list voices
node scripts/voiceover.mjs   # narration + word timings
node scripts/music.mjs       # score
node scripts/sfx.mjs         # sound effects
node scripts/timing.mjs      # src/timing.json (every word on a frame)
node scripts/capture.mjs     # record the live product  (BASE=https://www.inktoll.xyz)
node scripts/encode.mjs      # clips -> public/footage + src/footage.json
node scripts/stills.mjs 297 647 936   # check frames
npm run render               # 1080p
node scripts/finish.mjs      # loudness to -14 LUFS
```

The film is isolated from the app: `video/` is outside the dashboard's
TypeScript project, listed in `.vercelignore`, and its heavy artefacts are
gitignored. It never touches a running dev server.
