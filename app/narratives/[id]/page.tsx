import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExecutionPreviewSection } from "@/components/sonarr/execution-preview-section";
import { NarrativeLaunchRoom } from "@/components/sonarr/narrative-launch-room";
import { NarrativeSignalStack } from "@/components/sonarr/narrative-signal-stack";
import {
  buildNarrativeSignalStack,
  getNarrativeMarketSnapshots,
} from "@/lib/sonarr/signal-stack";
import {
  formatRelativeTime,
  getNarrativeById,
  type NarrativeSignal,
  type RadarData,
} from "@/lib/sosovalue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Narrative Intelligence | SoNarr",
  description:
    "Convert a detected market narrative into evidence, asset mapping, risk checks, and an index product preview.",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const defaultAssetsByNarrative: Record<string, string[]> = {
  ai: ["TAO", "FET", "RNDR", "NEAR", "AKT"],
  "bitcoin-etf": ["BTC", "COIN", "MSTR", "STX", "ORDI"],
  rwa: ["ONDO", "LINK", "MKR", "CFG", "POLYX"],
  defi: ["AAVE", "UNI", "MKR", "COMP", "SNX"],
  stablecoin: ["USDC", "USDT", "ENA", "MKR", "AAVE"],
  "layer-2": ["ARB", "OP", "MATIC", "STRK", "IMX"],
};

const baseWeights = [30, 25, 20, 15, 10];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAssets(narrative: NarrativeSignal) {
  const fromEvidence = narrative.items.flatMap((item) => item.currencies);
  const defaults = defaultAssetsByNarrative[narrative.id] ?? [];

  return uniqueValues([...narrative.relatedAssets, ...fromEvidence, ...defaults]).slice(
    0,
    5,
  );
}

function getWeightedAssets(assets: string[]) {
  const selectedAssets = assets.slice(0, 5);
  const rawWeights = baseWeights.slice(0, selectedAssets.length);
  const total = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const difference = 100 - total;

  return selectedAssets.map((asset, index) => ({
    asset,
    weight: rawWeights[index] + (index === selectedAssets.length - 1 ? difference : 0),
  }));
}

function getSourceLabel(radar: RadarData, narrative: NarrativeSignal) {
  if (radar.source === "fallback" || narrative.source === "fallback") {
    return "Fallback data";
  }

  if (radar.source === "mixed") {
    return "Mixed data";
  }

  return "Live SoSoValue data";
}

function getRiskLabel(score: number): "Low" | "Medium" | "Medium-high" | "High" {
  if (score >= 84) {
    return "High";
  }

  if (score >= 68) {
    return "Medium-high";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

function getEvidenceBullets(narrative: NarrativeSignal) {
  return [
    `${narrative.total.toLocaleString()} matching SoSoValue search results are associated with ${narrative.label}.`,
    `The current narrative score is ${narrative.score}/100, with ${narrative.confidence}/100 data confidence.`,
    narrative.items.length > 0
      ? `Recent feed evidence includes ${narrative.items.length} parsed headlines from the category check.`
      : "The category is present in the radar model, but live supporting headlines are limited right now.",
    `Latest detected signal: ${narrative.latestTitle}`,
  ];
}

function getNarrativeBrief(narrative: NarrativeSignal) {
  return {
    what: `${narrative.label} is being treated as a market narrative because related news, asset mentions, and category search activity are clustering around the same theme.`,
    whyNow: `It is appearing now because SoNarr detected current SoSoValue-powered feed activity and search evidence around ${narrative.keyword}. This can indicate attention rotation, catalyst monitoring, or renewed analyst focus.`,
    behavior:
      "The behavior may represent narrative-driven positioning rather than confirmed fundamental change. SoNarr packages the signal into a product idea so a solo operator can review the evidence, risks, and methodology before publishing.",
  };
}

export default async function NarrativeIntelligencePage({ params }: PageProps) {
  const { id } = await params;
  const result = await getNarrativeById(id);

  if (!result) {
    notFound();
  }

  const { narrative, radar } = result;
  const assets = getAssets(narrative);
  const weightedAssets = getWeightedAssets(assets);
  const coreAssets = assets.slice(0, 2);
  const adjacentAssets = assets.slice(2, 4);
  const watchlistAssets = assets.slice(4);
  const brief = getNarrativeBrief(narrative);
  const evidenceBullets = getEvidenceBullets(narrative);
  const sourceLabel = getSourceLabel(radar, narrative);
  const riskLevel = getRiskLabel(narrative.score);
  const marketSnapshots = await getNarrativeMarketSnapshots(narrative);
  const signalStack = buildNarrativeSignalStack({
    assets,
    evidenceBullets,
    marketSnapshots,
    narrative,
    radar,
    riskLevel,
    weightedAssets,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_6%,rgba(43,68,231,0.18),transparent_30rem),radial-gradient(circle_at_84%_10%,rgba(255,255,255,0.07),transparent_24rem)]" />

      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/radar" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-sm font-semibold text-primary">
              SN
            </span>
            <div>
              <p className="font-semibold leading-none text-foreground">SoNarr</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Narrative intelligence
              </p>
            </div>
          </Link>
          <Link
            href="/radar"
            className={buttonVariants({ variant: "outline", className: "px-4" })}
          >
            Back to radar
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden ">
            <CardHeader className="border-b border-border p-8">
              <div className="flex flex-wrap gap-2">
                <Badge>{sourceLabel}</Badge>
                <Badge variant="outline">{narrative.status}</Badge>
                <Badge variant="muted">{narrative.label}</Badge>
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
                {narrative.label} Momentum Intelligence
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                SoNarr has converted this detected market narrative into evidence,
                asset mapping, a suggested index product, risk checks, rebalance
                logic, and a preview-only execution path.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {narrative.label}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Signal score</p>
                <p className="mt-2 text-lg font-semibold text-primary">
                  {narrative.score}/100
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {narrative.confidence}/100
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatRelativeTime(new Date(radar.updatedAt).getTime())}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle>Product conversion state</CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This is not a generic news detail page. It is the packaging layer
                between narrative detection and a publishable finance product.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Suggested product</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {narrative.label} Momentum Index
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">Risk posture</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {riskLevel}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Narrative brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium text-primary">What it is</p>
              <p className="mt-2 leading-7 text-muted-foreground">{brief.what}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-primary">Why now</p>
              <p className="mt-2 leading-7 text-muted-foreground">{brief.whyNow}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-primary">
                Market behavior it may represent
              </p>
              <p className="mt-2 leading-7 text-muted-foreground">
                {brief.behavior}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Evidence panel</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Basis signals from SoSoValue-powered feeds and search.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {evidenceBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-2xl border border-border bg-background/60 p-4 text-sm leading-6 text-muted-foreground"
                >
                  {bullet}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {narrative.items.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.sourceLink}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {formatRelativeTime(item.releaseTime)}
                    </p>
                    <Badge variant="muted">SoSoValue feed</Badge>
                  </div>
                  <p className="mt-2 font-medium leading-6 text-foreground">
                    {item.title}
                  </p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-3 lg:px-8">
        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Core exposure</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {coreAssets.map((asset) => (
              <Badge key={asset} variant="outline">
                {asset}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Adjacent exposure</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {adjacentAssets.map((asset) => (
              <Badge key={asset} variant="outline">
                {asset}
              </Badge>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {watchlistAssets.map((asset) => (
              <Badge key={asset} variant="outline">
                {asset}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <NarrativeSignalStack stack={signalStack} />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>{narrative.label} Momentum Index</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Generated index product preview. Total weight equals 100%.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {weightedAssets.map((asset, index) => (
              <div
                key={asset.asset}
                className="rounded-2xl border border-border bg-background/60 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{asset.asset}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {index < 2
                        ? "Core exposure because it appears closest to the detected narrative."
                        : index < 4
                          ? "Adjacent exposure that can broaden the basket while staying connected to the theme."
                          : "Watchlist exposure included at a smaller weight for monitored relevance."}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-primary">
                    {asset.weight}%
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/85">
          <CardHeader>
            <CardTitle>Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Max single asset weight: 30%.</p>
            <p>Include assets repeatedly associated with the narrative.</p>
            <p>Higher weight for stronger narrative relevance.</p>
            <p>Reduce weight for high concentration or weak liquidity.</p>
            <p>Rebalance when narrative score changes by 20%+.</p>
          </CardContent>
        </Card>
      </section>

      <NarrativeLaunchRoom
        narrativeTitle={`${narrative.label} Momentum`}
        summary={brief.what}
        whyNow={brief.whyNow}
        signalScore={narrative.score}
        confidence={narrative.confidence}
        risk={riskLevel}
        evidenceBullets={evidenceBullets}
        topAssets={assets}
        weightedAssets={weightedAssets}
        methodology={[
          "Max single asset weight: 30%.",
          "Include assets repeatedly associated with the narrative.",
          "Higher weight for stronger narrative relevance.",
          "Reduce weight for high concentration or weak liquidity.",
          "Rebalance when narrative score changes by 20%+.",
        ]}
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-4 lg:px-8">
        {[
          ["Concentration risk", weightedAssets[0]?.weight === 30 ? "Medium" : "Low"],
          ["Narrative volatility", riskLevel],
          [
            "Data confidence",
            narrative.confidence >= 75
              ? "Low"
              : narrative.confidence >= 60
                ? "Medium"
                : "Medium-high",
          ],
          [
            "Execution readiness",
            narrative.relatedAssets.length >= 3 ? "Medium" : "Medium-high",
          ],
        ].map(([title, label]) => (
          <Card key={title} className="bg-card/85 p-5">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-3 text-2xl font-semibold text-foreground">{label}</p>
          </Card>
        ))}
      </section>

      <ExecutionPreviewSection />
    </main>
  );
}
