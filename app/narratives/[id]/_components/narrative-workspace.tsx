"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, FileText, Package, Rocket, Target } from "lucide-react";

import { NarrativeSidebar } from "./narrative-sidebar";
import { EvidencePanel } from "./panels/evidence-panel";
import { LaunchPanel } from "./panels/launch-panel";
import { LifecyclePanel } from "./panels/lifecycle-panel";
import { OverviewPanel } from "./panels/overview-panel";
import { ProductPanel } from "./panels/product-panel";
import type { NarrativeWorkspaceProps, NarrativeWorkspaceTab } from "./types";
import { getNarrativeTab, narrativeTabs } from "./types";
import { WorkspacePanelHeader } from "@/components/layout/page-section";

export type { NarrativeWorkspaceProps } from "./types";

const tabIcons = {
  overview: Target,
  evidence: FileText,
  product: Package,
  lifecycle: Activity,
  launch: Rocket,
} as const;

const validTabs = new Set<NarrativeWorkspaceTab>([
  "overview",
  "evidence",
  "product",
  "lifecycle",
  "launch",
]);

function parseTab(value: string | null): NarrativeWorkspaceTab {
  if (value && validTabs.has(value as NarrativeWorkspaceTab)) {
    return value as NarrativeWorkspaceTab;
  }

  return "overview";
}

function NarrativeWorkspaceInner(props: NarrativeWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = parseTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<NarrativeWorkspaceTab>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  function onTabChange(tab: NarrativeWorkspaceTab) {
    setActiveTab(tab);

    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <NarrativeSidebar data={props} activeTab={activeTab} onTabChange={onTabChange} />

        <div className="min-w-0">
          <div className="mb-6 lg:hidden">
            <label
              htmlFor="workspace-tab"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Section
            </label>
            <select
              id="workspace-tab"
              value={activeTab}
              onChange={(event) => onTabChange(event.target.value as NarrativeWorkspaceTab)}
              className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none ring-primary/30 focus:ring-2"
            >
              {narrativeTabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} — {tab.hint}
                </option>
              ))}
            </select>
          </div>

          <WorkspacePanelHeader
            title={getNarrativeTab(activeTab).title}
            description={getNarrativeTab(activeTab).description}
            icon={tabIcons[activeTab]}
            compact={activeTab === "launch"}
          />

          {activeTab === "overview" ? <OverviewPanel data={props} /> : null}
          {activeTab === "evidence" ? <EvidencePanel data={props} /> : null}
          {activeTab === "product" ? <ProductPanel data={props} /> : null}
          {activeTab === "lifecycle" ? <LifecyclePanel data={props} /> : null}
          {activeTab === "launch" ? <LaunchPanel data={props} /> : null}
        </div>
      </div>
    </div>
  );
}

export function NarrativeWorkspace(props: NarrativeWorkspaceProps) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">Loading workspace…</div>}>
      <NarrativeWorkspaceInner {...props} />
    </Suspense>
  );
}
