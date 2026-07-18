import type { NarrativeSignal } from "@/lib/sosovalue";
import { getSodexNetwork } from "@/lib/sodex/config";

const CATEGORY_LIKE_TOKENS = new Set([
  "AI",
  "BITCOIN",
  "DEFI",
  "DEFISSI",
  "ETF",
  "LAYER2",
  "MAG7",
  "MAG7SSI",
  "RWA",
  "STABLECOIN",
]);

const testnetAssetsByNarrative: Record<string, string[]> = {
  ai: ["NVDA", "TSLA", "GOOGL", "MSFT", "AMZN"],
  "bitcoin-etf": ["BTC", "ETH", "SOL", "BNB", "DOGE"],
  rwa: ["LINK", "ETH", "XAUT", "BTC", "BNB"],
  defi: ["AAVE", "UNI", "LINK", "ETH", "AVAX"],
  stablecoin: ["USDT", "ETH", "BTC", "BNB", "SOL"],
  "layer-2": ["ETH", "SOL", "AVAX", "LINK", "BNB"],
};

export type AssetExtractionSource = "matched" | "title" | "related" | "default" | "testnet";

export type BasketAssetProvenance = {
  asset: string;
  evidenceCount: number;
  sources: AssetExtractionSource[];
  /** 0–100 blend of evidence frequency, optional liquidity, optional routability. */
  rankScore: number;
  liquidityHint?: string;
  routable?: boolean;
  reason: string;
};

type AssetAccumulator = {
  asset: string;
  evidenceCount: number;
  sources: Set<AssetExtractionSource>;
};

function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.]/g, "");
}

function isCategoryLikeToken(symbol: string, narrative: NarrativeSignal) {
  const normalized = normalizeTicker(symbol).replace(/\./g, "");
  const narrativeLabel = normalizeTicker(narrative.label).replace(/\./g, "");
  const narrativeId = normalizeTicker(narrative.id).replace(/-/g, "");

  if (CATEGORY_LIKE_TOKENS.has(normalized)) {
    return true;
  }

  if (normalized === narrativeLabel || normalized === narrativeId) {
    return true;
  }

  if (normalized.endsWith("SSI") && normalized.length > 5) {
    return true;
  }

  return false;
}

function isLikelyTradeTicker(symbol: string) {
  const normalized = normalizeTicker(symbol);
  return /^[A-Z0-9.]{2,10}$/.test(normalized);
}

function addCandidate(
  map: Map<string, AssetAccumulator>,
  raw: string,
  source: AssetExtractionSource,
  narrative: NarrativeSignal,
  listedSymbols?: Set<string>,
) {
  const asset = normalizeTicker(raw);
  if (!asset || !isLikelyTradeTicker(asset) || isCategoryLikeToken(asset, narrative)) {
    return;
  }

  if (listedSymbols && listedSymbols.size > 0 && !listedSymbols.has(asset)) {
    return;
  }

  const existing = map.get(asset);
  if (existing) {
    existing.evidenceCount += source === "default" || source === "testnet" ? 0 : 1;
    existing.sources.add(source);
    return;
  }

  map.set(asset, {
    asset,
    evidenceCount: source === "default" || source === "testnet" ? 0 : 1,
    sources: new Set([source]),
  });
}

/** Pull tickers from titles/summaries ($BTC or bare SYMBOL when in listed set). */
function extractTickersFromText(text: string, listedSymbols?: Set<string>) {
  const found = new Set<string>();
  const dollarMatches = text.matchAll(/\$([A-Za-z][A-Za-z0-9.]{1,9})\b/g);
  for (const match of dollarMatches) {
    const symbol = normalizeTicker(match[1] ?? "");
    if (symbol) {
      found.add(symbol);
    }
  }

  if (listedSymbols && listedSymbols.size > 0) {
    const tokens = text.toUpperCase().match(/\b[A-Z][A-Z0-9.]{1,9}\b/g) ?? [];
    for (const token of tokens) {
      const symbol = normalizeTicker(token);
      if (listedSymbols.has(symbol)) {
        found.add(symbol);
      }
    }
  }

  return Array.from(found);
}

export function extractNarrativeAssetCandidates(
  narrative: NarrativeSignal,
  defaultAssetsByNarrative: Record<string, string[]>,
  options?: { listedSymbols?: string[] },
): BasketAssetProvenance[] {
  const listedSymbols = options?.listedSymbols
    ? new Set(options.listedSymbols.map((symbol) => normalizeTicker(symbol)))
    : undefined;
  const map = new Map<string, AssetAccumulator>();

  if (getSodexNetwork() === "testnet") {
    const testnetDefaults = testnetAssetsByNarrative[narrative.id] ?? [];
    for (const asset of testnetDefaults) {
      addCandidate(map, asset, "testnet", narrative);
    }
  }

  const defaults = defaultAssetsByNarrative[narrative.id] ?? [];
  for (const asset of defaults) {
    addCandidate(map, asset, "default", narrative, listedSymbols);
  }

  for (const item of narrative.items) {
    for (const symbol of item.currencies) {
      addCandidate(map, symbol, "matched", narrative, listedSymbols);
    }

    const textBlob = `${item.title} ${item.content ?? ""}`;
    for (const symbol of extractTickersFromText(textBlob, listedSymbols)) {
      addCandidate(map, symbol, "title", narrative, listedSymbols);
    }
  }

  for (const symbol of narrative.relatedAssets) {
    addCandidate(map, symbol, "related", narrative, listedSymbols);
  }

  return Array.from(map.values()).map((entry) => {
    const sources = Array.from(entry.sources);
    const evidenceBoost = Math.min(40, entry.evidenceCount * 12);
    const sourceBoost = sources.includes("matched") || sources.includes("title") ? 15 : 0;
    const defaultBoost = sources.includes("default") || sources.includes("testnet") ? 8 : 0;
    const rankScore = Math.min(100, 20 + evidenceBoost + sourceBoost + defaultBoost);

    return {
      asset: entry.asset,
      evidenceCount: entry.evidenceCount,
      sources,
      rankScore,
      reason: buildReason(entry.evidenceCount, sources),
    };
  });
}

function buildReason(evidenceCount: number, sources: AssetExtractionSource[]) {
  const parts: string[] = [];
  if (sources.includes("matched")) {
    parts.push("SoSoValue matched_currencies");
  }
  if (sources.includes("title")) {
    parts.push("title/summary mention");
  }
  if (sources.includes("related")) {
    parts.push("related assets");
  }
  if (sources.includes("default")) {
    parts.push("narrative default");
  }
  if (sources.includes("testnet")) {
    parts.push("testnet proxy map");
  }
  if (evidenceCount > 0) {
    parts.push(`${evidenceCount} evidence hit${evidenceCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ") || "Included in basket";
}

export function rankBasketAssets(
  candidates: BasketAssetProvenance[],
  options?: {
    liquidityTurnoverByAsset?: Record<string, number>;
    routableByAsset?: Record<string, boolean>;
    max?: number;
  },
): BasketAssetProvenance[] {
  const max = options?.max ?? 5;
  const liquidity = options?.liquidityTurnoverByAsset ?? {};
  const routable = options?.routableByAsset ?? {};

  const ranked = candidates.map((candidate) => {
    const turnover = liquidity[candidate.asset];
    const isRoutable = routable[candidate.asset];
    let rankScore = candidate.rankScore;

    let liquidityHint: string | undefined;
    if (typeof turnover === "number" && turnover > 0) {
      const liquidityBoost = Math.min(25, Math.log10(turnover + 1) * 4);
      rankScore = Math.min(100, rankScore + liquidityBoost);
      liquidityHint = `CEX turnover signal ~$${Math.round(turnover).toLocaleString()}`;
    }

    if (isRoutable === true) {
      rankScore = Math.min(100, rankScore + 12);
    } else if (isRoutable === false) {
      rankScore = Math.max(0, rankScore - 8);
    }

    return {
      ...candidate,
      rankScore,
      liquidityHint,
      routable: isRoutable,
      reason:
        candidate.reason +
        (isRoutable === true ? " · SoDEX routable" : "") +
        (isRoutable === false ? " · SoDEX unmapped" : "") +
        (liquidityHint ? ` · ${liquidityHint}` : ""),
    };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore || b.evidenceCount - a.evidenceCount);

  return ranked.slice(0, max);
}

export function resolveNarrativeBasketAssets(
  narrative: NarrativeSignal,
  defaultAssetsByNarrative: Record<string, string[]>,
  options?: { listedSymbols?: string[] },
) {
  const candidates = extractNarrativeAssetCandidates(narrative, defaultAssetsByNarrative, options);
  const ranked = rankBasketAssets(candidates, { max: 5 });

  if (ranked.length > 0) {
    return ranked.map((item) => item.asset);
  }

  const defaults = defaultAssetsByNarrative[narrative.id] ?? [];
  return defaults.slice(0, 5);
}

export function resolveNarrativeBasketWithProvenance(
  narrative: NarrativeSignal,
  defaultAssetsByNarrative: Record<string, string[]>,
  options?: {
    listedSymbols?: string[];
    liquidityTurnoverByAsset?: Record<string, number>;
    routableByAsset?: Record<string, boolean>;
  },
) {
  const candidates = extractNarrativeAssetCandidates(narrative, defaultAssetsByNarrative, {
    listedSymbols: options?.listedSymbols,
  });
  const provenance = rankBasketAssets(candidates, {
    liquidityTurnoverByAsset: options?.liquidityTurnoverByAsset,
    routableByAsset: options?.routableByAsset,
    max: 5,
  });

  return {
    assets: provenance.map((item) => item.asset),
    provenance,
  };
}

/** Attach CEX liquidity + SoDEX routability to an already-selected basket without reshuffling legs. */
export function enrichSelectedBasketProvenance(
  selected: BasketAssetProvenance[],
  options?: {
    liquidityTurnoverByAsset?: Record<string, number>;
    routableByAsset?: Record<string, boolean>;
  },
): BasketAssetProvenance[] {
  const liquidity = options?.liquidityTurnoverByAsset ?? {};
  const routable = options?.routableByAsset ?? {};

  return selected.map((candidate) => {
    const turnover = liquidity[candidate.asset];
    const isRoutable = routable[candidate.asset];
    let rankScore = candidate.rankScore;
    let liquidityHint: string | undefined;

    if (typeof turnover === "number" && turnover > 0) {
      rankScore = Math.min(100, rankScore + Math.min(25, Math.log10(turnover + 1) * 4));
      liquidityHint = `CEX turnover signal ~$${Math.round(turnover).toLocaleString()}`;
    }

    if (isRoutable === true) {
      rankScore = Math.min(100, rankScore + 12);
    } else if (isRoutable === false) {
      rankScore = Math.max(0, rankScore - 8);
    }

    return {
      ...candidate,
      rankScore,
      liquidityHint,
      routable: isRoutable,
      reason:
        candidate.reason +
        (isRoutable === true ? " · SoDEX routable" : "") +
        (isRoutable === false ? " · SoDEX unmapped" : "") +
        (liquidityHint ? ` · ${liquidityHint}` : ""),
    };
  });
}
