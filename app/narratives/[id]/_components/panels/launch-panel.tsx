"use client";

import { Gauge, Megaphone, Sparkles } from "lucide-react";

import { AiExecutionBrief } from "@/components/sonarr/ai-execution-brief";
import { AiNarrativeBrief } from "@/components/sonarr/ai-narrative-brief";
import { ExecutionPreviewSection } from "@/components/sonarr/execution-preview-section";
import { NarrativeLaunchRoom } from "@/components/sonarr/narrative-launch-room";
import { SodexTradingPanel } from "@/components/sonarr/sodex-trading-panel";
import { PageSection } from "@/components/layout/page-section";
import { useBasketExecutionReadiness } from "@/hooks/use-basket-execution-readiness";
import type { NarrativeWorkspaceProps } from "../types";

export function LaunchPanel({ data }: { data: NarrativeWorkspaceProps }) {
  const {
    basketNotionalUsd,
    setBasketNotionalUsd,
    executionReadiness,
    loadingReadiness,
  } = useBasketExecutionReadiness(data.weightedAssets, data.executionReadiness);

  return (
    <div className="space-y-3">
      <PageSection
        icon={Gauge}
        title="Execution readiness"
        description="Live SoDEX orderbook checks plus SoSoValue CEX pair context. Read-only — no orders until you connect a wallet below."
      >
        <ExecutionPreviewSection
          executionReadiness={executionReadiness}
          liquidityContext={data.liquidityContext}
          embedded
        />
      </PageSection>

      <SodexTradingPanel
        executionReadiness={executionReadiness}
        weightedAssets={data.weightedAssets}
        narrativeTitle={`${data.narrative.label} Momentum`}
        basketNotionalUsd={basketNotionalUsd}
        onBasketNotionalChange={setBasketNotionalUsd}
        loadingReadiness={loadingReadiness}
      />

      <PageSection
        icon={Megaphone}
        title="Launch room"
        description="Draft memo, thread, and checklist copy for publishing this narrative. Separate from live SoDEX fills."
      >
        <NarrativeLaunchRoom {...data.launchRoom} compact embedded />
      </PageSection>

      <PageSection
        icon={Sparkles}
        title="AI summaries"
        description="Optional Gemini drafts grounded in the same narrative and execution data — not financial advice."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          <AiNarrativeBrief input={data.aiBriefInput} embedded />
          <AiExecutionBrief input={data.executionBriefInput} embedded />
        </div>
      </PageSection>
    </div>
  );
}
