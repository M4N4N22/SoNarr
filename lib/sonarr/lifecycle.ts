import { kvGetJson, kvSetJson } from "@/lib/persistence/kv-store";
import {
  forwardReturnFromBars,
  getKlineBarsForSymbols,
  type KlineBar,
} from "@/lib/sosovalue/enrichment";

export type LifecycleStage = "Watching" | "Heating" | "Active" | "Cooling" | "Faded";

export type LifecycleLayerScore = {
  name: string;
  score?: number;
  dataMode?: string;
};

export type LifecycleSnapshot = {
  at: string;
  overallScore?: number;
  narrativeScore: number;
  confidence: number;
  stage: LifecycleStage;
  layerScores: LifecycleLayerScore[];
  assets: string[];
  executionCoverage?: number;
};

export type ForwardReturnBucket = {
  label: string;
  sampleCount: number;
  hitRatePct?: number;
  avgReturn1dPct?: number;
  avgReturn7dPct?: number;
  avgReturn30dPct?: number;
};

export type LifecycleValidation = {
  mode: "live" | "partial" | "unavailable";
  /** How forward windows were anchored — never treat bar-relative demo as stored history. */
  anchorMode: "stored_snapshots" | "bar_relative_illustrative" | "insufficient_history";
  summary: string;
  highConviction: ForwardReturnBucket;
  lowConviction: ForwardReturnBucket;
  refinementCues: string[];
  rebalanceSuggested: boolean;
  scoreDeltaPct?: number;
};

export type NarrativeLifecycleState = {
  narrativeId: string;
  updatedAt: string;
  stage: LifecycleStage;
  snapshots: LifecycleSnapshot[];
  validation?: LifecycleValidation;
  persistenceBackend?: "upstash" | "filesystem";
};

const HIGH_CONVICTION_THRESHOLD = 70;
const LOW_CONVICTION_THRESHOLD = 50;
const REBALANCE_DELTA_PCT = 20;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function classifyLifecycleStage(
  snapshots: LifecycleSnapshot[],
  currentScore: number,
): LifecycleStage {
  if (snapshots.length < 2) {
    if (currentScore >= 84) return "Active";
    if (currentScore >= 68) return "Heating";
    if (currentScore >= 50) return "Watching";
    return "Watching";
  }

  const recent = snapshots.slice(-5);
  const scores = recent.map((snap) => snap.overallScore ?? snap.narrativeScore);
  const latest = scores[scores.length - 1] ?? currentScore;
  const earliest = scores[0] ?? latest;
  const delta = latest - earliest;
  const peak = Math.max(...scores);

  if (latest < 45 && delta < -8) {
    return "Faded";
  }

  if (delta <= -REBALANCE_DELTA_PCT * 0.35 && latest < peak - 8) {
    return "Cooling";
  }

  if (latest >= 84 && delta >= -5) {
    return "Active";
  }

  if (latest >= 68 && delta > 3) {
    return "Heating";
  }

  if (latest >= 68) {
    return "Active";
  }

  return "Watching";
}

function lifecycleKey(narrativeId: string) {
  const safe = narrativeId.replace(/[^a-z0-9-_]/gi, "").toLowerCase() || "unknown";
  return `sonarr:lifecycle:${safe}`;
}

export async function readLifecycleState(
  narrativeId: string,
): Promise<NarrativeLifecycleState | undefined> {
  const parsed = await kvGetJson<NarrativeLifecycleState>(lifecycleKey(narrativeId));
  if (!parsed || parsed.narrativeId !== narrativeId || !Array.isArray(parsed.snapshots)) {
    return undefined;
  }
  return parsed;
}

async function writeLifecycleState(state: NarrativeLifecycleState) {
  const { backend } = await kvSetJson(lifecycleKey(state.narrativeId), state);
  state.persistenceBackend = backend;
}

export type AppendSnapshotInput = {
  narrativeId: string;
  narrativeScore: number;
  confidence: number;
  overallScore?: number;
  layerScores: LifecycleLayerScore[];
  assets: string[];
  executionCoverage?: number;
};

export async function appendLifecycleSnapshot(
  input: AppendSnapshotInput,
): Promise<NarrativeLifecycleState> {
  const existing = await readLifecycleState(input.narrativeId);
  const prior = existing?.snapshots ?? [];
  const score = input.overallScore ?? input.narrativeScore;

  const draftSnapshot: LifecycleSnapshot = {
    at: new Date().toISOString(),
    overallScore: input.overallScore,
    narrativeScore: input.narrativeScore,
    confidence: input.confidence,
    stage: "Watching",
    layerScores: input.layerScores,
    assets: input.assets,
    executionCoverage: input.executionCoverage,
  };

  const withDraft = [...prior, draftSnapshot];
  const stage = classifyLifecycleStage(withDraft, score);
  draftSnapshot.stage = stage;

  // Dedupe: if last snapshot within 30 minutes and score unchanged (±1), replace it.
  const last = prior[prior.length - 1];
  let snapshots = withDraft;
  if (last) {
    const lastAt = Date.parse(last.at);
    const closeInTime = Number.isFinite(lastAt) && Date.now() - lastAt < 30 * 60 * 1000;
    const sameScore =
      Math.abs((last.overallScore ?? last.narrativeScore) - score) <= 1 &&
      Math.abs(last.narrativeScore - input.narrativeScore) <= 1;
    if (closeInTime && sameScore) {
      snapshots = [...prior.slice(0, -1), draftSnapshot];
    }
  }

  // Cap history
  if (snapshots.length > 90) {
    snapshots = snapshots.slice(-90);
  }

  const state: NarrativeLifecycleState = {
    narrativeId: input.narrativeId,
    updatedAt: draftSnapshot.at,
    stage,
    snapshots,
  };

  try {
    await writeLifecycleState(state);
  } catch {
    // Ephemeral hosts may reject writes — still return in-memory state.
  }

  return state;
}

function average(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function basketForwardReturn(
  assets: string[],
  barsBySymbol: Record<string, KlineBar[]>,
  fromMs: number,
  horizonDays: number,
) {
  const returns: number[] = [];
  for (const asset of assets) {
    const bars = barsBySymbol[asset.toUpperCase()];
    if (!bars) {
      continue;
    }
    const ret = forwardReturnFromBars(bars, fromMs, horizonDays);
    if (ret !== undefined) {
      returns.push(ret);
    }
  }
  return average(returns);
}

function buildBucket(
  label: string,
  samples: Array<{ r1?: number; r7?: number; r30?: number }>,
): ForwardReturnBucket {
  const r1 = samples.map((s) => s.r1).filter((v): v is number => v !== undefined);
  const r7 = samples.map((s) => s.r7).filter((v): v is number => v !== undefined);
  const r30 = samples.map((s) => s.r30).filter((v): v is number => v !== undefined);
  const hitBase = r7.length > 0 ? r7 : r1;
  const hits = hitBase.filter((v) => v > 0).length;

  return {
    label,
    sampleCount: samples.length,
    hitRatePct: hitBase.length > 0 ? clampScore((hits / hitBase.length) * 100) : undefined,
    avgReturn1dPct: average(r1),
    avgReturn7dPct: average(r7),
    avgReturn30dPct: average(r30),
  };
}

export async function validateLifecyclePerformance(
  state: NarrativeLifecycleState,
): Promise<LifecycleValidation> {
  const snapshots = state.snapshots;
  if (snapshots.length === 0) {
    return {
      mode: "unavailable",
      anchorMode: "insufficient_history",
      summary: "No lifecycle snapshots yet — open this narrative again to begin scoring history.",
      highConviction: { label: "High conviction (≥70)", sampleCount: 0 },
      lowConviction: { label: "Low conviction (<50)", sampleCount: 0 },
      refinementCues: ["Visit narratives over time so SoNarr can snapshot conviction."],
      rebalanceSuggested: false,
    };
  }

  const assetSet = new Set<string>();
  for (const snap of snapshots) {
    for (const asset of snap.assets) {
      assetSet.add(asset.toUpperCase());
    }
  }

  const barsResult = await getKlineBarsForSymbols(Array.from(assetSet), 5);
  const barsBySymbol = barsResult.data;
  const hasBars = Object.keys(barsBySymbol).length > 0;

  if (!hasBars) {
    return {
      mode: "unavailable",
      anchorMode: "insufficient_history",
      summary: "SoSoValue klines were unavailable for forward-return validation on this basket.",
      highConviction: { label: "High conviction (≥70)", sampleCount: 0 },
      lowConviction: { label: "Low conviction (<50)", sampleCount: 0 },
      refinementCues: ["Retry when currency klines are reachable."],
      rebalanceSuggested: false,
    };
  }

  // Only snapshots older than 24h can support a real forward window in bar history.
  const evaluable = snapshots.filter((snap) => {
    const at = Date.parse(snap.at);
    return Number.isFinite(at) && Date.now() - at > 24 * 60 * 60 * 1000;
  });

  const usingIllustrativeAnchors = evaluable.length === 0;
  // Illustrative path: bar-relative anchors for UI shape only — never rewrite stored snapshot times.
  const samplesSource = usingIllustrativeAnchors
    ? snapshots.map((snap, index) => {
        const lookbackDays = (snapshots.length - index) * 3 + 7;
        return {
          ...snap,
          at: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
        };
      })
    : evaluable;

  const highSamples: Array<{ r1?: number; r7?: number; r30?: number }> = [];
  const lowSamples: Array<{ r1?: number; r7?: number; r30?: number }> = [];

  for (const snap of samplesSource) {
    const score = snap.overallScore ?? snap.narrativeScore;
    const fromMs = Date.parse(snap.at);
    if (!Number.isFinite(fromMs)) {
      continue;
    }

    const sample = {
      r1: basketForwardReturn(snap.assets, barsBySymbol, fromMs, 1),
      r7: basketForwardReturn(snap.assets, barsBySymbol, fromMs, 7),
      r30: basketForwardReturn(snap.assets, barsBySymbol, fromMs, 30),
    };

    if (score >= HIGH_CONVICTION_THRESHOLD) {
      highSamples.push(sample);
    } else if (score < LOW_CONVICTION_THRESHOLD) {
      lowSamples.push(sample);
    }
  }

  const highConviction = buildBucket("High conviction (≥70)", highSamples);
  const lowConviction = buildBucket("Low conviction (<50)", lowSamples);

  const latest = snapshots[snapshots.length - 1]!;
  const earliestRecent = snapshots[Math.max(0, snapshots.length - 5)]!;
  const latestScore = latest.overallScore ?? latest.narrativeScore;
  const priorScore = earliestRecent.overallScore ?? earliestRecent.narrativeScore;
  const scoreDeltaPct =
    priorScore > 0 ? ((latestScore - priorScore) / priorScore) * 100 : undefined;
  const rebalanceSuggested =
    scoreDeltaPct !== undefined && Math.abs(scoreDeltaPct) >= REBALANCE_DELTA_PCT;

  const refinementCues: string[] = [];

  if (usingIllustrativeAnchors) {
    refinementCues.push(
      "Forward-return checks are illustrative only right now — conviction snapshots are still under 24 hours old. Come back over several days for a real multi-day track record.",
    );
  }

  if (
    highConviction.avgReturn7dPct !== undefined &&
    lowConviction.avgReturn7dPct !== undefined
  ) {
    if (highConviction.avgReturn7dPct > lowConviction.avgReturn7dPct) {
      refinementCues.push(
        usingIllustrativeAnchors
          ? `On illustrative anchors, high-conviction windows averaged ${highConviction.avgReturn7dPct.toFixed(2)}% over ~7d vs ${lowConviction.avgReturn7dPct.toFixed(2)}% when conviction was low.`
          : `High-conviction windows averaged ${highConviction.avgReturn7dPct.toFixed(2)}% over ~7d vs ${lowConviction.avgReturn7dPct.toFixed(2)}% when conviction was low — lifecycle filtering adds signal.`,
      );
    } else {
      refinementCues.push(
        usingIllustrativeAnchors
          ? "On illustrative anchors, high-conviction windows did not outperform low-conviction ones — wait for stored multi-day snapshots before trusting this read."
          : `High-conviction windows did not outperform low-conviction ones on this sample — treat scores as research aids and tighten execution filters.`,
      );
    }
  } else if (highConviction.sampleCount > 0 && !usingIllustrativeAnchors) {
    refinementCues.push(
      `Collected ${highConviction.sampleCount} high-conviction forward windows from SoSoValue klines against stored snapshots.`,
    );
  }

  const lowCoverageSnaps = snapshots.filter(
    (snap) => typeof snap.executionCoverage === "number" && snap.executionCoverage < 0.6,
  );
  if (
    !usingIllustrativeAnchors &&
    lowCoverageSnaps.length >= 2 &&
    highConviction.avgReturn7dPct !== undefined
  ) {
    refinementCues.push(
      "High conviction historically coincided with weak SoDEX coverage on some visits — prefer baskets with higher routable leg ratios before sizing up.",
    );
  }

  if (rebalanceSuggested && scoreDeltaPct !== undefined) {
    refinementCues.push(
      `Score moved ${scoreDeltaPct > 0 ? "+" : ""}${scoreDeltaPct.toFixed(1)}% over recent snapshots (≥${REBALANCE_DELTA_PCT}% threshold) — rebalance review suggested.`,
    );
  }

  if (refinementCues.length === 0) {
    refinementCues.push(
      "Keep snapshotting this narrative; forward-return validation strengthens as history accumulates.",
    );
  }

  const sampleTotal = highConviction.sampleCount + lowConviction.sampleCount;
  const anchorMode: LifecycleValidation["anchorMode"] = usingIllustrativeAnchors
    ? "bar_relative_illustrative"
    : sampleTotal === 0
      ? "insufficient_history"
      : "stored_snapshots";

  // Never mark illustrative / empty anchors as live track record.
  const mode: LifecycleValidation["mode"] = usingIllustrativeAnchors
    ? "partial"
    : sampleTotal >= 2
      ? "live"
      : sampleTotal > 0
        ? "partial"
        : "unavailable";

  const summary = usingIllustrativeAnchors
    ? "Illustrative forward returns only — snapshots are too fresh for a real multi-day track record. Numbers use demo time anchors from SoSoValue klines, not stored history."
    : mode === "live"
      ? "Forward returns from SoSoValue daily klines against stored conviction snapshots older than 24h."
      : mode === "partial"
        ? "Partial validation — need more contrasting stored snapshots (high vs low conviction) for a stronger read."
        : "Not enough stored snapshot history yet for forward-return validation.";

  return {
    mode,
    anchorMode,
    summary,
    highConviction,
    lowConviction,
    refinementCues,
    rebalanceSuggested,
    scoreDeltaPct,
  };
}

export async function getOrRefreshNarrativeLifecycle(
  input: AppendSnapshotInput,
): Promise<NarrativeLifecycleState> {
  const state = await appendLifecycleSnapshot(input);
  const validation = await validateLifecyclePerformance(state);
  const withValidation: NarrativeLifecycleState = {
    ...state,
    validation,
  };

  try {
    await writeLifecycleState(withValidation);
  } catch {
    // ignore ephemeral write failures
  }

  return withValidation;
}

/**
 * Merge client-held snapshots (e.g. localStorage) with server state for recovery
 * when the server previously used ephemeral storage.
 */
export async function mergeClientLifecycleSnapshots(
  narrativeId: string,
  clientSnapshots: LifecycleSnapshot[],
): Promise<NarrativeLifecycleState> {
  const existing = await readLifecycleState(narrativeId);
  const byAt = new Map<string, LifecycleSnapshot>();

  for (const snap of existing?.snapshots ?? []) {
    byAt.set(snap.at, snap);
  }
  for (const snap of clientSnapshots) {
    if (!snap?.at) {
      continue;
    }
    byAt.set(snap.at, snap);
  }

  let snapshots = Array.from(byAt.values()).sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at),
  );

  if (snapshots.length > 90) {
    snapshots = snapshots.slice(-90);
  }

  const latest = snapshots[snapshots.length - 1];
  const score = latest ? (latest.overallScore ?? latest.narrativeScore) : 0;
  const stage = classifyLifecycleStage(snapshots, score);
  const updatedAt = latest?.at ?? new Date().toISOString();

  const state: NarrativeLifecycleState = {
    narrativeId,
    updatedAt,
    stage,
    snapshots,
  };

  const validation = await validateLifecyclePerformance(state);
  const withValidation: NarrativeLifecycleState = {
    ...state,
    validation,
  };

  try {
    await writeLifecycleState(withValidation);
  } catch {
    // Ephemeral hosts may reject writes — still return in-memory state.
  }

  return withValidation;
}
