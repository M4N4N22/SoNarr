import type { Metadata } from "next";
import Link from "next/link";

import { EndpointDiagnostics } from "@/components/sonarr/endpoint-diagnostics";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NarrativeWorkspace } from "./_components/narrative-workspace";
import {
  buildNarrativeSignalStack,
  getIndexConstituentData,
  getNarrativeMarketSnapshots,
  getRelevantIndexTickers,
  getSectorSpotlightData,
} from "@/lib/sonarr/signal-stack";
import {
  enrichSelectedBasketProvenance,
  extractNarrativeAssetCandidates,
  rankBasketAssets,
  resolveNarrativeBasketAssets,
} from "@/lib/sonarr/basket-assets";
import { getOrRefreshNarrativeLifecycle } from "@/lib/sonarr/lifecycle";
import { getBasketExecutionReadiness } from "@/lib/sodex";
import {
  filterFeaturedNewsForNarrative,
  getBasketLiquidityContext,
  getFeaturedNews,
  getIndexMarketSnapshots,
  getKlineTrendsForSymbols,
  getListedCurrencies,
  getMacroEvents,
  getNarrativeEtfSnapshot,
} from "@/lib/sosovalue/enrichment";
import {
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
const methodology = [
  "Max single asset weight: 30%.",
  "Include assets repeatedly associated with the narrative.",
  "Higher weight for stronger narrative relevance.",
  "Reduce weight for high concentration or weak liquidity.",
  "Rebalance when narrative score changes by 20%+.",
];

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAssets(narrative: NarrativeSignal, listedSymbols?: string[]) {
  return resolveNarrativeBasketAssets(narrative, defaultAssetsByNarrative, {
    listedSymbols,
  });
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

function getSourceLabel(radar: RadarData) {
  if (radar.mode === "partial") {
    return "Partial SoSoValue data";
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
    `${narrative.total.toLocaleString()} search hits for ${narrative.label}.`,
    `Signal ${narrative.score}/100 · confidence ${narrative.confidence}/100.`,
    narrative.items.length > 0
      ? `${narrative.items.length} live headlines in the category check.`
      : "Category detected, but few supporting headlines right now.",
    `Latest: ${narrative.latestTitle}`,
  ];
}

function getNarrativeBrief(narrative: NarrativeSignal) {
  return {
    what: `${narrative.label} assets and news are moving together — a possible market theme.`,
    whyNow: `SoSoValue picked up fresh activity around “${narrative.keyword}”.`,
    behavior:
      "This is attention and positioning, not proof of fundamentals. Review the charts, then decide if you want to package an index idea.",
  };
}

export default async function NarrativeIntelligencePage({ params }: PageProps) {
  const { id } = await params;
  const result = await getNarrativeById(id);
  const { narrative, radar } = result;

  if (!narrative) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SiteHeader variant="app" />
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <Card className="bg-card/85">
            <CardHeader>
              <Badge variant="outline">Live data only</Badge>
              <CardTitle className="mt-5 text-2xl sm:text-3xl">
                This narrative could not be resolved from live SoSoValue data.
              </CardTitle>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                If the radar endpoints fail, rate-limit, or return an incompatible
                response shape, SoNarr shows diagnostics instead of generated demo
                content.
              </p>
            </CardHeader>
            <CardContent>
              <Link
                href="/radar"
                className={buttonVariants({ variant: "default", className: "px-4" })}
              >
                Back to radar
              </Link>
            </CardContent>
          </Card>
          <div className="mt-6">
            <EndpointDiagnostics endpoints={radar.endpoints} />
          </div>
        </section>
      </main>
    );
  }

  const listedCurrencies = await getListedCurrencies();
  const listedSymbols = listedCurrencies.data.map((currency) => currency.symbol);
  const candidates = extractNarrativeAssetCandidates(narrative, defaultAssetsByNarrative, {
    listedSymbols,
  });
  const selectedProvenance = rankBasketAssets(candidates, { max: 5 });
  const assets =
    selectedProvenance.length > 0
      ? selectedProvenance.map((item) => item.asset)
      : getAssets(narrative, listedSymbols);
  const weightedAssets = getWeightedAssets(assets);
  const brief = getNarrativeBrief(narrative);
  const evidenceBullets = getEvidenceBullets(narrative);
  const sourceLabel = getSourceLabel(radar);
  const riskLevel = getRiskLabel(narrative.score);
  const [
    indexConstituents,
    marketSnapshots,
    sectorSpotlight,
    executionReadiness,
    liquidityContextResult,
    macroEventsResult,
    featuredNewsResult,
    etfSnapshotResult,
    klineTrendsResult,
  ] = await Promise.all([
    getIndexConstituentData(),
    getNarrativeMarketSnapshots(narrative, assets),
    getSectorSpotlightData(),
    getBasketExecutionReadiness(weightedAssets),
    getBasketLiquidityContext(assets),
    getMacroEvents(),
    getFeaturedNews(8),
    getNarrativeEtfSnapshot(narrative.id),
    getKlineTrendsForSymbols(assets, 5),
  ]);
  const relevantIndexTickers = getRelevantIndexTickers(assets, indexConstituents.data);
  const indexSnapshotsResult = await getIndexMarketSnapshots(relevantIndexTickers);
  const featuredForNarrative = filterFeaturedNewsForNarrative(
    featuredNewsResult.data,
    narrative,
  );
  const liquidityTurnoverByAsset = Object.fromEntries(
    liquidityContextResult.data.assets.map((asset) => [
      asset.symbol.toUpperCase(),
      asset.totalTurnover24h ?? 0,
    ]),
  );
  const routableByAsset = Object.fromEntries(
    executionReadiness.legs.map((leg) => [leg.asset.toUpperCase(), leg.tradable]),
  );
  const assetProvenance = enrichSelectedBasketProvenance(
    selectedProvenance.length > 0
      ? selectedProvenance
      : assets.map((asset) => ({
          asset,
          evidenceCount: 0,
          sources: ["default" as const],
          rankScore: 40,
          reason: "Narrative default basket",
        })),
    { liquidityTurnoverByAsset, routableByAsset },
  );
  const signalEndpointStatuses = [
    ...listedCurrencies.endpoints,
    ...indexConstituents.endpoints,
    ...marketSnapshots.endpoints,
    ...sectorSpotlight.endpoints,
    ...executionReadiness.endpoints,
    ...liquidityContextResult.endpoints,
    ...macroEventsResult.endpoints,
    ...featuredNewsResult.endpoints,
    ...etfSnapshotResult.endpoints,
    ...klineTrendsResult.endpoints,
    ...indexSnapshotsResult.endpoints,
  ];
  const signalStack = buildNarrativeSignalStack({
    assets,
    etfSnapshot: etfSnapshotResult.data,
    evidenceBullets,
    executionReadiness,
    indexConstituents: indexConstituents.data,
    indexSnapshots: indexSnapshotsResult.data,
    klineTrends: klineTrendsResult.data,
    liquidityContext: liquidityContextResult.data,
    macroEvents: macroEventsResult.data,
    marketSnapshots: marketSnapshots.data,
    narrative,
    radar,
    riskLevel,
    sectorSpotlight: sectorSpotlight.data,
    signalEndpointStatuses,
    weightedAssets,
  });
  const lifecycle = await getOrRefreshNarrativeLifecycle({
    narrativeId: narrative.id,
    narrativeScore: narrative.score,
    confidence: narrative.confidence,
    overallScore: signalStack.overallScore,
    layerScores: signalStack.layers.map((layer) => ({
      name: layer.name,
      score: layer.score,
      dataMode: layer.dataMode,
    })),
    assets,
    executionCoverage:
      executionReadiness.totalLegs > 0
        ? executionReadiness.tradableCount / executionReadiness.totalLegs
        : undefined,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="app" narrativeId={narrative.id} />
      <NarrativeWorkspace
        narrative={{
          id: narrative.id,
          label: narrative.label,
          score: narrative.score,
          confidence: narrative.confidence,
          status: narrative.status,
          items: narrative.items.map((item) => ({
            id: item.id,
            title: item.title,
            sourceLink: item.sourceLink,
            releaseTime: item.releaseTime,
          })),
        }}
        radarUpdatedAt={radar.updatedAt}
        sourceLabel={sourceLabel}
        riskLevel={riskLevel}
        brief={brief}
        evidenceBullets={evidenceBullets}
        evidenceSummary={{
          searchMatches: narrative.total,
          headlineCount: narrative.items.length,
          latestTitle: narrative.latestTitle,
        }}
        assets={assets}
        weightedAssets={weightedAssets}
        assetProvenance={assetProvenance}
        methodology={methodology}
        signalStack={signalStack}
        executionReadiness={executionReadiness}
        liquidityContext={liquidityContextResult.data}
        lifecycle={lifecycle}
        aiBriefInput={{
          basis: evidenceBullets,
          confidence: narrative.confidence,
          generatedWeights: weightedAssets,
          narrativeId: narrative.id,
          risk: riskLevel,
          signalScore: narrative.score,
          sourceLabels: [
            sourceLabel,
            "SoSoValue hot news and news search",
            "SoNarr deterministic narrative engine",
          ],
          summary: `${brief.what} ${brief.whyNow}`,
          title: `${narrative.label} Momentum`,
          topAssets: assets,
        }}
        executionBriefInput={{
          narrativeId: narrative.id,
          narrativeTitle: `${narrative.label} Momentum`,
          risk: riskLevel,
          executionReadiness: {
            mode: executionReadiness.mode,
            network: executionReadiness.network,
            totalNotionalUsd: executionReadiness.totalNotionalUsd,
            tradableCount: executionReadiness.tradableCount,
            totalLegs: executionReadiness.totalLegs,
            weightedSlippagePct: executionReadiness.weightedSlippagePct,
            totalAskDepthUsd: executionReadiness.totalAskDepthUsd,
            totalBidDepthUsd: executionReadiness.totalBidDepthUsd,
            summary: executionReadiness.summary,
            legs: executionReadiness.legs,
          },
        }}
        decisionAssistInput={{
          narrativeId: narrative.id,
          narrativeTitle: `${narrative.label} Momentum`,
          risk: riskLevel,
          stage: lifecycle.stage,
          overallScore: signalStack.overallScore,
          narrativeScore: narrative.score,
          confidence: narrative.confidence,
          validation: lifecycle.validation
            ? {
                mode: lifecycle.validation.mode,
                summary: lifecycle.validation.summary,
                highConviction: lifecycle.validation.highConviction,
                lowConviction: lifecycle.validation.lowConviction,
                refinementCues: lifecycle.validation.refinementCues,
                rebalanceSuggested: lifecycle.validation.rebalanceSuggested,
                scoreDeltaPct: lifecycle.validation.scoreDeltaPct,
              }
            : undefined,
          executionReadiness: {
            mode: executionReadiness.mode,
            network: executionReadiness.network,
            tradableCount: executionReadiness.tradableCount,
            totalLegs: executionReadiness.totalLegs,
            weightedSlippagePct: executionReadiness.weightedSlippagePct,
            summary: executionReadiness.summary,
          },
        }}
        launchRoom={{
          narrativeTitle: `${narrative.label} Momentum`,
          summary: brief.what,
          whyNow: brief.whyNow,
          signalScore: narrative.score,
          confidence: narrative.confidence,
          risk: riskLevel,
          evidenceBullets,
          topAssets: assets,
          weightedAssets,
          methodology,
        }}
        enrichment={{
          featuredNews: featuredForNarrative,
          klineTrends: klineTrendsResult.data,
          indexSnapshots: indexSnapshotsResult.data,
          etfSnapshot: etfSnapshotResult.data,
          macroEvents: macroEventsResult.data,
        }}
      />
      <SiteFooter compact />
    </main>
  );
}
