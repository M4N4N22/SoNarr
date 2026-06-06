import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Crown,
  Newspaper,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatRelativeTime, type NarrativeSignal } from "@/lib/sosovalue";
import { getNarrativeHeadline, getNarrativeIcon } from "@/lib/sonarr/narrative-icons";
import { cn } from "@/lib/utils";

import { getScoreWidth } from "./radar-utils";

function NarrativeThemeCard({
  narrative,
  featured = false,
}: {
  narrative: NarrativeSignal;
  featured?: boolean;
}) {
  const { icon: Icon, color } = getNarrativeIcon(narrative.id);
  const headline = getNarrativeHeadline(narrative);

  const content = (
    <div className="flex items-start gap-4">
      <Icon
        className={cn("shrink-0", color, featured ? "mt-1 h-7 w-7" : "mt-0.5 h-5 w-5")}
        strokeWidth={featured ? 1.75 : 2}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {featured ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                <Crown className="h-3.5 w-3.5" />
                Top narrative
              </span>
            ) : null}
            <p
              className={cn(
                "font-semibold text-foreground",
                featured ? "mt-1.5 text-xl tracking-tight" : "text-base",
              )}
            >
              {narrative.label}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Signal</p>
            <p className="tabular-nums text-2xl font-semibold leading-none text-foreground">
              {narrative.score}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-background/50 px-3 py-2.5">
          <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{headline}</p>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-background/80">
          <div className="h-full rounded-full bg-primary" style={{ width: getScoreWidth(narrative.score) }} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            {narrative.latestTime ? formatRelativeTime(narrative.latestTime) : "—"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />
            {narrative.total.toLocaleString()} hits
          </span>
          <Badge variant={narrative.status === "Heating up" ? "positive" : "muted"}>
            {narrative.status}
          </Badge>
        </div>
      </div>
    </div>
  );

  if (featured) {
    return (
      <div className="rounded-2xl bg-primary/10 p-6 sm:p-7">
        <Link href={`/narratives/${narrative.id}`} className="group block transition hover:opacity-95">
          {content}
        </Link>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href={`/narratives/${narrative.id}`}
            className={buttonVariants({ size: "sm", className: "h-10 w-full" })}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Open workspace
          </Link>
          <Link
            href={`/narratives/${narrative.id}?tab=launch`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-10 w-full bg-background/60" })}
          >
            <Rocket className="mr-2 h-4 w-4" />
            SoDEX launch
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/narratives/${narrative.id}`}
      className="group block rounded-2xl bg-muted/45 p-5 transition hover:bg-muted/65 sm:p-6"
    >
      {content}
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">
        Open workspace
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function NarrativeThemesPanel({
  narratives,
  className,
}: {
  narratives: NarrativeSignal[];
  className?: string;
}) {
  const [featured, ...rest] = narratives;

  return (
    <section
      id="narratives"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-muted/20",
        className,
      )}
    >
      <div className="shrink-0 bg-muted/35 px-6 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Narrative themes
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Ranked by SoSoValue signal strength. Each theme shows the headline driving it right now —
              your starting point for evidence, index weights, and SoDEX checks.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 px-5 py-5 sm:space-y-6 sm:px-6 sm:py-6">
        {narratives.length === 0 ? (
          <p className="text-sm text-muted-foreground">No narratives loaded.</p>
        ) : null}

        {featured ? <NarrativeThemeCard narrative={featured} featured /> : null}

        {rest.length > 0 ? (
          <div className="space-y-3">
            {featured ? (
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                More themes
              </p>
            ) : null}
            <div className="grid gap-3 sm:gap-4">
              {rest.map((narrative) => (
                <NarrativeThemeCard key={narrative.id} narrative={narrative} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** @deprecated Use NarrativeThemesPanel */
export function NarrativeChecks({
  narratives,
  title = "Narratives",
  variant = "stack",
}: {
  description?: string;
  narratives: NarrativeSignal[];
  title?: string;
  variant?: "grid" | "stack";
}) {
  if (variant === "grid" && title === "All narratives") {
    return <NarrativeThemesPanel narratives={narratives} />;
  }

  return <NarrativeThemesPanel narratives={narratives} />;
}
