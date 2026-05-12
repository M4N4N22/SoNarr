import {
  generateNarrativeBrief,
  type NarrativeBriefInput,
} from "@/lib/ai/gemini";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseWeights(value: unknown): NarrativeBriefInput["generatedWeights"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!isRecord(item)) {
        return undefined;
      }

      if (typeof item.asset !== "string" || typeof item.weight !== "number") {
        return undefined;
      }

      return {
        asset: item.asset,
        weight: item.weight,
      };
    })
    .filter((item): item is { asset: string; weight: number } => Boolean(item));
}

function parseInput(value: unknown): NarrativeBriefInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const {
    basis,
    confidence,
    generatedWeights,
    risk,
    signalScore,
    sourceLabels,
    summary,
    title,
    narrativeId,
    topAssets,
  } = value;

  if (
    typeof title !== "string" ||
    typeof summary !== "string" ||
    typeof signalScore !== "number" ||
    typeof confidence !== "number" ||
    typeof risk !== "string" ||
    !isStringArray(basis) ||
    !isStringArray(sourceLabels) ||
    !isStringArray(topAssets)
  ) {
    return undefined;
  }

  return {
    basis,
    confidence,
    generatedWeights: parseWeights(generatedWeights),
    narrativeId: typeof narrativeId === "string" ? narrativeId : undefined,
    risk,
    signalScore,
    sourceLabels,
    summary,
    title,
    topAssets,
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
    return Response.json({ error: "Invalid narrative brief input." }, { status: 400 });
  }

  const forceRefresh = isRecord(body) && body.forceRefresh === true;
  const result = await generateNarrativeBrief(input, { forceRefresh });
  return Response.json(result);
}
