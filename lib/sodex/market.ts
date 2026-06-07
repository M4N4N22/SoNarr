import { asNumber, asString, isRecord, requestSodexGet } from "./client";
import { getSodexNetwork } from "./config";

export type SodexSpotSymbol = {
  id: number;
  name: string;
  displayName: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  tickSize: string;
  stepSize: string;
  minPrice: string;
  maxPrice: string;
  minQuantity: string;
  minNotional: string;
  buyLimitUpRatio: string;
  sellLimitDownRatio: string;
  quantityPrecision: number;
  pricePrecision: number;
};

export type SodexOrderBookLevel = {
  price: number;
  quantity: number;
};

export type SodexOrderBook = {
  symbol: string;
  bids: SodexOrderBookLevel[];
  asks: SodexOrderBookLevel[];
};

export type SodexTicker = {
  askPx?: number;
  askSz?: number;
  bidPx?: number;
  bidSz?: number;
  changePct?: number;
  lastPx?: number;
  lastTradePrice?: string;
  symbol: string;
  volume?: number;
};

export type SodexTrade = {
  price: number;
  quantity: number;
  side: string;
  symbol: string;
  timestamp: number;
};

const ORDERBOOK_LIMIT = 20;
const SYMBOLS_CACHE_TTL_MS = 5 * 60 * 1000;

let symbolsCache:
  | {
      expiresAt: number;
      symbols: SodexSpotSymbol[];
      status: import("@/lib/types/data-source").EndpointStatus;
    }
  | undefined;

function parseSpotSymbol(value: unknown): SodexSpotSymbol | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = asNumber(value.id);
  const name = asString(value.name);
  const displayName = asString(value.displayName);
  const baseCoin = asString(value.baseCoin);
  const quoteCoin = asString(value.quoteCoin);
  const status = asString(value.status) ?? "UNKNOWN";
  const tickSize = asString(value.tickSize) ?? "0.00000001";
  const stepSize = asString(value.stepSize) ?? "0.00000001";
  const minPrice = asString(value.minPrice) ?? "0";
  const maxPrice = asString(value.maxPrice) ?? "0";
  const minQuantity = asString(value.minQuantity) ?? "0";
  const minNotional = asString(value.minNotional) ?? "0";
  const buyLimitUpRatio = asString(value.buyLimitUpRatio) ?? "0";
  const sellLimitDownRatio = asString(value.sellLimitDownRatio) ?? "0";
  const quantityPrecision = asNumber(value.quantityPrecision) ?? 8;
  const pricePrecision = asNumber(value.pricePrecision) ?? 8;

  if (id === undefined || !name || !displayName || !baseCoin || !quoteCoin) {
    return undefined;
  }

  return {
    id,
    name,
    displayName,
    baseCoin,
    quoteCoin,
    status,
    tickSize,
    stepSize,
    minPrice,
    maxPrice,
    minQuantity,
    minNotional,
    buyLimitUpRatio,
    sellLimitDownRatio,
    quantityPrecision,
    pricePrecision,
  };
}

function parseOrderBookLevels(value: unknown): SodexOrderBookLevel[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((level) => {
      if (!Array.isArray(level) || level.length < 2) {
        return undefined;
      }

      const price = asNumber(level[0]);
      const quantity = asNumber(level[1]);

      if (price === undefined || quantity === undefined) {
        return undefined;
      }

      return { price, quantity };
    })
    .filter((level): level is SodexOrderBookLevel => Boolean(level));
}

export function normalizeAssetToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/^V/, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function symbolAcceptsNewOrders(symbol: SodexSpotSymbol) {
  return symbol.status.trim().toUpperCase() === "TRADING";
}

export async function getSpotSymbols(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && symbolsCache && symbolsCache.expiresAt > now) {
    return { data: symbolsCache.symbols, endpoints: [symbolsCache.status] };
  }

  const result = await requestSodexGet(
    "/markets/symbols",
    "SoDEX Spot Symbols",
    (payload) => {
      if (!Array.isArray(payload)) {
        return undefined;
      }

      return payload
        .map(parseSpotSymbol)
        .filter((symbol): symbol is SodexSpotSymbol => Boolean(symbol))
        .filter((symbol) => symbolAcceptsNewOrders(symbol));
    },
    300,
  );

  if (!result.ok) {
    return { data: [], endpoints: [result.status] };
  }

  symbolsCache = {
    expiresAt: now + SYMBOLS_CACHE_TTL_MS,
    symbols: result.data,
    status: result.status,
  };

  return { data: result.data, endpoints: [result.status] };
}

export function resolveSpotSymbol(asset: string, symbols: SodexSpotSymbol[]) {
  const target = normalizeAssetToken(asset);

  if (!target) {
    return undefined;
  }

  const usdcPairs = symbols.filter(
    (symbol) => normalizeAssetToken(symbol.quoteCoin) === "USDC",
  );

  const exactMatches = usdcPairs.filter((symbol) => {
    const baseToken = normalizeAssetToken(symbol.baseCoin);
    const displayBase = normalizeAssetToken(symbol.displayName.split("/")[0] ?? "");

    return baseToken === target || displayBase === target;
  });

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    return (
      exactMatches.find((symbol) => normalizeAssetToken(symbol.baseCoin) === target) ??
      exactMatches[0]
    );
  }

  return usdcPairs.find((symbol) => {
    const baseToken = normalizeAssetToken(symbol.baseCoin);
    const displayBase = normalizeAssetToken(symbol.displayName.split("/")[0] ?? "");

    return baseToken === target || displayBase === target;
  });
}

export async function getOrderBook(symbol: string) {
  return requestSodexGet(
    `/markets/${encodeURIComponent(symbol)}/orderbook?limit=${ORDERBOOK_LIMIT}`,
    `SoDEX Orderbook: ${symbol}`,
    (payload) => {
      if (!isRecord(payload)) {
        return undefined;
      }

      return {
        symbol,
        bids: parseOrderBookLevels(payload.bids),
        asks: parseOrderBookLevels(payload.asks),
      } satisfies SodexOrderBook;
    },
  );
}

export async function getMarketTickers() {
  return requestSodexGet(
    "/markets/tickers",
    "SoDEX Market Tickers",
    (payload) => {
      if (!Array.isArray(payload)) {
        return undefined;
      }

      return payload
        .map((item) => {
          if (!isRecord(item)) {
            return undefined;
          }

          const symbol = asString(item.symbol);

          if (!symbol) {
            return undefined;
          }

          const lastTradePrice = asString(item.lastPx);
          const askPx = asNumber(item.askPx);
          const bidPx = asNumber(item.bidPx);

          return {
            symbol,
            lastPx: asNumber(item.lastPx),
            lastTradePrice,
            changePct: asNumber(item.changePct),
            volume: asNumber(item.volume),
            bidPx: bidPx && bidPx > 0 ? bidPx : undefined,
            bidSz: asNumber(item.bidSz),
            askPx: askPx && askPx > 0 ? askPx : undefined,
            askSz: asNumber(item.askSz),
          } as SodexTicker;
        })
        .filter((item): item is SodexTicker => item !== undefined);
    },
    15,
  );
}

export async function getRecentTrades(symbol: string, limit = 20) {
  return requestSodexGet(
    `/markets/${encodeURIComponent(symbol)}/trades`,
    `SoDEX Trades: ${symbol}`,
    (payload) => {
      if (!Array.isArray(payload)) {
        return undefined;
      }

      return payload
        .slice(0, limit)
        .map((item) => {
          if (!isRecord(item)) {
            return undefined;
          }

          const tradeSymbol = asString(item.s) ?? symbol;
          const price = asNumber(item.p);
          const quantity = asNumber(item.q);
          const timestamp = asNumber(item.T);
          const side = asString(item.S) ?? "UNKNOWN";

          if (price === undefined || quantity === undefined || timestamp === undefined) {
            return undefined;
          }

          return { symbol: tradeSymbol, price, quantity, side, timestamp } satisfies SodexTrade;
        })
        .filter((item): item is SodexTrade => Boolean(item));
    },
    15,
  );
}

export function depthNotionalUsd(levels: SodexOrderBookLevel[]) {
  return levels.reduce((sum, level) => sum + level.price * level.quantity, 0);
}

function positivePrice(value?: number) {
  return typeof value === "number" && value > 0 ? value : undefined;
}

/** Price used to size GTC limit buys when the book may be one-sided on testnet. */
export function resolveReferencePrice(
  orderbook: SodexOrderBook | undefined,
  ticker: SodexTicker | undefined,
) {
  return (
    positivePrice(orderbook?.asks[0]?.price) ??
    positivePrice(ticker?.askPx) ??
    positivePrice(ticker?.lastPx) ??
    positivePrice(orderbook?.bids[0]?.price) ??
    positivePrice(ticker?.bidPx)
  );
}

export function estimateBuySlippagePct(asks: SodexOrderBookLevel[], notionalUsd: number) {
  if (asks.length === 0 || notionalUsd <= 0) {
    return undefined;
  }

  const bestAsk = asks[0]?.price;

  if (!bestAsk) {
    return undefined;
  }

  let remainingUsd = notionalUsd;
  let acquiredQty = 0;
  let spentUsd = 0;

  for (const level of asks) {
    if (remainingUsd <= 0) {
      break;
    }

    const levelNotional = level.price * level.quantity;
    const usedNotional = Math.min(remainingUsd, levelNotional);
    const usedQty = usedNotional / level.price;

    acquiredQty += usedQty;
    spentUsd += usedNotional;
    remainingUsd -= usedNotional;
  }

  if (acquiredQty <= 0) {
    return undefined;
  }

  const averagePrice = spentUsd / acquiredQty;
  return ((averagePrice - bestAsk) / bestAsk) * 100;
}
