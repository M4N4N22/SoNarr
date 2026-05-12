import type { RadarData } from "@/lib/sosovalue";

export function RadarStatusNote({ radar }: { radar: RadarData }) {
  if (radar.source === "fallback") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
        Live feed unavailable, so SoNarr is showing fallback data. Reason:{" "}
        {radar.reason}
      </div>
    );
  }

  if (radar.source === "mixed") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
        SoNarr loaded the hot news feed and filled any rate-limited narrative
        checks with fallback category data.
      </div>
    );
  }

  return null;
}
