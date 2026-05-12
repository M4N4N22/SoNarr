import type { RadarData } from "@/lib/sosovalue";

export function RadarStatusNote({ radar }: { radar: RadarData }) {
  if (radar.mode === "unavailable") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
        SoSoValue radar data is unavailable. SoNarr is not showing fallback
        narrative cards; check endpoint diagnostics below for the exact issue.
      </div>
    );
  }

  if (radar.mode === "partial") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
        Partial SoSoValue data loaded. SoNarr is only showing narratives or feed
        items backed by successful endpoint responses.
      </div>
    );
  }

  return null;
}
