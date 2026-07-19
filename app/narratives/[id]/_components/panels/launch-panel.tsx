"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, FileText, Sparkles } from "lucide-react";

import { AiExecutionBrief } from "@/components/sonarr/ai-execution-brief";
import { AiNarrativeBrief } from "@/components/sonarr/ai-narrative-brief";
import { ExecutionPreviewSection } from "@/components/sonarr/execution-preview-section";
import { NarrativeLaunchRoom } from "@/components/sonarr/narrative-launch-room";
import { usePersistedSodexNetwork } from "@/components/sonarr/sodex-network-switch";
import { SodexTradingPanel } from "@/components/sonarr/sodex-trading-panel";
import { TradeJournalStrip } from "@/components/sonarr/trade-journal-strip";
import { useBasketExecutionReadiness } from "@/hooks/use-basket-execution-readiness";
import { cn } from "@/lib/utils";
import type { NarrativeWorkspaceProps } from "../types";

function ToolsDisclosure({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof FileText;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-muted/40"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="border-t border-border px-4 py-3">{children}</div> : null}
    </div>
  );
}

export function LaunchPanel({ data }: { data: NarrativeWorkspaceProps }) {
  const { network } = usePersistedSodexNetwork(data.executionReadiness.network);
  const {
    basketNotionalUsd,
    setBasketNotionalUsd,
    executionReadiness,
    loadingReadiness,
  } = useBasketExecutionReadiness(data.weightedAssets, data.executionReadiness, network);
  const [journalRefreshToken, setJournalRefreshToken] = useState(0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-3">
          <SodexTradingPanel
            executionReadiness={executionReadiness}
            weightedAssets={data.weightedAssets}
            narrativeId={data.narrative.id}
            narrativeTitle={`${data.narrative.label} Momentum`}
            basketNotionalUsd={basketNotionalUsd}
            onBasketNotionalChange={setBasketNotionalUsd}
            loadingReadiness={loadingReadiness}
            onTradeRecorded={() => setJournalRefreshToken((value) => value + 1)}
          />
          <TradeJournalStrip
            narrativeId={data.narrative.id}
            refreshToken={journalRefreshToken}
          />
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold text-foreground">Market</h2>
              {loadingReadiness ? (
                <span className="text-[11px] text-muted-foreground">Updating…</span>
              ) : (
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {executionReadiness.network}
                </span>
              )}
            </div>
            <div className="p-3">
              <ExecutionPreviewSection
                executionReadiness={executionReadiness}
                liquidityContext={data.liquidityContext}
                embedded
                variant="compact"
              />
            </div>
          </div>

          {data.lifecycle.validation?.rebalanceSuggested ? (
            <div className="rounded-lg border border-chart-4/30 bg-chart-4/10 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              Conviction moved ~{data.lifecycle.validation.scoreDeltaPct?.toFixed(1)}% — review
              weights on Lifecycle before sizing up.
            </div>
          ) : null}
        </aside>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Optional tools
        </p>
        <ToolsDisclosure title="Copy kit" icon={FileText}>
          <NarrativeLaunchRoom {...data.launchRoom} compact embedded />
        </ToolsDisclosure>
        <ToolsDisclosure title="AI briefs" icon={Sparkles}>
          <div className="grid gap-3 lg:grid-cols-2">
            <AiNarrativeBrief input={data.aiBriefInput} embedded />
            <AiExecutionBrief input={data.executionBriefInput} embedded />
          </div>
        </ToolsDisclosure>
      </div>
    </div>
  );
}
