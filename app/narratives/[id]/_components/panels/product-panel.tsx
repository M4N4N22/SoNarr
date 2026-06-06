import { AlertTriangle, PieChart, Scale, SlidersHorizontal } from "lucide-react";

import { PageSection } from "@/components/layout/page-section";
import { DonutChart } from "@/components/charts/donut-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { RiskMeter } from "@/components/charts/risk-meter";
import type { NarrativeWorkspaceProps } from "../types";

export function ProductPanel({ data }: { data: NarrativeWorkspaceProps }) {
  const { narrative, assets, weightedAssets, methodology, riskLevel } = data;

  return (
    <div className="space-y-3">
      <PageSection
        icon={PieChart}
        title={`${narrative.label} momentum index`}
        description="Research preview of a weighted basket for this narrative. Weights total 100% — not a live listed product."
      >
        <DonutChart
          segments={weightedAssets.map((asset, index) => ({
            id: asset.asset,
            label: asset.asset,
            value: asset.weight,
            hint: assets[index] ?? asset.asset,
          }))}
        />
      </PageSection>

      <div className="grid gap-3 xl:grid-cols-2">
        <PageSection
          icon={Scale}
          title="Target weights"
          description="Suggested allocation per asset before any SoDEX sizing on the Launch tab."
        >
          <div className="space-y-2">
            {weightedAssets.map((asset) => (
              <div key={asset.asset} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{asset.asset}</span>
                <span className="tabular-nums text-muted-foreground">{asset.weight}%</span>
              </div>
            ))}
          </div>
        </PageSection>

        <PageSection
          icon={SlidersHorizontal}
          title="Methodology rules"
          description="How SoNarr caps concentration and picks assets for this narrative."
        >
          <HorizontalBars
            compact
            items={methodology.map((rule, index) => ({
              id: String(index),
              label: rule.split(".")[0] ?? rule,
              value: 100 - index * 12,
              hint: rule,
              suffix: "",
            }))}
          />
        </PageSection>
      </div>

      <PageSection
        icon={AlertTriangle}
        title="Risk dashboard"
        description="Qualitative risks for this basket idea. Execution routing is checked separately on Launch."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <RiskMeter
            label="Concentration"
            level={weightedAssets[0]?.weight === 30 ? "Medium" : "Low"}
            hint="Top asset capped at 30% by default."
          />
          <RiskMeter
            label="Volatility"
            level={riskLevel as "Low" | "Medium" | "Medium-high" | "High"}
            hint="Derived from narrative signal heat."
          />
          <RiskMeter
            label="Data confidence"
            level={
              narrative.confidence >= 75 ? "Low" : narrative.confidence >= 60 ? "Medium" : "Medium-high"
            }
            hint="Lower is better — fewer API gaps."
          />
        </div>
      </PageSection>
    </div>
  );
}
