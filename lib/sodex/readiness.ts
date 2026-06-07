import { dataSourceMode, type EndpointStatus } from "@/lib/types/data-source";

import { resolveBasketNotionalUsd } from "./basket-notional";
import { getSodexBasketNotionalUsd, getSodexNetwork } from "./config";
import {
  estimateBuySlippagePct,
  getMarketTickers,
  getOrderBook,
  getSpotSymbols,
  depthNotionalUsd,
  resolveReferencePrice,
  resolveSpotSymbol,
  type SodexSpotSymbol,
} from "./market";

export type BasketLegReadiness = {
  asset: string;
  weight: number;
  legNotionalUsd: number;
  sodexSymbol?: string;
  symbolId?: number;
  displayName?: string;
  tradable: boolean;
  bestBid?: number;
  bestAsk?: number;
  referencePrice?: number;
  lastTradePrice?: string;
  bidDepthUsd: number;
  askDepthUsd: number;
  slippagePct?: number;
  message?: string;
};

export type BasketExecutionReadiness = {
  mode: "live" | "partial" | "unavailable";
  network: import("./config").SodexNetwork;
  totalNotionalUsd: number;
  tradableCount: number;
  totalLegs: number;
  weightedSlippagePct?: number;
  totalBidDepthUsd: number;
  totalAskDepthUsd: number;
  legs: BasketLegReadiness[];
  endpoints: EndpointStatus[];
  summary: string;
  updatedAt: string;
};

export async function getBasketExecutionReadiness(
  weightedAssets: Array<{ asset: string; weight: number }>,
  totalNotionalUsd = getSodexBasketNotionalUsd(),
): Promise<BasketExecutionReadiness> {
  const updatedAt = new Date().toISOString();
  const network = getSodexNetwork();
  const resolvedNotionalUsd = resolveBasketNotionalUsd(totalNotionalUsd, network);
  const symbolsResult = await getSpotSymbols();
  const endpoints: EndpointStatus[] = [...symbolsResult.endpoints];

  if (symbolsResult.data.length === 0) {
    return {
      mode: "unavailable",
      network,
      totalNotionalUsd: resolvedNotionalUsd,
      tradableCount: 0,
      totalLegs: weightedAssets.length,
      totalBidDepthUsd: 0,
      totalAskDepthUsd: 0,
      legs: weightedAssets.map((item) => ({
        asset: item.asset,
        weight: item.weight,
        legNotionalUsd: (resolvedNotionalUsd * item.weight) / 100,
        tradable: false,
        bidDepthUsd: 0,
        askDepthUsd: 0,
        message: "SoDEX symbol list unavailable.",
      })),
      endpoints,
      summary: "SoDEX execution readiness is unavailable because spot symbols could not be loaded.",
      updatedAt,
    };
  }

  const tickersResult = await getMarketTickers();
  endpoints.push(tickersResult.status);
  const tickerBySymbol = new Map(
    tickersResult.ok ? tickersResult.data.map((ticker) => [ticker.symbol, ticker]) : [],
  );

  const orderbookResults = await Promise.all(
    weightedAssets.map(async (item) => {
      const symbol = resolveSpotSymbol(item.asset, symbolsResult.data);

      if (!symbol) {
        return {
          item,
          symbol: undefined as SodexSpotSymbol | undefined,
          orderbook: undefined,
          ticker: undefined,
          status: {
            name: `SoDEX Symbol Match: ${item.asset}`,
            endpoint: "GET /markets/symbols",
            ok: false,
            errorType: "not_found" as const,
            message: `No SoDEX spot market found for ${item.asset}.`,
            itemCount: 0,
          },
        };
      }

      const orderbookResult = await getOrderBook(symbol.name);
      endpoints.push(orderbookResult.status);

      return {
        item,
        symbol,
        orderbook: orderbookResult.ok ? orderbookResult.data : undefined,
        ticker: tickerBySymbol.get(symbol.name),
        status: orderbookResult.status,
      };
    }),
  );

  const legs: BasketLegReadiness[] = orderbookResults.map(({ item, symbol, orderbook, ticker }) => {
    const legNotionalUsd = (resolvedNotionalUsd * item.weight) / 100;

    if (!symbol) {
      return {
        asset: item.asset,
        weight: item.weight,
        legNotionalUsd,
        tradable: false,
        bidDepthUsd: 0,
        askDepthUsd: 0,
        message: "No matching SoDEX spot market.",
      };
    }

    const bidDepthUsd = depthNotionalUsd(orderbook?.bids ?? []);
    const askDepthUsd = depthNotionalUsd(orderbook?.asks ?? []);
    const bestBid = orderbook?.bids[0]?.price;
    const bestAsk = orderbook?.asks[0]?.price;
    const referencePrice = resolveReferencePrice(orderbook, ticker);
    const lastTradePrice = ticker?.lastTradePrice;
    const slippagePct =
      orderbook && orderbook.asks.length > 0
        ? estimateBuySlippagePct(orderbook.asks, legNotionalUsd)
        : undefined;

    if (!referencePrice) {
      return {
        asset: item.asset,
        weight: item.weight,
        legNotionalUsd,
        sodexSymbol: symbol.name,
        symbolId: symbol.id,
        displayName: symbol.displayName,
        tradable: false,
        bestBid,
        bestAsk,
        bidDepthUsd,
        askDepthUsd,
        message: orderbook
          ? "Matched market has no usable reference price yet."
          : "Orderbook unavailable for matched market.",
      };
    }

    return {
      asset: item.asset,
      weight: item.weight,
      legNotionalUsd,
      sodexSymbol: symbol.name,
      symbolId: symbol.id,
      displayName: symbol.displayName,
      tradable: true,
      bestBid,
      bestAsk,
      referencePrice,
      lastTradePrice,
      bidDepthUsd,
      askDepthUsd,
      slippagePct,
      message:
        slippagePct === undefined
          ? "Limit order routable; ask-side depth too thin for slippage estimate."
          : undefined,
    };
  });

  const tradableCount = legs.filter((leg) => leg.tradable).length;
  const totalBidDepthUsd = legs.reduce((sum, leg) => sum + leg.bidDepthUsd, 0);
  const totalAskDepthUsd = legs.reduce((sum, leg) => sum + leg.askDepthUsd, 0);

  const slippageValues = legs.filter(
    (leg): leg is BasketLegReadiness & { slippagePct: number } =>
      leg.tradable && typeof leg.slippagePct === "number",
  );

  const weightedSlippagePct =
    slippageValues.length > 0
      ? slippageValues.reduce((sum, leg) => sum + leg.slippagePct * leg.weight, 0) /
        slippageValues.reduce((sum, leg) => sum + leg.weight, 0)
      : undefined;

  const mode = dataSourceMode({ endpoints, usefulItemCount: tradableCount });

  const summary =
    mode === "unavailable"
      ? "SoDEX execution readiness is unavailable for this basket."
      : `${tradableCount}/${legs.length} basket legs mapped to live SoDEX spot markets on ${network}.${weightedSlippagePct !== undefined ? ` Estimated weighted slippage: ${weightedSlippagePct.toFixed(2)}%.` : ""}`;

  return {
    mode,
    network,
    totalNotionalUsd: resolvedNotionalUsd,
    tradableCount,
    totalLegs: legs.length,
    weightedSlippagePct,
    totalBidDepthUsd,
    totalAskDepthUsd,
    legs,
    endpoints,
    summary,
    updatedAt,
  };
}
