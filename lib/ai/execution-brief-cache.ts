import type { ExecutionBrief, ExecutionBriefInput } from "./execution-gemini";

export const AI_BRIEF_CACHE_TTL_MS = 30 * 60 * 1000;
export const AI_BRIEF_FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000;

type CacheSource = "gemini" | "fallback";

export type CachedExecutionBrief = {
  brief: ExecutionBrief;
  createdAt: number;
  expiresAt: number;
  model?: string;
  source: CacheSource;
};

const cache = new Map<string, CachedExecutionBrief>();

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

export function createExecutionBriefCacheKey(input: ExecutionBriefInput) {
  return stableStringify({
    narrativeId: input.narrativeId,
    narrativeTitle: input.narrativeTitle,
    risk: input.risk,
    executionReadiness: {
      mode: input.executionReadiness.mode,
      network: input.executionReadiness.network,
      totalNotionalUsd: input.executionReadiness.totalNotionalUsd,
      tradableCount: input.executionReadiness.tradableCount,
      totalLegs: input.executionReadiness.totalLegs,
      weightedSlippagePct: input.executionReadiness.weightedSlippagePct,
      totalAskDepthUsd: input.executionReadiness.totalAskDepthUsd,
      summary: input.executionReadiness.summary,
      legs: input.executionReadiness.legs.map((leg) => ({
        asset: leg.asset,
        weight: leg.weight,
        tradable: leg.tradable,
        slippagePct: leg.slippagePct,
        sodexSymbol: leg.sodexSymbol,
      })),
    },
  });
}

function clearExpiredBriefs(now = Date.now()) {
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

export function getCachedExecutionBrief(key: string, now = Date.now()) {
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

export function setCachedExecutionBrief(
  key: string,
  value: Omit<CachedExecutionBrief, "createdAt" | "expiresAt">,
  ttlMs = AI_BRIEF_CACHE_TTL_MS,
  now = Date.now(),
) {
  clearExpiredBriefs(now);

  const cachedValue: CachedExecutionBrief = {
    ...value,
    createdAt: now,
    expiresAt: now + ttlMs,
  };

  cache.set(key, cachedValue);
  return cachedValue;
}

export function getExecutionCacheTtlSeconds(value: CachedExecutionBrief, now = Date.now()) {
  return Math.max(0, Math.ceil((value.expiresAt - now) / 1000));
}
