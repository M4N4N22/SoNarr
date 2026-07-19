"use client";

import { useState } from "react";
import { ArrowRight, Newspaper, Package } from "lucide-react";

import {
  AssetReturnsChart,
  EtfFlowChart,
  EvidenceKpiStrip,
  IndexMoveChart,
  LayerScoreChart,
  LiquidityChart,
  MacroTimeline,
  SignalRadarChart,
} from "@/components/sonarr/evidence-analytics";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/sosovalue";
import type { NarrativeWorkspaceProps, NarrativeWorkspaceTab } from "../types";

type EvidencePanelProps = {
  data: NarrativeWorkspaceProps;
  onTabChange: (tab: NarrativeWorkspaceTab) => void;
};

export function EvidencePanel({ data, onTabChange }: EvidencePanelProps) {
  const [showAllHeadlines, setShowAllHeadlines] = useState(false);
  const headlines = showAllHeadlines
    ? data.narrative.items
    : data.narrative.items.slice(0, 6);
  const liveLayers = data.signalStack.layers.filter((layer) => layer.dataMode === "Live").length;
  const { evidenceSummary, enrichment, liquidityContext, signalStack } = data;

  return (
    <div className="space-y-3">
      <EvidenceKpiStrip
        signal={data.narrative.score}
        confidence={data.narrative.confidence}
        searchMatches={evidenceSummary.searchMatches}
        headlineCount={evidenceSummary.headlineCount}
        liveLayers={liveLayers}
        totalLayers={signalStack.layers.length}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        <SignalRadarChart stack={signalStack} />
        <LayerScoreChart stack={signalStack} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <AssetReturnsChart trends={enrichment.klineTrends} />
        <LiquidityChart liquidity={liquidityContext} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <IndexMoveChart snapshots={enrichment.indexSnapshots} />
        <EtfFlowChart etf={enrichment.etfSnapshot} />
        <MacroTimeline events={enrichment.macroEvents} />
      </div>

      <section className="rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Next: package into Index</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                These returns, liquidity, and SSI moves feed the weighted basket and leg provenance
                on Index — then Lifecycle and Launch.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTabChange("product")}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:opacity-80"
          >
            Open Index
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Supporting headlines</h3>
          </div>
          {data.narrative.items.length > 6 ? (
            <button
              type="button"
              onClick={() => setShowAllHeadlines((value) => !value)}
              className="text-xs font-medium text-primary"
            >
              {showAllHeadlines ? "Show fewer" : `Show all (${data.narrative.items.length})`}
            </button>
          ) : null}
        </div>
        <div className="divide-y divide-border px-4">
          {headlines.map((item) => (
            <a
              key={item.id}
              href={item.sourceLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-4 py-3 transition hover:opacity-80"
            >
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(item.releaseTime)}
                </p>
              </div>
              <Badge variant="muted">Feed</Badge>
            </a>
          ))}
          {headlines.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No linked headlines for this narrative yet.
            </p>
          ) : null}
        </div>
      </section>

      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Layer notes
            <span className="text-[11px] font-normal text-muted-foreground">Expand detail</span>
          </span>
        </summary>
        <div className="space-y-2 border-t border-border px-4 py-3">
          {signalStack.layers.map((layer) => (
            <div key={layer.name} className="rounded-md bg-muted/30 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold text-foreground">{layer.name}</p>
                <Badge variant={layer.dataMode === "Live" ? "default" : "outline"}>
                  {layer.dataMode}
                </Badge>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {typeof layer.score === "number" ? `${layer.score}/100` : layer.status ?? "—"}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{layer.explanation}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
