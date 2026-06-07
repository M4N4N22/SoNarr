"use client";

import { AlertTriangle, CheckCircle2, KeyRound, PauseCircle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  classifyLegResult,
  isCancelOnlyError,
  legStatusHint,
  legStatusLabel,
  summarizeLegSubmitResults,
  type BasketLegSubmitResult,
} from "@/lib/sodex/trading-errors";
import type { BasketTradeResult } from "@/lib/sodex";

function StatusIcon({ category }: { category: ReturnType<typeof classifyLegResult> }) {
  switch (category) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" />;
    case "cancel-only":
    case "halted":
      return <PauseCircle className="h-4 w-4 shrink-0 text-chart-4" />;
    case "signature":
      return <KeyRound className="h-4 w-4 shrink-0 text-negative" />;
    default:
      return <XCircle className="h-4 w-4 shrink-0 text-negative" />;
  }
}

function badgeVariant(category: ReturnType<typeof classifyLegResult>) {
  switch (category) {
    case "success":
      return "positive" as const;
    case "cancel-only":
    case "halted":
      return "outline" as const;
    case "signature":
      return "muted" as const;
    default:
      return "muted" as const;
  }
}

export function BasketTradeStatus({
  result,
  submittingMessage,
}: {
  result?: BasketTradeResult | null;
  submittingMessage?: string;
}) {
  if (submittingMessage) {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-3 text-sm">
        <p className="font-medium text-foreground">{submittingMessage}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Approve each wallet signature on ValueChain Testnet. Do not switch networks mid-flow.
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const legResults = result.legResults ?? [];
  const cancelOnlyCount = legResults.filter((leg) => isCancelOnlyError(leg.message)).length;
  const successCount = legResults.filter((leg) => leg.ok).length;

  return (
    <div
      className={`rounded-md border px-3 py-3 ${
        result.ok
          ? successCount === legResults.length
            ? "border-positive/30 bg-positive/10"
            : "border-chart-4/30 bg-chart-4/10"
          : "border-negative/30 bg-negative/10"
      }`}
    >
      <div className="flex items-start gap-2">
        {result.ok ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {legResults.length > 0
              ? summarizeLegSubmitResults(legResults)
              : result.message}
          </p>
          {cancelOnlyCount > 0 ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Cancel-only mode is a SoDEX testnet maintenance state — not a SoNarr bug. Wait a few
              minutes and retry, or try markets that are actively accepting orders.
            </p>
          ) : null}
        </div>
      </div>

      {legResults.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
          {legResults.map((leg) => (
            <LegResultRow key={leg.clOrdID} leg={leg} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LegResultRow({ leg }: { leg: BasketLegSubmitResult }) {
  const category = classifyLegResult(leg);

  return (
    <li className="flex items-start gap-2 rounded-md bg-background/40 px-2 py-2">
      <StatusIcon category={category} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">{leg.asset}</span>
          {leg.displayName ? (
            <span className="text-[11px] text-muted-foreground">{leg.displayName}</span>
          ) : null}
          <Badge variant={badgeVariant(category)}>{legStatusLabel(category)}</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{legStatusHint(category)}</p>
        {category === "other" && leg.message !== "Submitted" ? (
          <p className="mt-1 text-[11px] leading-4 text-foreground/80">{leg.message}</p>
        ) : null}
      </div>
    </li>
  );
}
