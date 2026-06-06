import type { Hex } from "viem";

import type { BasketExecutionReadiness, BasketLegReadiness } from "./readiness";
import { requestSodexPost } from "./client";
import { getSodexTradingCredentials } from "./config";
import { getSpotSymbols } from "./market";
import {
  buildBatchNewOrderBody,
  signBatchNewOrderRequest,
  SODEX_ORDER_SIDE,
  SODEX_ORDER_TYPE,
  SODEX_TIME_IN_FORCE,
  type BatchNewOrderItem,
  type BatchNewOrderRequest,
} from "./signing";

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
  response?: unknown;
};

function formatDecimal(value: number, decimals = 8) {
  return value.toFixed(decimals).replace(/\.?0+$/, "");
}

export async function buildBasketTradePlan(
  executionReadiness: BasketExecutionReadiness,
): Promise<BasketTradePlan> {
  const symbolsResult = await getSpotSymbols();
  const symbolByName = new Map(symbolsResult.data.map((symbol) => [symbol.name, symbol]));
  const orders: PreparedBasketOrder[] = [];
  const skipped: Array<{ asset: string; reason: string }> = [];

  for (const leg of executionReadiness.legs) {
    if (!leg.tradable || !leg.sodexSymbol || !leg.referencePrice) {
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

    const quantity = leg.legNotionalUsd / leg.referencePrice;
    const clOrdID = `sonarr-${leg.asset.toLowerCase()}-${Date.now()}`;

    orders.push({
      asset: leg.asset,
      clOrdID,
      displayName: leg.displayName,
      legNotionalUsd: leg.legNotionalUsd,
      price: formatDecimal(leg.referencePrice, 6),
      quantity: formatDecimal(quantity, 8),
      sodexSymbol: leg.sodexSymbol,
      symbolID: symbol.id,
      tradable: true,
    });
  }

  return { orders, skipped };
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
  headers: {
    apiKeyName: string;
    nonce: bigint;
    signature: Hex;
  },
): Promise<BasketTradeResult> {
  if (request.orders.length === 0) {
    return {
      ok: false,
      message: "No tradable basket legs are ready for SoDEX submission.",
    };
  }

  const body = buildBatchNewOrderBody(request);
  const result = await requestSodexPost<unknown>("/trade/orders", "SoDEX Batch New Order", body, {
    "X-API-Key": headers.apiKeyName,
    "X-API-Sign": headers.signature,
    "X-API-Nonce": headers.nonce.toString(),
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.status.message,
      response: result.error,
    };
  }

  return {
    ok: true,
    message: `Submitted ${request.orders.length} basket orders to SoDEX.`,
    submittedOrders: request.orders.length,
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

  return submitSignedBasketTrade(request, {
    apiKeyName: credentials.apiKeyName,
    nonce,
    signature,
  });
}

export function summarizeLegForTrade(leg: BasketLegReadiness) {
  if (!leg.tradable) {
    return leg.message ?? "Not tradable";
  }

  return leg.referencePrice
    ? `Limit buy ~$${Math.round(leg.legNotionalUsd).toLocaleString()} @ ${leg.referencePrice}`
    : "Tradable";
}
