# Wave 3 — Judge Gap Analysis

Source: SoSoValue Buildathon 2nd-wave remarks (2026-06). Goal: map each critique to a Wave 3 pillar so the last wave proves narrative lifecycle improves decisions over time.

## Consensus gaps

| Judge / source | What they said is missing | Wave 3 pillar |
| --- | --- | --- |
| **SoSoValue** | Evidence that narrative lifecycle improves decisions over time | **P1** Lifecycle snapshots + forward-return validation |
| **jzddd** | No real SoDEX execution loop (preview only); limited quantitative alpha; AI as synthesis only; no performance feedback | **P2** Statistical klines; **P4** Fill polling; **P5** Decision assist + journal |
| **BlessinSum** | Stronger live scoring with historical klines; fuller asset extraction from narratives | **P2** Multi-window klines; **P3** Evidence-ranked asset extraction |
| **MuhammadBa_2024** | Performance validation + narrative lifecycle intelligence | **P1** Stages + hit-rate / forward PnL |
| **Wave 2 docs** | Fill polling, retry failed legs, persistence, score-delta rebalance | **P4** + **P1** persistence + **P5** rebalance cues |

Positive remarks to **preserve** (do not regress):

- Honest pending / unavailable instead of fake scores
- Exact SoDEX symbol matching (no fuzzy routing)
- CEX context from SoSoValue pairs beside SoDEX routability
- EIP-712 wallet signing; secrets server-side only
- SoSoValue as evidence layer; AI does not invent market facts

## Pillar map

1. **P1 — Narrative lifecycle + performance validation** — Score history, stage machine (`Watching → Heating → Active → Cooling → Faded`), forward returns from SoSoValue klines when conviction was high vs low.
2. **P2 — Stronger historical scoring** — Multi-window daily klines, signed returns, volatility, drawdown, consistency; fix abs-return bias.
3. **P3 — Fuller asset extraction** — Titles/summaries + matched currencies, resolve against live `/currencies`, rank by evidence × liquidity × routability, show provenance.
4. **P4 — Post-submit SoDEX loop** — Poll fills, show residual size, retry failed legs only, append trade journal.
5. **P5 — Bounded AI decision assist** — Hold / size-down / wait / rebalance from lifecycle + readiness JSON only; wire score-delta rebalance cues.

## Explicit non-goals (Wave 3)

- Smart contracts, custody, pooled trading
- Auto-execution without wallet confirmation
- Multi-tenant SaaS database
- Fake fills or invented liquidity
- Public marketing index pages (stretch only if time remains)

## Honesty constraints (deploy)

JSON lifecycle store under `data/lifecycle/` works for local/demo. On ephemeral hosts (e.g. Vercel), filesystem writes may not persist across instances — document that and keep client `localStorage` mirror for operator sessions.
