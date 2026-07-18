import type { NewsItem } from "@/lib/sosovalue";
import {
  asNumber,
  asString,
  normalizeSymbolToken,
  requestSoSoValue,
  responseList,
  responsePayload,
  responseRecord,
} from "@/lib/sosovalue/client";
import type { EndpointStatus } from "@/lib/types/data-source";

export type ListedCurrency = {
  id: string;
  symbol: string;
  name?: string;
};

export type KlineBar = {
  close: number;
  timestamp: number;
};

export type KlineTrend = {
  symbol: string;
  /** Signed ~7d return from daily closes (first→last in window). */
  change7dPct?: number;
  /** Signed ~30d return when enough bars exist. */
  change30dPct?: number;
  /** Stdev of daily returns over the 7d window, in percent. */
  volatility7dPct?: number;
  /** Max peak-to-trough drawdown over the 7d window, in percent (negative or zero). */
  maxDrawdown7dPct?: number;
  /** Share of positive daily closes in the 7d window (0–1). */
  positiveDayRatio7d?: number;
  barCount?: number;
};

export type IndexMarketSnapshot = {
  change24hPct?: number;
  indexTicker: string;
  monthRoi?: number;
  price?: number;
  weekRoi?: number;
};

export type EtfMarketSnapshot = {
  cumInflow?: number;
  netAssets?: number;
  netInflow?: number;
  ticker: string;
  valueTraded?: number;
};

export type MacroEventDay = {
  date: string;
  events: string[];
};

const CURRENCY_CACHE_TTL_MS = 10 * 60 * 1000;

let currencyCache:
  | {
      expiresAt: number;
      currencies: ListedCurrency[];
      status: EndpointStatus;
    }
  | undefined;

function parseListedCurrency(value: unknown): ListedCurrency | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id =
    asString(record.currency_id) ??
    asString(record.id) ??
    asString(record.currencyId);
  const symbol =
    asString(record.symbol) ??
    asString(record.name) ??
    asString(record.full_name);

  if (!id || !symbol) {
    return undefined;
  }

  return {
    id,
    symbol: symbol.toUpperCase(),
    name: asString(record.full_name) ?? asString(record.name),
  };
}

function parseNewsItem(value: unknown): NewsItem | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const title = asString(record.title);
  const sourceLink =
    asString(record.source_link) ??
    asString(record.sourceLink) ??
    asString(record.original_link);
  const releaseTime =
    asNumber(record.release_time) ??
    asNumber(record.releaseTime) ??
    asNumber(record.create_time);

  if (!id || !title || !sourceLink || !releaseTime) {
    return undefined;
  }

  const stripHtml = (input: string) =>
    input
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const currencyRefs = Array.isArray(record.matched_currencies)
    ? record.matched_currencies
        .map((currency) => {
          if (typeof currency !== "object" || currency === null) {
            return undefined;
          }

          const item = currency as Record<string, unknown>;
          const symbol =
            asString(item.symbol) ?? asString(item.name) ?? asString(item.full_name);

          if (!symbol) {
            return undefined;
          }

          return {
            id: asString(item.currency_id) ?? asString(item.id),
            name: asString(item.full_name) ?? asString(item.name),
            symbol: symbol.toUpperCase(),
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    id,
    title: stripHtml(title),
    content: stripHtml(asString(record.content) ?? ""),
    sourceLink,
    releaseTime,
    author: asString(record.author) ?? asString(record.nick_name),
    tags: Array.isArray(record.tags)
      ? record.tags.map(asString).filter((tag): tag is string => Boolean(tag))
      : [],
    currencies: currencyRefs.map((currency) => currency.symbol),
    currencyRefs,
  };
}

export async function getListedCurrencies(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && currencyCache && currencyCache.expiresAt > now) {
    return {
      data: currencyCache.currencies,
      endpoints: [currencyCache.status],
    };
  }

  const response = await requestSoSoValue("/currencies", "Currency List", {
    revalidate: 600,
  });

  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const currencies = responseList(response.data)
    .map(parseListedCurrency)
    .filter((currency): currency is ListedCurrency => Boolean(currency));

  currencyCache = {
    expiresAt: now + CURRENCY_CACHE_TTL_MS,
    currencies,
    status: { ...response.status, itemCount: currencies.length },
  };

  return { data: currencies, endpoints: [currencyCache.status] };
}

export function resolveListedCurrency(
  symbol: string,
  currencies: ListedCurrency[],
): ListedCurrency | undefined {
  const target = normalizeSymbolToken(symbol);

  return currencies.find(
    (currency) => normalizeSymbolToken(currency.symbol) === target,
  );
}

function parseKlineBars(payload: unknown): KlineBar[] {
  return responseList(payload)
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const close = asNumber(record.close);
      const timestamp = asNumber(record.timestamp);

      if (close === undefined || timestamp === undefined) {
        return undefined;
      }

      return { close, timestamp };
    })
    .filter((item): item is KlineBar => Boolean(item))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function windowReturnPct(bars: KlineBar[], lookbackBars: number): number | undefined {
  if (bars.length < 2) {
    return undefined;
  }

  const slice = bars.slice(-Math.min(lookbackBars, bars.length));
  const first = slice[0]?.close;
  const last = slice[slice.length - 1]?.close;

  if (!first || !last) {
    return undefined;
  }

  return ((last - first) / first) * 100;
}

function dailyReturnStats(bars: KlineBar[]) {
  if (bars.length < 3) {
    return {
      volatilityPct: undefined as number | undefined,
      maxDrawdownPct: undefined as number | undefined,
      positiveDayRatio: undefined as number | undefined,
    };
  }

  const returns: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1]?.close;
    const curr = bars[i]?.close;
    if (!prev || !curr) {
      continue;
    }
    returns.push(((curr - prev) / prev) * 100);
  }

  if (returns.length === 0) {
    return {
      volatilityPct: undefined,
      maxDrawdownPct: undefined,
      positiveDayRatio: undefined,
    };
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  const volatilityPct = Math.sqrt(variance);

  let peak = bars[0]!.close;
  let maxDrawdownPct = 0;
  for (const bar of bars) {
    if (bar.close > peak) {
      peak = bar.close;
    }
    const drawdown = ((bar.close - peak) / peak) * 100;
    if (drawdown < maxDrawdownPct) {
      maxDrawdownPct = drawdown;
    }
  }

  const positiveDayRatio = returns.filter((value) => value > 0).length / returns.length;

  return { volatilityPct, maxDrawdownPct, positiveDayRatio };
}

export function buildKlineTrendFromBars(symbol: string, bars: KlineBar[]): KlineTrend | undefined {
  if (bars.length < 2) {
    return undefined;
  }

  const window7 = bars.slice(-Math.min(8, bars.length));
  const stats7 = dailyReturnStats(window7);

  return {
    symbol,
    change7dPct: windowReturnPct(bars, 8),
    change30dPct: bars.length >= 10 ? windowReturnPct(bars, 31) : undefined,
    volatility7dPct: stats7.volatilityPct,
    maxDrawdown7dPct: stats7.maxDrawdownPct,
    positiveDayRatio7d: stats7.positiveDayRatio,
    barCount: bars.length,
  };
}

/** Close at or just after `fromMs`, and close ~`horizonDays` later. */
export function forwardReturnFromBars(
  bars: KlineBar[],
  fromMs: number,
  horizonDays: number,
): number | undefined {
  if (bars.length < 2) {
    return undefined;
  }

  let startIndex = bars.findIndex((bar) => bar.timestamp >= fromMs);
  if (startIndex < 0) {
    startIndex = bars.length - 1;
  }

  const start = bars[startIndex];
  if (!start?.close) {
    return undefined;
  }

  const targetMs = start.timestamp + horizonDays * 24 * 60 * 60 * 1000;
  let endIndex = bars.findIndex((bar, index) => index > startIndex && bar.timestamp >= targetMs);
  if (endIndex < 0) {
    endIndex = bars.length - 1;
  }

  if (endIndex <= startIndex) {
    return undefined;
  }

  const end = bars[endIndex];
  if (!end?.close) {
    return undefined;
  }

  return ((end.close - start.close) / start.close) * 100;
}

export async function getCurrencyKlineBars(
  currency: ListedCurrency,
  options?: { interval?: "1d" | "1h"; limit?: number },
) {
  const interval = options?.interval ?? "1d";
  const limit = options?.limit ?? 31;
  const response = await requestSoSoValue(
    `/currencies/${currency.id}/klines?interval=${interval}&limit=${limit}`,
    `Currency Klines: ${currency.symbol}`,
  );

  if (!response.ok) {
    return { data: undefined as KlineBar[] | undefined, endpoints: [response.status] };
  }

  const bars = parseKlineBars(response.data);

  return {
    data: bars.length >= 2 ? bars : undefined,
    endpoints: [{ ...response.status, itemCount: bars.length }],
  };
}

export async function getCurrencyKlineTrend(currency: ListedCurrency) {
  const result = await getCurrencyKlineBars(currency, { interval: "1d", limit: 31 });

  if (!result.data) {
    return { data: undefined as KlineTrend | undefined, endpoints: result.endpoints };
  }

  const trend = buildKlineTrendFromBars(currency.symbol, result.data);

  return {
    data: trend,
    endpoints: result.endpoints,
  };
}

export async function getKlineTrendsForSymbols(symbols: string[], maxSymbols = 5) {
  const listed = await getListedCurrencies();
  const endpoints: EndpointStatus[] = [...listed.endpoints];
  const trends: KlineTrend[] = [];

  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase()))).slice(
    0,
    maxSymbols,
  );

  for (const symbol of uniqueSymbols) {
    const currency = resolveListedCurrency(symbol, listed.data);

    if (!currency) {
      continue;
    }

    const result = await getCurrencyKlineTrend(currency);
    endpoints.push(...result.endpoints);

    if (result.data) {
      trends.push(result.data);
    }
  }

  return { data: trends, endpoints };
}

export async function getKlineBarsForSymbols(symbols: string[], maxSymbols = 5) {
  const listed = await getListedCurrencies();
  const endpoints: EndpointStatus[] = [...listed.endpoints];
  const bySymbol: Record<string, KlineBar[]> = {};

  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => symbol.toUpperCase()))).slice(
    0,
    maxSymbols,
  );

  for (const symbol of uniqueSymbols) {
    const currency = resolveListedCurrency(symbol, listed.data);
    if (!currency) {
      continue;
    }

    const result = await getCurrencyKlineBars(currency, { interval: "1d", limit: 60 });
    endpoints.push(...result.endpoints);
    if (result.data) {
      bySymbol[symbol] = result.data;
    }
  }

  return { data: bySymbol, endpoints };
}

export async function getIndexMarketSnapshots(indexTickers: string[]) {
  const endpoints: EndpointStatus[] = [];
  const snapshots: IndexMarketSnapshot[] = [];

  for (const indexTicker of indexTickers.slice(0, 3)) {
    const response = await requestSoSoValue(
      `/indices/${encodeURIComponent(indexTicker)}/market-snapshot`,
      `Index Snapshot: ${indexTicker}`,
    );
    endpoints.push(response.status);

    if (!response.ok) {
      continue;
    }

    const payload = responseRecord(response.data);

    if (!payload) {
      continue;
    }

    snapshots.push({
      indexTicker,
      price: asNumber(payload.price),
      change24hPct: asNumber(payload["24h_change_pct"]),
      weekRoi: asNumber(payload["7day_roi"]),
      monthRoi: asNumber(payload["1month_roi"]),
    });
  }

  return { data: snapshots, endpoints };
}

const defaultEtfByNarrative: Record<string, string> = {
  "bitcoin-etf": "IBIT",
};

export async function getNarrativeEtfSnapshot(narrativeId: string) {
  const ticker = defaultEtfByNarrative[narrativeId];

  if (!ticker) {
    return { data: undefined, endpoints: [] as EndpointStatus[] };
  }

  const response = await requestSoSoValue(
    `/etfs/${encodeURIComponent(ticker)}/market-snapshot`,
    `ETF Snapshot: ${ticker}`,
  );

  if (!response.ok) {
    return { data: undefined, endpoints: [response.status] };
  }

  const payload = responseRecord(response.data);

  if (!payload) {
    return {
      data: undefined,
      endpoints: [
        {
          ...response.status,
          ok: false,
          errorType: "invalid_response" as const,
          message: "SoSoValue ETF snapshot response shape was incompatible.",
          itemCount: 0,
        },
      ],
    };
  }

  return {
    data: {
      ticker,
      netInflow: asNumber(payload.net_inflow),
      cumInflow: asNumber(payload.cum_inflow),
      netAssets: asNumber(payload.net_assets),
      valueTraded: asNumber(payload.value_traded),
    } satisfies EtfMarketSnapshot,
    endpoints: [{ ...response.status, itemCount: 1 }],
  };
}

export async function getMacroEvents() {
  const response = await requestSoSoValue("/macro/events", "Macro Events", {
    revalidate: 300,
  });

  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const data = responseList(response.data)
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const date = asString(record.date);
      const events = Array.isArray(record.events)
        ? record.events.map(asString).filter((event): event is string => Boolean(event))
        : [];

      if (!date || events.length === 0) {
        return undefined;
      }

      return { date, events } satisfies MacroEventDay;
    })
    .filter((item): item is MacroEventDay => Boolean(item))
    .slice(0, 7);

  return { data, endpoints: [{ ...response.status, itemCount: data.length }] };
}

export async function getFeaturedNews(limit = 8) {
  const response = await requestSoSoValue("/news/featured", "Featured News", {
    query: {
      page: "1",
      page_size: String(Math.max(20, limit)),
      language: "en",
    },
  });

  if (!response.ok) {
    return { data: [], endpoints: [response.status] };
  }

  const data = responseList(response.data)
    .map(parseNewsItem)
    .filter((item): item is NewsItem => Boolean(item))
    .slice(0, limit);

  return { data, endpoints: [{ ...response.status, itemCount: data.length }] };
}

export function filterFeaturedNewsForNarrative(
  items: NewsItem[],
  narrative: { keyword: string; label: string },
) {
  const tokens = [narrative.keyword, narrative.label]
    .map((value) => value.toLowerCase())
    .filter(Boolean);

  return items.filter((item) => {
    const haystack = [item.title, item.content, ...item.tags].join(" ").toLowerCase();
    return tokens.some((token) => haystack.includes(token.toLowerCase()));
  });
}

export function formatUsdCompact(value?: number) {
  if (value === undefined) {
    return "N/A";
  }

  return `$${Math.round(value).toLocaleString()}`;
}

export type CurrencyTradingPair = {
  base: string;
  costToMoveDownUsd?: number;
  costToMoveUpUsd?: number;
  market: string;
  price?: number;
  target: string;
  turnover24h?: number;
};

export type AssetLiquidityContext = {
  pairCount: number;
  stableQuotePairCount: number;
  symbol: string;
  topMarkets: string[];
  topPair?: CurrencyTradingPair;
  totalTurnover24h?: number;
};

export type BasketLiquidityContext = {
  aggregateTurnover24h?: number;
  assets: AssetLiquidityContext[];
  endpoints: EndpointStatus[];
  mode: "live" | "partial" | "unavailable";
  stableQuoteCoverage: number;
  summary: string;
};

const STABLE_QUOTE_TOKENS = new Set(["USDT", "USDC", "USD"]);

function parseTradingPair(value: unknown): CurrencyTradingPair | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const base = asString(record.base);
  const target = asString(record.target);
  const market = asString(record.market);

  if (!base || !target || !market) {
    return undefined;
  }

  return {
    base: base.toUpperCase(),
    target: target.toUpperCase(),
    market,
    price: asNumber(record.price),
    turnover24h: asNumber(record.turnover_24h),
    costToMoveUpUsd: asNumber(record.cost_to_move_up_usd) ?? undefined,
    costToMoveDownUsd: asNumber(record.cost_to_move_down_usd) ?? undefined,
  };
}

function buildAssetLiquidityContext(
  symbol: string,
  pairs: CurrencyTradingPair[],
): AssetLiquidityContext {
  const sorted = [...pairs].sort(
    (left, right) => (right.turnover24h ?? 0) - (left.turnover24h ?? 0),
  );
  const topPair = sorted[0];
  const stableQuotePairCount = pairs.filter((pair) =>
    STABLE_QUOTE_TOKENS.has(pair.target),
  ).length;
  const totalTurnover24h = pairs.reduce(
    (sum, pair) => sum + (pair.turnover24h ?? 0),
    0,
  );

  return {
    symbol,
    pairCount: pairs.length,
    stableQuotePairCount,
    topMarkets: Array.from(new Set(sorted.slice(0, 3).map((pair) => pair.market))),
    topPair,
    totalTurnover24h: totalTurnover24h > 0 ? totalTurnover24h : undefined,
  };
}

export async function getCurrencyTradingPairs(currency: ListedCurrency) {
  const response = await requestSoSoValue(
    `/currencies/${currency.id}/pairs`,
    `Currency Pairs: ${currency.symbol}`,
  );

  if (!response.ok) {
    return { data: [] as CurrencyTradingPair[], endpoints: [response.status] };
  }

  const pairs = responseList(response.data)
    .map(parseTradingPair)
    .filter((pair): pair is CurrencyTradingPair => Boolean(pair));

  return {
    data: pairs,
    endpoints: [{ ...response.status, itemCount: pairs.length }],
  };
}

export async function getBasketLiquidityContext(symbols: string[]) {
  const listed = await getListedCurrencies();
  const endpoints: EndpointStatus[] = [...listed.endpoints];
  const assets: AssetLiquidityContext[] = [];
  const uniqueSymbols = Array.from(
    new Set(symbols.map((symbol) => symbol.toUpperCase())),
  ).slice(0, 5);

  const results = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      const currency = resolveListedCurrency(symbol, listed.data);

      if (!currency) {
        return { symbol, pairs: [] as CurrencyTradingPair[], endpoints: [] as EndpointStatus[] };
      }

      const result = await getCurrencyTradingPairs(currency);
      return { symbol, pairs: result.data, endpoints: result.endpoints };
    }),
  );

  for (const result of results) {
    endpoints.push(...result.endpoints);

    if (result.pairs.length > 0) {
      assets.push(buildAssetLiquidityContext(result.symbol, result.pairs));
    }
  }

  const aggregateTurnover24h = assets.reduce(
    (sum, asset) => sum + (asset.totalTurnover24h ?? 0),
    0,
  );
  const stableQuoteCoverage = assets.filter((asset) => asset.stableQuotePairCount > 0).length;
  const resolvedCount = assets.length;
  const mode =
    resolvedCount === 0
      ? ("unavailable" as const)
      : resolvedCount < uniqueSymbols.length
        ? ("partial" as const)
        : ("live" as const);

  const summary =
    mode === "unavailable"
      ? "SoSoValue trading pair data is unavailable for this basket."
      : `${resolvedCount}/${uniqueSymbols.length} basket assets resolved to ${assets.reduce(
          (sum, asset) => sum + asset.pairCount,
          0,
        )} CEX trading pairs.${aggregateTurnover24h > 0 ? ` Aggregate 24h turnover: ${formatUsdCompact(aggregateTurnover24h)}.` : ""}`;

  return {
    data: {
      mode,
      assets,
      aggregateTurnover24h: aggregateTurnover24h > 0 ? aggregateTurnover24h : undefined,
      stableQuoteCoverage,
      endpoints,
      summary,
    } satisfies BasketLiquidityContext,
    endpoints,
  };
}
