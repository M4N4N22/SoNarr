"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  NarrativeBrief,
  NarrativeBriefInput,
  NarrativeBriefResult,
} from "@/lib/ai/gemini";

type AiNarrativeBriefProps = {
  input: NarrativeBriefInput;
};

function BulletSection({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <p className="font-semibold text-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BriefContent({ brief }: { brief: NarrativeBrief }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <p className="font-semibold text-foreground">Executive summary</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {brief.executiveSummary}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BulletSection title="Why now" items={brief.whyNow} />
        <BulletSection title="Bull case" items={brief.bullCase} />
        <BulletSection title="Bear case" items={brief.bearCase} />
        <BulletSection title="Risk notes" items={brief.riskNotes} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="font-semibold text-foreground">Index thesis</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {brief.indexThesis}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="font-semibold text-foreground">Suggested next step</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {brief.suggestedNextStep}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AiNarrativeBrief({ input }: AiNarrativeBriefProps) {
  const [result, setResult] = useState<NarrativeBriefResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generateBrief(forceRefresh = false) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/narrative-brief", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...input, forceRefresh }),
        });

        if (!response.ok) {
          throw new Error("Brief generation failed.");
        }

        const payload = (await response.json()) as NarrativeBriefResult;
        setResult(payload);
      } catch {
        setError("Unable to generate the AI brief right now.");
      }
    });
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
      <Card className="bg-card/85">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant={result?.source === "gemini" ? "default" : "outline"}>
                {result?.source === "gemini"
                  ? "Gemini Powered"
                  : result?.source === "cache"
                    ? "Cached brief"
                  : result?.source === "fallback"
                    ? "Fallback brief"
                    : "AI"}
              </Badge>
              <CardTitle className="mt-5 text-3xl sm:text-4xl">
                AI Narrative Brief
              </CardTitle>
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
                SoNarr turns SoSoValue-powered evidence into a finance-ready
                narrative brief.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => generateBrief(false)}
                disabled={isPending}
              >
                {isPending ? "Generating brief" : "Generate AI brief"}
              </Button>
              {result ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateBrief(true)}
                  disabled={isPending}
                >
                  Regenerate brief
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {error ? (
            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {isPending ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {["Executive summary", "Bull case", "Risk notes"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-background/60 p-4"
                >
                  <p className="text-sm font-medium text-foreground">{item}</p>
                  <div className="mt-4 h-3 rounded-full bg-muted" />
                  <div className="mt-3 h-3 w-3/4 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : result ? (
            <>
              {result.cached ? (
                <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
                  Returned from cache to avoid unnecessary AI calls.
                  {result.cacheTtlSeconds
                    ? ` Cache TTL: ${result.cacheTtlSeconds}s.`
                    : ""}
                </div>
              ) : null}
              <BriefContent brief={result.brief} />
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                Click generate to synthesize the existing narrative evidence into
                an executive brief. SoNarr will not invent prices, assets, scores,
                or evidence.
              </p>
            </div>
          )}

          <Separator />

          <p className="text-sm leading-6 text-muted-foreground">
            This brief is generated from available evidence and is not financial
            advice.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
