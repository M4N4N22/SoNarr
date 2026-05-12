import type { CurrencyRef, NarrativeSignal, RadarData } from "@/lib/sosovalue";

export const SIGNAL_STACK_ENDPOINTS = {
  indexConstituents: "/indices/{index_ticker}/constituents",
  indexList: "/indices",
  indexMarketSnapshot: "/indices/{index_ticker}/market-snapshot",
  marketSnapshot: "/currencies/{currency_id}/market-snapshot",
  sectorSpotlight: "/currencies/sector-spotlight",
  tradingPairs: "/currencies/{currency_id}/pairs",
} as const;

export type SignalStackLayer = {
  name: string;
  score?: number;
  status?: "Pending" | "Needs endpoint wiring";
  description: string;
  explanation: string;
  evidence: string[];
  sourceLabel: string;
  dataMode: "Live" | "Mixed" | "Derived" | "Fallback" | "Pending";
};

type MarketSnapshot = {
  changePct24h?: number;
  marketcapRank?: number;
  price?: number;
  symbol: string;
  turnover24h?: number;
};

export type NarrativeSignalStack = {
  overallScore: number;
  strongestLayer: string;
  weakestLayer: string;
  mode: "Live" | "Mixed" | "Derived" | "Fallback";
  conclusion: string;
  layers: SignalStackLayer[];
};

type WeightedAsset = {
  asset: string;
  weight: number;
};

type BuildSignalStackInput = {
  assets: string[];
  evidenceBullets: string[];
  marketSnapshots?: MarketSnapshot[];
  narrative: NarrativeSignal;
  radar: RadarData;
  riskLevel: string;
  weightedAssets: WeightedAsset[];
};

type UnknownRecord = Record<string, unknown>;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function responsePayload(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return isRecord(value.data) ? value.data : value;
}

function sourceMode(radar: RadarData, narrative: NarrativeSignal) {
  if (radar.source === "fallback" || narrative.source === "fallback") {
    return "Fallback" as const;
  }

  if (radar.source === "mixed") {
    return "Mixed" as const;
  }

  return "Live" as const;
}

function scoreLabel(layer: SignalStackLayer) {
  return layer.score === undefined ? layer.status ?? "Pending" : `${layer.score}/100`;
}

function uniqueCurrencyRefs(narrative: NarrativeSignal) {
  const byId = new Map<string, CurrencyRef>();

  for (const item of narrative.items) {
    for (const currency of item.currencyRefs) {
      if (currency.id && !byId.has(currency.id)) {
        byId.set(currency.id, currency);
      }
    }
  }

  return Array.from(byId.values()).slice(0, 4);
}

async function requestSoSoValue(path: string) {
  const apiKey = process.env.SOSOVALUE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SOSOVALUE_API_KEY.");
  }

  const baseUrl =
    process.env.SOSOVALUE_API_BASE_URL ?? "https://openapi.sosovalue.com/api/v1";
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: "application/json",
      "x-soso-api-key": apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`SoSoValue signal-stack request failed with ${response.status}.`);
  }

  return response.json();
}

async function getMarketSnapshot(currency: CurrencyRef): Promise<MarketSnapshot | undefined> {
  if (!currency.id) {
    return undefined;
  }

  const response = await requestSoSoValue(`/currencies/${currency.id}/market-snapshot`);
  const payload = responsePayload(response);
  if (!payload) {
    return undefined;
  }

  return {
    changePct24h: asNumber(payload.change_pct_24h),
    marketcapRank: asNumber(payload.marketcap_rank),
    price: asNumber(payload.price),
    symbol: currency.symbol,
    turnover24h: asNumber(payload.turnover_24h),
  };
}

export async function getNarrativeMarketSnapshots(narrative: NarrativeSignal) {
  const currencies = uniqueCurrencyRefs(narrative);
  const snapshots: MarketSnapshot[] = [];

  for (const currency of currencies) {
    try {
      const snapshot = await getMarketSnapshot(currency);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    } catch {
      // Market momentum is an enrichment layer. Keep the page resilient if a
      // currency endpoint fails or rate-limits.
    }
  }

  return snapshots;
}

function buildMarketMomentumLayer({
  marketSnapshots,
  topAssets,
}: {
  marketSnapshots: MarketSnapshot[];
  topAssets: string[];
}): SignalStackLayer {
  if (marketSnapshots.length === 0) {
    return {
      name: "Market momentum",
      status: "Pending",
      description:
        "Checks whether related assets show movement through market snapshot or historical kline data.",
      explanation:
        "SoNarr found related assets, but live market snapshot confirmation is unavailable for this narrative right now.",
      evidence: [
        `Related assets queued for market checks: ${topAssets.join(", ")}.`,
        `Market snapshot endpoint: ${SIGNAL_STACK_ENDPOINTS.marketSnapshot}.`,
      ],
      sourceLabel: "SoSoValue market snapshot",
      dataMode: "Pending",
    };
  }

  const averageAbsChange =
    marketSnapshots.reduce(
      (sum, snapshot) => sum + Math.abs(snapshot.changePct24h ?? 0),
      0,
    ) / marketSnapshots.length;
  const rankedAssets = marketSnapshots.filter(
    (snapshot) => snapshot.marketcapRank !== undefined,
  ).length;
  const score = clampScore(45 + averageAbsChange * 6 + rankedAssets * 8);
  const movers = marketSnapshots
    .map((snapshot) => {
      const change =
        snapshot.changePct24h === undefined
          ? "change unavailable"
          : `${snapshot.changePct24h.toFixed(2)}% 24h`;
      return `${snapshot.symbol}: ${change}`;
    })
    .slice(0, 4);

  return {
    name: "Market momentum",
    score,
    description:
      "Checks whether related assets show movement through market snapshot or historical kline data.",
    explanation:
      "SoNarr confirmed live market snapshot data for matched assets in this narrative. Kline confirmation can be added next for a longer historical read.",
    evidence: [
      `Live market snapshots resolved for ${marketSnapshots.length} related assets.`,
      ...movers,
    ],
    sourceLabel: "SoSoValue market snapshot",
    dataMode: "Live",
  };
}

export function buildNarrativeSignalStack({
  assets,
  evidenceBullets,
  marketSnapshots = [],
  narrative,
  radar,
  riskLevel,
  weightedAssets,
}: BuildSignalStackInput): NarrativeSignalStack {
  const baseMode = sourceMode(radar, narrative);
  const topAssets = assets.slice(0, 5);
  const indexCoverage = weightedAssets.length / Math.max(1, topAssets.length);
  const sourceEvidence = evidenceBullets.slice(0, 3);

  const layers: SignalStackLayer[] = [
    {
      name: "News heat",
      score: clampScore(narrative.score),
      description:
        "Measures how strongly the narrative appears in SoSoValue hot news and news search.",
      explanation:
        "This is the strongest live signal currently available because the radar is built from SoSoValue feed and search responses.",
      evidence: sourceEvidence,
      sourceLabel: "SoSoValue hot news and news search",
      dataMode: baseMode,
    },
    buildMarketMomentumLayer({ marketSnapshots, topAssets }),
    {
      name: "Sector alignment",
      score: clampScore(narrative.confidence * 0.72 + topAssets.length * 4),
      description:
        "Checks whether the narrative maps to sector or spotlight data.",
      explanation:
        "This first version derives sector alignment from narrative category confidence and mapped assets until sector spotlight matching is wired.",
      evidence: [
        `${narrative.label} maps to ${topAssets.length} tracked assets in the current narrative model.`,
        `Sector/spotlight endpoint ready for future enrichment: ${SIGNAL_STACK_ENDPOINTS.sectorSpotlight}.`,
      ],
      sourceLabel: "SoSoValue sector/spotlight",
      dataMode: "Derived",
    },
    {
      name: "Index relevance",
      score: clampScore(indexCoverage * 70 + weightedAssets.length * 4),
      description:
        "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
      explanation:
        "Index relevance is derived from the generated basket coverage now, with index constituent checks isolated for the next live enrichment pass.",
      evidence: [
        `Generated basket covers ${weightedAssets.length} assets: ${weightedAssets
          .map((asset) => `${asset.asset} ${asset.weight}%`)
          .join(", ")}.`,
        `Index endpoints ready for wiring: ${SIGNAL_STACK_ENDPOINTS.indexList} and ${SIGNAL_STACK_ENDPOINTS.indexConstituents}.`,
      ],
      sourceLabel: "SoSoValue index data",
      dataMode: "Derived",
    },
    {
      name: "Execution readiness",
      status: "Pending",
      description:
        "Tracks whether the basket is ready for future SoDEX orderbook, slippage, and route checks.",
      explanation:
        "Execution remains preview-only. No signed writes, routes, wallet connections, or trades are available in Wave 1.",
      evidence: [
        `Current risk posture: ${riskLevel}.`,
        "Orderbook depth, slippage, and basket route checks are pending SoDEX integration.",
      ],
      sourceLabel: "SoDEX preview",
      dataMode: "Pending",
    },
  ];

  const scoredLayers = layers.filter(
    (layer): layer is SignalStackLayer & { score: number } =>
      typeof layer.score === "number",
  );
  const overallScore = clampScore(
    scoredLayers.reduce((sum, layer) => sum + layer.score, 0) /
      Math.max(1, scoredLayers.length),
  );
  const strongestLayer = scoredLayers.reduce((best, layer) =>
    layer.score > best.score ? layer : best,
  );
  const weakestLayer = scoredLayers.reduce((weakest, layer) =>
    layer.score < weakest.score ? layer : weakest,
  );
  const mode =
    baseMode === "Fallback"
      ? "Fallback"
      : layers.some((layer) => layer.dataMode === "Pending")
        ? "Mixed"
        : baseMode;

  return {
    overallScore,
    strongestLayer: `${strongestLayer.name} (${scoreLabel(strongestLayer)})`,
    weakestLayer: `${weakestLayer.name} (${scoreLabel(weakestLayer)})`,
    mode,
    conclusion:
      "This narrative is strongest on news heat and market attention, while execution readiness remains in preview mode until SoDEX orderbook checks are connected.",
    layers,
  };
}
