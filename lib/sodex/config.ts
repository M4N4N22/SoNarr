import {
  getSodexBasketNotionalLimits,
  resolveBasketNotionalUsd,
} from "./basket-notional";

export type SodexNetwork = "testnet" | "mainnet";

const TESTNET_BASE_URL = "https://testnet-gw.sodex.dev/api/v1/spot";
const MAINNET_BASE_URL = "https://mainnet-gw.sodex.dev/api/v1/spot";

export const SODEX_CHAIN_IDS = {
  testnet: 138565,
  mainnet: 286623,
} as const;

export function getSodexChainId(network = getSodexNetwork()) {
  return SODEX_CHAIN_IDS[network];
}

export function getSodexNetwork(): SodexNetwork {
  const configured = process.env.SODEX_NETWORK?.trim().toLowerCase();

  if (configured === "mainnet") {
    return "mainnet";
  }

  if (configured === "testnet") {
    return "testnet";
  }

  if (process.env.SODEX_API_BASE_URL?.includes("mainnet")) {
    return "mainnet";
  }

  return "testnet";
}

export function getSodexBaseUrl(network = getSodexNetwork()) {
  if (process.env.SODEX_API_BASE_URL) {
    return process.env.SODEX_API_BASE_URL.replace(/\/$/, "");
  }

  return network === "mainnet" ? MAINNET_BASE_URL : TESTNET_BASE_URL;
}

export function getSodexNetworkLabel(network = getSodexNetwork()) {
  return network === "mainnet" ? "Mainnet" : "Testnet";
}

export function getSodexBasketNotionalUsd(network = getSodexNetwork()) {
  const configured = Number(process.env.SODEX_BASKET_NOTIONAL_USD);

  if (Number.isFinite(configured) && configured > 0) {
    return resolveBasketNotionalUsd(configured, network);
  }

  return getSodexBasketNotionalLimits(network).default;
}

export function getSodexTradingCredentials() {
  const apiKeyName = process.env.SODEX_API_KEY_NAME?.trim();
  const apiPrivateKey = process.env.SODEX_API_PRIVATE_KEY?.trim();
  const accountId = Number(process.env.SODEX_ACCOUNT_ID);

  if (!apiKeyName || !apiPrivateKey || !Number.isFinite(accountId) || accountId <= 0) {
    return undefined;
  }

  return {
    apiKeyName,
    apiPrivateKey,
    accountId,
  };
}
