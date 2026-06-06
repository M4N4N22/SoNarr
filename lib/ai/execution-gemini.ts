import type { BasketExecutionReadiness } from "@/lib/sodex";

import {
  AI_BRIEF_FALLBACK_CACHE_TTL_MS,
  AI_BRIEF_CACHE_TTL_MS,
  createExecutionBriefCacheKey,
  getCachedExecutionBrief,
  getExecutionCacheTtlSeconds,
  setCachedExecutionBrief,
} from "./execution-brief-cache";

export type ExecutionBriefInput = {
  narrativeId?: string;
  narrativeTitle: string;
  risk: string;
  executionReadiness: Pick<
    BasketExecutionReadiness,
    | "mode"
    | "network"
    | "totalNotionalUsd"
    | "tradableCount"
    | "totalLegs"
    | "weightedSlippagePct"
    | "totalAskDepthUsd"
    | "totalBidDepthUsd"
    | "summary"
    | "legs"
  >;
};

export type ExecutionBrief = {
  routeSummary: string;
  depthAssessment: string[];
  slippageAssessment: string[];
  missingMarkets: string[];
  readinessVerdict: string;
  suggestedNextStep: string;
};

export type ExecutionBriefResult = {
  source: "gemini" | "cache" | "fallback";
  cached: boolean;
  cacheTtlSeconds?: number;
  brief: ExecutionBrief;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function fallbackBrief(input: ExecutionBriefInput): ExecutionBrief {
  const { executionReadiness } = input;
  const missing = executionReadiness.legs
    .filter((leg) => !leg.tradable)
    .map((leg) => leg.asset);

  return {
    routeSummary: executionReadiness.summary,
    depthAssessment: [
      `Ask-side depth across resolved SoDEX ${executionReadiness.network} markets: $${Math.round(executionReadiness.totalAskDepthUsd).toLocaleString()}.`,
      `${executionReadiness.tradableCount}/${executionReadiness.totalLegs} basket legs mapped to tradable spot markets.`,
    ],
    slippageAssessment: [
      executionReadiness.weightedSlippagePct !== undefined
        ? `Estimated weighted slippage for a $${executionReadiness.totalNotionalUsd.toLocaleString()} basket: ${executionReadiness.weightedSlippagePct.toFixed(2)}%.`
        : "Slippage could not be estimated because one or more legs lacked sufficient ask depth.",
    ],
    missingMarkets:
      missing.length > 0
        ? missing.map((asset) => `${asset} has no resolved SoDEX spot route in the current basket.`)
        : ["All basket legs mapped to SoDEX spot markets in the current check."],
    readinessVerdict:
      executionReadiness.mode === "live"
        ? "The basket appears route-ready on SoDEX for read-only execution planning."
        : executionReadiness.mode === "partial"
          ? "The basket is partially route-ready. Review missing markets before any signed execution step."
          : "SoDEX execution readiness is unavailable for this basket right now.",
    suggestedNextStep:
      "Review the execution route table, confirm market coverage, and require explicit user approval before any wallet or signed-order integration.",
  };
}

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : undefined;
}

function parseBrief(value: unknown): ExecutionBrief | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const routeSummary = record.routeSummary;
  const readinessVerdict = record.readinessVerdict;
  const suggestedNextStep = record.suggestedNextStep;
  const depthAssessment = asStringArray(record.depthAssessment);
  const slippageAssessment = asStringArray(record.slippageAssessment);
  const missingMarkets = asStringArray(record.missingMarkets);

  if (
    typeof routeSummary !== "string" ||
    typeof readinessVerdict !== "string" ||
    typeof suggestedNextStep !== "string" ||
    !depthAssessment ||
    !slippageAssessment ||
    !missingMarkets
  ) {
    return undefined;
  }

  return {
    routeSummary,
    depthAssessment,
    slippageAssessment,
    missingMarkets,
    readinessVerdict,
    suggestedNextStep,
  };
}

function getGeminiText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join("");
}

function buildPrompt(input: ExecutionBriefInput) {
  return `You are SoNarr's execution synthesis layer.

Your job:
Turn provided SoDEX orderbook readiness data into a concise execution-readiness brief for a narrative index basket.

Hard rules:
- Do not invent facts, prices, markets, slippage numbers, or coverage counts.
- Use only the provided execution readiness input.
- Do not provide financial advice.
- Do not guarantee returns or fills.
- Do not recommend placing trades automatically.
- If coverage is partial or unavailable, say so clearly.
- Keep output concise and structured.
- Return only valid JSON with this exact shape:
{
  "routeSummary": "string",
  "depthAssessment": ["string"],
  "slippageAssessment": ["string"],
  "missingMarkets": ["string"],
  "readinessVerdict": "string",
  "suggestedNextStep": "string"
}

Input:
${JSON.stringify(input, null, 2)}`;
}

export async function generateExecutionBrief(
  input: ExecutionBriefInput,
  options: { forceRefresh?: boolean } = {},
): Promise<ExecutionBriefResult> {
  const cacheKey = createExecutionBriefCacheKey(input);
  const cachedBrief = options.forceRefresh ? undefined : getCachedExecutionBrief(cacheKey);

  if (cachedBrief) {
    return {
      source: "cache",
      cached: true,
      cacheTtlSeconds: getExecutionCacheTtlSeconds(cachedBrief),
      brief: cachedBrief.brief,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const cached = setCachedExecutionBrief(
      cacheKey,
      {
        source: "fallback",
        brief: fallbackBrief(input),
      },
      AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    );

    return {
      source: "fallback",
      cached: false,
      cacheTtlSeconds: getExecutionCacheTtlSeconds(cached),
      brief: cached.brief,
    };
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = getGeminiText(payload);
    if (!text) {
      throw new Error("Gemini response did not include text.");
    }

    const parsed = parseBrief(JSON.parse(cleanJsonText(text)));
    if (!parsed) {
      throw new Error("Gemini response did not match the expected execution brief schema.");
    }

    const cached = setCachedExecutionBrief(cacheKey, {
      source: "gemini",
      model: GEMINI_MODEL,
      brief: parsed,
    });

    return {
      source: "gemini",
      cached: false,
      cacheTtlSeconds: Math.ceil(AI_BRIEF_CACHE_TTL_MS / 1000),
      brief: cached.brief,
    };
  } catch {
    const cached = setCachedExecutionBrief(
      cacheKey,
      {
        source: "fallback",
        brief: fallbackBrief(input),
      },
      AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    );

    return {
      source: "fallback",
      cached: false,
      cacheTtlSeconds: getExecutionCacheTtlSeconds(cached),
      brief: cached.brief,
    };
  }
}
