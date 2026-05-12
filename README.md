# SoNarr

Narrative sonar for one-person on-chain finance businesses.

SoNarr turns SoSoValue market intelligence into launch-ready narrative finance products. It helps a solo analyst, creator, trader, or small fund move from market noise to a validated narrative, suggested index basket, research brief, launch package, and future SoDEX execution-readiness workflow.

This is not a generic news reader and not an AI chatbot. The product thesis is sharper: SoNarr detects narratives first through SoSoValue evidence, then packages them into finance products that a one-person desk can publish, monitor, and eventually route toward execution.

## Product Loop

```txt
                         SONARR WAVE 1 PRODUCT LOOP

  +-------------------+      +-----------------------+
  | SoSoValue Feeds   |      | SoSoValue Signal APIs |
  | /news/hot         |      | market snapshots      |
  | /news/search      |      | sector / spotlight    |
  +---------+---------+      | index constituents    |
            |                +-----------+-----------+
            |                            |
            v                            v
  +--------------------------------------------------+
  | Server-side Evidence Layer                       |
  | - defensive parsers                              |
  | - endpoint status objects                        |
  | - live / partial / unavailable data modes        |
  +-----------------------+--------------------------+
                          |
                          v
  +--------------------------------------------------+
  | Narrative Radar                                  |
  | Detects live market narratives from hot news and |
  | category search: AI, Bitcoin ETF, RWA, DeFi,     |
  | Stablecoin, Layer 2.                             |
  +-----------------------+--------------------------+
                          |
                          v
  +--------------------------------------------------+
  | Narrative Intelligence Page                      |
  | Evidence -> Signal Stack -> Asset Map -> Index   |
  | Product -> Risk Checks -> Rebalance Logic        |
  +-----------------------+--------------------------+
                          |
                          v
  +-------------------+      +-----------------------+
  | AI Brief          |      | Launch Room           |
  | bounded Gemini    |      | thesis, memo, thread, |
  | synthesis only    |      | policy, checklist     |
  +---------+---------+      +-----------+-----------+
            |                            |
            +-------------+--------------+
                          |
                          v
  +--------------------------------------------------+
  | Preview Surfaces                                  |
  | Public index preview path + future SoDEX          |
  | execution readiness. No real trades in Wave 1.    |
  +--------------------------------------------------+
```

## What Is Built

Wave 1 is a Web2 prototype for the SoSoValue Buildathon. It is designed to prove the core product behavior before adding wallets, persistence, or execution.

- Landing page that positions SoNarr as narrative infrastructure for one-person finance desks.
- Live-data-first Narrative Radar at `/radar`.
- Narrative Intelligence pages at `/narratives/[id]`.
- Server API route at `/api/radar` for radar data.
- Server API route at `/api/ai/narrative-brief` for Gemini synthesis.
- Multi-layer Narrative Signal Stack for conviction checks.
- AI Narrative Brief that summarizes only provided evidence.
- Narrative Launch Room that creates a launch kit from the detected narrative.
- SoDEX execution preview panel that shows the future route without placing trades.
- Endpoint diagnostics for partial or unavailable SoSoValue responses.

## Architecture

SoNarr uses Next.js App Router, TypeScript, Tailwind CSS, and small local UI primitives inspired by shadcn/ui. The important architectural choice is that SoSoValue evidence stays server-side, where API keys, parsers, endpoint health, and enrichment logic can be handled safely.

```txt
Browser UI
  |
  | renders server pages and calls AI brief on user action
  v
Next.js App Router
  |
  |-- app/page.tsx
  |     Landing page
  |
  |-- app/radar/page.tsx
  |     Server-rendered Narrative Radar
  |
  |-- app/narratives/[id]/page.tsx
  |     Server-rendered Narrative Intelligence page
  |
  |-- app/api/radar/route.ts
  |     JSON endpoint for radar data
  |
  `-- app/api/ai/narrative-brief/route.ts
        Server-only Gemini route

Server Libraries
  |
  |-- lib/sosovalue.ts
  |     Hot news/search client, defensive parsing,
  |     narrative scoring, endpoint statuses
  |
  |-- lib/sonarr/signal-stack.ts
  |     Market momentum, sector alignment,
  |     index relevance, execution-readiness logic
  |
  |-- lib/ai/gemini.ts
  |     Prompt construction, Gemini call,
  |     structured JSON parsing, deterministic AI fallback
  |
  |-- lib/ai/brief-cache.ts
  |     30-minute in-memory cache for generated briefs
  |
  `-- lib/types/data-source.ts
        Shared live / partial / unavailable status model
```

## Folder Map

```txt
next-app/
  app/
    page.tsx
      Public landing page.

    radar/
      page.tsx
        Server component for the live Narrative Radar.
      _components/
        radar-hero.tsx
        hot-news-feed.tsx
        narrative-checks.tsx
        radar-status-note.tsx
        radar-stats.tsx
          Radar-specific UI sections.

    narratives/[id]/
      page.tsx
        Narrative Intelligence page. Resolves live radar data,
        builds asset maps, weights, evidence, signal stack,
        launch room inputs, and execution preview.

    api/
      radar/route.ts
        Returns live radar JSON with endpoint status metadata.
      ai/narrative-brief/route.ts
        Validates narrative input and calls Gemini server-side.

  components/
    sonarr/
      narrative-signal-stack.tsx
        UI for multi-layer narrative validation.
      ai-narrative-brief.tsx
        Client-triggered AI brief panel.
      narrative-launch-room.tsx
        Launch package generator and copy actions.
      execution-preview-section.tsx
        Preview-only SoDEX readiness panel.
      endpoint-diagnostics.tsx
        Endpoint health cards for honest data states.

    ui/
      badge.tsx
      button.tsx
      card.tsx
      separator.tsx
        Small local UI primitives.

  lib/
    sosovalue.ts
      SoSoValue feed/search integration and radar engine.
    sonarr/signal-stack.ts
      Signal-stack enrichment and scoring logic.
    ai/gemini.ts
      Gemini narrative synthesis.
    ai/brief-cache.ts
      In-memory AI brief cache.
    types/data-source.ts
      EndpointStatus and DataSourceState contracts.

  docs/
    wave-1-updates.md
      Public Wave 1 progress summary.
```

## SoSoValue Integration

SoSoValue is the evidence layer. SoNarr currently uses or wires against these endpoint families:

- Feeds: `GET /news/hot` for current market heat.
- Feeds: `GET /news/search` for narrative category probes.
- Currency & Pairs: `/currencies/{currency_id}/market-snapshot`.
- Currency & Pairs: `/currencies/{currency_id}/klines` as the next historical momentum path.
- Currency & Pairs: `/currencies/{currency_id}/pairs` for future liquidity and routing checks.
- Sector & Spotlight: `/currencies/sector-spotlight`.
- SoSoValue Index: `/indices`.
- SoSoValue Index: `/indices/{index_ticker}/constituents`.
- SoSoValue Index: `/indices/{index_ticker}/market-snapshot`.

The current radar engine checks narratives such as AI, Bitcoin ETF, RWA, DeFi, Stablecoin, and Layer 2. The Signal Stack then attempts to validate the selected narrative across:

- News heat: frequency and recency from SoSoValue hot news/search.
- Market momentum: related asset snapshots when currency IDs are available.
- Sector alignment: category matches from SoSoValue sector and spotlight data.
- Index relevance: whether related assets appear in SoSoValue index constituents.
- Execution readiness: preview-only SoDEX orderbook/slippage/basket-route path.

Future SoSoValue expansion can add ETF flows, macro indicators, BTC treasury data, fundraising data, analysis charts, deeper historical windows, and richer index analytics.

## Live Data Honesty

The main product flow is live-data-first and does not silently replace failed SoSoValue responses with fake product data.

Every endpoint call is normalized into an `EndpointStatus`:

```txt
EndpointStatus
  name
  endpoint
  ok
  status / statusText
  errorType
  message
  durationMs
  itemCount
```

These statuses roll up into a `DataSourceState`:

```txt
live         all required responses worked and useful data was parsed
partial      some useful live data was parsed, some endpoints failed
unavailable  no useful live SoSoValue data was retrieved
```

This lets the UI show truthful states:

- Live SoSoValue data.
- Partial SoSoValue data.
- SoSoValue data unavailable.
- Endpoint diagnostics with HTTP status, error type, and short message.

In development, safe logs include endpoint name, path, URL without secrets, HTTP status, duration, item count, response shape summary, error type, and message. API keys and authorization headers are never logged.

## AI Narrative Brief

Gemini is used as a synthesis layer, not an evidence source.

The model receives only existing narrative data:

- title and summary
- signal score and confidence
- risk label
- evidence bullets
- top assets
- generated index weights
- source labels

The prompt explicitly tells Gemini not to invent facts, prices, assets, scores, or evidence; not to guarantee returns; and not to provide financial advice. The response is parsed as structured JSON for:

- executive summary
- why now
- bull case
- bear case
- index thesis
- risk notes
- suggested next step

Generated briefs are cached in memory for 30 minutes to reduce unnecessary Gemini calls and rate-limit risk during demos. The cache stores brief content and metadata only, never secrets.

## Narrative Signal Stack

The Signal Stack is what makes SoNarr more than a news summarizer. It asks whether a detected narrative is backed by multiple SoSoValue-native layers:

```txt
News Heat
  Is the narrative visible in current SoSoValue feed/search data?

Market Momentum
  Do related assets have live snapshot confirmation?

Sector Alignment
  Does the narrative map to SoSoValue-recognized sectors or spotlight categories?

Index Relevance
  Do related assets appear in SoSoValue index constituents?

Execution Readiness
  Is the basket ready for future SoDEX depth, slippage, and route checks?
```

When a layer cannot be verified, it is marked pending or unavailable instead of being inflated with fake confirmation. This is intentional: the product should help an operator trust what is known, see what is missing, and decide the next research step.

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

Do not use `NEXT_PUBLIC_GEMINI_API_KEY`. SoSoValue and Gemini calls run server-side so keys are never exposed to the browser.

Useful commands:

```bash
npm run lint
npm run build
```

## Wave 1 Scope

Wave 1 is deliberately scoped as a Web2 prototype:

- No smart contracts.
- No wallet connection.
- No real trading.
- No custody.
- No investment advice.
- No SoDEX signed writes.
- No automatic execution.

The SoDEX panel is an execution-readiness preview. It shows where orderbook depth, slippage estimation, and basket execution routing will connect after the research and product-packaging loop is proven.

## Roadmap

Wave 1 proves the core loop: SoSoValue evidence -> narrative detection -> signal validation -> index product idea -> AI brief -> launch kit -> execution preview.

Wave 2 turns outputs into product surfaces: public index pages, persisted narrative products, stronger historical validation, richer methodology, shareable launch assets, and deeper SoSoValue coverage.

Wave 3 connects the product layer to execution readiness: SoDEX orderbook checks, slippage estimation, basket routing, wallet-aware flows, and eventual on-chain product surfaces when the execution path is ready.
