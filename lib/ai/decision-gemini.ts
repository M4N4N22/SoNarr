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
    | "anchorMode"
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
  const networkLabel =
    input.executionReadiness.network === "mainnet" ? "mainnet" : "testnet";
  const illustrative =
    input.validation?.anchorMode === "bar_relative_illustrative";

  let action: DecisionAction = "hold";
  if (input.validation?.rebalanceSuggested) {
    action = "rebalance";
  } else if (input.stage === "Cooling" || input.stage === "Faded") {
    action = "size-down";
  } else if (input.stage === "Watching" || coverage < 0.5 || illustrative) {
    action = "wait";
  }

  const evidencePoints = [
    `Lifecycle stage is ${input.stage}.`,
    `Conviction is ${input.overallScore ?? input.narrativeScore}/100 with confidence ${input.confidence}/100.`,
    `${input.executionReadiness.tradableCount} of ${input.executionReadiness.totalLegs} basket legs map to live SoDEX ${networkLabel} markets.`,
    illustrative
      ? "Forward-return checks are illustrative only — snapshots are still too fresh for a multi-day track record."
      : (input.validation?.summary ?? "Forward-return history is still building for this narrative."),
  ].filter(Boolean);

  return {
    action,
    rationale:
      action === "rebalance"
        ? "Score trajectory crossed the rebalance threshold; review weights before adding risk."
        : action === "size-down"
          ? "Narrative is cooling or fading — reduce exposure rather than adding size."
          : action === "wait"
            ? illustrative
              ? "High conviction alone is not enough yet — wait for real multi-day lifecycle proof and better SoDEX coverage before sizing up."
              : "Conviction or route coverage is not ready for a full basket — wait for stronger evidence or routability."
            : "Lifecycle and readiness do not show an urgent change — hold the research stance.",
    evidencePoints: evidencePoints.map(humanizeOperatorCopy),
    risks: [
      "Research aid only — not financial advice and not an automatic trade.",
      illustrative
        ? "Forward-return numbers are illustrative only (fresh snapshots) — not a multi-day track record."
        : "Forward-return samples can be thin on new narratives.",
    ].map(humanizeOperatorCopy),
    nextCheck:
      "Check again after the next conviction snapshot, or after SoDEX fills show up in the trade journal.",
  };
}

/** Strip code/JSON field names so operator-facing copy stays human. */
function humanizeOperatorCopy(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\bvalidation\.summary\b/gi, "forward-return summary")
    .replace(/\bvalidation\.refinementCues\b/gi, "lifecycle cues")
    .replace(/\bvalidation\.rebalanceSuggested\b/gi, "rebalance suggestion")
    .replace(/\bvalidation\.mode\b/gi, "validation status")
    .replace(/\bvalidation\.anchorMode\b/gi, "history quality")
    .replace(/\bvalidation\b/gi, "forward-return check")
    .replace(/\bexecutionReadiness\.summary\b/gi, "SoDEX route summary")
    .replace(/\bexecutionReadiness\.[A-Za-z]+\b/gi, "SoDEX readiness")
    .replace(/\bexecutionReadiness\b/gi, "SoDEX readiness")
    .replace(/\bnarrativeScore\b/gi, "conviction score")
    .replace(/\boverallScore\b/gi, "overall score")
    .replace(/\brebalanceSuggested\b/gi, "rebalance suggestion")
    .replace(/\brefinementCues\b/gi, "lifecycle cues")
    .replace(/\banchorMode\b/gi, "history quality")
    .replace(/\bNarrative\s+stage\b/gi, "Lifecycle stage")
    .replace(/\bstates\b(?=\s+['"])/gi, "says")
    .replace(/\sindicates\b(?=\s+['"])/gi, "shows")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeBrief(brief: DecisionAssistBrief): DecisionAssistBrief {
  return {
    ...brief,
    rationale: humanizeOperatorCopy(brief.rationale),
    evidencePoints: brief.evidencePoints.map(humanizeOperatorCopy),
    risks: brief.risks.map(humanizeOperatorCopy),
    nextCheck: humanizeOperatorCopy(brief.nextCheck),
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

function buildHumanFactSheet(input: DecisionAssistInput) {
  const illustrative = input.validation?.anchorMode === "bar_relative_illustrative";
  return {
    narrative: input.narrativeTitle,
    riskLabel: input.risk,
    lifecycleStage: input.stage,
    convictionScore: input.overallScore ?? input.narrativeScore,
    confidenceScore: input.confidence,
    forwardReturnStatus: input.validation?.mode ?? "unavailable",
    historyQuality: illustrative
      ? "illustrative only (snapshots under 24 hours)"
      : input.validation?.anchorMode === "stored_snapshots"
        ? "stored multi-day snapshots"
        : "insufficient history",
    forwardReturnSummary: input.validation?.summary ?? "No forward-return summary yet.",
    lifecycleCues: (input.validation?.refinementCues ?? []).slice(0, 3),
    rebalanceSuggested: input.validation?.rebalanceSuggested === true,
    scoreChangePct: input.validation?.scoreDeltaPct,
    sodexNetwork: input.executionReadiness.network,
    sodexRoutableLegs: `${input.executionReadiness.tradableCount}/${input.executionReadiness.totalLegs}`,
    sodexRouteSummary: input.executionReadiness.summary,
  };
}

function buildPrompt(input: DecisionAssistInput) {
  return `You are SoNarr's bounded decision-assist layer (not a black-box alpha engine).

Your job:
Recommend one operator action for a narrative basket using ONLY the provided facts.

Hard rules:
- Do not invent fills, prices, PnL, or kline numbers.
- Use only the fact sheet below.
- Write every string for a human operator — plain English only.
- Never quote JSON keys, code identifiers, backticks, or camelCase field names.
- Prefer phrases like "lifecycle stage", "conviction score", "forward-return check", "SoDEX route coverage".
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

Fact sheet:
${JSON.stringify(buildHumanFactSheet(input), null, 2)}`;
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
      brief: sanitizeBrief(cached.brief),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const brief = sanitizeBrief(fallbackBrief(input));
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
      const brief = sanitizeBrief(fallbackBrief(input));
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
    const brief = sanitizeBrief(parsed ?? fallbackBrief(input));

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
    const brief = sanitizeBrief(fallbackBrief(input));
    decisionCache.set(key, {
      brief,
      source: "fallback",
      expiresAt: now + AI_BRIEF_FALLBACK_CACHE_TTL_MS,
    });
    return { source: "fallback", cached: false, brief };
  }
}
