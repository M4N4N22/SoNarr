# SoNarr

Narrative sonar for one-person on-chain finance businesses.

SoNarr uses SoSoValue market intelligence to detect emerging crypto narratives, validate them through a multi-layer signal stack, generate index ideas, produce AI research briefs, and prepare execution-ready workflows for future SoDEX integration.

It is not a generic news feed analyzer or AI chatbot. SoNarr turns SoSoValue market intelligence into launch-ready narrative finance products for solo analysts, creators, traders, and small funds.

```txt
SoSoValue APIs
  |-- Feeds / Hot News / Search
  |-- Market Snapshot / Klines
  |-- Sector & Spotlight
  `-- Index Data
        |
        v
Narrative Radar
        |
        v
Narrative Signal Stack
        |
        v
AI Narrative Brief + Launch Room
        |
        v
Public Index Preview
        |
        v
Future SoDEX Execution Preview
```

## Current Build

Wave 1 is a Web2 prototype for the SoSoValue Buildathon. The app demonstrates the full product loop from live market evidence to packaged index-product thinking:

- Landing page explaining the SoNarr product vision.
- Narrative Radar powered by live SoSoValue hot news and search.
- Narrative Intelligence pages for detected narratives.
- Narrative Signal Stack for news heat, market momentum, sector alignment, index relevance, and execution readiness.
- Gemini-powered AI Narrative Brief for synthesis only.
- Narrative Launch Room that turns a narrative into public thesis, memo, thread, rebalance policy, and execution checklist.
- Preview-only SoDEX execution panel.
- Honest endpoint diagnostics when data is unavailable or partially integrated.

## SoSoValue Usage

SoSoValue is the evidence layer for SoNarr. The app uses or wires against these endpoint areas:

- Feeds: `GET /news/hot` and `GET /news/search`.
- Currency & Pairs: market snapshot, historical klines, trading pairs, sector & spotlight.
- SoSoValue Index: index list, index constituents, and index market snapshot.
- Future expansion: ETFs, macro, BTC treasuries, fundraising, analysis charts, and richer historical data.

SoNarr is live-data-first. It does not silently use fake fallback narratives or mock market scores as product data. If a SoSoValue endpoint fails, rate-limits, returns unauthorized/not found, or returns an incompatible response shape, the UI shows the endpoint status honestly.

## AI Layer

Gemini is used only for narrative synthesis. It can generate:

- Executive summary.
- Why the narrative matters now.
- Bull case and bear case.
- Index thesis.
- Risk notes.
- Suggested next step.

SoSoValue remains the source of market evidence. AI does not invent prices, scores, assets, or facts, and it does not place trades or provide financial advice. AI briefs are cached server-side in memory for 30 minutes to reduce unnecessary Gemini calls and rate-limit risk during demos.

## Architecture

SoNarr is built with Next.js App Router, TypeScript, Tailwind CSS, and small local UI primitives inspired by shadcn/ui.

Key routes:

- `/` - product landing page.
- `/radar` - live SoSoValue-powered Narrative Radar.
- `/narratives/[id]` - Narrative Intelligence page.
- `/api/radar` - server-side radar data route.
- `/api/ai/narrative-brief` - server-side Gemini synthesis route.

Key modules:

- `lib/sosovalue.ts` - SoSoValue feed/search integration and live-data status handling.
- `lib/sonarr/signal-stack.ts` - narrative signal-stack enrichment and scoring.
- `lib/ai/gemini.ts` - server-side Gemini brief generation.
- `lib/ai/brief-cache.ts` - in-memory AI brief cache.
- `lib/types/data-source.ts` - endpoint status and data-source state types.

## Setup

```bash
npm install
npm run dev
```

Create a local `.env` file:

```bash
SOSOVALUE_API_KEY=your_sosovalue_key
GEMINI_API_KEY=your_gemini_key
```

Do not use `NEXT_PUBLIC_GEMINI_API_KEY`. Gemini and SoSoValue calls run server-side so keys are never exposed to the browser.

Useful commands:

```bash
npm run lint
npm run build
```

## Current Limitations

- Wave 1 is a Web2 prototype.
- No smart contracts.
- No wallet connection.
- No real trading.
- No custody.
- No investment advice.
- SoDEX execution is preview-only and future-facing.
- Some SoSoValue enrichment layers depend on endpoint availability and compatible response shapes.
- In-memory AI cache resets on server restart.

Development logs include safe endpoint diagnostics such as endpoint name, path, HTTP status, duration, item count, response shape summary, and error type. API keys and authorization headers are never logged.

## Roadmap

Wave 1: Prove the core product loop from SoSoValue intelligence to narrative radar, signal stack, AI brief, launch room, and execution preview.

Wave 2: Add public index pages, deeper SoSoValue enrichment, stronger historical validation, richer index methodology, and saved/published narrative products.

Wave 3: Connect SoDEX execution readiness with real orderbook depth, slippage, basket routing, wallet-aware flows, and on-chain product surfaces when the execution layer is ready.
