"use client";

import { DivergingBars } from "@/components/charts/diverging-bars";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { MiniTimeline } from "@/components/charts/mini-timeline";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import {
  formatUsdCompact,
  type EtfMarketSnapshot,
  type IndexMarketSnapshot,
  type KlineTrend,
  type MacroEventDay,
} from "@/lib/sosovalue/enrichment";
import { formatRelativeTime, type NewsItem } from "@/lib/sosovalue";

type SoSoValueEnrichmentPanelProps = {
  featuredNews: NewsItem[];
  klineTrends: KlineTrend[];
  indexSnapshots: IndexMarketSnapshot[];
  etfSnapshot?: EtfMarketSnapshot;
  macroEvents: MacroEventDay[];
  narrativeLabel: string;
};

export function SoSoValueEnrichmentPanel({
  featuredNews,
  klineTrends,
  indexSnapshots,
  etfSnapshot,
  macroEvents,
  narrativeLabel,
}: SoSoValueEnrichmentPanelProps) {
  const hasContent =
    featuredNews.length > 0 ||
    klineTrends.length > 0 ||
    indexSnapshots.length > 0 ||
    Boolean(etfSnapshot) ||
    macroEvents.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className="bg-card/85">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          SoSoValue market depth
          <InfoTip label="SoSoValue market depth" side="bottom">
            Extra SoSoValue endpoints — price history, indices, ETF flows, macro calendar, and
            curated research for {narrativeLabel}.
          </InfoTip>
        </CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Charts and snapshots beyond headlines — klines, official indices, ETF flow, and macro
          events tied to this narrative.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {klineTrends.length > 0 ? (
          <section className="rounded-xl border border-border bg-background/60 p-4">
            <DivergingBars
              title="7-day price move"
              titleHint="Signed change from daily klines — green up, red down. Hover for vol/drawdown when present."
              items={klineTrends.map((trend) => ({
                id: trend.symbol,
                label: trend.symbol,
                value: trend.change7dPct ?? 0,
                hint: [
                  `${trend.symbol} ~7d ${
                    trend.change7dPct === undefined
                      ? "n/a"
                      : `${trend.change7dPct > 0 ? "+" : ""}${trend.change7dPct.toFixed(2)}%`
                  }`,
                  trend.change30dPct !== undefined
                    ? `30d ${trend.change30dPct > 0 ? "+" : ""}${trend.change30dPct.toFixed(2)}%`
                    : null,
                  trend.volatility7dPct !== undefined
                    ? `vol ${trend.volatility7dPct.toFixed(1)}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </section>
        ) : null}

        {indexSnapshots.length > 0 ? (
          <section className="rounded-xl border border-border bg-background/60 p-4">
            <HorizontalBars
              items={indexSnapshots.map((snapshot) => ({
                id: snapshot.indexTicker,
                label: snapshot.indexTicker,
                value:
                  snapshot.change24hPct === undefined
                    ? null
                    : Math.min(100, Math.abs(snapshot.change24hPct) * 4),
                suffix: snapshot.change24hPct !== undefined ? `% (${snapshot.change24hPct > 0 ? "+" : ""}${snapshot.change24hPct.toFixed(1)} 24h)` : "",
                hint: `SoSoValue index snapshot for ${snapshot.indexTicker}.`,
              }))}
            />
          </section>
        ) : null}

        {etfSnapshot ? (
          <section className="rounded-xl border border-border bg-background/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                ETF flow · {etfSnapshot.ticker}
              </p>
              <Badge variant="outline">TradFi</Badge>
            </div>
            <HorizontalBars
              items={[
                {
                  id: "inflow",
                  label: "Daily net inflow",
                  value: etfSnapshot.netInflow
                    ? Math.min(100, (etfSnapshot.netInflow / 1_000_000_000) * 20)
                    : null,
                  hint: formatUsdCompact(etfSnapshot.netInflow),
                },
                {
                  id: "cum",
                  label: "Cumulative inflow",
                  value: etfSnapshot.cumInflow
                    ? Math.min(100, (etfSnapshot.cumInflow / 10_000_000_000) * 20)
                    : null,
                  hint: formatUsdCompact(etfSnapshot.cumInflow),
                },
                {
                  id: "traded",
                  label: "Value traded",
                  value: etfSnapshot.valueTraded
                    ? Math.min(100, (etfSnapshot.valueTraded / 2_000_000_000) * 20)
                    : null,
                  hint: formatUsdCompact(etfSnapshot.valueTraded),
                },
              ]}
            />
          </section>
        ) : null}

        {macroEvents.length > 0 ? (
          <section className="rounded-xl border border-border bg-background/60 p-4">
            <MiniTimeline
              title="Macro calendar"
              titleHint="Upcoming macro events that may move risk assets."
              items={macroEvents.slice(0, 4).map((day) => ({
                id: day.date,
                date: day.date,
                title: day.events.slice(0, 2).join(" · "),
                hint: day.events.join(" · "),
              }))}
            />
          </section>
        ) : null}

        {featuredNews.length > 0 ? (
          <section className="rounded-xl border border-border bg-background/60 p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-foreground">Featured research</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {featuredNews.slice(0, 4).map((item) => (
                <a
                  key={item.id}
                  href={item.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border/70 bg-background/50 px-3 py-2 transition hover:border-primary/40"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(item.releaseTime)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-foreground">
                    {item.title}
                  </p>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
