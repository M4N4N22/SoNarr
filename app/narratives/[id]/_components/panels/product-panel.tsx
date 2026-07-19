"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  Link2,
  Package,
  PieChart,
  Rocket,
  Scale,
  SlidersHorizontal,
} from "lucide-react";

import { PageSection } from "@/components/layout/page-section";
import { RiskMeter } from "@/components/charts/risk-meter";
import { Badge } from "@/components/ui/badge";
import { formatUsdCompact } from "@/lib/sosovalue/enrichment";
import type { NarrativeWorkspaceProps, NarrativeWorkspaceTab } from "../types";

type ProductPanelProps = {
  data: NarrativeWorkspaceProps;
  onTabChange: (tab: NarrativeWorkspaceTab) => void;
};

function formatPct(value?: number) {
  if (value === undefined) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function TabLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:opacity-80"
    >
      {label}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

export function ProductPanel({ data, onTabChange }: ProductPanelProps) {
  const {
    narrative,
    weightedAssets,
    methodology,
    riskLevel,
    assetProvenance,
    enrichment,
    liquidityContext,
    executionReadiness,
    lifecycle,
    evidenceSummary,
    signalStack,
    relevantIndexTickers,
    indexOverlaps,
  } = data;

  const liveLayers = signalStack.layers.filter((layer) => layer.dataMode === "Live").length;
  const topWeight = weightedAssets[0]?.weight ?? 0;
  const provenanceByAsset = new Map(
    assetProvenance.map((item) => [item.asset.toUpperCase(), item]),
  );
  const trendByAsset = new Map(
    enrichment.klineTrends.map((trend) => [trend.symbol.toUpperCase(), trend]),
  );
  const liquidityByAsset = new Map(
    liquidityContext.assets.map((asset) => [asset.symbol.toUpperCase(), asset]),
  );
  const readinessByAsset = new Map(
    executionReadiness.legs.map((leg) => [leg.asset.toUpperCase(), leg]),
  );
  const overlapsByIndex = relevantIndexTickers.map((ticker) => ({
    ticker,
    snapshot: enrichment.indexSnapshots.find(
      (item) => item.indexTicker.toLowerCase() === ticker.toLowerCase(),
    ),
    assets: indexOverlaps
      .filter((item) => item.indexTicker.toLowerCase() === ticker.toLowerCase())
      .map((item) => item.asset),
  }));

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          Evidence → Index → Lifecycle → Launch
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Evidence
            </p>
            <p className="mt-1 text-sm tabular-nums text-foreground">
              {narrative.score.toFixed(0)} signal · {narrative.confidence.toFixed(0)} conf
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {liveLayers}/{signalStack.layers.length} live layers · {evidenceSummary.headlineCount}{" "}
              headlines
            </p>
            <div className="mt-2">
              <TabLink label="Review Evidence" onClick={() => onTabChange("evidence")} />
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              Index
            </p>
            <p className="mt-1 text-sm tabular-nums text-foreground">
              {weightedAssets.length} legs · top {topWeight}%
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {methodology[0]?.replace(/\.$/, "") ?? "Weighted from narrative evidence"}
            </p>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              Lifecycle
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{lifecycle.stage}</Badge>
              {lifecycle.validation?.rebalanceSuggested ? (
                <Badge variant="muted">Rebalance cue</Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {lifecycle.validation?.scoreDeltaPct !== undefined
                ? `Conviction Δ ${lifecycle.validation.scoreDeltaPct > 0 ? "+" : ""}${lifecycle.validation.scoreDeltaPct.toFixed(1)}%`
                : `${lifecycle.snapshots.length} snapshots`}
            </p>
            <div className="mt-2">
              <TabLink label="Open Lifecycle" onClick={() => onTabChange("lifecycle")} />
            </div>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Rocket className="h-3.5 w-3.5 text-muted-foreground" />
              Launch
            </p>
            <p className="mt-1 text-sm tabular-nums text-foreground">
              {executionReadiness.tradableCount}/{executionReadiness.totalLegs} SoDEX routable
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {executionReadiness.network} · research size then buy
            </p>
            <div className="mt-2">
              <TabLink label="Buy on Launch" onClick={() => onTabChange("launch")} />
            </div>
          </div>
        </div>
      </section>

      <PageSection
        icon={PieChart}
        title={`${narrative.label} basket`}
        description="Each leg is packaged from Evidence (hits, returns, liquidity) with SoDEX routability for Launch."
      >
        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted">
          {weightedAssets.map((leg, index) => (
            <div
              key={leg.asset}
              className="h-full bg-primary/80 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${leg.weight}%`,
                opacity: 1 - index * 0.12,
              }}
              title={`${leg.asset} ${leg.weight}%`}
            />
          ))}
        </div>

        <ul className="divide-y divide-border rounded-md border border-border">
          {weightedAssets.map((leg) => {
            const key = leg.asset.toUpperCase();
            const provenance = provenanceByAsset.get(key);
            const trend = trendByAsset.get(key);
            const liquidity = liquidityByAsset.get(key);
            const readiness = readinessByAsset.get(key);
            const routable =
              readiness?.tradable ?? provenance?.routable ?? false;
            const overlapIndexes = indexOverlaps
              .filter((item) => item.asset === key)
              .map((item) => item.indexTicker);

            return (
              <li key={leg.asset} className="px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{leg.asset}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {leg.weight}%
                      </span>
                      {routable ? (
                        <Badge variant="positive" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          SoDEX
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CircleDashed className="h-3 w-3" />
                          Unmapped
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {provenance?.reason ?? "Included from narrative defaults"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-[11px] tabular-nums sm:grid-cols-3">
                    <div>
                      <p className="text-muted-foreground">7d</p>
                      <p className="font-medium text-foreground">
                        {formatPct(trend?.change7dPct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">CEX 24h</p>
                      <p className="font-medium text-foreground">
                        {liquidity?.totalTurnover24h
                          ? formatUsdCompact(liquidity.totalTurnover24h)
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-muted-foreground">Evidence</p>
                      <p className="font-medium text-foreground">
                        {provenance?.evidenceCount ?? 0} hits
                      </p>
                    </div>
                  </div>
                </div>
                {overlapIndexes.length > 0 ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    SSI overlap: {overlapIndexes.join(", ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </PageSection>

      <PageSection
        icon={Scale}
        title="SSI benchmark check"
        description="SoSoValue index snapshots tied to this basket — the same moves Evidence charts, used here for packaging relevance."
      >
        {overlapsByIndex.length > 0 ? (
          <ul className="space-y-2">
            {overlapsByIndex.map(({ ticker, snapshot, assets: overlapAssets }) => (
              <li
                key={ticker}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{ticker}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {overlapAssets.length > 0
                      ? `Overlaps basket: ${overlapAssets.join(", ")}`
                      : "Related index for this narrative theme"}
                  </p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <p className="font-medium text-foreground">
                    {formatPct(snapshot?.change24hPct)}{" "}
                    <span className="font-normal text-muted-foreground">24h</span>
                  </p>
                  <p className="text-muted-foreground">
                    7d {formatPct(snapshot?.weekRoi)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No SoSoValue SSI tickers resolved for this basket yet. Evidence still tracks theme
            momentum; revisit after constituents load.
          </p>
        )}
        <div className="mt-3">
          <TabLink
            label="See Index 24h chart on Evidence"
            onClick={() => onTabChange("evidence")}
          />
        </div>
      </PageSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <PageSection
          icon={SlidersHorizontal}
          title="Methodology"
          description="Rules used to turn Evidence into these weights."
        >
          <ul className="space-y-2">
            {methodology.map((rule) => (
              <li
                key={rule}
                className="flex gap-2 text-sm leading-6 text-muted-foreground"
              >
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </PageSection>

        <PageSection
          icon={Package}
          title="Basket risk"
          description="Consequences of this packaging vs Evidence heat and Lifecycle confidence — routing stays on Launch."
        >
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <RiskMeter
              label="Concentration"
              level={topWeight >= 30 ? "Medium" : "Low"}
              hint={`Top leg ${topWeight}% — Evidence-weighted, capped by methodology.`}
            />
            <RiskMeter
              label="Narrative heat"
              level={riskLevel as "Low" | "Medium" | "Medium-high" | "High"}
              hint={`From Evidence signal ${narrative.score.toFixed(0)} · stage ${lifecycle.stage}.`}
            />
            <RiskMeter
              label="Data confidence"
              level={
                narrative.confidence >= 75
                  ? "Low"
                  : narrative.confidence >= 60
                    ? "Medium"
                    : "Medium-high"
              }
              hint="Lower is better — fewer Evidence/API gaps for this basket."
            />
          </div>
          {lifecycle.validation?.rebalanceSuggested ? (
            <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
              Lifecycle suggests reviewing weights before Launch.{" "}
              <TabLink label="Open Lifecycle" onClick={() => onTabChange("lifecycle")} />
            </div>
          ) : null}
        </PageSection>
      </div>
    </div>
  );
}
