# Wave 1 Updates

SoNarr Wave 1 is a Web2 prototype for the SoSoValue Buildathon. The goal is to prove that a solo operator can move from market noise to a packaged finance product idea using SoSoValue's market intelligence.

## Product Progress

SoNarr now supports the core workflow:

```txt
market noise
  |
  v
detected narrative
  |
  v
evidence stack
  |
  v
suggested index product
  |
  v
AI narrative brief
  |
  v
launch room
  |
  v
public index preview path
  |
  v
future SoDEX execution readiness
```

Built surfaces:

- Landing page for the SoNarr product vision.
- Narrative Radar at `/radar`.
- Narrative Intelligence pages at `/narratives/[id]`.
- Narrative Signal Stack for cross-checking narrative conviction.
- AI Narrative Brief powered by Gemini.
- Narrative Launch Room for thesis, memo, thread, rebalance policy, and execution checklist.
- Preview-only SoDEX execution section.
- Endpoint diagnostics for live-data transparency.

## SoSoValue Integration

SoSoValue is the evidence layer for the product. Current implementation focuses on:

- News heat through `GET /news/hot`.
- Narrative discovery through `GET /news/search`.
- Market momentum through currency market snapshot wiring.
- Sector and spotlight alignment through `/currencies/sector-spotlight`.
- Index relevance through `/indices` and `/indices/{index_ticker}/constituents`.

Future SoSoValue expansion paths include ETFs, macro, BTC treasuries, fundraising, analysis charts, trading pairs, historical klines, and richer index snapshots.

## Data Honesty

The main product flow is live-data-first. SoNarr does not silently fill missing radar cards, signal layers, or scores with fake fallback data.

If an endpoint is unavailable, rate-limited, unauthorized, unresolved, or returns an incompatible shape, the UI shows that status directly. In development, safe logs help diagnose endpoint behavior without exposing API keys.

## AI Usage

Gemini is used only for narrative synthesis. It turns existing SoSoValue-powered evidence into a concise research brief with an executive summary, bull case, bear case, index thesis, risk notes, and suggested next step.

AI does not invent scores, assets, prices, or facts. SoSoValue remains the source of market evidence. Briefs are cached server-side in memory for 30 minutes to reduce unnecessary Gemini calls during demos.

## What Wave 1 Does Not Do

- No smart contracts.
- No wallet connection.
- No real trading.
- No custody.
- No investment advice.
- No SoDEX signed writes.
- No automatic execution.

SoDEX is represented as an execution readiness preview only. The future path is to check orderbook depth, slippage, and basket execution routes before any real execution integration exists.

## Roadmap

Wave 2 will focus on public index pages, persisted narrative products, stronger historical validation, deeper SoSoValue signal coverage, and clearer publish/share workflows.

Wave 3 will focus on execution readiness becoming actionable through SoDEX orderbook checks, slippage estimation, basket routing, wallet-aware flows, and eventual on-chain product surfaces.
