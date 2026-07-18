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
import type {
  DecisionAssistBrief,
  DecisionAssistInput,
  DecisionAssistResult,
} from "@/lib/ai/decision-gemini";

type AiDecisionAssistProps = {
  input: DecisionAssistInput;
  embedded?: boolean;
};

function BriefContent({ brief }: { brief: DecisionAssistBrief }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Action: {brief.action}</Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{brief.rationale}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
            {brief.evidencePoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-border bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Risks
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
            {brief.risks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Next check: {brief.nextCheck}
      </p>
    </div>
  );
}

export function AiDecisionAssist({ input, embedded = false }: AiDecisionAssistProps) {
  const [result, setResult] = useState<DecisionAssistResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate(forceRefresh = false) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/decision-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, forceRefresh }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Decision assist failed.");
        }
        setResult(payload as DecisionAssistResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Decision assist failed.");
      }
    });
  }

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={isPending} onClick={() => generate(false)}>
          {isPending ? "Generating…" : result ? "Refresh assist" : "Generate decision assist"}
        </Button>
        {result ? (
          <Badge variant="muted">
            {result.source}
            {result.cached ? " · cache" : ""}
          </Badge>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-negative">{error}</p> : null}
      {result ? (
        <div className="mt-4">
          <BriefContent brief={result.brief} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Uses lifecycle stage, forward-return cues, and SoDEX readiness only — no invented fills.
        </p>
      )}
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return (
    <Card className="bg-card/85">
      <CardHeader>
        <CardTitle className="text-lg">Decision assist</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
