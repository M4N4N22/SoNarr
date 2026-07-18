# SoNarr Wave 3 Updates

Wave 3 proves that SoNarr’s narrative lifecycle improves decisions over time: conviction is snapshotted, validated against SoSoValue kline forward returns, baskets explain why legs were chosen, and SoDEX submit continues into fill polling — not just accept-time “Submitted”.

## Shipped

| Capability | Summary |
| --- | --- |
| **Lifecycle panel** | Stage machine `Watching → Heating → Active → Cooling → Faded` from score trajectory |
| **Score snapshots** | JSON store under `data/lifecycle/` + `/api/lifecycle` |
| **Forward-return validation** | High vs low conviction buckets using SoSoValue daily klines (1d / 7d / 30d) |
| **Deeper klines scoring** | 7d + 30d signed returns, volatility, drawdown, consistency; abs-bias removed |
| **Fuller asset extraction** | Titles/summaries + matched currencies, ranked with CEX turnover + SoDEX routability |
| **Leg provenance UI** | Index tab shows why each asset was included |
| **Fill polling** | Post-submit order lifecycle (filled / partial / open / residual) |
| **Retry failed legs** | Re-sign only failed legs; keep successful accepts |
| **Trade journal** | `/api/trade-journal` appends outcomes for feedback |
| **Decision assist** | Bounded Gemini/fallback: hold / size-down / wait / rebalance from lifecycle + readiness |
| **Network switch** | Launch UI Testnet/Mainnet toggle with mainnet confirm; cookie + optional `SODEX_NETWORK_LOCK` |
| **Durable store** | Upstash Redis REST when configured; filesystem fallback + browser localStorage mirror |
| **Cancel open orders** | Wallet-signed batch cancel from Launch when open orders are visible |

## Architecture add-ons

```txt
Narrative page
  → extract/rank assets → signal stack (deeper klines)
  → append lifecycle snapshot → forward-return validation
  → Lifecycle tab + decision assist

Launch submit
  → EIP-712 per leg → poll /accounts/.../orders
  → trade journal entry → retry failed legs only
```

## Honesty notes

- Lifecycle/trade-journal persistence uses Upstash when `UPSTASH_REDIS_REST_*` is set; otherwise local filesystem (ephemeral on many hosts) plus a browser localStorage mirror.
- Forward-return samples strengthen as snapshots accumulate; thin history is labeled partial.
- Decision assist never invents fills or prices — same evidence-bound rule as Wave 2 briefs.
- Still research tooling, not financial advice; no auto-trading without wallet confirmation.
- Keep public demos on testnet; use a dedicated deploy + funded wallet before mainnet.

## Demo path

1. Open a narrative → **Lifecycle** tab (stage, trail, forward returns).
2. **Index** tab → leg provenance.
3. **Launch** → preview → sign & submit → watch fill polling; retry failed legs if needed.
4. Generate **decision assist** on Lifecycle (cites stage + readiness).
