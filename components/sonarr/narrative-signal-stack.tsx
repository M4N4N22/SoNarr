import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NarrativeSignalStack as NarrativeSignalStackData } from "@/lib/sonarr/signal-stack";

function ProgressBar({ score }: { score: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
      />
    </div>
  );
}

function layerValue(layer: NarrativeSignalStackData["layers"][number]) {
  if (typeof layer.score === "number") {
    return `${layer.score}/100`;
  }

  return layer.status ?? "Pending";
}

export function NarrativeSignalStack({
  stack,
}: {
  stack: NarrativeSignalStackData;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
      <Card className="overflow-hidden bg-card/85">
        <CardHeader className="border-b border-border p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <Badge>{stack.mode}</Badge>
              <CardTitle className="mt-5 text-3xl sm:text-4xl">
                Narrative Signal Stack
              </CardTitle>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                A multi-layer check that turns SoSoValue data into narrative
                conviction, not just a news summary.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Overall narrative conviction
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-foreground">
                    {stack.overallScore}/100
                  </p>
                </div>
                <Badge variant="outline">Current mode: {stack.mode}</Badge>
              </div>
              <div className="mt-4">
                <ProgressBar score={stack.overallScore} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">Strongest layer</p>
              <p className="mt-2 font-semibold text-foreground">
                {stack.strongestLayer}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">Weakest scored layer</p>
              <p className="mt-2 font-semibold text-foreground">
                {stack.weakestLayer}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="text-sm text-muted-foreground">Conclusion</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                {stack.conclusion}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 lg:grid-cols-2">
            {stack.layers.map((layer) => (
              <Card key={layer.name} className="bg-background/50 shadow-none">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{layer.name}</CardTitle>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {layer.description}
                      </p>
                    </div>
                    <Badge
                      variant={layer.dataMode === "Live" ? "default" : "outline"}
                    >
                      {layer.dataMode}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      {layerValue(layer)}
                    </p>
                    {typeof layer.score === "number" ? (
                      <div className="mt-3">
                        <ProgressBar score={layer.score} />
                      </div>
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">
                    {layer.explanation}
                  </p>

                  <div className="space-y-2">
                    {layer.evidence.map((item) => (
                      <p
                        key={item}
                        className="rounded-xl border border-border bg-card/70 p-3 text-xs leading-5 text-muted-foreground"
                      >
                        {item}
                      </p>
                    ))}
                  </div>

                  <Badge variant="muted">{layer.sourceLabel}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
