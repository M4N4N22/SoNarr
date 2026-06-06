import type { SodexNetwork } from "./config";

export const SODEX_TESTNET_FAUCET_USDC = 1000;
export const SODEX_TESTNET_FEE_BUFFER_USD = 50;

export type BasketNotionalLimits = {
  min: number;
  max: number;
  default: number;
  feeBufferUsd: number;
};

export function getSodexBasketNotionalLimits(network: SodexNetwork): BasketNotionalLimits {
  if (network === "testnet") {
    return {
      min: 10,
      max: SODEX_TESTNET_FAUCET_USDC - SODEX_TESTNET_FEE_BUFFER_USD,
      default: 500,
      feeBufferUsd: SODEX_TESTNET_FEE_BUFFER_USD,
    };
  }

  return {
    min: 10,
    max: 1_000_000,
    default: 5000,
    feeBufferUsd: 0,
  };
}

export function clampBasketNotionalUsd(value: number, network: SodexNetwork) {
  const { min, max } = getSodexBasketNotionalLimits(network);
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function resolveBasketNotionalUsd(
  value: number | undefined,
  network: SodexNetwork,
) {
  const limits = getSodexBasketNotionalLimits(network);

  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return limits.default;
  }

  return clampBasketNotionalUsd(value, network);
}

export function formatWeightedAssetsParam(
  weightedAssets: Array<{ asset: string; weight: number }>,
) {
  return weightedAssets.map((item) => `${item.asset}:${item.weight}`).join(",");
}
