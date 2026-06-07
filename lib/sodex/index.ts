export type { SodexNetwork } from "./config";
export {
  getSodexBaseUrl,
  getSodexBasketNotionalUsd,
  getSodexChainId,
  getSodexNetwork,
  getSodexNetworkLabel,
  getSodexTradingCredentials,
  SODEX_CHAIN_IDS,
} from "./config";

export {
  clampBasketNotionalUsd,
  getSodexBasketNotionalLimits,
  resolveBasketNotionalUsd,
  SODEX_TESTNET_FAUCET_USDC,
  SODEX_TESTNET_FEE_BUFFER_USD,
} from "./basket-notional";

export type {
  SodexAccountState,
  SodexApiKey,
  SodexBalance,
  SodexOpenOrder,
} from "./account";
export {
  getAccountApiKeys,
  getAccountBalances,
  getAccountOrders,
  getAccountState,
} from "./account";

export type {
  SodexOrderBook,
  SodexOrderBookLevel,
  SodexSpotSymbol,
  SodexTicker,
  SodexTrade,
} from "./market";
export {
  depthNotionalUsd,
  estimateBuySlippagePct,
  getMarketTickers,
  getOrderBook,
  getRecentTrades,
  getSpotSymbols,
  normalizeAssetToken,
  resolveSpotSymbol,
  symbolAcceptsNewOrders,
} from "./market";

export type {
  BasketExecutionReadiness,
  BasketLegReadiness,
} from "./readiness";
export { getBasketExecutionReadiness } from "./readiness";

export type {
  BatchNewOrderItem,
  BatchNewOrderRequest,
} from "./signing";
export {
  buildBatchNewOrderBody,
  formatSodexSignature,
  getBatchNewOrderDigest,
  getBatchNewOrderPayloadHash,
  getSodexExchangeTypedData,
  signBatchNewOrderRequest,
  SODEX_ORDER_SIDE,
  SODEX_ORDER_TYPE,
  SODEX_TIME_IN_FORCE,
} from "./signing";

export type {
  BasketTradePlan,
  BasketTradeResult,
  PreparedBasketOrder,
} from "./trading";
export {
  buildBasketTradePlan,
  findWalletApiKeyName,
  planToBatchNewOrderRequest,
  singleOrderPlan,
  submitBasketTradePlan,
  submitSignedBasketTrade,
  summarizeLegForTrade,
} from "./trading";
