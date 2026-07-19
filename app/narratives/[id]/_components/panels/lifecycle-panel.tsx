"use client";

import { useEffect } from "react";
import { Activity, AlertTriangle, LineChart, Sparkles } from "lucide-react";

import { AiDecisionAssist } from "@/components/sonarr/ai-decision-assist";
import { MiniTimeline } from "@/components/charts/mini-timeline";
import { PageSection } from "@/components/layout/page-section";
import { Badge } from "@/components/ui/badge";
import type { NarrativeWorkspaceProps } from "../types";

function formatPct(value?: number) {
  if (value === undefined) {
    return "—";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function lifecycleStorageKey(narrativeId: string) {
  return `sonarr:lifecycle:${narrativeId}`;
}

export function LifecyclePanel({ data }: { data: NarrativeWorkspaceProps }) {
  const { lifecycle, decisionAssistInput, narrative } = data;
  const validation = lifecycle.validation;
  const scoreTrail = lifecycle.snapshots.map((snap) => ({
    id: snap.at,
    label: new Date(snap.at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    value: snap.overallScore ?? snap.narrativeScore,
    hint: `${snap.stage} · ${new Date(snap.at).toLocaleString()}`,
  }));

  useEffect(() => {
    try {
      window.localStorage.setItem(
        lifecycleStorageKey(narrative.id),
        JSON.stringify(lifecycle.snapshots),
      );
    } catch {
      // ignore
    }

    try {
      const raw = window.localStorage.getItem(lifecycleStorageKey(narrative.id));
      if (!raw) {
        return;
      }
      const snapshots = JSON.parse(raw);
      if (!Array.isArray(snapshots) || snapshots.length <= lifecycle.snapshots.length) {
        return;
      }
      void fetch("/api/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mergeClient: true,
          narrativeId: narrative.id,
          snapshots,
        }),
      });
    } catch {
      // ignore
    }
  }, [lifecycle.snapshots, narrative.id]);

  return (
    <div className="space-y-3">
      <PageSection
        icon={Activity}
        title="Lifecycle stage"
        description="Stage is derived from conviction trajectory — not a one-shot headline status."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{lifecycle.stage}</Badge>
          <Badge variant="muted">{lifecycle.snapshots.length} snapshots</Badge>
          {lifecycle.persistenceBackend ? (
            <Badge variant="outline">{lifecycle.persistenceBackend}</Badge>
          ) : null}
          {validation?.rebalanceSuggested ? (
            <Badge variant="positive">Rebalance suggested</Badge>
          ) : null}
          {validation?.scoreDeltaPct !== undefined ? (
            <span className="text-xs text-muted-foreground">
              Recent score Δ {formatPct(validation.scoreDeltaPct)}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Watching → Heating → Active → Cooling → Faded. Updated{" "}
          {new Date(lifecycle.updatedAt).toLocaleString()}.
        </p>
      </PageSection>

      <PageSection
        icon={LineChart}
        title="Conviction trail"
        description="Overall signal-stack score snapshots persisted for this narrative."
      >
        {scoreTrail.length > 0 ? (
          <MiniTimeline
            title="Score over visits"
            titleHint="Overall conviction from the signal stack at each snapshot."
            items={scoreTrail.map((point) => ({
              id: point.id,
              date: point.label,
              title: `${point.value.toFixed(0)} / 100`,
              hint: point.hint,
            }))}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No snapshots yet — this visit seeds the lifecycle store.
          </p>
        )}

        {lifecycle.snapshots.length > 0 ? (
          <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto text-xs">
            {[...lifecycle.snapshots].reverse().slice(0, 12).map((snap) => (
              <li
                key={snap.at}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
              >
                <span className="text-muted-foreground">
                  {new Date(snap.at).toLocaleString()}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {(snap.overallScore ?? snap.narrativeScore).toFixed(0)}
                </span>
                <Badge variant="outline">{snap.stage}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </PageSection>

      <PageSection
        icon={AlertTriangle}
        title="Forward-return validation"
        description="Basket returns after high vs low conviction windows, measured with SoSoValue daily klines."
      >
        {validation ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  validation.mode === "live"
                    ? "positive"
                    : validation.mode === "partial"
                      ? "outline"
                      : "muted"
                }
              >
                {validation.mode}
              </Badge>
              <Badge
                variant={
                  validation.anchorMode === "stored_snapshots" ? "outline" : "muted"
                }
              >
                {validation.anchorMode === "stored_snapshots"
                  ? "Stored snapshots"
                  : validation.anchorMode === "bar_relative_illustrative"
                    ? "Illustrative anchors"
                    : "Insufficient history"}
              </Badge>
            </div>

            {validation.anchorMode === "bar_relative_illustrative" ? (
              <div className="rounded-md border border-chart-4/30 bg-chart-4/10 px-3 py-2 text-xs leading-5 text-muted-foreground">
                <span className="font-medium text-foreground">Not a live track record.</span>{" "}
                Stored snapshots are younger than 24h, so these forward windows use bar-relative
                demo anchors. Revisit this narrative over multiple days for stored-snapshot
                validation.
              </div>
            ) : null}

            <p className="text-sm leading-6 text-muted-foreground">{validation.summary}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[validation.highConviction, validation.lowConviction].map((bucket) => (
                <div
                  key={bucket.label}
                  className="rounded-md border border-border bg-muted/30 px-3 py-3 text-sm"
                >
                  <p className="font-medium text-foreground">{bucket.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bucket.sampleCount} sample{bucket.sampleCount === 1 ? "" : "s"}
                    {validation.anchorMode === "bar_relative_illustrative"
                      ? " · illustrative"
                      : ""}
                  </p>
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Hit rate</dt>
                      <dd className="tabular-nums">
                        {bucket.hitRatePct === undefined ? "—" : `${bucket.hitRatePct}%`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Avg 1d</dt>
                      <dd className="tabular-nums">{formatPct(bucket.avgReturn1dPct)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Avg 7d</dt>
                      <dd className="tabular-nums">{formatPct(bucket.avgReturn7dPct)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Avg 30d</dt>
                      <dd className="tabular-nums">{formatPct(bucket.avgReturn30dPct)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            {validation.refinementCues.length > 0 ? (
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                {validation.refinementCues.map((cue) => (
                  <li key={cue} className="rounded-md bg-muted/40 px-3 py-2">
                    {cue}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Validation pending for this narrative.</p>
        )}
      </PageSection>

      <PageSection
        icon={Sparkles}
        title="Decision assist"
        description="Bounded recommendation from lifecycle stats + SoDEX readiness — not automatic trading."
      >
        <AiDecisionAssist input={decisionAssistInput} embedded />
      </PageSection>
    </div>
  );
}
