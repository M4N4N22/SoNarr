"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  chartColors,
  formatCompactNumber,
  layerPalette,
} from "@/components/charts/recharts-theme";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NarrativeSignalStack } from "@/lib/sonarr/signal-stack";
import type {
  BasketLiquidityContext,
  EtfMarketSnapshot,
  IndexMarketSnapshot,
  KlineTrend,
  MacroEventDay,
} from "@/lib/sosovalue/enrichment";
import { formatUsdCompact } from "@/lib/sosovalue/enrichment";

function ChartFrame({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className="rounded-md border px-2.5 py-2 text-[11px] shadow-md"
      style={{
        background: chartColors.tooltipBg,
        borderColor: chartColors.tooltipBorder,
        color: chartColors.tooltipFg,
      }}
    >
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((entry) => (
        <p key={`${entry.name}-${entry.value}`} className="tabular-nums text-muted-foreground">
          <span style={{ color: entry.color }}>{entry.name}</span>: {entry.value}
        </p>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  score,
}: {
  label: string;
  value: string;
  hint: string;
  score?: number;
}) {
  const radialData =
    typeof score === "number"
      ? [{ name: label, value: Math.max(4, Math.min(100, score)), fill: chartColors.primary }]
      : null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3">
      <div className="flex items-center gap-3">
        {radialData ? (
          <div className="h-14 w-14 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={radialData}
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: "var(--muted)" }} cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}

export function EvidenceKpiStrip({
  signal,
  confidence,
  searchMatches,
  headlineCount,
  liveLayers,
  totalLayers,
}: {
  signal: number;
  confidence: number;
  searchMatches: number;
  headlineCount: number;
  liveLayers: number;
  totalLayers: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Signal" value={`${signal}`} hint="Composite radar score" score={signal} />
      <KpiCard
        label="Data quality"
        value={`${confidence}`}
        hint="API completeness"
        score={confidence}
      />
      <KpiCard
        label="Search hits"
        value={searchMatches.toLocaleString()}
        hint="Matching news results"
      />
      <KpiCard
        label="Live layers"
        value={`${liveLayers}/${totalLayers}`}
        hint={`${headlineCount} linked headlines`}
        score={totalLayers > 0 ? (liveLayers / totalLayers) * 100 : 0}
      />
    </div>
  );
}

export function SignalRadarChart({ stack }: { stack: NarrativeSignalStack }) {
  const data = stack.layers.map((layer) => ({
    layer: layer.name.replace(" readiness", "").replace("Historical ", "Hist. "),
    fullName: layer.name,
    score: typeof layer.score === "number" ? layer.score : 0,
    pending: typeof layer.score !== "number",
  }));

  return (
    <ChartFrame
      title="Conviction radar"
      subtitle="Eight-layer stack — pending layers plot at 0"
      action={<Badge variant="outline">{stack.strongestLayer}</Badge>}
    >
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke={chartColors.grid} />
            <PolarAngleAxis
              dataKey="layer"
              tick={{ fill: chartColors.muted, fontSize: 10 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: chartColors.muted, fontSize: 9 }}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={chartColors.primary}
              fill={chartColors.primary}
              fillOpacity={0.28}
              strokeWidth={2}
            />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{stack.conclusion}</p>
    </ChartFrame>
  );
}

export function LayerScoreChart({ stack }: { stack: NarrativeSignalStack }) {
  const data = stack.layers.map((layer, index) => ({
    name: layer.name,
    short: layer.name.split(" ")[0] ?? layer.name,
    score: typeof layer.score === "number" ? layer.score : null,
    fill: layerPalette[index % layerPalette.length],
    mode: layer.dataMode,
  }));

  return (
    <ChartFrame title="Layer scores" subtitle="0–100 per evidence layer (blank = pending)">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={chartColors.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: chartColors.muted, fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tick={{ fill: chartColors.muted, fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <ChartTooltip
                    active
                    label={row.name}
                    payload={[
                      {
                        name: row.mode,
                        value: row.score === null ? "Pending" : `${row.score}/100`,
                        color: row.fill,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.score === null ? chartColors.neutral : entry.fill}
                  fillOpacity={entry.score === null ? 0.35 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function AssetReturnsChart({ trends }: { trends: KlineTrend[] }) {
  const data = trends
    .filter(
      (trend) =>
        typeof trend.change7dPct === "number" || typeof trend.change30dPct === "number",
    )
    .map((trend) => ({
      symbol: trend.symbol,
      ...(typeof trend.change7dPct === "number" ? { "7d": trend.change7dPct } : {}),
      ...(typeof trend.change30dPct === "number" ? { "30d": trend.change30dPct } : {}),
      vol: trend.volatility7dPct,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <ChartFrame
      title="Asset returns"
      subtitle="Signed SoSoValue daily kline windows (missing windows omitted)"
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="symbol" tick={{ fill: chartColors.muted, fontSize: 11 }} />
            <YAxis
              tick={{ fill: chartColors.muted, fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <ChartTooltip
                    active
                    label={String(label)}
                    payload={payload.map((entry) => ({
                      name: String(entry.name),
                      value: `${Number(entry.value).toFixed(2)}%`,
                      color: String(entry.color),
                    }))}
                  />
                );
              }}
            />
            <Bar dataKey="7d" name="7d" fill={chartColors.primary} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="30d" name="30d" fill={chartColors.mid} radius={[3, 3, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function LiquidityChart({ liquidity }: { liquidity: BasketLiquidityContext }) {
  if (liquidity.mode === "unavailable" || liquidity.assets.length === 0) {
    return null;
  }

  const data = [...liquidity.assets]
    .sort((a, b) => (b.totalTurnover24h ?? 0) - (a.totalTurnover24h ?? 0))
    .slice(0, 8)
    .map((asset) => ({
      symbol: asset.symbol,
      turnover: asset.totalTurnover24h ?? 0,
      pairs: asset.pairCount,
    }));

  return (
    <ChartFrame
      title="CEX liquidity"
      subtitle={liquidity.summary}
      action={<Badge variant="outline">{liquidity.mode}</Badge>}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid stroke={chartColors.grid} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: chartColors.muted, fontSize: 10 }}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              width={48}
              tick={{ fill: chartColors.muted, fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as (typeof data)[number];
                return (
                  <ChartTooltip
                    active
                    label={row.symbol}
                    payload={[
                      {
                        name: "24h turnover",
                        value: formatUsdCompact(row.turnover),
                        color: chartColors.strong,
                      },
                      {
                        name: "Pairs",
                        value: String(row.pairs),
                        color: chartColors.neutral,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="turnover" fill={chartColors.strong} radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function IndexMoveChart({ snapshots }: { snapshots: IndexMarketSnapshot[] }) {
  const data = snapshots
    .filter((snapshot) => typeof snapshot.change24hPct === "number")
    .map((snapshot) => ({
      ticker: snapshot.indexTicker,
      change: snapshot.change24hPct as number,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <ChartFrame title="Index 24h" subtitle="SoSoValue index snapshots">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="ticker" tick={{ fill: chartColors.muted, fontSize: 10 }} />
            <YAxis
              tick={{ fill: chartColors.muted, fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null;
                const value = Number(payload[0].value);
                return (
                  <ChartTooltip
                    active
                    label={String(label)}
                    payload={[
                      {
                        name: "24h",
                        value: `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
                        color: value >= 0 ? chartColors.up : chartColors.down,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="change" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((entry) => (
                <Cell
                  key={entry.ticker}
                  fill={entry.change >= 0 ? chartColors.up : chartColors.down}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function EtfFlowChart({ etf }: { etf?: EtfMarketSnapshot }) {
  if (!etf) {
    return null;
  }

  const data = [
    { name: "Daily net", value: etf.netInflow ?? 0 },
    { name: "Cumulative", value: etf.cumInflow ?? 0 },
    { name: "Traded", value: etf.valueTraded ?? 0 },
  ].filter((item) => item.value !== 0);

  if (data.length === 0) {
    return null;
  }

  return (
    <ChartFrame title={`ETF flow · ${etf.ticker}`} subtitle="TradFi flow snapshot">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={chartColors.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: chartColors.muted, fontSize: 11 }} />
            <YAxis
              tick={{ fill: chartColors.muted, fontSize: 10 }}
              tickFormatter={(value) => formatCompactNumber(Number(value))}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <ChartTooltip
                    active
                    label={String(label)}
                    payload={[
                      {
                        name: "USD",
                        value: formatUsdCompact(Number(payload[0].value)),
                        color: chartColors.mid,
                      },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="value" fill={chartColors.mid} radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function MacroTimeline({ events }: { events: MacroEventDay[] }) {
  const flat = events
    .flatMap((day) =>
      day.events.slice(0, 3).map((title) => ({
        day: day.date,
        title,
      })),
    )
    .slice(0, 8);

  if (flat.length === 0) {
    return null;
  }

  return (
    <ChartFrame title="Macro calendar" subtitle="Upcoming catalysts from SoSoValue">
      <ol className="space-y-2">
        {flat.map((event) => (
          <li
            key={`${event.day}-${event.title}`}
            className="flex items-start gap-3 rounded-md bg-muted/30 px-3 py-2"
          >
            <span className="mt-0.5 w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {event.day}
            </span>
            <p className="min-w-0 flex-1 text-xs font-medium leading-5 text-foreground">
              {event.title}
            </p>
          </li>
        ))}
      </ol>
    </ChartFrame>
  );
}
