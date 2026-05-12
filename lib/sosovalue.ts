import {
  dataSourceMode,
  errorTypeFromHttpStatus,
  logEndpointStatus,
  responseShapeSummary,
  type DataSourceState,
  type EndpointResult,
  type EndpointStatus,
} from "@/lib/types/data-source";

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
  source: "live";
  status: "Heating up" | "Active" | "Watching";
  latestTitle: string;
  latestTime?: number;
  relatedAssets: string[];
  items: NewsItem[];
};

export type RadarData = DataSourceState & {
  hotNews: NewsItem[];
  narratives: NarrativeSignal[];
  note?: string;
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

      const currencyRef: CurrencyRef = { symbol: symbol.toUpperCase() };
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

async function requestSoSoValue(
  path: "/news/hot" | "/news/search",
  params: URLSearchParams,
  name: string,
): Promise<EndpointResult<unknown>> {
  const startedAt = Date.now();
  const endpoint = `GET ${path}`;
  const apiKey = process.env.SOSOVALUE_API_KEY;

  const url = new URL(`${API_BASE_URL}${path}`);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  if (!apiKey) {
    const status: EndpointStatus = {
      name,
      endpoint,
      ok: false,
      errorType: "missing_api_key",
      message: "Missing SOSOVALUE_API_KEY. Add the key to enable live SoSoValue data.",
      durationMs: Date.now() - startedAt,
      itemCount: 0,
    };
    logEndpointStatus({ status, url: url.toString() });
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
      logEndpointStatus({ status, url: url.toString() });
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
      logEndpointStatus({
        status,
        url: url.toString(),
        shape: responseShapeSummary(data),
      });
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
      logEndpointStatus({ status, url: url.toString() });
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
    logEndpointStatus({ status, url: url.toString() });
    return { ok: false, status };
  }
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

function invalidResponseStatus(status: EndpointStatus, message: string): EndpointStatus {
  return {
    ...status,
    ok: false,
    errorType: "invalid_response",
    message,
    itemCount: 0,
  };
}

async function getHotNews(): Promise<EndpointResult<NewsItem[]>> {
  const response = await requestSoSoValue(
    "/news/hot",
    new URLSearchParams({
      page: "1",
      page_size: "12",
      language: "en",
    }),
    "Hot News",
  );

  if (!response.ok) {
    return response;
  }

  try {
    const parsed = parseNewsList(response.data);
    const status = { ...response.status, itemCount: parsed.list.length };
    logEndpointStatus({ status });
    return { ok: true, data: parsed.list, status };
  } catch (error) {
    return {
      ok: false,
      status: invalidResponseStatus(
        response.status,
        error instanceof Error
          ? error.message
          : "SoSoValue hot news response shape was incompatible.",
      ),
    };
  }
}

async function getNarrativeSignal({
  id,
  keyword,
  label,
}: {
  id: string;
  keyword: string;
  label: string;
}): Promise<EndpointResult<NarrativeSignal>> {
  const response = await requestSoSoValue(
    "/news/search",
    new URLSearchParams({
      keyword,
      page: "1",
      page_size: "8",
      sort: "release_time",
    }),
    `Narrative Search: ${label}`,
  );

  if (!response.ok) {
    return response;
  }

  try {
    const parsed = parseNewsList(response.data);
    const relatedAssets: string[] = Array.from(
      new Set(parsed.list.flatMap((item: NewsItem) => item.currencies).slice(0, 6)),
    );
    const score = Math.min(
      96,
      Math.max(35, Math.round(Math.log10(parsed.total + 1) * 24 + parsed.list.length * 2)),
    );
    const narrative: NarrativeSignal = {
      id,
      keyword,
      label,
      total: parsed.total,
      score,
      confidence: Math.min(
        94,
        Math.max(48, Math.round(score * 0.78 + parsed.list.length * 2)),
      ),
      source: "live",
      status: score >= 78 ? "Heating up" : score >= 62 ? "Active" : "Watching",
      latestTitle: parsed.list[0]?.title ?? `${label} narrative activity`,
      latestTime: parsed.list[0]?.releaseTime,
      relatedAssets,
      items: parsed.list,
    };
    const status = { ...response.status, itemCount: parsed.list.length };
    logEndpointStatus({ status });
    return { ok: true, data: narrative, status };
  } catch (error) {
    return {
      ok: false,
      status: invalidResponseStatus(
        response.status,
        error instanceof Error
          ? error.message
          : "SoSoValue narrative search response shape was incompatible.",
      ),
    };
  }
}

export async function getRadarData(): Promise<RadarData> {
  const updatedAt = new Date().toISOString();
  const hotNewsResult = await getHotNews();
  const endpoints: EndpointStatus[] = [hotNewsResult.status];
  const hotNews = hotNewsResult.ok ? hotNewsResult.data : [];
  const narratives: NarrativeSignal[] = [];

  for (const query of narrativeQueries) {
    const result = await getNarrativeSignal(query);
    endpoints.push(result.status);

    if (result.ok) {
      narratives.push(result.data);
    }
  }

  const usefulItemCount = hotNews.length + narratives.length;
  const mode = dataSourceMode({ endpoints, usefulItemCount });

  return {
    hotNews,
    narratives: narratives.sort(
      (a: NarrativeSignal, b: NarrativeSignal) => b.score - a.score,
    ),
    mode,
    endpoints,
    note:
      mode === "unavailable"
        ? "SoSoValue radar data is unavailable. Check endpoint status for details."
        : undefined,
    updatedAt,
  };
}

export async function getNarrativeById(id: string) {
  const radar = await getRadarData();
  const narrative = radar.narratives.find((item) => item.id === id);

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
