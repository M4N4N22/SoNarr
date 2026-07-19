import type { ExecutionBriefInput } from "@/lib/ai/execution-gemini";
import type { DecisionAssistInput } from "@/lib/ai/decision-gemini";
import type { NarrativeBriefInput } from "@/lib/ai/gemini";
import type { BasketExecutionReadiness } from "@/lib/sodex";
import type { BasketAssetProvenance } from "@/lib/sonarr/basket-assets";
import type { NarrativeLifecycleState } from "@/lib/sonarr/lifecycle";
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

export type NarrativeWorkspaceTab =
  | "overview"
  | "evidence"
  | "product"
  | "lifecycle"
  | "launch";

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
  assetProvenance: BasketAssetProvenance[];
  methodology: string[];
  signalStack: SignalStackData;
  executionReadiness: BasketExecutionReadiness;
  liquidityContext: BasketLiquidityContext;
  lifecycle: NarrativeLifecycleState;
  aiBriefInput: NarrativeBriefInput;
  executionBriefInput: ExecutionBriefInput;
  decisionAssistInput: DecisionAssistInput;
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
  /** SoSoValue SSI tickers related to this basket + constituent overlap. */
  relevantIndexTickers: string[];
  indexOverlaps: Array<{
    asset: string;
    indexTicker: string;
    weight?: number;
  }>;
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
    hint: "Analytics for signals, klines, and liquidity.",
    title: "Evidence",
    description:
      "Live SoSoValue analytics — conviction radar, layer scores, asset returns, CEX liquidity, and supporting headlines.",
  },
  {
    id: "product",
    label: "Index",
    hint: "Package evidence into a weighted basket.",
    title: "Basket from evidence",
    description:
      "Turn Evidence into target weights and leg provenance, check SSI benchmark overlap, then carry Lifecycle stage and SoDEX readiness into Launch. Research packaging only — no live trading here.",
  },
  {
    id: "lifecycle",
    label: "Lifecycle",
    hint: "Score history and forward-return proof.",
    title: "Narrative lifecycle",
    description:
      "Conviction snapshots over time, lifecycle stage, and forward returns from SoSoValue klines — evidence that the narrative loop improves decisions.",
  },
  {
    id: "launch",
    label: "Launch",
    hint: "Buy the basket on SoDEX.",
    title: "SoDEX",
    description: "Size the basket, review limit orders, and buy with wallet signatures.",
  },
];

export function getNarrativeTab(id: NarrativeWorkspaceTab) {
  return narrativeTabs.find((tab) => tab.id === id) ?? narrativeTabs[0];
}
