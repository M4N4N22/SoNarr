import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { NarrativeSignal } from "@/lib/sosovalue";

import { shortText } from "./radar-utils";

export function ProductPackagingPreview({
  topNarrative,
}: {
  topNarrative: NarrativeSignal;
}) {
  return (
    <Card id="package" className="bg-card/80">
      <CardHeader>
        <CardTitle>Product packaging preview</CardTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          SoNarr detects the narrative first, then prepares the product surface for
          a solo finance desk.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Index idea</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {topNarrative.label} Momentum Index
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <p className="text-sm text-muted-foreground">Research brief seed</p>
          <p className="mt-2 leading-7 text-foreground">
            {shortText(topNarrative.latestTitle, 180)}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">Risk checks</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              Confidence, volatility, concentration, liquidity, and rebalance review
              queued.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">Execution preview</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              SoDEX-ready orderbook plan prepared for future integration.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-sm font-medium text-primary">
            Wave 1 prototype scope
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This page does not connect wallets, custody assets, execute trades, or
            provide investment advice. It packages narratives into product previews
            only.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
