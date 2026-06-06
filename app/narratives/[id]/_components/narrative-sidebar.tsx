"use client";

import { FileText, Package, Rocket, Target } from "lucide-react";

import type { NarrativeWorkspaceProps, NarrativeWorkspaceTab } from "./types";
import { narrativeTabs } from "./types";
import { Badge } from "@/components/ui/badge";
import { StatCell, StatGrid } from "@/components/ui/stat";
import { getNarrativeIcon } from "@/lib/sonarr/narrative-icons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/sosovalue";

const tabIcons: Record<NarrativeWorkspaceTab, typeof Target> = {
  overview: Target,
  evidence: FileText,
  product: Package,
  launch: Rocket,
};

export function NarrativeSidebar({
  data,
  activeTab,
  onTabChange,
}: {
  data: NarrativeWorkspaceProps;
  activeTab: NarrativeWorkspaceTab;
  onTabChange: (tab: NarrativeWorkspaceTab) => void;
}) {
  const { narrative, sourceLabel, executionReadiness } = data;
  const { icon: NarrativeIcon, color, bg } = getNarrativeIcon(narrative.id);

  return (
    <aside className="lg:sticky lg:top-14 lg:self-start">
      <div className="rounded-lg bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="muted">{sourceLabel}</Badge>
            <Badge variant="outline">{narrative.status}</Badge>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <NarrativeIcon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground">{narrative.label}</h1>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Narrative workspace · updated{" "}
                {formatRelativeTime(new Date(data.radarUpdatedAt).getTime())}
              </p>
            </div>
          </div>
        </div>

        <StatGrid columns={3} className="rounded-none border-0 bg-transparent">
          <StatCell label="Signal" help="Theme strength from SoSoValue" value={narrative.score} />
          <StatCell label="Data" help="API coverage quality" value={narrative.confidence} />
          <StatCell
            label="Route"
            help="SoDEX legs routable"
            value={`${executionReadiness.tradableCount}/${executionReadiness.totalLegs}`}
          />
        </StatGrid>
      </div>

      <nav className="mt-2 rounded-lg bg-card" aria-label="Workspace sections">
        <p className="border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Sections
        </p>
        <ul>
          {narrativeTabs.map((tab) => {
            const Icon = tabIcons[tab.id];
            const active = activeTab === tab.id;

            return (
              <li key={tab.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-3 text-left transition",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{tab.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 opacity-80">{tab.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeTab !== "launch" ? (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
          <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <p>
            <span className="font-medium text-foreground">SoDEX:</span>{" "}
            {executionReadiness.tradableCount}/{executionReadiness.totalLegs} basket legs routable. Open{" "}
            <button type="button" onClick={() => onTabChange("launch")} className="text-primary hover:underline">
              Launch
            </button>{" "}
            to check depth and submit orders.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
