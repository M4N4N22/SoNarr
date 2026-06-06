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
  ExecutionBrief,
  ExecutionBriefInput,
  ExecutionBriefResult,
} from "@/lib/ai/execution-gemini";

type AiExecutionBriefProps = {
  input: ExecutionBriefInput;
  embedded?: boolean;
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

function BriefContent({ brief }: { brief: ExecutionBrief }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <p className="font-semibold text-foreground">Route summary</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {brief.routeSummary}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BulletSection title="Depth assessment" items={brief.depthAssessment} />
        <BulletSection title="Slippage assessment" items={brief.slippageAssessment} />
        <BulletSection title="Missing markets" items={brief.missingMarkets} />
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="font-semibold text-foreground">Readiness verdict</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {brief.readinessVerdict}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <p className="font-semibold text-foreground">Suggested next step</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {brief.suggestedNextStep}
        </p>
      </div>
    </div>
  );
}

export function AiExecutionBrief({ input, embedded = false }: AiExecutionBriefProps) {
  const [result, setResult] = useState<ExecutionBriefResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generateBrief(forceRefresh = false) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/execution-brief", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...input, forceRefresh }),
        });

        if (!response.ok) {
          throw new Error("Execution brief generation failed.");
        }

        const payload = (await response.json()) as ExecutionBriefResult;
        setResult(payload);
      } catch {
        setError("Unable to generate the execution brief right now.");
      }
    });
  }

  const card = (
    <Card className="bg-card/85">
      <CardHeader className={embedded ? "border-b border-border p-4 sm:p-5" : "border-b border-border"}>
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
            <CardTitle className={embedded ? "mt-3 text-xl" : "mt-5 text-3xl sm:text-4xl"}>
              {embedded ? "Execution brief" : "AI Execution Brief"}
            </CardTitle>
            <p className={embedded ? "mt-2 text-sm text-muted-foreground" : "mt-4 max-w-3xl text-base leading-7 text-muted-foreground"}>
              {embedded
                ? "Summarize SoDEX route, depth, and slippage checks."
                : "SoNarr synthesizes live SoDEX orderbook readiness into an operator-facing execution brief. No trades are placed."}
            </p>
          </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => generateBrief(false)}
                disabled={isPending}
              >
                {isPending ? "Generating brief" : "Generate execution brief"}
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
        <CardContent className={embedded ? "space-y-4 p-4 sm:p-5" : "space-y-5 p-6"}>
          {error ? (
            <div className="rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {isPending ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {["Route summary", "Depth assessment", "Readiness verdict"].map((item) => (
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
                Click generate to summarize the live SoDEX route, depth, and
                slippage checks already loaded for this basket. SoNarr will not
                invent markets, prices, or fill assumptions.
              </p>
            </div>
          )}

          <Separator />

          <p className="text-sm leading-6 text-muted-foreground">
            This execution brief is research-only and is not financial advice.
          </p>
        </CardContent>
      </Card>
  );

  if (embedded) {
    return card;
  }

  return <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">{card}</section>;
}
