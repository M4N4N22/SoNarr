import type { Hex } from "viem";

import { asNumber, asString, isRecord, requestSodexDelete, requestSodexPost } from "./client";
import { getDefaultSodexNetwork, getSodexChainId, getSodexTradingCredentials, type SodexNetwork } from "./config";
import type { BasketExecutionReadiness, BasketLegReadiness } from "./readiness";
import {
  buildBatchCancelOrderBody,
  buildBatchNewOrderBody,
  getBatchCancelOrderPayloadHash,
  getSodexExchangeTypedData,
  signBatchNewOrderRequest,
  SODEX_ORDER_SIDE,
  SODEX_ORDER_TYPE,
  SODEX_TIME_IN_FORCE,
  type BatchCancelOrderRequest,
  type BatchNewOrderItem,
  type BatchNewOrderRequest,
} from "./signing";
import {
  formatSymbolTradingBlockReason,
  formatTradingErrorMessage,
  summarizeLegSubmitResults,
  type BasketLegSubmitResult,
} from "./trading-errors";
import { symbolAcceptsNewOrders, getSpotSymbols } from "./market";
import {
  createClientOrderId,
  formatLimitBuyPrice,
  formatOrderQuantity,
  validateOrderFilters,
} from "./order-filters";

export type PreparedBasketOrder = {
  asset: string;
  clOrdID: string;
  displayName?: string;
  legNotionalUsd: number;
  price?: string;
  quantity?: string;
  sodexSymbol?: string;
  symbolID: number;
  tradable: boolean;
  message?: string;
};

export type BasketTradePlan = {
  orders: PreparedBasketOrder[];
  skipped: Array<{ asset: string; reason: string }>;
};

export type BasketTradeResult = {
  ok: boolean;
  message: string;
  submittedOrders?: number;
  legResults?: BasketLegSubmitResult[];
  response?: unknown;
};

export async function buildBasketTradePlan(
  executionReadiness: BasketExecutionReadiness,
): Promise<BasketTradePlan> {
  const symbolsResult = await getSpotSymbols(false, executionReadiness.network);
  const symbolByName = new Map(symbolsResult.data.map((symbol) => [symbol.name, symbol]));
  const orders: PreparedBasketOrder[] = [];
  const skipped: Array<{ asset: string; reason: string }> = [];
  let orderIndex = 0;

  for (const leg of executionReadiness.legs) {
    if (!leg.tradable || !leg.sodexSymbol || !leg.lastTradePrice) {
      skipped.push({
        asset: leg.asset,
        reason: leg.message ?? "Leg is not tradable on SoDEX.",
      });
      continue;
    }

    const symbol = symbolByName.get(leg.sodexSymbol);

    if (!symbol) {
      skipped.push({ asset: leg.asset, reason: "Could not resolve SoDEX symbol ID." });
      continue;
    }

    if (!symbolAcceptsNewOrders(symbol)) {
      skipped.push({
        asset: leg.asset,
        reason: formatSymbolTradingBlockReason(symbol.displayName, symbol.status),
      });
      continue;
    }

    const price = formatLimitBuyPrice(leg.referencePrice ?? Number(leg.lastTradePrice), leg.lastTradePrice, symbol);
    const quantity = formatOrderQuantity(leg.legNotionalUsd / Number(price), symbol);
    const filterError = validateOrderFilters(quantity, price, symbol, leg.lastTradePrice);

    if (filterError) {
      skipped.push({ asset: leg.asset, reason: filterError });
      continue;
    }

    const clOrdID = createClientOrderId(leg.asset, orderIndex);
    orderIndex += 1;

    orders.push({
      asset: leg.asset,
      clOrdID,
      displayName: leg.displayName,
      legNotionalUsd: leg.legNotionalUsd,
      price,
      quantity,
      sodexSymbol: leg.sodexSymbol,
      symbolID: symbol.id,
      tradable: true,
    });
  }

  return { orders, skipped };
}

export function singleOrderPlan(order: PreparedBasketOrder): BasketTradePlan {
  return { orders: [order], skipped: [] };
}

export function parseBatchLegResults(
  request: BatchNewOrderRequest,
  plan: BasketTradePlan,
  payload: unknown,
): BasketLegSubmitResult[] {
  const orderByClOrdId = new Map(plan.orders.map((order) => [order.clOrdID, order]));

  if (Array.isArray(payload)) {
    return payload.map((item) => {
      if (!isRecord(item)) {
        return {
          asset: "UNKNOWN",
          clOrdID: "unknown",
          ok: false,
          message: "Unexpected SoDEX response item.",
        };
      }

      const clOrdID = asString(item.clOrdID) ?? "unknown";
      const order = orderByClOrdId.get(clOrdID);
      const code = asNumber(item.code);
      const error = asString(item.error);
      const ok = code === 0;

      return {
        asset: order?.asset ?? clOrdID,
        clOrdID,
        displayName: order?.displayName,
        ok,
        message: ok
          ? "Submitted"
          : formatTradingErrorMessage(error ?? "Order rejected.", order?.displayName),
      };
    });
  }

  const batchError =
    isRecord(payload) ? asString(payload.error) ?? asString(payload.message) : undefined;

  if (batchError) {
    return plan.orders.map((order) => ({
      asset: order.asset,
      clOrdID: order.clOrdID,
      displayName: order.displayName,
      ok: false,
      message: formatTradingErrorMessage(batchError, order.displayName),
    }));
  }

  return plan.orders.map((order) => ({
    asset: order.asset,
    clOrdID: order.clOrdID,
    displayName: order.displayName,
    ok: true,
    message: "Submitted",
  }));
}

export function planToBatchNewOrderRequest(
  plan: BasketTradePlan,
  accountId: number,
): BatchNewOrderRequest {
  return {
    accountID: accountId,
    orders: plan.orders.map(
      (order): BatchNewOrderItem => ({
        symbolID: order.symbolID,
        clOrdID: order.clOrdID,
        side: SODEX_ORDER_SIDE.BUY,
        type: SODEX_ORDER_TYPE.LIMIT,
        timeInForce: SODEX_TIME_IN_FORCE.GTC,
        price: order.price,
        quantity: order.quantity,
      }),
    ),
  };
}

export async function submitSignedBasketTrade(
  request: BatchNewOrderRequest,
  plan: BasketTradePlan,
  headers: {
    apiKeyName: string;
    nonce: bigint;
    signature: Hex;
  },
  network: SodexNetwork = getDefaultSodexNetwork(),
): Promise<BasketTradeResult> {
  if (request.orders.length === 0) {
    return {
      ok: false,
      message: "No tradable basket legs are ready for SoDEX submission.",
    };
  }

  const body = buildBatchNewOrderBody(request);
  const result = await requestSodexPost<unknown>(
    "/trade/orders/batch",
    "SoDEX Batch New Order",
    body,
    {
      "X-API-Key": headers.apiKeyName,
      "X-API-Sign": headers.signature,
      "X-API-Nonce": headers.nonce.toString(),
      "X-API-Chain": getSodexChainId(network).toString(),
    },
    network,
  );

  if (!result.ok) {
    const legResults = parseBatchLegResults(request, plan, result.response);
    return {
      ok: false,
      message: summarizeLegSubmitResults(legResults),
      legResults,
      response: result.response,
    };
  }

  const legResults = parseBatchLegResults(request, plan, result.data);
  const acceptedCount = legResults.filter((leg) => leg.ok).length;

  if (acceptedCount < legResults.length) {
    return {
      ok: acceptedCount > 0,
      message: summarizeLegSubmitResults(legResults),
      submittedOrders: acceptedCount,
      legResults,
      response: result.data,
    };
  }

  return {
    ok: true,
    message: summarizeLegSubmitResults(legResults),
    submittedOrders: acceptedCount,
    legResults,
    response: result.data,
  };
}

export function findWalletApiKeyName(
  walletAddress: string,
  apiKeys: Array<{ name: string; publicKey: string }>,
) {
  const target = walletAddress.toLowerCase();
  const matching = apiKeys.filter((key) => key.publicKey.toLowerCase() === target);

  if (matching.length === 0) {
    return undefined;
  }

  const preferred = matching.find((key) => key.name !== "default");
  return (preferred ?? matching[0]).name;
}

export async function submitBasketTradePlan(
  plan: BasketTradePlan,
  options: { accountId?: number; dryRun?: boolean } = {},
): Promise<BasketTradeResult> {
  if (plan.orders.length === 0) {
    return {
      ok: false,
      message: "No tradable basket legs are ready for SoDEX submission.",
    };
  }

  if (options.dryRun) {
    const request = planToBatchNewOrderRequest(plan, options.accountId ?? 0);

    return {
      ok: true,
      message: `Dry run: ${request.orders.length} limit buy orders prepared for SoDEX.`,
      submittedOrders: request.orders.length,
      response: request,
    };
  }

  const credentials = getSodexTradingCredentials();

  if (!credentials) {
    return {
      ok: false,
      message:
        "Server SoDEX credentials are not configured. Connect your wallet and use Sign & submit on the Launch tab.",
    };
  }

  const request = planToBatchNewOrderRequest(plan, credentials.accountId);
  const nonce = BigInt(Date.now());
  const privateKey = (
    credentials.apiPrivateKey.startsWith("0x")
      ? credentials.apiPrivateKey
      : `0x${credentials.apiPrivateKey}`
  ) as Hex;

  const signature = await signBatchNewOrderRequest(request, nonce, privateKey);

  return submitSignedBasketTrade(request, plan, {
    apiKeyName: credentials.apiKeyName,
    nonce,
    signature,
  });
}

export function createCancelClientOrderId(asset: string, index: number) {
  return createClientOrderId(`CX${asset}`.slice(0, 8), index);
}

export function planToBatchCancelRequest(
  cancels: Array<{
    symbolID: number;
    orderID?: number;
    origClOrdID?: string;
    asset?: string;
  }>,
  accountId: number,
): BatchCancelOrderRequest {
  return {
    accountID: accountId,
    cancels: cancels.map((item, index) => ({
      symbolID: item.symbolID,
      clOrdID: createCancelClientOrderId(item.asset ?? "CX", index),
      orderID: item.orderID,
      origClOrdID: item.origClOrdID,
    })),
  };
}

export function getBatchCancelTypedData(
  request: BatchCancelOrderRequest,
  nonce: bigint,
  chainId: number,
) {
  return getSodexExchangeTypedData(getBatchCancelOrderPayloadHash(request), nonce, chainId);
}

export async function submitSignedBatchCancel(
  request: BatchCancelOrderRequest,
  headers: {
    apiKeyName: string;
    nonce: bigint;
    signature: Hex;
  },
  network: SodexNetwork = getDefaultSodexNetwork(),
): Promise<{ ok: boolean; message: string; response?: unknown }> {
  if (request.cancels.length === 0) {
    return { ok: false, message: "No orders selected to cancel." };
  }

  const body = buildBatchCancelOrderBody(request);
  const result = await requestSodexDelete<unknown>(
    "/trade/orders/batch",
    "SoDEX Batch Cancel Order",
    body,
    {
      "X-API-Key": headers.apiKeyName,
      "X-API-Sign": headers.signature,
      "X-API-Nonce": headers.nonce.toString(),
      "X-API-Chain": getSodexChainId(network).toString(),
    },
    network,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.status.message ?? "Cancel request failed.",
      response: result.response,
    };
  }

  return {
    ok: true,
    message: `Cancel submitted for ${request.cancels.length} order${request.cancels.length === 1 ? "" : "s"}.`,
    response: result.data,
  };
}

export function summarizeLegForTrade(leg: BasketLegReadiness) {
  if (!leg.tradable) {
    return leg.message ?? "Not tradable";
  }

  return leg.lastTradePrice
    ? `Limit buy ~$${Math.round(leg.legNotionalUsd).toLocaleString()} @ ${leg.lastTradePrice}`
    : leg.referencePrice
      ? `Limit buy ~$${Math.round(leg.legNotionalUsd).toLocaleString()} @ ${leg.referencePrice}`
      : "Tradable";
}
