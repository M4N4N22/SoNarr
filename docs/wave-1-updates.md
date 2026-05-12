# SoNarr Wave 1 Updates

Wave 1 proves the core SoNarr loop: live SoSoValue market intelligence can be transformed into narrative conviction, index-product thinking, AI-assisted research, and launch-ready business assets for a one-person finance desk.

SoNarr is not positioned as a chatbot or a generic news feed analyzer. It is a product workflow:

```txt
market noise
  |
  v
SoSoValue evidence
  |
  v
detected narrative
  |
  v
signal stack validation
  |
  v
suggested index basket
  |
  v
AI research brief
  |
  v
launch room assets
  |
  v
public index preview path
  |
  v
future SoDEX execution readiness
```

## Wave 1 Outcome

The current prototype demonstrates that SoNarr can behave like a lightweight research desk, index publisher, and execution strategist without requiring a team.

Built in Wave 1:

- Landing page explaining the SoNarr product vision.
- Live-data-first Narrative Radar at `/radar`.
- Narrative Intelligence pages at `/narratives/[id]`.
- Narrative Signal Stack for multi-layer validation.
- AI Narrative Brief powered by Gemini.
- Narrative Launch Room for launch-ready content and operating policy.
- Preview-only SoDEX execution readiness section.
- Endpoint diagnostics for transparent live-data behavior.

The important product jump is that a user does not just read news. They land on a narrative and receive evidence, interpretation, asset mapping, index construction, risk checks, rebalance logic, launch copy, and an execution-readiness path.

## Current Technical Flow

```txt
GET /news/hot
GET /news/search
      |
      v
lib/sosovalue.ts
  - fetches SoSoValue data server-side
  - parses feed/search responses defensively
  - builds NarrativeSignal objects
  - returns endpoint status metadata
      |
      v
/radar
  - shows live hot news
  - ranks narrative category checks
  - links each narrative to /narratives/[id]
      |
      v
/narratives/[id]
  - resolves narrative from live radar data
  - builds evidence bullets
  - derives asset map and index weights
  - requests signal-stack enrichments
      |
      v
lib/sonarr/signal-stack.ts
  - market momentum
  - sector alignment
  - index relevance
  - execution readiness
      |
      v
Gemini AI Brief + Launch Room + SoDEX Preview
```

## Code Surfaces Added

```txt
app/
  radar/page.tsx
    Main radar surface.

  radar/_components/
    Modular UI sections for hero, feed, stats, status, and narrative cards.

  narratives/[id]/page.tsx
    Narrative Intelligence page. Converts one detected narrative into a product package.

  api/radar/route.ts
    JSON route for live radar state.

  api/ai/narrative-brief/route.ts
    Server-only Gemini synthesis route.

components/sonarr/
  narrative-signal-stack.tsx
    Displays layered narrative validation.

  ai-narrative-brief.tsx
    Client-triggered brief generation. Does not auto-call Gemini.

  narrative-launch-room.tsx
    Generates thesis, memo, X thread, rebalance policy, and execution checklist.

  execution-preview-section.tsx
    Preview-only SoDEX readiness UI.

  endpoint-diagnostics.tsx
    Shows endpoint health instead of hiding failures.

lib/
  sosovalue.ts
    SoSoValue feed/search client and radar engine.

  sonarr/signal-stack.ts
    Signal-stack enrichment and scoring.

  ai/gemini.ts
    Gemini prompt, request, parser, and deterministic AI fallback.

  ai/brief-cache.ts
    In-memory cache for generated AI briefs.

  types/data-source.ts
    Shared endpoint status and data-source state contracts.
```

## SoSoValue Integration

SoSoValue is the evidence layer for SoNarr. Wave 1 focuses on proving the first useful product path with live endpoints and explicit endpoint status handling.

Current feed layer:

- `GET /news/hot` powers the live market tape.
- `GET /news/search` probes narrative categories such as AI, Bitcoin ETF, RWA, DeFi, Stablecoin, and Layer 2.

Current signal-stack layer:

- `/currencies/{currency_id}/market-snapshot` for related asset momentum when currency IDs are available.
- `/currencies/sector-spotlight` for SoSoValue-recognized sector and spotlight matches.
- `/indices` for index discovery.
- `/indices/{index_ticker}/constituents` for index relevance checks.

Prepared expansion paths:

- `/currencies/{currency_id}/klines` for historical momentum.
- `/currencies/{currency_id}/pairs` for liquidity and routing checks.
- `/indices/{index_ticker}/market-snapshot` for richer index movement.
- ETF, macro, BTC treasury, fundraising, and analysis chart data for deeper research workflows.

## Live Data Honesty

Wave 1 now uses a live-data-first model for the main product flow. SoNarr does not silently fill missing radar cards, signal layers, or market scores with fake fallback data.

Each SoSoValue call returns a structured endpoint result:

```txt
EndpointResult
  ok: boolean
  data?: unknown
  status:
    name
    endpoint
    ok
    status / statusText
    errorType
    message
    durationMs
    itemCount
```

Endpoint statuses roll up into:

```txt
live         useful data from required endpoints
partial      some useful data, some failed endpoints
unavailable  no useful SoSoValue data parsed
```

This means the demo stays honest:

- If data is live, the UI says live.
- If data is partial, the UI says partial.
- If data is unavailable, the UI shows endpoint diagnostics.
- If a narrative cannot be resolved from live data, the narrative page says so directly.

Development logs include endpoint name, path, safe URL, HTTP status, duration, item count, response shape summary, error type, and message. API keys and headers are not logged.

## Narrative Signal Stack

The Signal Stack is the main technical product feature of Wave 1. It turns a detected narrative into a structured conviction check instead of a passive article summary.

Layers:

- News Heat: measures whether the narrative appears in live SoSoValue feed/search data.
- Market Momentum: checks live market snapshot availability for related assets.
- Sector Alignment: maps the narrative to SoSoValue sector and spotlight categories.
- Index Relevance: checks whether related assets appear in SoSoValue index constituents.
- Execution Readiness: tracks the future SoDEX orderbook, slippage, and basket route path.

Layer states are intentionally conservative:

- Live confirmed layers can show normal scores.
- Partial layers are capped.
- Pending layers show pending verification.
- Unavailable layers do not receive fake high scores.

This makes the product more useful for a real operator because it separates conviction from missing data.

## AI Narrative Brief

Gemini is used only after SoSoValue-powered evidence exists. It receives structured narrative input and produces a concise finance-ready brief.

The brief includes:

- Executive summary.
- Why now.
- Bull case.
- Bear case.
- Index thesis.
- Risk notes.
- Suggested next step.

Guardrails:

- AI does not invent prices, scores, assets, or evidence.
- AI does not provide investment advice.
- AI does not place trades.
- AI generation is user-triggered, not automatic on page load.
- Briefs are cached in memory for 30 minutes to reduce rate-limit risk during demos.

## Launch Room

The Narrative Launch Room turns a narrative and suggested index into business assets:

- Public index thesis.
- Research memo.
- Professional X thread.
- Rebalance policy.
- Execution checklist.

This is the product moment where SoNarr becomes more than analytics. It converts SoSoValue evidence into the assets a solo operator needs to publish, explain, monitor, and eventually route a narrative product.

## SoDEX Preview

Wave 1 includes a SoDEX execution-readiness panel, but it is intentionally preview-only.

It shows:

- Orderbook depth: pending.
- Slippage estimate: pending.
- Basket route: pending.
- Future execution route preview button: disabled.

No wallet is connected, no order is signed, no trade is placed, and no custody exists. The purpose is to make the future integration path visible without overstating current capabilities.

## Wave 1 Boundaries

Wave 1 deliberately does not include:

- Smart contracts.
- Wallet connection.
- Real trading.
- Asset custody.
- Investment advice.
- Authentication.
- Database persistence.
- SoDEX signed writes.
- Automatic execution.

These are not framed as missing pieces of the demo. They are deliberate boundaries so the prototype can focus on the research-to-product loop first.

## What This Proves

Wave 1 proves that SoNarr can:

- Treat SoSoValue as the source of market evidence.
- Detect narratives from live feed/search data.
- Convert narratives into structured conviction checks.
- Package narratives into suggested index products.
- Use AI safely for synthesis rather than invention.
- Generate launch-ready materials for a one-person finance desk.
- Represent future execution readiness without pretending execution exists today.

## Roadmap

Wave 2 will turn generated products into publishable surfaces:

- Public index pages.
- Saved narrative products.
- Better share workflows.
- More historical validation.
- Deeper SoSoValue enrichment.
- Richer methodology and rebalance policy.

Wave 3 will connect the product layer to execution readiness:

- SoDEX orderbook depth checks.
- Slippage estimation.
- Basket route planning.
- Wallet-aware user approval.
- On-chain product surfaces when execution is ready.
