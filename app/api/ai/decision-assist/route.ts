import {
  generateDecisionAssist,
  type DecisionAssistInput,
  type DecisionAction,
} from "@/lib/ai/decision-gemini";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ACTIONS = new Set<DecisionAction>(["hold", "size-down", "wait", "rebalance"]);

function parseInput(value: unknown): DecisionAssistInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const {
    narrativeId,
    narrativeTitle,
    risk,
    stage,
    overallScore,
    narrativeScore,
    confidence,
    validation,
    executionReadiness,
  } = value;

  if (
    typeof narrativeTitle !== "string" ||
    typeof risk !== "string" ||
    typeof stage !== "string" ||
    typeof narrativeScore !== "number" ||
    typeof confidence !== "number" ||
    !isRecord(executionReadiness)
  ) {
    return undefined;
  }

  if (
    stage !== "Watching" &&
    stage !== "Heating" &&
    stage !== "Active" &&
    stage !== "Cooling" &&
    stage !== "Faded"
  ) {
    return undefined;
  }

  const mode = executionReadiness.mode;
  const network = executionReadiness.network;

  if (
    (mode !== "live" && mode !== "partial" && mode !== "unavailable") ||
    (network !== "testnet" && network !== "mainnet") ||
    typeof executionReadiness.tradableCount !== "number" ||
    typeof executionReadiness.totalLegs !== "number" ||
    typeof executionReadiness.summary !== "string"
  ) {
    return undefined;
  }

  let parsedValidation: DecisionAssistInput["validation"];
  if (isRecord(validation)) {
    parsedValidation = {
      mode:
        validation.mode === "live" ||
        validation.mode === "partial" ||
        validation.mode === "unavailable"
          ? validation.mode
          : "partial",
      anchorMode:
        validation.anchorMode === "stored_snapshots" ||
        validation.anchorMode === "bar_relative_illustrative" ||
        validation.anchorMode === "insufficient_history"
          ? validation.anchorMode
          : "insufficient_history",
      summary: typeof validation.summary === "string" ? validation.summary : "",
      highConviction: isRecord(validation.highConviction)
        ? {
            label:
              typeof validation.highConviction.label === "string"
                ? validation.highConviction.label
                : "High",
            sampleCount:
              typeof validation.highConviction.sampleCount === "number"
                ? validation.highConviction.sampleCount
                : 0,
            hitRatePct:
              typeof validation.highConviction.hitRatePct === "number"
                ? validation.highConviction.hitRatePct
                : undefined,
            avgReturn1dPct:
              typeof validation.highConviction.avgReturn1dPct === "number"
                ? validation.highConviction.avgReturn1dPct
                : undefined,
            avgReturn7dPct:
              typeof validation.highConviction.avgReturn7dPct === "number"
                ? validation.highConviction.avgReturn7dPct
                : undefined,
            avgReturn30dPct:
              typeof validation.highConviction.avgReturn30dPct === "number"
                ? validation.highConviction.avgReturn30dPct
                : undefined,
          }
        : { label: "High conviction (≥70)", sampleCount: 0 },
      lowConviction: isRecord(validation.lowConviction)
        ? {
            label:
              typeof validation.lowConviction.label === "string"
                ? validation.lowConviction.label
                : "Low",
            sampleCount:
              typeof validation.lowConviction.sampleCount === "number"
                ? validation.lowConviction.sampleCount
                : 0,
            hitRatePct:
              typeof validation.lowConviction.hitRatePct === "number"
                ? validation.lowConviction.hitRatePct
                : undefined,
            avgReturn1dPct:
              typeof validation.lowConviction.avgReturn1dPct === "number"
                ? validation.lowConviction.avgReturn1dPct
                : undefined,
            avgReturn7dPct:
              typeof validation.lowConviction.avgReturn7dPct === "number"
                ? validation.lowConviction.avgReturn7dPct
                : undefined,
            avgReturn30dPct:
              typeof validation.lowConviction.avgReturn30dPct === "number"
                ? validation.lowConviction.avgReturn30dPct
                : undefined,
          }
        : { label: "Low conviction (<50)", sampleCount: 0 },
      refinementCues: Array.isArray(validation.refinementCues)
        ? validation.refinementCues.filter((item): item is string => typeof item === "string")
        : [],
      rebalanceSuggested: validation.rebalanceSuggested === true,
      scoreDeltaPct:
        typeof validation.scoreDeltaPct === "number" ? validation.scoreDeltaPct : undefined,
    };
  }

  return {
    narrativeId: typeof narrativeId === "string" ? narrativeId : undefined,
    narrativeTitle,
    risk,
    stage,
    overallScore: typeof overallScore === "number" ? overallScore : undefined,
    narrativeScore,
    confidence,
    validation: parsedValidation,
    executionReadiness: {
      mode,
      network,
      tradableCount: executionReadiness.tradableCount,
      totalLegs: executionReadiness.totalLegs,
      weightedSlippagePct:
        typeof executionReadiness.weightedSlippagePct === "number"
          ? executionReadiness.weightedSlippagePct
          : undefined,
      summary: executionReadiness.summary,
    },
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseInput(body);
  if (!input) {
    return Response.json({ error: "Invalid decision assist input." }, { status: 400 });
  }

  // Keep ACTIONS referenced so tree-shaking doesn't confuse reviewers of the route.
  void ACTIONS;

  const forceRefresh = isRecord(body) && body.forceRefresh === true;
  const result = await generateDecisionAssist(input, { forceRefresh });
  return Response.json(result);
}
