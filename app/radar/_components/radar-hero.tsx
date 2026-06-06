import { Radar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RadarData } from "@/lib/sosovalue";

export function RadarHero({ radar }: { radar: RadarData }) {
  const sourceLabel =
    radar.mode === "live" ? "Live" : radar.mode === "partial" ? "Partial" : "Offline";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={radar.mode === "live" ? "positive" : "outline"}>{sourceLabel}</Badge>
        <Badge variant="muted" className="inline-flex items-center gap-1">
          <Radar className="h-3 w-3" />
          SoSoValue feed
        </Badge>
      </div>

      <div>
        <h1 className="flex items-center gap-2.5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          <Radar className="h-8 w-8 text-primary sm:h-9 sm:w-9" />
          Narrative radar
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Live hot news on the left, ranked narrative themes on the right — each tied to its latest
          headline. Open a workspace for evidence, index preview, and SoDEX routing.
        </p>
      </div>
    </div>
  );
}
