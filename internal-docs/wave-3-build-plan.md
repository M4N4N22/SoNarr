# Wave 3 — Build Plan & Demo Script

Branch: `wave3`. Implementation order matches judge priority.

## Checklist

- [x] Branch `wave3` + internal docs
- [x] **P2** Multi-window klines + directional/vol features in enrichment + historical trend layer
- [x] **P3** Fuller asset extraction, ranking, leg provenance UI
- [x] **P1** Score snapshots, lifecycle stages, forward-return API + Lifecycle panel
- [x] **P4** Fill polling, status UX, retry failed legs, trade journal
- [x] **P5** Bounded AI decision assist + rebalance / refinement cues
- [x] Ship notes (`docs/wave-3-updates.md` + this checklist)

## Demo script for judges

1. Open a narrative workspace → **Lifecycle** tab shows stage + score trail.
2. Forward-return table: high-score windows vs low-score windows (SoSoValue klines as evidence).
3. **Index** / product tab: basket legs show extraction reason, evidence count, liquidity, SoDEX route.
4. **Launch** → preview → sign & submit → fills update (not only “Submitted”); retry failed legs only.
5. Decision assist cites lifecycle stats + readiness — no invented fills.

## Key paths

| Area | Paths |
| --- | --- |
| Klines / scoring | `lib/sosovalue/enrichment.ts`, `lib/sonarr/signal-stack.ts` |
| Assets | `lib/sonarr/basket-assets.ts`, narrative `page.tsx` |
| Lifecycle | `lib/sonarr/lifecycle.ts`, `app/api/lifecycle/route.ts`, Lifecycle panel |
| Execution | `lib/sodex/account.ts`, `components/sonarr/sodex-trading-panel.tsx`, `basket-trade-status.tsx`, `app/api/trade-journal` |
| AI | `lib/ai/decision-gemini.ts`, `app/api/ai/decision-assist`, `components/sonarr/ai-decision-assist.tsx` |
| Public ship notes | `docs/wave-3-updates.md` |
