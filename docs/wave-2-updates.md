# SoNarr Wave 2 Updates

Wave 2 turns SoNarr from a narrative research prototype into an **evidence-bound execution workstation**: SoSoValue supplies market structure and CEX context; SoDEX supplies on-chain spot route checks and wallet-signed basket submission. The implementation prioritizes production habits—server-side secrets, structured error surfaces, dry-run before submit, and UI states that do not pretend upstream failures succeeded.

- SoSoValue API: [https://sosovalue.gitbook.io/soso-value-api-doc](https://sosovalue.gitbook.io/soso-value-api-doc)
- SoDEX API: [https://sodex.com/documentation/api](https://sodex.com/documentation/api)

## Wave 2 outcome

### Shipped

| Capability | Summary |
| --- | --- |
| **SoSoValue client layer** | Shared authenticated fetch, response normalization, `EndpointStatus` on every call |
| **14+ SoSoValue endpoints** | Feeds, currencies, pairs, klines, indices, ETF, macro, sector spotlight |
| **Eight-layer signal stack** | News → momentum → trend → sector → index → ETF → macro → execution |
| **CEX liquidity context** | `GET /currencies/{id}/pairs` cross-checks SoDEX legs (pair count, turnover, stable quotes) |
| **SoDEX market module** | Symbols, orderbooks, tickers; exact asset matching; testnet `vUSDC` quote normalization |
| **Basket readiness engine** | Notional-aware legs, slippage when ask depth exists, ticker fallback for limit pricing |
| **Wallet-signed trading** | EIP-712 `signTypedData` in browser; per-leg submit to `/trade/orders/batch`; API key matched to wallet |
| **Launch workflow** | Connect → size basket → preview → **confirmation dialogs** → sign one leg at a time |
| **Trade status UX** | Per-leg results (submitted, cancel-only, signature error); in-progress signing banner |
| **Account visibility** | Balances, orders, state, api-keys via server routes |
| **AI execution brief** | Gemini bounded to readiness JSON; 30-min cache |
| **Radar performance** | React `cache()` + parallel category searches |
| **Trading UI** | Flat terminal aesthetic; Radar \| SoDEX header; confirmation dialogs; leg status panel |

### Explicitly out of scope

- Smart contracts, custody, or pooled trading
- Automatic execution without user confirmation
- Database persistence or multi-tenant account management
- Guaranteed fill / order lifecycle polling (Wave 3 direction)
- Financial advice

## Architecture (Wave 2)

```txt
                    ┌─────────────────────────────────────┐
                    │           Browser (client)           │
                    │  Radar | SoDEX nav · wagmi wallet    │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────v──────────────────────┐
                    │         Next.js App Router           │
                    │  RSC pages · Route Handlers · cache()  │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           v                       v                       v
   lib/sosovalue/*           lib/sodex/*            lib/sonarr/*
   evidence + pairs          market + trade         baskets + signals
           │                       │
           v                       v
   openapi.sosovalue.com     testnet/mainnet-gw.sodex.dev
```

Secrets (`SOSOVALUE_API_KEY`, `GEMINI_API_KEY`, optional `SODEX_API_*`) exist **only** in server environment variables.

## SoSoValue integration (depth)

### Endpoint map

| Endpoint | Product use |
| --- | --- |
| `GET /news/hot` | Radar hot tape; news heat layer |
| `GET /news/search` | Category probes (AI, DeFi, RWA, …) |
| `GET /news/featured` | Radar research strip; narrative evidence |
| `GET /currencies` | Resolve ticker → currency ID for enrichment |
| `GET /currencies/{id}/market-snapshot` | Market momentum scores |
| `GET /currencies/{id}/klines` | ~7d trend layer |
| `GET /currencies/{id}/pairs` | CEX pair count, turnover, stable-quote coverage |
| `GET /currencies/sector-spotlight` | Sector alignment |
| `GET /indices` | Index discovery |
| `GET /indices/{ticker}/constituents` | Constituent overlap with basket |
| `GET /indices/{ticker}/market-snapshot` | Index performance context |
| `GET /etfs/{ticker}/market-snapshot` | Bitcoin ETF narrative (IBIT flows) |
| `GET /macro/events` | Macro catalyst calendar |

### Production patterns

1. **Normalized client** — `lib/sosovalue/client.ts` centralizes auth, timing, and parse guards. Array-shaped `data` payloads (currency list) no longer collapse to empty CEX coverage.
2. **Per-endpoint status** — failures become `EndpointStatus` objects with `errorType` (`network_error`, `invalid_response`, HTTP class) instead of silent `{}`.
3. **Parallel narrative enrichment** — `page.tsx` loads constituents, snapshots, pairs, klines, ETF, macro concurrently; partial data still renders with honest layer caps.
4. **Evidence-bound narratives** — basket assets from `resolveNarrativeBasketAssets()` prioritize narrative defaults + news tickers; **exclude** category/index symbols (`DEFI`, `MAG7SSI`, etc.).
5. **Rate-limit awareness** — radar `cache()` and brief caches reduce duplicate Gemini/SoSoValue calls during demos.

### What SoSoValue does *not* do here

- It does not place trades or sign orders.
- It does not replace SoDEX for on-chain spot routing.
- Pair data describes **off-chain CEX liquidity context**, not executable SoDEX depth.

## SoDEX integration (depth)

### Network configuration

```bash
SODEX_NETWORK=testnet   # default — testnet-gw.sodex.dev
# SODEX_NETWORK=mainnet
# SODEX_API_BASE_URL=...   # optional override
# SODEX_BASKET_NOTIONAL_USD=500
```

Testnet spot stablecoin displays as **`vUSDC`**. Funding wallet faucet (~1000 vUSDC) must be transferred to **Spot** before trading UI shows balance.

### Read path — execution readiness

```txt
GET /markets/symbols
  → resolveSpotSymbol(asset) — exact match on base/display; USDC/vUSDC quotes

GET /markets/{symbol}/orderbook?limit=20
  → ask depth, slippage simulation (market-buy model)

GET /markets/tickers
  → reference price when ask side empty (limit-order model)

Output: BasketExecutionReadiness
  legs[].tradable, legNotionalUsd, slippagePct?, displayName, message
  tradableCount, weightedSlippagePct, endpoints[]
```

API: `GET /api/execution/readiness?assets=AAVE:30,UNI:25&notionalUsd=500`

UI distinguishes:

- **OK** — ask depth supports slippage estimate
- **Limit** — routable via ticker/bid reference; slippage N/A
- **Missing** — no SoDEX market or price

### Account path — wallet visibility

| SoDEX API | SoNarr route |
| --- | --- |
| `GET /accounts/{address}/balances` | `/api/sodex/account/[address]/balances` |
| `GET /accounts/{address}/orders` | `/api/sodex/account/[address]/orders` |
| `GET /accounts/{address}/state` | `/api/sodex/account/[address]/state` |
| `GET /accounts/{address}/api-keys` | `/api/sodex/account/[address]/api-keys` |

Used to display spot balance, open orders, and resolve signing key name (`findWalletApiKeyName`).

### Trade path — wallet-signed (primary)

```txt
1. buildBasketTradePlan(readiness)
     → limit prices from lastTradePrice (ticker), quantized to tickSize / pricePrecision
     → quantities from notional / price, floored to stepSize
     → skip non-tradable / HALT symbols with reason

2. POST /api/sodex/trade/basket  { dryRun: true, assets, totalNotionalUsd }
     → returns plan + readiness (no credentials)

3. User confirms in dialog; for each leg:
     getBatchNewOrderPayloadHash + walletClient.signTypedData (EIP-712, domain spot, chain 138565)
     POST /api/sodex/trade/basket/submit { single-order plan, signature, nonce, X-API-Chain }

4. UI shows per-leg status: submitted | cancel-only | signature error | other
```

Implementation: `lib/sodex/signing.ts`, `trading.ts`, `order-filters.ts`, `trading-errors.ts`; UI: `SodexTradingPanel`, `BasketTradeStatus`, `ConfirmDialog`.

**Security model:** signing key material stays in the user wallet / SoDEX-registered API key flow. SoNarr never receives the user's private key. Server `SODEX_API_PRIVATE_KEY` is optional fallback for operator scripts only.

### SoDEX order validation (Wave 2 hardening)

| Issue | Mitigation |
| --- | --- |
| Wrong batch endpoint | `POST /trade/orders/batch` (not `/trade/orders`) |
| Invalid signature format | EIP-712 `signTypedData` + SoDEX `0x01` signature prefix |
| Chain mismatch | wagmi ValueChain Testnet (138565); `ensureSodexChain()` before sign |
| `quantity is invalid` | Floor to symbol `stepSize`; enforce `minQuantity` / `minNotional` |
| `price is invalid` | Price from **last trade** string, not wide testnet asks; tick + precision alignment |
| Whole batch fails on one symbol | Submit **one order per signed request** |
| Cancel-only maintenance | Classify error; show per-leg hint; other legs still attempt |
| Bad recovery ID (one leg) | Classify as signature error; user stays on ValueChain and re-approves popup |

Headers on submit: `X-API-Key`, `X-API-Sign`, `X-API-Nonce`, `X-API-Chain`.

### Operator fallback (optional)

```bash
SODEX_API_KEY_NAME=default
SODEX_API_PRIVATE_KEY=0x...
SODEX_ACCOUNT_ID=12345
```

`submitBasketTradePlan()` can submit with server credentials when configured. Launch tab defaults to wallet path and does not require these variables.

### Testnet honesty

| Topic | Reality in SoNarr |
| --- | --- |
| Market count | ~32 testnet pairs vs broader mainnet intent |
| DeFi basket | Proxies (AAVE, UNI, LINK, ETH, AVAX) when on testnet |
| One-sided books | Common; limit routing uses ticker/last — not hidden |
| Limit price | Uses last trade, not orderbook ask (avoids stale testnet quotes) |
| Cancel-only mode | SoDEX maintenance; new orders paused per symbol — retry later |
| Slippage N/A | Expected on thin testnet asks; separate from routable status |
| Notional | Default $500; max $950 UI cap vs $1000 faucet |

## Signal stack (Wave 2 layers)

```txt
1. News heat           /news/hot + /news/search
2. Market momentum     /currencies/{id}/market-snapshot
3. Historical trend    /currencies/{id}/klines (~7d)
4. Sector alignment    /currencies/sector-spotlight
5. Index relevance     /indices/.../constituents + snapshots
6. TradFi flow         /etfs/IBIT/market-snapshot (bitcoin-etf)
7. Macro catalysts     /macro/events
8. Execution readiness SoDEX orderbook + SoSoValue pairs
```

Layers 1–7 require SoSoValue. Layer 8 requires SoDEX + pairs. Any missing upstream data → layer score capped; status **Partial**, **Pending**, or **Unavailable**.

## Code surfaces (Wave 2)

```txt
lib/sodex/
  config.ts              Network, URLs, chain IDs, optional server credentials
  client.ts              GET/POST + EndpointStatus
  market.ts              Symbols, orderbook, tickers, symbolAcceptsNewOrders
  account.ts             Balances, orders, state, api-keys
  readiness.ts           getBasketExecutionReadiness()
  signing.ts             EIP-712 batchNewOrder (viem signTypedData)
  trading.ts             Plan build, per-leg wallet submit, batch error parsing
  order-filters.ts       tickSize / stepSize / last-trade limit pricing
  trading-errors.ts      Cancel-only, signature, leg status classification
  basket-notional.ts     Testnet caps, defaults, clamp helpers

lib/wagmi/
  sodex-chains.ts        ValueChain testnet/mainnet definitions
  ensure-sodex-chain.ts  Auto switch / add chain before signing

lib/sosovalue/
  client.ts              Auth, fetch, responsePayload normalization
  enrichment.ts          Pairs, klines, ETF, macro, featured

lib/sonarr/
  basket-assets.ts       Narrative basket resolution + testnet proxies
  signal-stack.ts        Layer builders + honest caps

app/
  sodex/page.tsx         Entry → top narrative ?tab=launch
  narratives/[id]/       Sidebar workspace + panel modules
  api/execution/readiness/
  api/sodex/**

components/
  layout/site-header.tsx     Radar | SoDEX
  ui/confirm-dialog.tsx      Connect / disconnect / notional / submit confirms
  sonarr/sodex-trading-panel.tsx
  sonarr/basket-trade-status.tsx
  sonarr/execution-preview-section.tsx
  sonarr/basket-order-plan-table.tsx
  providers/web3-provider.tsx
```

Removed / superseded: duplicate `lib/sodex.ts` barrel, per-page nav headers, gradient marketing shells on app routes.

## Narrative workspace

| Section | Purpose |
| --- | --- |
| **Overview** | Stats, workflow strip, brief |
| **Evidence** | Headlines, signal stack, SoSoValue enrichment |
| **Index** | Weights, methodology, risk — no SoDEX mixed in |
| **Launch** | Route check, wallet trading (dialogs + per-leg status), launch room, AI briefs |

URL: `/narratives/[id]?tab=launch` syncs with header **SoDEX** active state.

## UI direction (Wave 2 refresh)

Trading-terminal patterns (Binance / Polymarket inspired):

- Flat `#0b0e11` background — no page gradients
- Panel separation via background tone, not heavy borders
- `StatGrid` / tabular numbers for metrics
- Compact tables for route and order plan
- Minimal copy; tooltips only where metrics need context

## Environment

```bash
# Required
SOSOVALUE_API_KEY=
GEMINI_API_KEY=

# SoDEX (read + wallet submit)
SODEX_NETWORK=testnet

# Optional
SODEX_BASKET_NOTIONAL_USD=500
SOSOVALUE_API_BASE_URL=https://openapi.sosovalue.com/api/v1
SODEX_API_BASE_URL=https://testnet-gw.sodex.dev/api/v1/spot

# Operator fallback only
# SODEX_API_KEY_NAME=
# SODEX_API_PRIVATE_KEY=
# SODEX_ACCOUNT_ID=
```

## Production-grade runbook

### Local / CI

```bash
npm install
npm run lint
npm run build
```

Build must pass before deploy — App Router pages, route handlers, and wallet client components are type-checked together.

### Deploy

1. Inject secrets via platform env (Vercel, Docker, etc.) — never commit `.env`.
2. Set `SODEX_NETWORK` explicitly per environment.
3. Confirm `SOSOVALUE_API_KEY` quota for parallel narrative enrichment.
4. Smoke test: `/radar` → narrative → **SoDEX** tab → preview (dry-run) only until wallet funded.

### Operator testnet demo

1. Faucet vUSDC to connected wallet; transfer **Funding → Spot** on SoDEX testnet.
2. Set basket size ≤ available spot (default $500; cap $950). Confirm dialog if changing size after preview.
3. Connect wallet (confirm dialog) — verify `vUSDC` balance, API key name, and **ValueChain Testnet (138565)**.
4. **Preview orders** → review plan table (skipped legs show reasons).
5. **Sign & submit** → confirm dialog with full plan → approve **one signature per leg**.
6. Read per-leg status:
   - **Submitted** — order accepted
   - **Cancel-only** — SoDEX maintenance on that market; retry later
   - **Signature error** — stay on ValueChain and re-approve the wallet popup
7. If legs show **Limit** in readiness, slippage N/A is expected — GTC limits still routable.

### Mainnet (when ready)

- Review basket assets against live `/markets/symbols`.
- Size notional against real spot balance and fee buffer.
- Verify wallet-registered API key on SoDEX mainnet gateway.
- Treat AI briefs and signal scores as research aids only.

## Demo narratives (recommended)

| Narrative | SoSoValue highlights | SoDEX notes |
| --- | --- | --- |
| **DeFi** | Rich pairs data; sector news | Testnet proxies; ETH leg often has ask depth |
| **Bitcoin ETF** | IBIT ETF snapshot + BTC pairs | BTC/USDC on testnet |
| **AI** | Sector spotlight + klines | Use workspace → Launch for route table |

## Wave 3 direction

- Order fill polling and post-submit status UX
- Retry failed legs without re-signing successful ones
- Persisted baskets, public index pages, shareable launch assets
- Deeper rebalance triggers from live score deltas
- Mainnet hardening checklist (monitoring, alerting on endpoint failure rates)
