"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TradeJournalEntry } from "@/lib/sonarr/trade-journal";

function fillSummary(entry: TradeJournalEntry) {
  if (entry.fills.length === 0) {
    return "No fill snapshot yet";
  }
  const filled = entry.fills.filter((fill) =>
    (fill.status ?? "").toLowerCase().includes("fill"),
  ).length;
  const open = entry.fills.filter((fill) => {
    const status = (fill.status ?? "").toLowerCase();
    return status.includes("open") || status.includes("new") || status.includes("live");
  }).length;
  return `${filled} filled · ${open} open · ${entry.fills.length} tracked`;
}

export function TradeJournalStrip({
  narrativeId,
  refreshToken = 0,
}: {
  narrativeId: string;
  /** Bump after submit so the strip refetches. */
  refreshToken?: number;
}) {
  const [entries, setEntries] = useState<TradeJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/trade-journal?narrativeId=${encodeURIComponent(narrativeId)}`,
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load trade journal.");
      }
      setEntries(Array.isArray(payload.entries) ? payload.entries.slice(0, 5) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load trade journal.");
    } finally {
      setLoading(false);
    }
  }, [narrativeId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">Trade journal</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="space-y-2 p-3">
        {error ? (
          <p className="text-xs text-negative">{error}</p>
        ) : null}

        {!loading && !error && entries.length === 0 ? (
          <p className="px-1 py-3 text-center text-xs text-muted-foreground">
            No journal entries yet. After a signed submit, fill polls append outcomes here.
          </p>
        ) : null}

        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {entry.successLegs}/{entry.submittedLegs} legs accepted
              </span>
              {entry.network ? (
                <Badge variant={entry.network === "mainnet" ? "negative" : "outline"}>
                  {entry.network}
                </Badge>
              ) : null}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(entry.at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">{entry.message}</p>
            <p className="mt-1 tabular-nums text-muted-foreground">{fillSummary(entry)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
