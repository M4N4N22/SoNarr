import {
  getOrRefreshNarrativeLifecycle,
  readLifecycleState,
  type AppendSnapshotInput,
} from "@/lib/sonarr/lifecycle";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAppendInput(value: unknown): AppendSnapshotInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const {
    narrativeId,
    narrativeScore,
    confidence,
    overallScore,
    layerScores,
    assets,
    executionCoverage,
  } = value;

  if (
    typeof narrativeId !== "string" ||
    typeof narrativeScore !== "number" ||
    typeof confidence !== "number" ||
    !Array.isArray(assets) ||
    !Array.isArray(layerScores)
  ) {
    return undefined;
  }

  const parsedLayers = layerScores
    .map((item) => {
      if (!isRecord(item) || typeof item.name !== "string") {
        return undefined;
      }
      return {
        name: item.name,
        score: typeof item.score === "number" ? item.score : undefined,
        dataMode: typeof item.dataMode === "string" ? item.dataMode : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const parsedAssets = assets.filter((item): item is string => typeof item === "string");

  if (parsedAssets.length === 0) {
    return undefined;
  }

  return {
    narrativeId,
    narrativeScore,
    confidence,
    overallScore: typeof overallScore === "number" ? overallScore : undefined,
    layerScores: parsedLayers,
    assets: parsedAssets,
    executionCoverage:
      typeof executionCoverage === "number" ? executionCoverage : undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const narrativeId = searchParams.get("narrativeId");

  if (!narrativeId) {
    return Response.json({ error: "narrativeId is required." }, { status: 400 });
  }

  const state = await readLifecycleState(narrativeId);
  if (!state) {
    return Response.json({
      narrativeId,
      stage: "Watching",
      snapshots: [],
      updatedAt: new Date().toISOString(),
    });
  }

  return Response.json(state);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const input = parseAppendInput(body);
  if (!input) {
    return Response.json({ error: "Invalid lifecycle snapshot input." }, { status: 400 });
  }

  const state = await getOrRefreshNarrativeLifecycle(input);
  return Response.json(state);
}
