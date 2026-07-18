import type { LifecycleValidation, LifecycleStage } from "@/lib/sonarr/lifecycle";
import type { BasketExecutionReadiness } from "@/lib/sodex";

import {
  AI_BRIEF_CACHE_TTL_MS,
  AI_BRIEF_FALLBACK_CACHE_TTL_MS,
} from "./execution-brief-cache";

export type DecisionAssistInput = {
  narrativeId?: string;
  narrativeTitle: string;
  risk: string;
  stage: LifecycleStage;
  overallScore?: number;
  narrativeScore: number;
  confidence: number;
  validation?: Pick<
    LifecycleValidation,
    | "mode"
    | "summary"
    | "highConviction"
    | "lowConviction"
    | "refinementCues"
    | "rebalanceSuggested"
    | "scoreDeltaPct"
  >;
  executionReadiness: Pick<
    BasketExecutionReadiness,
    "mode" | "network" | "tradableCount" | "totalLegs" | "weightedSlippagePct" | "summary"
  >;
};

export type DecisionAction = "hold" | "size-down" | "wait" | "rebalance";

export type DecisionAssistBrief = {
  action: DecisionAction;
  rationale: string;
  evidencePoints: string[];
  risks: string[];
  nextCheck: string;
};

export type DecisionAssistResult = {
  source: "gemini" | "cache" | "fallback";
  cached: boolean;
  cacheTtlSeconds?: number;
  brief: DecisionAssistBrief;
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

const decisionCache = new Map<
  string,
  { brief: DecisionAssistBrief; expiresAt: number; source: "gemini" | "fallback" }
>();

function fallbackBrief(input: DecisionAssistInput): DecisionAssistBrief {
  const coverage =
    input.executionReadiness.totalLegs > 0
      ? input.executionReadiness.tradableCount / input.executionReadiness.totalLegs
      : 0;

  let action: DecisionAction = "hold";
  if (input.validation?.rebalanceSuggested) {
    action = "rebalance";
  } else if (input.stage === "Cooling" || input.stage === "Faded") {
    action = "size-down";
  } else if (input.stage === "Watching" || coverage < 0.5) {
    action = "wait";
  }

  const evidencePoints = [
    `Lifecycle stage: ${input.stage}.`,
    `Conviction ${input.overallScore ?? input.narrativeScore}/100 · confidence ${input.confidence}/100.`,
    `SoDEX coverage ${input.executionReadiness.tradableCount}/${input.executionReadiness.totalLegs} on ${input.executionReadiness.network}.`,
    ...(input.validation?.refinementCues ?? []).slice(0, 2),
  ];

  return {
    action,
    rationale:
      action === "rebalance"
        ? "Score trajectory crossed the rebalance threshold; review weights before adding risk."
        : action === "size-down"
          ? "Narrative is cooling or fading — reduce exposure rather than adding size."
          : action === "wait"
            ? "Conviction or route coverage is not ready for a full basket — wait for stronger evidence or routability."
            : "Lifecycle and readiness do not show an urgent change — hold the research stance.",
    evidencePoints,
    risks: [
      "Decision assist is bounded to provided lifecycle + readiness JSON — not financial advice.",
      "Forward-return samples can be thin on new narratives.",
    ],
    nextCheck:
      "Re-open this narrative after the next score snapshot or after SoDEX fills update the trade journal.",
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

function parseBrief(value: unknown): DecisionAssistBrief | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const action = record.action;
  const rationale = record.rationale;
  const nextCheck = record.nextCheck;
  const evidencePoints = asStringArray(record.evidencePoints);
  const risks = asStringArray(record.risks);

  if (
    (action !== "hold" &&
      action !== "size-down" &&
      action !== "wait" &&
      action !== "rebalance") ||
    typeof rationale !== "string" ||
    typeof nextCheck !== "string" ||
    !evidencePoints ||
    !risks
  ) {
    return undefined;
  }

  return { action, rationale, evidencePoints, risks, nextCheck };
}

function getGeminiText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join("");
}

function cacheKey(input: DecisionAssistInput) {
  return JSON.stringify({
    narrativeId: input.narrativeId,
    stage: input.stage,
    overallScore: input.overallScore,
    narrativeScore: input.narrativeScore,
    rebalanceSuggested: input.validation?.rebalanceSuggested,
    scoreDeltaPct: input.validation?.scoreDeltaPct,
    tradableCount: input.executionReadiness.tradableCount,
    totalLegs: input.executionReadiness.totalLegs,
    mode: input.executionReadiness.mode,
  });
}

function buildPrompt(input: DecisionAssistInput) {
  return `You are SoNarr's bounded decision-assist layer (not a black-box alpha engine).

Your job:
Recommend one operator action for a narrative basket using ONLY the provided lifecycle stats and SoDEX readiness.

Hard rules:
- Do not invent fills, prices, PnL, or kline numbers.
- Use only the JSON input.
- Do not provide financial advice or guarantee outcomes.
- Do not recommend automatic trading.
- action must be exactly one of: hold | size-down | wait | rebalance
- Return only valid JSON:
{
  "action": "hold|size-down|wait|rebalance",
  "rationale": "string",
  "evidencePoints": ["string"],
  "risks": ["string"],
  "nextCheck": "string"
}

Input:
${JSON.stringify(input, null, 2)}`;
}

export async function generateDecisionAssist(
  input: DecisionAssistInput,
  options: { forceRefresh?: boolean } = {},
): Promise<DecisionAssistResult> {
  const key = cacheKey(input);
  const now = Date.now();
  const cached = options.forceRefresh ? undefined : decisionCache.get(key);

  if (cached && cached.expiresAt > now) {
    return {
      source: "cache",
      cached: true,
      cacheTtlSeconds: Math.max(1, Math.round((cached.expiresAt - now) / 1000)),
      brief: cached.brief,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const brief = fallbackBrief(input);
    decisionCache.set(key, {
      brief,
      source: "fallback",
      expiresAt: now + AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    });
    return { source: "fallback", cached: false, brief };
  }

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const brief = fallbackBrief(input);
      decisionCache.set(key, {
        brief,
        source: "fallback",
        expiresAt: now + AI_BRIEF_FALLBACK_CACHE_TTL_MS,
      });
      return { source: "fallback", cached: false, brief };
    }

    const payload = (await response.json()) as GeminiResponse;
    const text = getGeminiText(payload);
    const parsed = text ? parseBrief(JSON.parse(cleanJsonText(text))) : undefined;
    const brief = parsed ?? fallbackBrief(input);

    decisionCache.set(key, {
      brief,
      source: parsed ? "gemini" : "fallback",
      expiresAt: now + (parsed ? AI_BRIEF_CACHE_TTL_MS : AI_BRIEF_FALLBACK_CACHE_TTL_MS),
    });

    return {
      source: parsed ? "gemini" : "fallback",
      cached: false,
      brief,
    };
  } catch {
    const brief = fallbackBrief(input);
    decisionCache.set(key, {
      brief,
      source: "fallback",
      expiresAt: now + AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    });
    return { source: "fallback", cached: false, brief };
  }
}
