type SodexNetwork = "testnet" | "mainnet";

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

  // Mainnet: no faucet cap. UI also clamps to available spot − fee buffer when balance is known.
  return {
    min: 25,
    max: 250_000,
    default: 1000,
    feeBufferUsd: 25,
  };
}

/** Clamp notional using network limits and optional live spot balance. */
export function clampBasketNotionalForBalance(
  value: number,
  network: SodexNetwork,
  availableUsdc?: number,
) {
  const limits = getSodexBasketNotionalLimits(network);
  let max = limits.max;

  if (typeof availableUsdc === "number" && Number.isFinite(availableUsdc)) {
    const spendable = Math.max(0, availableUsdc - limits.feeBufferUsd);
    max = Math.min(max, spendable);
  }

  if (max < limits.min) {
    return Math.max(0, Math.round(max));
  }

  return Math.min(max, Math.max(limits.min, Math.round(value)));
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
