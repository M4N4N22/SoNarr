# SoNarr Wave 3 Updates

Wave 3 proves that SoNarr’s narrative lifecycle improves decisions over time: conviction is snapshotted, validated against SoSoValue kline forward returns, baskets explain why legs were chosen (and stay SoDEX-routable), Evidence→Index→Lifecycle→Launch stay one connected desk, and SoDEX submit continues into fill polling + journal — not just accept-time “Submitted”.

## Shipped

| Capability | Summary |
| --- | --- |
| **Lifecycle panel** | Stage machine `Watching → Heating → Active → Cooling → Faded` from score trajectory |
| **Score snapshots** | JSON store under `data/lifecycle/` + `/api/lifecycle` (+ Upstash when configured) |
| **Forward-return validation** | High vs low conviction vs SoSoValue klines; `anchorMode` separates stored-snapshot proof from illustrative demo anchors |
| **Deeper klines scoring** | 7d + 30d signed returns, volatility, drawdown, consistency; abs-bias removed from historical trend |
| **Evidence analytics** | Recharts KPI strip, conviction radar, layer bars, asset returns, CEX liquidity, SSI Index 24h, ETF/macro, headlines |
| **Routability-first basket ranking** | Probe candidates with CEX turnover + SoDEX symbol match; demote unmapped legs; promote mapped coverage into top-N |
| **Index as bridge tab** | Pipeline strip Evidence→Index→Lifecycle→Launch; legs show 7d / CEX / SoDEX; SSI benchmark overlap; real methodology checklist |
| **SSI index snapshots** | Parse live `change_pct_24h` / `roi_*` fractions (not stale field names) so Index 24h is real, not always 0% |
| **Fill polling** | Post-submit poll of open orders; legs that leave the open book are treated as closed (not stuck unknown) |
| **Retry failed legs** | Re-sign only failed legs; keep successful accepts |
| **Trade journal** | `/api/trade-journal` + Launch strip (honest “accepted / left open-book / still open” copy) |
| **Decision assist** | Bounded Gemini/fallback: hold / size-down / wait / rebalance; human fact sheet (no raw field-name echoing) |
| **Launch desk UX** | Market metrics above Buy; basket contents (weights, $, Buy/Skip, slip) prioritized; no duplicate “View legs” table |
| **Slippage honesty** | Walk asks when depth exists; empty ask book → **0%** estimated impact for resting GTC limits |
| **Network / wallet** | Header wallet connect + Testnet/Mainnet; mainnet confirm; optional `SODEX_NETWORK_LOCK` |
| **Durable store** | Upstash Redis REST when configured; filesystem fallback + browser localStorage mirror |
| **Cancel open orders** | Wallet-signed batch cancel from Launch when open orders are visible |
| **Env template** | Tracked `.env.example` with Wave 3 vars (`UPSTASH_*`, lock, $500 default notional) |

## Architecture add-ons

```txt
Narrative page
  → extract candidates → rank (evidence + CEX + SoDEX routability)
  → signal stack (deeper klines) + Evidence analytics
  → Index packages basket + SSI overlap
  → append lifecycle snapshot → forward-return validation
  → Lifecycle + decision assist

Launch
  → Market (route / depth / slip / CEX)
  → Basket contents → size → Buy
  → EIP-712 per leg → poll open orders → trade journal
  → retry failed / cancel open
```

## Honesty notes

- Lifecycle/trade-journal persistence uses Upstash when `UPSTASH_REDIS_REST_*` is set; otherwise local filesystem (ephemeral on many hosts) plus a browser localStorage mirror.
- Forward-return samples strengthen as snapshots accumulate; thin history is labeled partial.
- When all snapshots are &lt;24h old, forward windows may use **bar-relative illustrative anchors** — UI badges this and never marks those reads as `live` stored-snapshot proof.
- Fill polling watches SoDEX **open orders**. Filled/cancelled legs often drop off that list — SoNarr treats disappearance (after a short grace) as left-book / closed, not as proof of average fill price.
- Thin testnet books: **0% slip** means resting limit impact estimate, not “instant fill at mid.”
- Decision assist never invents fills or prices — same evidence-bound rule as Wave 2 briefs.
- Still research tooling, not financial advice; no auto-trading without wallet confirmation.
- Keep public demos on testnet; use a dedicated deploy + funded wallet before mainnet.

## Demo path

1. Open a narrative → **Evidence** (radar, layers, klines, liquidity, SSI 24h).
2. **Index** → pipeline strip, packaged legs, SSI overlap, methodology.
3. **Lifecycle** → stage, trail, forward returns (note illustrative vs stored anchors) → decision assist.
4. **Launch** → Market strip → basket contents → size → Buy → poll + **Trade journal**; retry/cancel if needed.
