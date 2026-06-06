import {
  generateExecutionBrief,
  type ExecutionBriefInput,
} from "@/lib/ai/execution-gemini";
import type { BasketLegReadiness } from "@/lib/sodex";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLegs(value: unknown): BasketLegReadiness[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const legs: BasketLegReadiness[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      typeof item.asset !== "string" ||
      typeof item.weight !== "number" ||
      typeof item.legNotionalUsd !== "number" ||
      typeof item.tradable !== "boolean" ||
      typeof item.bidDepthUsd !== "number" ||
      typeof item.askDepthUsd !== "number"
    ) {
      continue;
    }

    legs.push({
      asset: item.asset,
      weight: item.weight,
      legNotionalUsd: item.legNotionalUsd,
      sodexSymbol: typeof item.sodexSymbol === "string" ? item.sodexSymbol : undefined,
      displayName: typeof item.displayName === "string" ? item.displayName : undefined,
      tradable: item.tradable,
      bestBid: typeof item.bestBid === "number" ? item.bestBid : undefined,
      bestAsk: typeof item.bestAsk === "number" ? item.bestAsk : undefined,
      bidDepthUsd: item.bidDepthUsd,
      askDepthUsd: item.askDepthUsd,
      slippagePct: typeof item.slippagePct === "number" ? item.slippagePct : undefined,
      message: typeof item.message === "string" ? item.message : undefined,
    });
  }

  return legs;
}

function parseExecutionReadiness(
  value: unknown,
): ExecutionBriefInput["executionReadiness"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const {
    mode,
    network,
    totalNotionalUsd,
    tradableCount,
    totalLegs,
    weightedSlippagePct,
    totalAskDepthUsd,
    totalBidDepthUsd,
    summary,
    legs,
  } = value;

  if (
    (mode !== "live" && mode !== "partial" && mode !== "unavailable") ||
    (network !== "testnet" && network !== "mainnet") ||
    typeof totalNotionalUsd !== "number" ||
    typeof tradableCount !== "number" ||
    typeof totalLegs !== "number" ||
    typeof totalAskDepthUsd !== "number" ||
    typeof totalBidDepthUsd !== "number" ||
    typeof summary !== "string"
  ) {
    return undefined;
  }

  return {
    mode,
    network,
    totalNotionalUsd,
    tradableCount,
    totalLegs,
    weightedSlippagePct:
      typeof weightedSlippagePct === "number" ? weightedSlippagePct : undefined,
    totalAskDepthUsd,
    totalBidDepthUsd,
    summary,
    legs: parseLegs(legs),
  };
}

function parseInput(value: unknown): ExecutionBriefInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { narrativeId, narrativeTitle, risk, executionReadiness } = value;
  const parsedReadiness = parseExecutionReadiness(executionReadiness);

  if (
    typeof narrativeTitle !== "string" ||
    typeof risk !== "string" ||
    !parsedReadiness
  ) {
    return undefined;
  }

  return {
    narrativeId: typeof narrativeId === "string" ? narrativeId : undefined,
    narrativeTitle,
    risk,
    executionReadiness: parsedReadiness,
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
    return Response.json({ error: "Invalid execution brief input." }, { status: 400 });
  }

  const forceRefresh = isRecord(body) && body.forceRefresh === true;
  const result = await generateExecutionBrief(input, { forceRefresh });
  return Response.json(result);
}
