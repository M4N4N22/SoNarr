"use client";

import { useState } from "react";

import { CoverageChart } from "@/components/charts/coverage-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCell, StatGrid } from "@/components/ui/stat";
import { SodexNetworkBadge } from "@/components/sonarr/sodex-network-badge";
import type { BasketExecutionReadiness } from "@/lib/sodex";
import { formatUsdCompact, type BasketLiquidityContext } from "@/lib/sosovalue/enrichment";
import { cn } from "@/lib/utils";

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPct(value?: number) {
  if (value === undefined) return "—";
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(2)}%`;
}

function legStatusLabel(leg: BasketExecutionReadiness["legs"][number]) {
  if (leg.tradable) return leg.askDepthUsd > 0 ? "OK" : "Limit";
  if (leg.sodexSymbol || leg.displayName) return "No price";
  return "Missing";
}

export function ExecutionPreviewSection({
  executionReadiness,
  liquidityContext,
  embedded = false,
  variant = "full",
}: {
  executionReadiness?: BasketExecutionReadiness;
  liquidityContext?: BasketLiquidityContext;
  indexHref?: string;
  embedded?: boolean;
  /** compact = launch desk strip; full = research-style block */
  variant?: "full" | "compact";
}) {
  const [showRoute, setShowRoute] = useState(false);
  const hasLiveData = Boolean(executionReadiness && executionReadiness.mode !== "unavailable");
  const hasLiquidityData = Boolean(liquidityContext && liquidityContext.mode !== "unavailable");
  const compact = variant === "compact";

  const slippageLabel =
    executionReadiness?.weightedSlippagePct !== undefined
      ? formatPct(executionReadiness.weightedSlippagePct)
      : "—";

  const routeTable =
    showRoute && hasLiveData && executionReadiness ? (
      <div className="overflow-x-auto rounded-md border border-border bg-muted/20">
        <table className="min-w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2 font-medium">Asset</th>
              <th className="px-3 py-2 font-medium">Wt</th>
              <th className="px-3 py-2 font-medium">Market</th>
              <th className="px-3 py-2 font-medium">Notional</th>
              <th className="px-3 py-2 font-medium">Depth</th>
              <th className="px-3 py-2 font-medium">Slip</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {executionReadiness.legs.map((leg) => (
              <tr key={leg.asset} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{leg.asset}</td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{leg.weight}%</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {leg.displayName ?? leg.sodexSymbol ?? "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {formatUsd(leg.legNotionalUsd)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {formatUsd(leg.askDepthUsd)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                  {formatPct(leg.slippagePct)}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={leg.tradable ? "positive" : "outline"}>
                    {legStatusLabel(leg)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : null;

  const content = compact ? (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Route"
          value={
            hasLiveData
              ? `${executionReadiness?.tradableCount}/${executionReadiness?.totalLegs}`
              : "—"
          }
        />
        <Metric
          label="Depth"
          value={hasLiveData ? formatUsd(executionReadiness?.totalAskDepthUsd ?? 0) : "—"}
        />
        <Metric label="Slip" value={hasLiveData ? slippageLabel : "—"} />
        <Metric
          label="CEX 24h"
          value={hasLiquidityData ? formatUsdCompact(liquidityContext?.aggregateTurnover24h) : "—"}
        />
      </div>

      {hasLiveData && executionReadiness && executionReadiness.tradableCount < executionReadiness.totalLegs ? (
        <p className="text-[11px] leading-4 text-muted-foreground">
          {executionReadiness.totalLegs - executionReadiness.tradableCount} leg
          {executionReadiness.totalLegs - executionReadiness.tradableCount === 1 ? "" : "s"} unmapped —
          skipped at submit.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Badge variant={hasLiveData ? "positive" : "muted"}>
          {hasLiveData ? "Live book" : "Pending"}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasLiveData}
          onClick={() => setShowRoute((value) => !value)}
          className="h-7 px-2 text-xs"
        >
          {showRoute ? "Hide legs" : "View legs"}
        </Button>
      </div>

      {routeTable}
    </div>
  ) : (
    <div className="space-y-2">
      <p className="px-1 text-xs leading-5 text-muted-foreground">
        SoDEX route = legs with a mapped market and reference price. Depth and slippage need visible
        ask liquidity; thin books may still allow limit orders. CEX vol is SoSoValue spot context,
        not on-chain fill size.
      </p>

      <div className="flex flex-wrap items-center gap-2 px-1">
        {executionReadiness ? <SodexNetworkBadge network={executionReadiness.network} /> : null}
        <Badge variant="muted">{hasLiveData ? "Live book" : "Pending"}</Badge>
        <Button
          className="ml-auto h-8"
          variant="outline"
          size="sm"
          disabled={!hasLiveData}
          onClick={() => setShowRoute((value) => !value)}
        >
          {showRoute ? "Hide route" : "Route table"}
        </Button>
      </div>

      <StatGrid columns={4}>
        <StatCell
          label="Route"
          help="Legs with SoDEX market + price"
          value={
            hasLiveData
              ? `${executionReadiness?.tradableCount}/${executionReadiness?.totalLegs}`
              : "—"
          }
        />
        <StatCell
          label="Depth"
          help="Total ask liquidity on book"
          value={hasLiveData ? formatUsd(executionReadiness?.totalAskDepthUsd ?? 0) : "—"}
        />
        <StatCell
          label="Slippage"
          help="Weighted vs top-of-book asks"
          value={hasLiveData ? slippageLabel : "—"}
        />
        <StatCell
          label="CEX vol"
          help="24h SoSoValue spot turnover"
          value={hasLiquidityData ? formatUsdCompact(liquidityContext?.aggregateTurnover24h) : "—"}
        />
      </StatGrid>

      {hasLiveData && executionReadiness ? (
        <CoverageChart
          title="Coverage"
          titleHint="Routable vs missing legs"
          segments={[
            {
              id: "tradable",
              label: "OK",
              value: executionReadiness.tradableCount,
              color: "var(--chart-strong)",
            },
            {
              id: "missing",
              label: "Missing",
              value: Math.max(0, executionReadiness.totalLegs - executionReadiness.tradableCount),
              color: "var(--chart-weak)",
            },
          ]}
        />
      ) : null}

      {routeTable}
    </div>
  );

  if (embedded) return content;
  return <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">{content}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("rounded-md bg-muted/40 px-2.5 py-2")}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
