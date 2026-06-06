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

export function resolveNarrativeBasketAssets(
  narrative: NarrativeSignal,
  defaultAssetsByNarrative: Record<string, string[]>,
) {
  if (getSodexNetwork() === "testnet") {
    const testnetDefaults = testnetAssetsByNarrative[narrative.id];
    if (testnetDefaults?.length) {
      return testnetDefaults.slice(0, 5);
    }
  }

  const defaults = defaultAssetsByNarrative[narrative.id] ?? [];
  const evidenceAssets = narrative.items
    .flatMap((item) => item.currencies)
    .filter((symbol) => isLikelyTradeTicker(symbol) && !isCategoryLikeToken(symbol, narrative));
  const relatedAssets = narrative.relatedAssets.filter(
    (symbol) => isLikelyTradeTicker(symbol) && !isCategoryLikeToken(symbol, narrative),
  );

  const merged = Array.from(
    new Set(
      [...defaults, ...evidenceAssets, ...relatedAssets]
        .map((symbol) => normalizeTicker(symbol))
        .filter(Boolean),
    ),
  );

  if (merged.length > 0) {
    return merged.slice(0, 5);
  }

  return defaults.slice(0, 5);
}
