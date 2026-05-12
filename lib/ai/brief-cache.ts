import type { NarrativeBrief, NarrativeBriefInput } from "./gemini";

export const AI_BRIEF_CACHE_TTL_MS = 30 * 60 * 1000;
export const AI_BRIEF_FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheSource = "gemini" | "fallback";

export type CachedBrief = {
  brief: NarrativeBrief;
  createdAt: number;
  expiresAt: number;
  model?: string;
  source: CacheSource;
};

const cache = new Map<string, CachedBrief>();

function normalizeStringArray(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).sort();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createBriefCacheKey(input: NarrativeBriefInput) {
  return stableStringify({
    basis: normalizeStringArray(input.basis),
    confidence: input.confidence,
    generatedWeights: input.generatedWeights.map((asset) => ({
      asset: asset.asset,
      weight: asset.weight,
    })),
    narrativeId: input.narrativeId,
    risk: input.risk,
    signalScore: input.signalScore,
    title: input.title,
    topAssets: normalizeStringArray(input.topAssets),
  });
}

export function clearExpiredBriefs(now = Date.now()) {
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

export function getCachedBrief(key: string, now = Date.now()) {
  const value = cache.get(key);

  if (!value) {
    return undefined;
  }

  if (value.expiresAt <= now) {
    cache.delete(key);
    return undefined;
  }

  return value;
}

export function setCachedBrief(
  key: string,
  value: Omit<CachedBrief, "createdAt" | "expiresAt">,
  ttlMs = AI_BRIEF_CACHE_TTL_MS,
  now = Date.now(),
) {
  clearExpiredBriefs(now);

  const cachedValue: CachedBrief = {
    ...value,
    createdAt: now,
    expiresAt: now + ttlMs,
  };

  cache.set(key, cachedValue);
  return cachedValue;
}

export function getCacheTtlSeconds(value: CachedBrief, now = Date.now()) {
  return Math.max(0, Math.ceil((value.expiresAt - now) / 1000));
}
