# SoNarr

Narrative sonar for one-person on-chain finance desks.

SoNarr connects **SoSoValue market intelligence** to **SoDEX spot execution** in a single operator workflow: detect a narrative, validate it against live API evidence, size a weighted basket, review on-chain route readiness, and optionally submit wallet-signed limit orders on SoDEX testnet or mainnet.

This is not a generic news reader or an AI chatbot. Evidence comes from SoSoValue and SoDEX first; Gemini synthesizes only after structured data exists. The UI is intentionally honest when APIs fail, rate-limit, or return partial payloads.

**Docs:** [Wave 1](./docs/wave-1-updates.md) · [Wave 2](./docs/wave-2-updates.md) · [Wave 3](./docs/wave-3-updates.md)

## Product loop

```txt
SoSoValue (evidence)                    SoDEX (execution)
  news · search · featured                  symbols · orderbooks · tickers
  snapshots · klines · pairs                account balances · open orders
  indices · ETF · macro · sector            EIP-712 batchNewOrder (wallet-signed)
           \                                       /
            v                                     v
         Narrative Radar (/radar)  --------->  SoDEX entry (/sodex)
                    |                              |
                    v                              v
         Narrative workspace (/narratives/[id])
           Overview · Evidence · Index · Lifecycle · Launch
                    |
                    +-- Evidence analytics → Index packages basket → Lifecycle validates over time
                    +-- Launch: Market → basket contents → size → Buy → sign (per leg)
                        → fill poll · retry failed · cancel open · trade journal
```

Primary navigation is **Radar** (find themes) and **SoDEX** (route and trade the current basket).

## What is built

### Wave 1

Landing, Narrative Radar, narrative workspace foundation, multi-layer signal stack, Gemini narrative brief, Launch Room copy kit, endpoint diagnostics, live-data-first behavior.

### Wave 2

- **SoSoValue enrichment layer** — shared HTTP client, normalized parsers, 14+ documented endpoints (feeds, currencies, pairs, indices, ETF, macro).
- **Eight-layer signal stack** — each layer capped or marked pending/unavailable when live data is missing.
- **SoDEX execution readiness** — per-leg symbol mapping, orderbook depth, slippage where ask liquidity exists, CEX pair context from SoSoValue.
- **Wallet-signed basket trading** — wagmi on ValueChain, account snapshot, dry-run preview, EIP-712 `signTypedData` in wallet, per-leg submit with structured results.
- **Operator-safe defaults** — testnet-first config, editable basket notional, confirmation dialogs before connect/disconnect, size changes, and live submit.
- **AI execution brief** — Gemini summary bounded to parsed readiness JSON only.

### Wave 3 (current)

- **Narrative lifecycle** — score snapshots, stage machine, forward-return validation vs SoSoValue klines with honest `anchorMode` (stored vs illustrative).
- **Deeper historical scoring** — 7d/30d signed returns, volatility, drawdown, consistency.
- **Evidence analytics** — live charts for conviction, layers, returns, CEX liquidity, SSI Index 24h, ETF/macro.
- **Routability-first baskets** — rank legs with evidence + CEX turnover + SoDEX symbol match; prefer mapped coverage in top-N.
- **Index as bridge** — Evidence → packaged weights/provenance/SSI overlap → Lifecycle stage + Launch readiness (not a detached product mock).
- **Post-submit loop** — fill polling (open-book aware), retry failed legs, cancel open orders, trade journal.
- **Decision assist** — bounded hold / size-down / wait / rebalance from lifecycle + readiness (human copy, no invented fills).
- **Launch desk** — Market metrics above Buy; basket contents visible (weights, notional, Buy/Skip, slip); header wallet + network switch.
- **Operator controls** — mainnet confirm, balance-aware sizing, optional Upstash (`UPSTASH_REDIS_REST_*`), `SODEX_NETWORK_LOCK`, tracked `.env.example`.

Full changelogs: [docs/wave-2-updates.md](./docs/wave-2-updates.md) · [docs/wave-3-updates.md](./docs/wave-3-updates.md).

## Architecture

Next.js App Router (TypeScript), server-side integration modules, wagmi/viem for wallet connect and signing. **All SoSoValue, Gemini, and SoDEX secrets stay on the server** unless the user signs with their own wallet.

```txt
Browser
  SiteHeader: Radar | SoDEX
  Narrative workspace (sidebar + panel)
  SodexTradingPanel (connect → preview → confirm → sign per leg)

Next.js routes
  /radar                          Live radar
  /narratives/[id]?tab=launch     Workspace + SoDEX tab
  /sodex                          Redirect to top narrative Launch tab
  /api/radar                      Radar JSON
  /api/execution/readiness        Basket readiness (notional-aware)
  /api/sodex/account/[address]/*  Balances, orders, state, api-keys
  /api/sodex/trade/basket         Dry-run plan build
  /api/sodex/trade/basket/submit  Proxies wallet-signed batch order
  /api/ai/narrative-brief         Gemini (evidence-bound)
  /api/ai/execution-brief         Gemini (readiness-bound)
  /api/ai/decision-assist         Gemini (lifecycle + readiness)
  /api/lifecycle                  Score snapshots + forward-return validation
  /api/trade-journal              Post-submit outcome journal

Server libraries
  lib/sosovalue/client.ts         Shared fetch, auth, response normalization
  lib/sosovalue/enrichment.ts     Klines (7d/30d stats), pairs, ETF, macro, featured
  lib/sosovalue.ts                Radar + narrative engine
  lib/sodex/                      Market, account, readiness, signing, trading, order-filters
  lib/sonarr/basket-assets.ts     Evidence + CEX + SoDEX-routability ranking + provenance
  lib/sonarr/lifecycle.ts         Stages, snapshots, forward-return validation (anchorMode)
  lib/sonarr/signal-stack.ts      Multi-layer conviction model
  components/sonarr/evidence-analytics.tsx  Evidence charts (recharts)
  lib/ai/decision-gemini.ts       Bounded hold/size-down/wait/rebalance assist
  lib/types/data-source.ts        EndpointStatus + live/partial/unavailable
```

## SoSoValue integration

SoSoValue is the **evidence and liquidity context layer**. SoNarr does not invent narrative scores from LLMs; it ranks category probes from live search and feed data, then enriches each narrative with market structure.

### Endpoints in production use

| Area | Endpoint | Role |
| --- | --- | --- |
| Feeds | `GET /news/hot` | Radar tape + news heat |
| Feeds | `GET /news/search` | Category narrative probes |
| Feeds | `GET /news/featured` | Radar research strip |
| Market | `GET /currencies` | Symbol → currency ID |
| Market | `GET /currencies/{id}/market-snapshot` | Momentum layer |
| Market | `GET /currencies/{id}/klines` | Historical trend (7d/30d signed stats) |
| Market | `GET /currencies/{id}/pairs` | CEX liquidity vs SoDEX route |
| Sector | `GET /currencies/sector-spotlight` | Sector alignment |
| Indices | `GET /indices`, `/constituents`, `/market-snapshot` | Index relevance |
| ETF | `GET /etfs/{ticker}/market-snapshot` | TradFi flow (Bitcoin ETF) |
| Macro | `GET /macro/events` | Catalyst calendar |

Official reference: [SoSoValue API documentation](https://sosovalue.gitbook.io/soso-value-api-doc)

### Production patterns (SoSoValue)

- **Single shared client** (`lib/sosovalue/client.ts`) — auth header injection, timeout-safe fetch, structured `EndpointStatus` on every call.
- **Defensive parsing** — handles array and object response shapes (e.g. currency list payloads) without silently returning empty product state.
- **Parallel enrichment** — narrative page loads snapshots, pairs, klines, and macro concurrently; failures degrade per-layer, not whole-page.
- **React `cache()` on radar** — deduplicates hot feed + search fan-out within a request.
- **No client-side API keys** — browser never sees `SOSOVALUE_API_KEY`.
- **Honest UI states** — `live` / `partial` / `unavailable` rollups; endpoint diagnostics surface HTTP status, error type, and parse failures in development.

## SoDEX integration

SoDEX is the **on-chain spot execution layer**. SoNarr maps narrative basket weights to SoDEX USDC markets, estimates readiness from live orderbooks and tickers, and supports **wallet-signed** limit buys submitted **one leg at a time** so a paused market does not block the rest of the basket.

Official reference: [SoDEX API documentation](https://sodex.com/documentation/api)

### Read path (unsigned, server-proxied)

| Step | SoDEX API | Purpose |
| --- | --- | --- |
| 1 | `GET /markets/symbols` | Resolve `AAVE/USDC`-style markets (incl. testnet `v*` tokens) |
| 2 | `GET /markets/{symbol}/orderbook` | Ask depth, slippage simulation |
| 3 | `GET /markets/tickers` | Reference prices when books are one-sided (common on testnet) |
| 4 | Internal readiness | Weighted slippage, route table, tradable leg count |

`GET /api/execution/readiness?assets=AAVE:30,UNI:25&notionalUsd=500` — notional-aware leg sizing.

### Account path (unsigned, address-scoped)

- `GET /accounts/{address}/balances` — spot balances (e.g. testnet `vUSDC`)
- `GET /accounts/{address}/orders` — open orders
- `GET /accounts/{address}/state` — account metadata
- `GET /accounts/{address}/api-keys` — match wallet to SoDEX signing key name

Proxied at `/api/sodex/account/[address]/*` so the browser never calls SoDEX origins directly with custom headers.

### Trade path (wallet-signed, production-intended)

1. User connects wallet on Launch tab (confirmation dialog); SoNarr auto-prompts **ValueChain Testnet (138565)** when needed.
2. **Preview orders** — `POST /api/sodex/trade/basket` with `dryRun: true` builds limit prices from each market’s **last trade** (not stale/wide testnet asks); quantities respect `stepSize`, `tickSize`, and `minNotional`.
3. **Confirm & submit** — confirmation dialog shows the full order plan; user approves **one EIP-712 signature per leg**; `POST /api/sodex/trade/basket/submit` proxies each signed order to SoDEX `POST /trade/orders/batch`. **Private keys never leave the wallet.**

Per-leg results distinguish **submitted**, **cancel-only** (testnet maintenance), **signature errors**, and other rejections — see Launch tab status panel.

Optional server env (`SODEX_API_*`) exists only as an **operator fallback** for scripted demos — not required for the normal Launch flow.

### Basket asset selection (honest constraints)

- Narrative defaults (e.g. DeFi → AAVE, UNI, MKR) on **mainnet intent**.
- **Testnet** uses a curated proxy list — SoDEX testnet lists ~32 markets; many CEX names are not listed. Ranking **prefers SoDEX-mapped legs** so Launch stays executable.
- Category/index tickers from news (e.g. `DEFI`, `MAG7.SSI`) are **filtered out** of baskets; exact symbol matching prevents `DEFI` → `DEFIssi` fuzzy routes.
- SSI Index 24h uses live SoSoValue fields (`change_pct_24h` as a fraction → percent points).

### Testnet operator defaults

- `SODEX_NETWORK=testnet` (default)
- Default basket notional **$500**; UI cap **$950** of **$1000** faucet vUSDC (fee headroom)
- Limit-order prices use **last trade** from SoDEX tickers (aligned to `tickSize` / `pricePrecision`) — not orderbook asks, which are often stale on testnet
- Each leg is signed and submitted separately; **cancel-only mode** on one symbol does not block others

## Live data honesty

SoNarr does **not** backfill failed API responses with demo narratives, prices, or scores.

Every external call produces an `EndpointStatus` (name, HTTP status, error type, duration, item count). Narrative and radar views roll up to:

- **live** — required data parsed successfully
- **partial** — some layers usable, some failed
- **unavailable** — no trustworthy evidence base

Signal stack layers show **Pending verification** or **Unavailable** instead of inflated scores. Execution legs distinguish **OK**, **Limit** (routable, thin book), and **Missing** (no market).

## AI boundaries

Gemini receives **only** structured fields already computed (scores, weights, readiness legs, evidence bullets). Prompts forbid inventing prices, assets, or guarantees. Briefs cache in memory for 30 minutes — content only, never secrets.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required:

```bash
SOSOVALUE_API_KEY=your_sosovalue_key
GEMINI_API_KEY=your_gemini_key
```

SoDEX (defaults work for read + wallet submit on testnet):

```bash
SODEX_NETWORK=testnet
# SODEX_NETWORK_LOCK=testnet
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# Optional overrides:
# SODEX_BASKET_NOTIONAL_USD=500
# SODEX_API_BASE_URL=https://testnet-gw.sodex.dev/api/v1/spot
```

Optional operator-only server submit (not needed for wallet flow):

```bash
# SODEX_API_KEY_NAME=default
# SODEX_API_PRIVATE_KEY=0x...
# SODEX_ACCOUNT_ID=12345
```

**Do not** expose integration keys via `NEXT_PUBLIC_*`.

### Production-grade checklist

| Step | Command / practice |
| --- | --- |
| Typecheck + build | `npm run build` before deploy |
| Lint | `npm run lint` |
| Secrets | Server env only; rotate keys per environment |
| Network | Set `SODEX_NETWORK=mainnet` only with funded mainnet account + reviewed basket |
| Notional | Size basket ≤ spot balance; testnet cap enforced in UI |
| Submit | Preview orders → confirm dialog → one wallet signature per leg |
| Observability | Endpoint diagnostics on partial/unavailable radar loads |
| Rate limits | Radar cache + brief cache reduce duplicate upstream calls |

## Scope and limits (honest)

- Web2 prototype — no smart contracts, no custody. Wave 3 adds lifecycle/trade-journal persistence (Upstash when set; otherwise filesystem may be ephemeral on serverless).
- Research and execution-readiness tooling — **not investment advice**.
- Testnet liquidity is thin; empty ask books report **0%** estimated resting-limit impact, not guaranteed fills.
- Fill polling tracks **open orders**; disappearance from that list is treated as left-book / closed, not average fill price.
- Mainnet submit requires real spot balance, correct chain, and operator judgment.

## Roadmap

| Wave | Focus |
| --- | --- |
| **1 (done)** | SoSoValue evidence → narrative → index idea → brief → launch kit |
| **2 (done)** | SoDEX readiness + wallet-signed trading, enrichment APIs, execution brief, trading UI |
| **3 (current)** | Lifecycle + forward returns, Evidence analytics, routability-first Index, Launch desk + fill/journal loop, decision assist |
