import type { ExecutionBriefInput } from "@/lib/ai/execution-gemini";
import type { NarrativeBriefInput } from "@/lib/ai/gemini";
import type { BasketExecutionReadiness } from "@/lib/sodex";
import type { BasketLiquidityContext } from "@/lib/sosovalue/enrichment";
import type { NarrativeSignalStack as SignalStackData } from "@/lib/sonarr/signal-stack";
import type {
  EtfMarketSnapshot,
  IndexMarketSnapshot,
  KlineTrend,
  MacroEventDay,
} from "@/lib/sosovalue/enrichment";
import type { NewsItem as FeedNewsItem } from "@/lib/sosovalue";

export type WeightedAsset = { asset: string; weight: number };

export type NarrativeWorkspaceTab = "overview" | "evidence" | "product" | "launch";

export type NarrativeWorkspaceProps = {
  narrative: {
    id: string;
    label: string;
    score: number;
    confidence: number;
    status: string;
    items: Array<{
      id: string;
      title: string;
      sourceLink: string;
      releaseTime: number;
    }>;
  };
  radarUpdatedAt: string;
  sourceLabel: string;
  riskLevel: string;
  brief: {
    what: string;
    whyNow: string;
    behavior: string;
  };
  evidenceBullets: string[];
  evidenceSummary: {
    searchMatches: number;
    headlineCount: number;
    latestTitle: string;
  };
  assets: string[];
  weightedAssets: WeightedAsset[];
  methodology: string[];
  signalStack: SignalStackData;
  executionReadiness: BasketExecutionReadiness;
  liquidityContext: BasketLiquidityContext;
  aiBriefInput: NarrativeBriefInput;
  executionBriefInput: ExecutionBriefInput;
  launchRoom: {
    narrativeTitle: string;
    summary: string;
    whyNow: string;
    signalScore: number;
    confidence: number;
    risk: string;
    evidenceBullets: string[];
    topAssets: string[];
    weightedAssets: WeightedAsset[];
    methodology: string[];
  };
  enrichment: {
    featuredNews: FeedNewsItem[];
    klineTrends: KlineTrend[];
    indexSnapshots: IndexMarketSnapshot[];
    etfSnapshot?: EtfMarketSnapshot;
    macroEvents: MacroEventDay[];
  };
};

export const narrativeTabs: Array<{
  id: NarrativeWorkspaceTab;
  label: string;
  hint: string;
  title: string;
  description: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    hint: "Scores and where you are in the pipeline.",
    title: "Overview",
    description:
      "Start here for headline scores, the detect→validate→index→SoDEX pipeline, and a short narrative brief.",
  },
  {
    id: "evidence",
    label: "Evidence",
    hint: "News and SoSoValue layers behind the theme.",
    title: "Evidence",
    description:
      "Headlines, the multi-layer signal stack, and deeper SoSoValue market data that support (or weaken) this narrative.",
  },
  {
    id: "product",
    label: "Index",
    hint: "Suggested basket weights — research only.",
    title: "Index preview",
    description:
      "The proposed weighted basket for this narrative: asset mix, methodology rules, and risk checks. No live trading on this tab.",
  },
  {
    id: "launch",
    label: "Launch",
    hint: "SoDEX checks, wallet trade, and publish kit.",
    title: "Launch & SoDEX",
    description:
      "Check on-chain route readiness, connect your wallet to preview or submit a basket, then grab launch copy or AI summaries.",
  },
];

export function getNarrativeTab(id: NarrativeWorkspaceTab) {
  return narrativeTabs.find((tab) => tab.id === id) ?? narrativeTabs[0];
}
