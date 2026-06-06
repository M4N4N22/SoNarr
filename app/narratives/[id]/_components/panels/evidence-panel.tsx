"use client";

import { useState } from "react";
import { BarChart3, Newspaper } from "lucide-react";

import { PageSection } from "@/components/layout/page-section";
import { StatCell, StatGrid } from "@/components/ui/stat";
import { NarrativeSignalStack } from "@/components/sonarr/narrative-signal-stack";
import { SoSoValueEnrichmentPanel } from "@/components/sonarr/sosovalue-enrichment-panel";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/sosovalue";
import type { NarrativeWorkspaceProps } from "../types";

export function EvidencePanel({ data }: { data: NarrativeWorkspaceProps }) {
  const [showAllHeadlines, setShowAllHeadlines] = useState(false);
  const headlines = showAllHeadlines
    ? data.narrative.items
    : data.narrative.items.slice(0, 5);
  const { evidenceSummary } = data;

  return (
    <div className="space-y-3">
      <PageSection
        icon={BarChart3}
        title="Evidence snapshot"
        description="Counts from SoSoValue search and feed parsing for this narrative category."
      >
        <StatGrid columns={4} className="rounded-none border-0 bg-transparent">
          <StatCell label="Search hits" help="Matching news results" value={evidenceSummary.searchMatches.toLocaleString()} />
          <StatCell label="Signal" help="Composite radar score" value={data.narrative.score} />
          <StatCell label="Data quality" help="API completeness" value={data.narrative.confidence} />
          <StatCell label="Headlines" help="Linked articles" value={evidenceSummary.headlineCount} />
        </StatGrid>
      </PageSection>

      <PageSection
        icon={Newspaper}
        title="Supporting headlines"
        description="Recent articles tied to this narrative — open a source to verify the story yourself."
        action={
          data.narrative.items.length > 5 ? (
            <button
              type="button"
              onClick={() => setShowAllHeadlines((value) => !value)}
              className="text-xs font-medium text-primary"
            >
              {showAllHeadlines ? "Show fewer" : `Show all (${data.narrative.items.length})`}
            </button>
          ) : undefined
        }
      >
        <div className="divide-y divide-border">
          {headlines.map((item) => (
            <a
              key={item.id}
              href={item.sourceLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0 transition hover:opacity-80"
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
        </div>
      </PageSection>

      <NarrativeSignalStack stack={data.signalStack} compact embedded />

      <SoSoValueEnrichmentPanel
        featuredNews={data.enrichment.featuredNews}
        klineTrends={data.enrichment.klineTrends}
        indexSnapshots={data.enrichment.indexSnapshots}
        etfSnapshot={data.enrichment.etfSnapshot}
        macroEvents={data.enrichment.macroEvents}
        narrativeLabel={data.narrative.label}
      />
    </div>
  );
}
