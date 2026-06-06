import { Activity, BarChart3, GitBranch, Target, TrendingUp } from "lucide-react";

import { PageSection } from "@/components/layout/page-section";
import { WorkflowTrack } from "@/components/charts/workflow-track";
import { StatCell, StatGrid } from "@/components/ui/stat";
import type { NarrativeWorkspaceProps } from "../types";

export function OverviewPanel({ data }: { data: NarrativeWorkspaceProps }) {
  const { narrative, brief, riskLevel, signalStack, executionReadiness } = data;

  return (
    <div className="space-y-3">
      <PageSection
        icon={BarChart3}
        title="Key metrics"
        description="Quick read on narrative heat, data quality, risk label, and how many basket legs SoDEX can route."
      >
        <StatGrid className="rounded-none border-0 bg-transparent">
          <StatCell label="Signal" help="From SoSoValue news/search" value={narrative.score} />
          <StatCell label="Confidence" help="How complete the API data was" value={narrative.confidence} />
          <StatCell label="Risk heat" help="Attention ≠ safety" value={riskLevel} valueClassName="text-base" />
          <StatCell
            label="SoDEX route"
            help="Routable basket legs"
            value={`${executionReadiness.tradableCount}/${executionReadiness.totalLegs}`}
          />
        </StatGrid>
      </PageSection>

      <PageSection
        icon={GitBranch}
        title="Pipeline"
        description="Where this narrative sits from detection through optional SoDEX execution. Open Launch for trading steps."
      >
        <WorkflowTrack
          steps={[
            {
              id: "detect",
              title: "Detect",
              detail: "SoSoValue feeds",
              hint: "Theme surfaced from hot news and category search on Radar.",
              complete: true,
              active: true,
            },
            {
              id: "validate",
              title: "Validate",
              detail:
                typeof signalStack.overallScore === "number"
                  ? `${signalStack.overallScore}/100`
                  : signalStack.mode,
              hint: "Signal stack scores evidence layers — see Evidence tab for detail.",
              complete: signalStack.mode !== "Unavailable",
              active: true,
            },
            {
              id: "package",
              title: "Index",
              detail: "Basket ready",
              hint: "Suggested weights on the Index tab — research preview, not a listed product.",
              complete: true,
              active: true,
            },
            {
              id: "execute",
              title: "SoDEX",
              detail: `${executionReadiness.tradableCount}/${executionReadiness.totalLegs}`,
              hint: "Live orderbook checks and optional wallet-signed basket on the Launch tab.",
              complete: executionReadiness.tradableCount === executionReadiness.totalLegs,
              active: executionReadiness.tradableCount > 0,
            },
          ]}
        />
      </PageSection>

      <PageSection
        icon={Activity}
        title="Narrative brief"
        description="Plain-language summary of what this theme is, why it shows up now, and how to interpret the scores."
      >
        <div className="grid gap-px overflow-hidden rounded-md bg-border md:grid-cols-3">
          {[
            { icon: Target, title: "What it is", body: brief.what },
            { icon: TrendingUp, title: "Why now", body: brief.whyNow },
            { icon: Activity, title: "How to read it", body: brief.behavior },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {title}
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{body}</p>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
