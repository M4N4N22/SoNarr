"use client";

import { useState } from "react";

import { HorizontalBars, type HorizontalBarItem } from "@/components/charts/horizontal-bars";
import { ScoreRing } from "@/components/charts/score-ring";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Separator } from "@/components/ui/separator";
import type { NarrativeSignalStack as NarrativeSignalStackData } from "@/lib/sonarr/signal-stack";
import { cn } from "@/lib/utils";

const layerHints: Record<string, string> = {
  "News heat": "How loud this theme is in SoSoValue hot news and search right now.",
  "Market momentum": "Whether linked assets are moving in live market snapshots.",
  "Historical trend": "Directional 7d/30d returns, volatility, and consistency from daily klines.",
  "Sector alignment": "Match to SoSoValue sector or spotlight categories.",
  "Index relevance": "Overlap with official SoSoValue index constituents.",
  "TradFi flow": "Spot ETF inflow and trading activity (Bitcoin ETF narrative).",
  "Macro catalysts": "Upcoming macro events that may affect timing.",
  "Execution readiness": "SoDEX route checks plus SoSoValue CEX pair liquidity.",
};

function layerBarItems(stack: NarrativeSignalStackData): HorizontalBarItem[] {
  return stack.layers.map((layer) => ({
    id: layer.name,
    label: layer.name,
    value: typeof layer.score === "number" ? layer.score : null,
    status: layer.status,
    dataMode: layer.dataMode,
    hint: layerHints[layer.name] ?? layer.description,
  }));
}

function layerValue(layer: NarrativeSignalStackData["layers"][number]) {
  if (typeof layer.score === "number") {
    return `${layer.score}/100`;
  }

  return layer.status ?? "Pending";
}

function LayerAccordionItem({
  layer,
  defaultOpen,
}: {
  layer: NarrativeSignalStackData["layers"][number];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const topEvidence = layer.evidence.slice(0, 2);

  return (
    <div className="rounded-xl border border-border bg-background/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{layer.name}</p>
            <InfoTip label={layer.name} side="bottom">
              {layerHints[layer.name] ?? layer.description}
            </InfoTip>
          </div>
          {typeof layer.score === "number" ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, layer.score)}%` }}
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{layer.status ?? "Pending"}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-semibold text-foreground">{layerValue(layer)}</span>
          <Badge variant={layer.dataMode === "Live" ? "default" : "outline"} className="text-[10px]">
            {layer.dataMode}
          </Badge>
        </div>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-border px-4 py-3">
          <p className="text-xs leading-5 text-muted-foreground">{layer.explanation}</p>
          {topEvidence.map((item) => (
            <p
              key={item}
              className="rounded-lg border border-border bg-card/70 px-2.5 py-2 text-xs leading-5 text-muted-foreground"
            >
              {item}
            </p>
          ))}
          {layer.evidence.length > 2 ? (
            <p className="text-[11px] text-muted-foreground">
              +{layer.evidence.length - 2} more data points in this layer
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function NarrativeSignalStack({
  stack,
  compact = false,
  embedded = false,
}: {
  stack: NarrativeSignalStackData;
  compact?: boolean;
  embedded?: boolean;
}) {
  const content = (
    <Card className={cn("overflow-hidden bg-card/85", embedded && "shadow-none")}>
      <CardHeader className={cn("border-b border-border", compact ? "p-4 sm:p-5" : "p-6 sm:p-8")}>
        <div className={cn("grid gap-6", !compact && "lg:grid-cols-[1fr_auto] lg:items-center")}>
          <div>
            <Badge>{stack.mode}</Badge>
            <CardTitle className={cn("mt-3", compact ? "text-xl" : "text-3xl sm:text-4xl")}>
              Signal Stack
            </CardTitle>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Each bar is a live check from SoSoValue or SoDEX. Hover the{" "}
              <span className="text-foreground">?</span> icons for plain-English help.
            </p>
          </div>
          <ScoreRing
            value={stack.overallScore ?? 0}
            label="Overall"
            hint="Average of scored layers — not a buy signal."
            displayValue={
              typeof stack.overallScore === "number"
                ? `${stack.overallScore}`
                : "N/A"
            }
            size={compact ? "md" : "lg"}
          />
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact ? "p-4 sm:p-5" : "p-6 sm:p-8")}>
        <HorizontalBars items={layerBarItems(stack)} />

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Strongest layer</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{stack.strongestLayer}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Weakest layer</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{stack.weakestLayer}</p>
          </div>
        </div>

        {!compact ? <Separator /> : null}

        <div className="space-y-2">
          {stack.layers.map((layer, index) => (
            <LayerAccordionItem
              key={layer.name}
              layer={layer}
              defaultOpen={compact && index === 0}
            />
          ))}
        </div>

        <p className="rounded-xl border border-border bg-background/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {stack.conclusion}
        </p>
      </CardContent>
    </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">{content}</section>
  );
}
