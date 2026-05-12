type UnknownRecord = Record<string, unknown>;

export type CurrencyRef = {
  id?: string;
  name?: string;
  symbol: string;
};

export type NewsItem = {
  id: string;
  title: string;
  content: string;
  sourceLink: string;
  releaseTime: number;
  author?: string;
  tags: string[];
  currencies: string[];
  currencyRefs: CurrencyRef[];
};

export type NarrativeSignal = {
  id: string;
  keyword: string;
  label: string;
  total: number;
  score: number;
  confidence: number;
  source: "live" | "fallback";
  status: "Heating up" | "Active" | "Watching";
  latestTitle: string;
  latestTime?: number;
  relatedAssets: string[];
  items: NewsItem[];
};

export type RadarData = {
  hotNews: NewsItem[];
  narratives: NarrativeSignal[];
  source: "live" | "mixed" | "fallback";
  reason?: string;
  updatedAt: string;
};

const API_BASE_URL =
  process.env.SOSOVALUE_API_BASE_URL ?? "https://openapi.sosovalue.com/api/v1";

const narrativeQueries = [
  { id: "ai", keyword: "AI", label: "AI" },
  { id: "bitcoin-etf", keyword: "Bitcoin ETF", label: "Bitcoin ETF" },
  { id: "rwa", keyword: "RWA", label: "RWA" },
  { id: "defi", keyword: "DeFi", label: "DeFi" },
  { id: "stablecoin", keyword: "Stablecoin", label: "Stablecoin" },
  { id: "layer-2", keyword: "Layer 2", label: "Layer 2" },
];

const fallbackHotNews: NewsItem[] = [
  {
    id: "fallback-hot-1",
    title: "Bitcoin liquidity rotation drives renewed institutional attention",
    content:
      "Market desks are tracking renewed Bitcoin momentum alongside ETF flow discussion and broader risk-on positioning.",
    sourceLink: "https://sosovalue.com",
    releaseTime: Date.now() - 1000 * 60 * 42,
    author: "SoNarr fallback",
    tags: ["Bitcoin", "ETF"],
    currencies: ["BTC"],
    currencyRefs: [{ id: "1673723677362319866", name: "BITCOIN", symbol: "BTC" }],
  },
  {
    id: "fallback-hot-2",
    title: "AI infrastructure tokens lead narrative watchlists",
    content:
      "AI-linked crypto assets are being monitored as capital expenditure headlines and token momentum overlap.",
    sourceLink: "https://sosovalue.com",
    releaseTime: Date.now() - 1000 * 60 * 88,
    author: "SoNarr fallback",
    tags: ["AI"],
    currencies: ["TAO", "FET", "RNDR"],
    currencyRefs: [
      { symbol: "TAO" },
      { symbol: "FET" },
      { symbol: "RNDR" },
    ],
  },
  {
    id: "fallback-hot-3",
    title: "Stablecoin settlement and RWA rails remain active themes",
    content:
      "Stablecoin payment infrastructure and tokenized real-world asset updates continue to appear across market feeds.",
    sourceLink: "https://sosovalue.com",
    releaseTime: Date.now() - 1000 * 60 * 131,
    author: "SoNarr fallback",
    tags: ["Stablecoin", "RWA"],
    currencies: ["USDC", "ONDO"],
    currencyRefs: [{ symbol: "USDC" }, { symbol: "ONDO" }],
  },
];

const fallbackNarratives: NarrativeSignal[] = [
  {
    id: "ai",
    keyword: "AI",
    label: "AI",
    total: 58,
    score: 88,
    confidence: 74,
    source: "fallback",
    status: "Heating up",
    latestTitle: "AI infrastructure tokens lead narrative watchlists",
    latestTime: Date.now() - 1000 * 60 * 88,
    relatedAssets: ["TAO", "FET", "RNDR"],
    items: [fallbackHotNews[1]],
  },
  {
    id: "bitcoin-etf",
    keyword: "Bitcoin ETF",
    label: "Bitcoin ETF",
    total: 41,
    score: 76,
    confidence: 68,
    source: "fallback",
    status: "Active",
    latestTitle: "Bitcoin liquidity rotation drives renewed institutional attention",
    latestTime: Date.now() - 1000 * 60 * 42,
    relatedAssets: ["BTC"],
    items: [fallbackHotNews[0]],
  },
  {
    id: "rwa",
    keyword: "RWA",
    label: "RWA",
    total: 24,
    score: 61,
    confidence: 59,
    source: "fallback",
    status: "Watching",
    latestTitle: "Stablecoin settlement and RWA rails remain active themes",
    latestTime: Date.now() - 1000 * 60 * 131,
    relatedAssets: ["ONDO"],
    items: [fallbackHotNews[2]],
  },
  {
    id: "defi",
    keyword: "DeFi",
    label: "DeFi",
    total: 22,
    score: 58,
    confidence: 56,
    source: "fallback",
    status: "Watching",
    latestTitle: "DeFi risk and liquidity checks remain a radar category",
    latestTime: Date.now() - 1000 * 60 * 160,
    relatedAssets: ["AAVE", "UNI"],
    items: [],
  },
  {
    id: "stablecoin",
    keyword: "Stablecoin",
    label: "Stablecoin",
    total: 33,
    score: 69,
    confidence: 64,
    source: "fallback",
    status: "Active",
    latestTitle: "Stablecoin settlement and RWA rails remain active themes",
    latestTime: Date.now() - 1000 * 60 * 131,
    relatedAssets: ["USDC"],
    items: [fallbackHotNews[2]],
  },
  {
    id: "layer-2",
    keyword: "Layer 2",
    label: "Layer 2",
    total: 19,
    score: 52,
    confidence: 52,
    source: "fallback",
    status: "Watching",
    latestTitle: "Layer 2 activity remains on the monitoring board",
    latestTime: Date.now() - 1000 * 60 * 220,
    relatedAssets: ["ARB", "OP"],
    items: [],
  },
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asString).filter((tag): tag is string => Boolean(tag));
}

function parseCurrencyRefs(value: unknown): CurrencyRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((currency) => {
      if (!isRecord(currency)) {
        return undefined;
      }

      const symbol =
        asString(currency.symbol) ??
        asString(currency.name) ??
        asString(currency.full_name);

      if (!symbol) {
        return undefined;
      }

      const currencyRef: CurrencyRef = { symbol };
      const id = asString(currency.currency_id) ?? asString(currency.id);
      const name = asString(currency.full_name) ?? asString(currency.name);

      if (id) {
        currencyRef.id = id;
      }

      if (name) {
        currencyRef.name = name;
      }

      return currencyRef;
    })
    .filter((currency): currency is CurrencyRef => Boolean(currency));
}

function parseNewsItem(value: unknown): NewsItem | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = asString(value.id);
  const title = asString(value.title);
  const sourceLink =
    asString(value.source_link) ??
    asString(value.sourceLink) ??
    asString(value.original_link) ??
    asString(value.originalLink);
  const releaseTime =
    asNumber(value.release_time) ??
    asNumber(value.releaseTime) ??
    asNumber(value.create_time) ??
    asNumber(value.createTime);

  if (!id || !title || !sourceLink || !releaseTime) {
    return undefined;
  }

  const currencyRefs = parseCurrencyRefs(
    value.matched_currencies ?? value.matchedCurrencies,
  );

  return {
    id,
    title: stripHtml(title),
    content: stripHtml(asString(value.content) ?? ""),
    sourceLink,
    releaseTime,
    author: asString(value.author) ?? asString(value.nick_name),
    tags: parseTags(value.tags),
    currencies: currencyRefs.map((currency) => currency.symbol),
    currencyRefs,
  };
}

function responseData(value: unknown): UnknownRecord & { list: unknown[] } {
  if (!isRecord(value)) {
    throw new Error("SoSoValue response is not an object.");
  }

  const code = asNumber(value.code);
  if (code !== undefined && code !== 0) {
    throw new Error(asString(value.message) ?? "SoSoValue returned an error code.");
  }

  const data = isRecord(value.data) ? value.data : value;
  const list = data.list;
  if (!Array.isArray(list)) {
    throw new Error("SoSoValue response does not include a list.");
  }

  return { ...data, list };
}

async function requestSoSoValue(path: "/news/hot" | "/news/search", params: URLSearchParams) {
  const apiKey = process.env.SOSOVALUE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SOSOVALUE_API_KEY.");
  }

  const url = new URL(`${API_BASE_URL}${path}`);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-soso-api-key": apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`SoSoValue request failed with ${response.status}.`);
  }

  return response.json();
}

function parseNewsList(response: unknown) {
  const data = responseData(response);
  const list = data.list
    .map(parseNewsItem)
    .filter((item): item is NewsItem => Boolean(item));

  if (list.length === 0) {
    throw new Error("SoSoValue list did not include compatible news items.");
  }

  return {
    total: asNumber(data.total) ?? list.length,
    list,
  };
}

async function getHotNews() {
  const response = await requestSoSoValue(
    "/news/hot",
    new URLSearchParams({
      page: "1",
      page_size: "12",
      language: "en",
    }),
  );

  return parseNewsList(response).list;
}

async function getNarrativeSignal({
  id,
  keyword,
  label,
}: {
  id: string;
  keyword: string;
  label: string;
}): Promise<NarrativeSignal> {
  const response = await requestSoSoValue(
    "/news/search",
    new URLSearchParams({
      keyword,
      page: "1",
      page_size: "8",
      sort: "release_time",
    }),
  );
  const parsed = parseNewsList(response);
  const relatedAssets: string[] = Array.from(
    new Set(parsed.list.flatMap((item: NewsItem) => item.currencies).slice(0, 6)),
  );
  const score = Math.min(
    96,
    Math.max(35, Math.round(Math.log10(parsed.total + 1) * 24 + parsed.list.length * 2)),
  );

  return {
    id,
    keyword,
    label,
    total: parsed.total,
    score,
    confidence: Math.min(94, Math.max(48, Math.round(score * 0.78 + parsed.list.length * 2))),
    source: "live",
    status: score >= 78 ? "Heating up" : score >= 62 ? "Active" : "Watching",
    latestTitle: parsed.list[0]?.title ?? `${label} narrative activity`,
    latestTime: parsed.list[0]?.releaseTime,
    relatedAssets,
    items: parsed.list,
  };
}

export async function getRadarData(): Promise<RadarData> {
  try {
    const hotNews = await getHotNews();
    const narratives: NarrativeSignal[] = [];

    for (const query of narrativeQueries) {
      try {
        narratives.push(await getNarrativeSignal(query));
      } catch {
        const fallback = fallbackNarratives.find(
          (narrative) => narrative.keyword === query.keyword,
        );

        if (fallback) {
          narratives.push(fallback);
        }
      }
    }

    return {
      hotNews,
      narratives: narratives.sort(
        (a: NarrativeSignal, b: NarrativeSignal) => b.score - a.score,
      ),
      source: narratives.some((narrative) => narrative.source === "fallback")
        ? "mixed"
        : "live",
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      hotNews: fallbackHotNews,
      narratives: fallbackNarratives,
      source: "fallback",
      reason: error instanceof Error ? error.message : "SoSoValue feed unavailable.",
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function getNarrativeById(id: string) {
  const radar = await getRadarData();
  const narrative = radar.narratives.find((item) => item.id === id);

  if (!narrative) {
    return undefined;
  }

  return {
    narrative,
    radar,
  };
}

export function formatRelativeTime(timestamp?: number) {
  if (!timestamp) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}
