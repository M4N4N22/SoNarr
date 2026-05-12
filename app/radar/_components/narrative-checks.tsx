import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime, type NarrativeSignal } from "@/lib/sosovalue";

import { getScoreWidth, shortText } from "./radar-utils";

export function NarrativeChecks({
  narratives,
  description = "Search probes from GET /news/search across AI, Bitcoin ETF, RWA, DeFi, Stablecoin, and Layer 2.",
  title = "Narrative category checks",
  variant = "stack",
}: {
  description?: string;
  narratives: NarrativeSignal[];
  title?: string;
  variant?: "grid" | "stack";
}) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent
        className={
          variant === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"
        }
      >
        {narratives.length === 0 ? (
          <div className="rounded-2xl border border-border bg-background/60 p-5 text-sm leading-6 text-muted-foreground">
            No live narrative cards are available from the current SoSoValue
            response set.
          </div>
        ) : null}
        {narratives.map((narrative) => (
          <Link
            key={narrative.keyword}
            href={`/narratives/${narrative.id}`}
            className="block rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{narrative.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {narrative.total.toLocaleString()} matching feed items
                </p>
              </div>
              <Badge
                variant={narrative.status === "Heating up" ? "default" : "outline"}
              >
                {narrative.status}
              </Badge>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: getScoreWidth(narrative.score) }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatRelativeTime(narrative.latestTime)}
              </span>
              <span className="font-medium text-foreground">
                {narrative.score}/100
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {shortText(narrative.latestTitle, 110)}
            </p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">
                Source: SoSoValue
              </span>
              <span
                className={buttonVariants({
                  variant: "outline",
                  className: "px-3 py-1.5 text-xs",
                })}
              >
                Analyze narrative
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
