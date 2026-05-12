import type { CurrencyRef, NarrativeSignal, RadarData } from "@/lib/sosovalue";
import {
  errorTypeFromHttpStatus,
  logEndpointStatus,
  responseShapeSummary,
  type EndpointResult,
  type EndpointStatus,
} from "@/lib/types/data-source";

export const SIGNAL_STACK_ENDPOINTS = {
  indexConstituents: "/indices/{index_ticker}/constituents",
  indexList: "/indices",
  indexMarketSnapshot: "/indices/{index_ticker}/market-snapshot",
  marketSnapshot: "/currencies/{currency_id}/market-snapshot",
  sectorSpotlight: "/currencies/sector-spotlight",
  tradingPairs: "/currencies/{currency_id}/pairs",
} as const;

export type SignalStackLayer = {
  name: string;
  score?: number;
  status?: "Live" | "Partial" | "Pending verification" | "Unavailable";
  description: string;
  explanation: string;
  evidence: string[];
  sourceLabel: string;
  dataMode: "Live" | "Partial" | "Pending" | "Unavailable";
};

type MarketSnapshot = {
  changePct24h?: number;
  marketcapRank?: number;
  price?: number;
  symbol: string;
  turnover24h?: number;
};

type SectorSpotlightItem = {
  change24hPct: number | null;
  marketcapDom?: number | null;
  name: string;
  type: "sector" | "spotlight";
};

type IndexConstituent = {
  currencyId?: string;
  indexTicker: string;
  symbol: string;
  weight?: number;
};

export type NarrativeSignalStack = {
  overallScore?: number;
  strongestLayer: string;
  weakestLayer: string;
  mode: "Live" | "Partial" | "Unavailable";
  conclusion: string;
  layers: SignalStackLayer[];
};

type WeightedAsset = {
  asset: string;
  weight: number;
};

type BuildSignalStackInput = {
  assets: string[];
  evidenceBullets: string[];
  indexConstituents?: IndexConstituent[];
  marketSnapshots?: MarketSnapshot[];
  narrative: NarrativeSignal;
  radar: RadarData;
  riskLevel: string;
  sectorSpotlight?: SectorSpotlightItem[];
  signalEndpointStatuses?: EndpointStatus[];
  weightedAssets: WeightedAsset[];
};

type UnknownRecord = Record<string, unknown>;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  return undefined;
}

function responsePayload(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return isRecord(value.data) ? value.data : value;
}

function sourceMode(radar: RadarData) {
  if (radar.mode === "partial") {
    return "Partial" as const;
  }

  if (radar.mode === "unavailable") {
    return "Unavailable" as const;
  }

  return "Live" as const;
}

function scoreLabel(layer: SignalStackLayer) {
  return layer.score === undefined ? layer.status ?? "Pending" : `${layer.score}/100`;
}

function uniqueCurrencyRefs(narrative: NarrativeSignal) {
  const byId = new Map<string, CurrencyRef>();

  for (const item of narrative.items) {
    for (const currency of item.currencyRefs) {
      if (currency.id && !byId.has(currency.id)) {
        byId.set(currency.id, currency);
      }
    }
  }

  return Array.from(byId.values()).slice(0, 4);
}

async function requestSoSoValue(path: string, name: string): Promise<EndpointResult<unknown>> {
  const startedAt = Date.now();
  const apiKey = process.env.SOSOVALUE_API_KEY;
  const endpoint = `GET ${path}`;
  const baseUrl =
    process.env.SOSOVALUE_API_BASE_URL ?? "https://openapi.sosovalue.com/api/v1";
  const url = `${baseUrl}${path}`;

  if (!apiKey) {
    const status: EndpointStatus = {
      name,
      endpoint,
      ok: false,
      errorType: "missing_api_key",
      message: "Missing SOSOVALUE_API_KEY. Add the key to enable live SoSoValue enrichment.",
      durationMs: Date.now() - startedAt,
      itemCount: 0,
    };
    logEndpointStatus({ status, url });
    return { ok: false, status };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "x-soso-api-key": apiKey,
      },
      next: { revalidate: 60 },
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const status: EndpointStatus = {
        name,
        endpoint,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorType: errorTypeFromHttpStatus(response.status),
        message: `SoSoValue returned ${response.status} ${response.statusText || ""}`.trim(),
        durationMs,
        itemCount: 0,
      };
      logEndpointStatus({ status, url });
      return { ok: false, status };
    }

    try {
      const data: unknown = await response.json();
      const status: EndpointStatus = {
        name,
        endpoint,
        ok: true,
        status: response.status,
        statusText: response.statusText,
        errorType: "unknown",
        message: "SoSoValue endpoint responded successfully.",
        durationMs,
      };
      logEndpointStatus({ status, url, shape: responseShapeSummary(data) });
      return { ok: true, data, status };
    } catch {
      const status: EndpointStatus = {
        name,
        endpoint,
        ok: false,
        status: response.status,
        statusText: response.statusText,
        errorType: "invalid_response",
        message: "SoSoValue response could not be parsed as JSON.",
        durationMs,
        itemCount: 0,
      };
      logEndpointStatus({ status, url });
      return { ok: false, status };
    }
  } catch {
    const status: EndpointStatus = {
      name,
      endpoint,
      ok: false,
      errorType: "network_error",
      message: "Network error while contacting SoSoValue.",
      durationMs: Date.now() - startedAt,
      itemCount: 0,
    };
    logEndpointStatus({ status, url });
    return { ok: false, status };
  }
}

async function getMarketSnapshot(
  currency: CurrencyRef,
): Promise<EndpointResult<MarketSnapshot | undefined>> {
  if (!currency.id) {
    return {
      ok: false,
      status: {
        name: `Market Snapshot: ${currency.symbol}`,
        endpoint: SIGNAL_STACK_ENDPOINTS.marketSnapshot,
        ok: false,
        errorType: "invalid_response",
        message:
          "The current narrative model stores an asset symbol without the SoSoValue currency ID required for live market snapshot confirmation.",
        itemCount: 0,
      },
    };
  }

  const response = await requestSoSoValue(
    `/currencies/${currency.id}/market-snapshot`,
    `Market Snapshot: ${currency.symbol}`,
  );
  if (!response.ok) {
    return response;
  }

  const payload = responsePayload(response.data);
  if (!payload) {
    return {
      ok: false,
      status: {
        ...response.status,
        ok: false,
        errorType: "invalid_response",
        message: "SoSoValue market snapshot response shape was incompatible with the parser.",
        itemCount: 0,
      },
    };
  }

  return {
    ok: true,
    status: { ...response.status, itemCount: 1 },
    data: {
    changePct24h: asNumber(payload.change_pct_24h),
    marketcapRank: asNumber(payload.marketcap_rank),
    price: asNumber(payload.price),
    symbol: currency.symbol,
    turnover24h: asNumber(payload.turnover_24h),
    },
  };
}

export async function getNarrativeMarketSnapshots(narrative: NarrativeSignal) {
  const currencies = uniqueCurrencyRefs(narrative);
  const snapshots: MarketSnapshot[] = [];
  const endpoints: EndpointStatus[] = [];

  for (const currency of currencies) {
    const result = await getMarketSnapshot(currency);
    endpoints.push(result.status);

    if (result.ok && result.data) {
      snapshots.push(result.data);
    }
  }

  return { data: snapshots, endpoints };
}

function parseSectorSpotlightItem(
  value: unknown,
  type: SectorSpotlightItem["type"],
): SectorSpotlightItem | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = asString(value.name);
  if (!name) {
    return undefined;
  }

  return {
    change24hPct: asNumber(value["24h_change_pct"]) ?? null,
    marketcapDom: asNumber(value.marketcap_dom) ?? null,
    name,
    type,
  };
}

export async function getSectorSpotlightData() {
  const response = await requestSoSoValue(
    SIGNAL_STACK_ENDPOINTS.sectorSpotlight,
    "Sector Spotlight",
  );

  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const payload = responsePayload(response.data);

  if (!payload) {
    return {
      data: [],
      endpoints: [
        {
          ...response.status,
          ok: false,
          errorType: "invalid_response" as const,
          message: "SoSoValue sector/spotlight response shape was incompatible with the parser.",
          itemCount: 0,
        },
      ],
    };
  }

  const data = [
    ...(Array.isArray(payload.sector)
      ? payload.sector
          .map((item) => parseSectorSpotlightItem(item, "sector"))
          .filter((item): item is SectorSpotlightItem => Boolean(item))
      : []),
    ...(Array.isArray(payload.spotlight)
      ? payload.spotlight
          .map((item) => parseSectorSpotlightItem(item, "spotlight"))
          .filter((item): item is SectorSpotlightItem => Boolean(item))
      : []),
  ];

  return {
    data,
    endpoints: [{ ...response.status, itemCount: data.length }],
  };
}

function parseIndexTicker(value: unknown): string | undefined {
  const ticker = asString(value);
  return ticker?.trim() || undefined;
}

function parseIndexConstituent(
  value: unknown,
  indexTicker: string,
): IndexConstituent | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const symbol = asString(value.symbol);
  if (!symbol) {
    return undefined;
  }

  return {
    currencyId: asString(value.currency_id),
    indexTicker,
    symbol: symbol.toUpperCase(),
    weight: asNumber(value.weight),
  };
}

async function getIndexTickers() {
  const response = await requestSoSoValue(SIGNAL_STACK_ENDPOINTS.indexList, "Index List");
  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const payload = responsePayload(response.data);
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.list) ? payload.list : [];
  const data = list
    .map(parseIndexTicker)
    .filter((ticker): ticker is string => Boolean(ticker))
    .slice(0, 12);

  return { data, endpoints: [{ ...response.status, itemCount: data.length }] };
}

async function getIndexConstituents(indexTicker: string) {
  const response = await requestSoSoValue(
    `/indices/${indexTicker}/constituents`,
    `Index Constituents: ${indexTicker}`,
  );
  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const payload = responsePayload(response.data);
  const list = Array.isArray(payload) ? payload : Array.isArray(payload?.list) ? payload.list : [];
  const data = list
    .map((item) => parseIndexConstituent(item, indexTicker))
    .filter((item): item is IndexConstituent => Boolean(item));

  return { data, endpoints: [{ ...response.status, itemCount: data.length }] };
}

export async function getIndexConstituentData() {
  const tickerResult = await getIndexTickers();
  const endpoints: EndpointStatus[] = [...tickerResult.endpoints];
  const constituents: IndexConstituent[] = [];

  for (const ticker of tickerResult.data) {
    const result = await getIndexConstituents(ticker);
    endpoints.push(...result.endpoints);
    constituents.push(...result.data);
  }

  return { data: constituents, endpoints };
}

function buildMarketMomentumLayer({
  endpointStatuses,
  marketSnapshots,
  topAssets,
}: {
  endpointStatuses: EndpointStatus[];
  marketSnapshots: MarketSnapshot[];
  topAssets: string[];
}): SignalStackLayer {
  if (marketSnapshots.length === 0) {
    const failedEndpoint = endpointStatuses.find((status) =>
      status.endpoint.includes("/currencies/"),
    );

    return {
      name: "Market momentum",
      status: failedEndpoint ? "Unavailable" : "Pending verification",
      description:
        "Checks whether related assets show movement through market snapshot or historical kline data.",
      explanation:
        failedEndpoint
          ? `${failedEndpoint.name} returned ${failedEndpoint.status ?? ""} ${failedEndpoint.errorType}.`
          : "SoNarr found related assets, but live market snapshot confirmation is pending because currency IDs were not available in the live narrative response.",
      evidence: [
        `Related assets identified for future checks: ${topAssets.join(", ")}.`,
        `Market snapshot endpoint: ${SIGNAL_STACK_ENDPOINTS.marketSnapshot}.`,
      ],
      sourceLabel: "SoSoValue market snapshot",
      dataMode: failedEndpoint ? "Unavailable" : "Pending",
    };
  }

  const averageAbsChange =
    marketSnapshots.reduce(
      (sum, snapshot) => sum + Math.abs(snapshot.changePct24h ?? 0),
      0,
    ) / marketSnapshots.length;
  const rankedAssets = marketSnapshots.filter(
    (snapshot) => snapshot.marketcapRank !== undefined,
  ).length;
  const score = clampScore(45 + averageAbsChange * 6 + rankedAssets * 8);
  const movers = marketSnapshots
    .map((snapshot) => {
      const change =
        snapshot.changePct24h === undefined
          ? "change unavailable"
          : `${snapshot.changePct24h.toFixed(2)}% 24h`;
      return `${snapshot.symbol}: ${change}`;
    })
    .slice(0, 4);

  return {
    name: "Market momentum",
    score,
    description:
      "Checks whether related assets show movement through market snapshot or historical kline data.",
    explanation:
      "SoNarr confirmed live market snapshot data for matched assets in this narrative. Kline confirmation can be added next for a longer historical read.",
    evidence: [
      `Live market snapshots resolved for ${marketSnapshots.length} related assets.`,
      ...movers,
    ],
    sourceLabel: "SoSoValue market snapshot",
    dataMode: "Live",
  };
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const narrativeKeywordMap: Record<string, string[]> = {
  ai: [
    "ai",
    "artificial intelligence",
    "agent",
    "agents",
    "compute",
    "defai",
    "decentralized ai",
  ],
  "bitcoin-etf": ["btc", "bitcoin", "store of value", "etf"],
  rwa: ["rwa", "real world asset", "tokenized", "treasury"],
  defi: ["defi", "dex", "lending", "revenue", "perpdex", "perp"],
  stablecoin: ["stablecoin", "usdt", "usdc", "payment", "settlement"],
  "layer-2": [
    "l1",
    "l2",
    "layer 1",
    "layer 2",
    "modular",
    "rollup",
    "ecosystem",
  ],
};

function narrativeKeywords(narrative: NarrativeSignal) {
  return [
    ...(narrativeKeywordMap[narrative.id] ?? []),
    narrative.keyword,
    narrative.label,
  ];
}

function sectorMatchesNarrative({
  item,
  narrative,
}: {
  item: SectorSpotlightItem;
  narrative: NarrativeSignal;
}) {
  const itemToken = normalizeToken(item.name);
  const narrativeTokens = narrativeKeywords(narrative)
    .map(normalizeToken)
    .filter(Boolean);

  return narrativeTokens.some((token) => itemToken === token);
}

function isLooseSectorMatch(item: SectorSpotlightItem, narrative: NarrativeSignal) {
  const itemToken = normalizeToken(item.name);
  const narrativeTokens = narrativeKeywords(narrative)
    .map(normalizeToken)
    .filter(Boolean);

  return narrativeTokens.some(
    (token) =>
      itemToken !== token &&
      token.length >= 3 &&
      (itemToken.includes(token) || token.includes(itemToken)),
  );
}

function displaySectorName(name: string) {
  const normalized = name.trim().toLowerCase();
  const knownNames: Record<string, string> = {
    ai: "AI",
    btc: "BTC",
    defai: "DeFAI",
    l1: "L1",
    l2: "L2",
    perpdex: "PerpDEX",
    rwa: "RWA",
    usdc: "USDC",
    usdt: "USDT",
  };

  if (knownNames[normalized]) {
    return knownNames[normalized];
  }

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSignedPercent(value: number) {
  const formatted = `${(value * 100).toFixed(2)}%`;
  return value > 0 ? `+${formatted}` : formatted;
}

function formatMarketcapDominance(value: number) {
  return `${(value * 100).toFixed(2)}% market dominance`;
}

function sectorEvidenceText(item: SectorSpotlightItem) {
  const change =
    item.change24hPct === null
      ? "category match"
      : `${formatSignedPercent(item.change24hPct)} 24h`;
  const dominance =
    item.type === "sector" && item.marketcapDom !== null && item.marketcapDom !== undefined
      ? ` · ${formatMarketcapDominance(item.marketcapDom)}`
      : "";

  return `${displaySectorName(item.name)} (${item.type}): ${change}${dominance}`;
}

function categoryMatchBaseScore(matchCount: number) {
  if (matchCount >= 4) {
    return 75;
  }

  if (matchCount === 3) {
    return 68;
  }

  if (matchCount === 2) {
    return 55;
  }

  return 40;
}

function buildSectorAlignmentLayer({
  endpointStatuses,
  narrative,
  sectorSpotlight,
  topAssets,
}: {
  endpointStatuses: EndpointStatus[];
  narrative: NarrativeSignal;
  sectorSpotlight: SectorSpotlightItem[];
  topAssets: string[];
}): SignalStackLayer {
  const exactMatches = sectorSpotlight.filter((item) =>
    sectorMatchesNarrative({ item, narrative }),
  );
  const looseMatches = sectorSpotlight.filter(
    (item) =>
      !exactMatches.includes(item) && isLooseSectorMatch(item, narrative),
  );
  const matches = [...exactMatches, ...looseMatches]
    .slice(0, 5);

  if (matches.length === 0) {
    const failedEndpoint = endpointStatuses.find(
      (status) => status.endpoint === `GET ${SIGNAL_STACK_ENDPOINTS.sectorSpotlight}`,
    );

    return {
      name: "Sector alignment",
      score: sectorSpotlight.length > 0 ? 25 : undefined,
      status: sectorSpotlight.length > 0 ? undefined : failedEndpoint ? "Unavailable" : "Pending verification",
      description:
        "Checks whether the narrative maps to sector or spotlight data.",
      explanation:
        failedEndpoint
          ? `SoSoValue sector/spotlight endpoint returned ${failedEndpoint.status ?? ""} ${failedEndpoint.errorType}.`
          : sectorSpotlight.length > 0
            ? "SoNarr checked live SoSoValue sector/spotlight categories but did not find a direct narrative match."
            : "Sector/spotlight verification is pending because no compatible live category data was returned.",
      evidence: [
        `${narrative.label} currently maps to ${topAssets.length} live narrative assets.`,
        `No direct sector/spotlight match found from ${SIGNAL_STACK_ENDPOINTS.sectorSpotlight}.`,
      ],
      sourceLabel: "SoSoValue sector/spotlight",
      dataMode: sectorSpotlight.length > 0 ? "Partial" : failedEndpoint ? "Unavailable" : "Pending",
    };
  }

  const movementScore = matches.some((item) => item.change24hPct !== null) ? 10 : 0;
  const marketcapDominanceScore = Math.min(
    10,
    matches.filter(
      (item) =>
        item.type === "sector" &&
        item.marketcapDom !== null &&
        item.marketcapDom !== undefined,
    ).length * 5,
  );
  const rawScore =
    categoryMatchBaseScore(matches.length) + movementScore + marketcapDominanceScore;
  const canReachMax =
    exactMatches.length > 1 && movementScore > 0 && marketcapDominanceScore > 0;
  const score = Math.min(canReachMax ? 95 : 85, clampScore(rawScore));

  return {
    name: "Sector alignment",
    score,
    description:
      "Checks whether the narrative maps to sector or spotlight data.",
    explanation:
      "SoNarr found matching SoSoValue sector and spotlight categories. Token-level movement is checked separately in Market Momentum.",
    evidence: [
      `Matched ${matches.length} SoSoValue-recognized sector/spotlight categories for this narrative.`,
      ...matches.map(sectorEvidenceText),
    ],
    sourceLabel: "SoSoValue sector/spotlight",
    dataMode: "Live",
  };
}

function buildIndexRelevanceLayer({
  endpointStatuses,
  indexConstituents,
  topAssets,
  weightedAssets,
}: {
  endpointStatuses: EndpointStatus[];
  indexConstituents: IndexConstituent[];
  topAssets: string[];
  weightedAssets: WeightedAsset[];
}): SignalStackLayer {
  const targetAssets = new Set(
    [...topAssets, ...weightedAssets.map((asset) => asset.asset)].map((asset) =>
      asset.toUpperCase(),
    ),
  );
const normalizeEndpoint = (endpoint: string) =>
  endpoint.replace(/^GET\s+/i, "").trim();
const indexListStatus = endpointStatuses.find((status) => {
  const endpoint = normalizeEndpoint(status.endpoint);

  return endpoint === "/indices";
});

const constituentsStatus = endpointStatuses.find((status) => {
  const endpoint = normalizeEndpoint(status.endpoint);

  return endpoint.includes("/constituents");
});

const isEndpointOk = (status?: EndpointStatus) =>
  Boolean(
    status &&
      status.ok &&
      typeof status.status === "number" &&
      status.status >= 200 &&
      status.status < 300,
  );

  const indexListOk = isEndpointOk(indexListStatus);
  const constituentsOk = isEndpointOk(constituentsStatus);

  const failedEndpoint = endpointStatuses.find(
    (status) =>
      status.endpoint.startsWith("GET /indices") &&
      (!status.ok ||
        typeof status.status !== "number" ||
        status.status < 200 ||
        status.status >= 300),
  );

  const matches = indexConstituents.filter((constituent) =>
    targetAssets.has(constituent.symbol.toUpperCase()),
  );

  const matchedAssets = Array.from(
    new Set(matches.map((constituent) => constituent.symbol.toUpperCase())),
  );

  const matchedIndexes = Array.from(
    new Set(matches.map((constituent) => constituent.indexTicker)),
  );

  console.log("[Index relevance debug]", {
  endpointStatuses,
  indexListStatus,
  constituentsStatus,
  indexListOk,
  constituentsOk,
  indexConstituentsLength: indexConstituents.length,
});

  if (indexConstituents.length === 0) {
    if (failedEndpoint) {
      return {
        name: "Index relevance",
        status: "Unavailable",
        description:
          "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
        explanation: `${failedEndpoint.name} returned ${
          failedEndpoint.status ?? "no status"
        } ${failedEndpoint.errorType}.`,
        evidence: [
          `Generated basket is ready for a live index relevance check: ${weightedAssets
            .map((asset) => `${asset.asset} ${asset.weight}%`)
            .join(", ")}.`,
          `Attempted live index endpoints: ${SIGNAL_STACK_ENDPOINTS.indexList} and ${SIGNAL_STACK_ENDPOINTS.indexConstituents}.`,
        ],
        sourceLabel: "SoSoValue index data",
        dataMode: "Unavailable",
      };
    }

    if (indexListOk && !constituentsOk) {
      return {
        name: "Index relevance",
        score: 55,
        status: "Partial",
        description:
          "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
        explanation:
          "SoSoValue index list resolved, but live constituent verification is still pending for this narrative.",
        evidence: [
          "Live index discovery is available, but SoNarr has not resolved matching index constituents yet.",
          `Generated basket is ready for constituent overlap checks: ${weightedAssets
            .map((asset) => `${asset.asset} ${asset.weight}%`)
            .join(", ")}.`,
          `Next live check: fetch constituents for relevant SoSoValue indices and compare against ${Array.from(
            targetAssets,
          ).join(", ")}.`,
        ],
        sourceLabel: "SoSoValue index data",
        dataMode: "Partial",
      };
    }

    return {
      name: "Index relevance",
      score: 45,
      status: "Pending verification",
      description:
        "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
      explanation:
        "Live SoSoValue index constituent overlap has not been resolved yet. This layer is waiting for official index constituent data before assigning a strong relevance score.",
      evidence: [
        `Generated basket is ready for a live index relevance check: ${weightedAssets
          .map((asset) => `${asset.asset} ${asset.weight}%`)
          .join(", ")}.`,
        `Attempted live index endpoints: ${SIGNAL_STACK_ENDPOINTS.indexList} and ${SIGNAL_STACK_ENDPOINTS.indexConstituents}.`,
      ],
      sourceLabel: "SoSoValue index data",
      dataMode: "Pending",
    };
  }

  if (matches.length === 0) {
    return {
      name: "Index relevance",
      score: 35,
      description:
        "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
      explanation:
        "SoNarr checked live SoSoValue index constituents but did not find direct overlap with this generated basket.",
      evidence: [
        `Checked ${indexConstituents.length} constituents across ${
          new Set(indexConstituents.map((item) => item.indexTicker)).size
        } SoSoValue indices.`,
        `No direct matches for: ${Array.from(targetAssets).join(", ")}.`,
      ],
      sourceLabel: "SoSoValue index data",
      dataMode: "Live",
    };
  }

  const coverageScore = Math.min(45, matchedAssets.length * 12);
  const indexBreadthScore = Math.min(25, matchedIndexes.length * 8);
  const weightScore = Math.min(
    25,
    matches.reduce((sum, constituent) => {
      const weight =
        typeof constituent.weight === "number" && Number.isFinite(constituent.weight)
          ? constituent.weight
          : 0;

      return sum + weight * 20;
    }, 0),
  );

  const score = Math.min(
    95,
    clampScore(coverageScore + indexBreadthScore + weightScore),
  );

  return {
    name: "Index relevance",
    score,
    description:
      "Checks whether related assets appear in SoSoValue index constituents or index snapshots.",
    explanation:
      "SoNarr found live SoSoValue index constituent overlap with the generated narrative basket.",
    evidence: [
      `Matched ${matchedAssets.length} basket assets across ${matchedIndexes.length} SoSoValue indices.`,
      ...matches.slice(0, 5).map((constituent) => {
        const weight =
          constituent.weight === undefined
            ? "weight unavailable"
            : `${(constituent.weight * 100).toFixed(2)}% index weight`;

        return `${constituent.symbol} appears in ${constituent.indexTicker}: ${weight}.`;
      }),
    ],
    sourceLabel: "SoSoValue index data",
    dataMode: "Live",
  };
}

export function buildNarrativeSignalStack({
  assets,
  evidenceBullets,
  indexConstituents = [],
  marketSnapshots = [],
  narrative,
  radar,
  riskLevel,
  sectorSpotlight = [],
  signalEndpointStatuses = [],
  weightedAssets,
}: BuildSignalStackInput): NarrativeSignalStack {
  const baseMode = sourceMode(radar);
  const topAssets = assets.slice(0, 5);
  const sourceEvidence = evidenceBullets.slice(0, 3);

  const layers: SignalStackLayer[] = [
    {
      name: "News heat",
      score: clampScore(narrative.score),
      description:
        "Measures how strongly the narrative appears in SoSoValue hot news and news search.",
      explanation:
        "This is the strongest live signal currently available because the radar is built from SoSoValue feed and search responses.",
      evidence: sourceEvidence,
      sourceLabel: "SoSoValue hot news and news search",
      dataMode: baseMode,
    },
    buildMarketMomentumLayer({
      endpointStatuses: signalEndpointStatuses,
      marketSnapshots,
      topAssets,
    }),
    buildSectorAlignmentLayer({
      endpointStatuses: signalEndpointStatuses,
      narrative,
      sectorSpotlight,
      topAssets,
    }),
    buildIndexRelevanceLayer({
      endpointStatuses: signalEndpointStatuses,
      indexConstituents,
      topAssets,
      weightedAssets,
    }),
    {
      name: "Execution readiness",
      status: "Pending verification",
      description:
        "Tracks whether the basket is ready for future SoDEX orderbook, slippage, and route checks.",
      explanation:
        "Execution remains preview-only. No signed writes, routes, wallet connections, or trades are available in Wave 1.",
      evidence: [
        `Current risk posture: ${riskLevel}.`,
        "Orderbook depth, slippage, and basket route checks are pending SoDEX integration.",
      ],
      sourceLabel: "SoDEX preview",
      dataMode: "Pending",
    },
  ];

  const scoredLayers = layers.filter(
    (layer): layer is SignalStackLayer & { score: number } =>
      typeof layer.score === "number",
  );
  const overallScore =
    scoredLayers.length > 0
      ? clampScore(
          scoredLayers.reduce((sum, layer) => sum + layer.score, 0) /
            scoredLayers.length,
        )
      : undefined;
  const strongestLayer = scoredLayers.reduce<
    (SignalStackLayer & { score: number }) | undefined
  >((best, layer) => (!best || layer.score > best.score ? layer : best), undefined);
  const weakestLayer = scoredLayers.reduce<
    (SignalStackLayer & { score: number }) | undefined
  >(
    (weakest, layer) =>
      !weakest || layer.score < weakest.score ? layer : weakest,
    undefined,
  );
  const mode =
    baseMode === "Unavailable" || layers.every((layer) => layer.dataMode === "Unavailable")
      ? "Unavailable"
      : baseMode === "Partial" ||
          layers.some((layer) => layer.dataMode !== "Live")
        ? "Partial"
        : "Live";

  return {
    overallScore,
    strongestLayer: strongestLayer
      ? `${strongestLayer.name} (${scoreLabel(strongestLayer)})`
      : "No scored layer available",
    weakestLayer: weakestLayer
      ? `${weakestLayer.name} (${scoreLabel(weakestLayer)})`
      : "No scored layer available",
    mode,
    conclusion:
      "This narrative is strongest on news heat and market attention, while execution readiness remains in preview mode until SoDEX orderbook checks are connected.",
    layers,
  };
}
