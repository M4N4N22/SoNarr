import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { NarrativeSignal, RadarData } from "@/lib/sosovalue";

type RadarHeroProps = {
  radar: RadarData;
  topNarrative?: NarrativeSignal;
};

export function RadarHero({ radar, topNarrative }: RadarHeroProps) {
  const sourceLabel =
    radar.mode === "live"
      ? "Live SoSoValue feed"
      : radar.mode === "partial"
        ? "Partial SoSoValue data"
        : "SoSoValue data unavailable";

  return (
    <div className="relative overflow-hidden  p-6 shadow-sm sm:p-8">
   

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={radar.mode === "live" ? "default" : "outline"}
              className="gap-1.5 rounded-full px-3 py-1"
            >
              {sourceLabel}
            </Badge>

            <Badge
              variant="outline"
            
            >
              Narrative radar
            </Badge>

            <Badge
              variant="outline"
             
            >
              Index idea engine
            </Badge>
          </div>

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Find the market narrative before it becomes obvious.
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
            SoNarr scans live crypto news, detects rising themes, and turns
            market movement into actionable briefs, risk checks, and index ideas
            for one fast-moving operator.
          </p>

          <div className="mt-6 flex gap-3 ">
            <div className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-2 text-sm text-muted-foreground w-fit">
              Hot news first
            </div>

            <div className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-2 text-sm text-muted-foreground w-fit">
              Narrative scoring
            </div>

            <div className="flex items-center gap-2 rounded-full border bg-background/50 px-3 py-2 text-sm text-muted-foreground w-fit">
              Ready-to-use outputs
            </div>
          </div>
        </div>

        <Card className="w-full  bg-background/70 p-5 shadow-sm backdrop-blur lg:max-w-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Current leader
                </p>
                <p className="text-xs text-muted-foreground">
                  Strongest detected narrative
                </p>
              </div>
            </div>

            <span className="text-sm text-muted-foreground">
              {radar.mode === "live" ? "Live" : "No fallback"}
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {topNarrative?.label ?? "Pending"}
              </p>
              <p className="mt-2 max-w-48 text-sm leading-6 text-muted-foreground">
                {topNarrative?.status ??
                  "Waiting for compatible live SoSoValue narrative data."}
              </p>
            </div>

            <div className="rounded-2xl border bg-card px-4 py-3 text-right">
              <p className="text-xs text-muted-foreground">Signal score</p>
              <p className="mt-1 text-3xl font-semibold text-primary">
                {topNarrative?.score ?? "--"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
