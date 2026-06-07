import type { SodexSpotSymbol } from "./market";

function stepDecimalPlaces(step: string) {
  const fraction = step.split(".")[1];
  return fraction ? fraction.length : 0;
}

function decimalScale(value: string) {
  const fraction = value.split(".")[1];
  return fraction ? fraction.length : 0;
}

function trimTrailingZeros(value: string) {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
}

function parsePositiveDecimal(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/u.test(trimmed)) {
    return undefined;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }

  return trimmed;
}

/** SoDEX doc: limit buy price <= lastTradePrice * (1 + buyLimitUpRatio). */
export function parseBuyLimitUpRatio(ratio: string) {
  const value = Number(ratio);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function scaledDecimal(value: string, scale: number): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  const padded = (fraction + "0".repeat(scale)).slice(0, scale);
  return BigInt(`${whole}${padded}`);
}

function scaledNumberToString(scaled: bigint, scale: number) {
  if (scale === 0) {
    return scaled.toString();
  }

  const negative = scaled < BigInt(0);
  const abs = negative ? -scaled : scaled;
  const raw = abs.toString().padStart(scale + 1, "0");
  const whole = raw.slice(0, -scale) || "0";
  const fraction = raw.slice(-scale);
  const value = `${negative ? "-" : ""}${whole}.${fraction}`;
  return trimTrailingZeros(value);
}

/** Floor/ceil a decimal string to a SoDEX step or tick size. */
export function quantizeDecimalString(
  value: string,
  step: string,
  mode: "floor" | "ceil" = "floor",
): string {
  const positive = parsePositiveDecimal(value);
  const stepPositive = parsePositiveDecimal(step);

  if (!positive || !stepPositive) {
    return "0";
  }

  const scale = Math.max(decimalScale(positive), decimalScale(stepPositive), stepDecimalPlaces(step));
  const valueScaled = scaledDecimal(positive, scale);
  const stepScaled = scaledDecimal(stepPositive, scale);

  if (stepScaled <= BigInt(0)) {
    return "0";
  }

  const units =
    mode === "ceil"
      ? (valueScaled + stepScaled - BigInt(1)) / stepScaled
      : valueScaled / stepScaled;
  const quantizedScaled = units * stepScaled;

  if (quantizedScaled <= BigInt(0)) {
    return "0";
  }

  return scaledNumberToString(quantizedScaled, scale);
}

/** Floor/ceil a number to a SoDEX step or tick size string. */
export function quantizeToStep(
  value: number,
  step: string,
  mode: "floor" | "ceil" = "floor",
): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return quantizeDecimalString(value.toString(), step, mode);
}

export function formatDecimalToPrecision(value: string, precision: number) {
  const positive = parsePositiveDecimal(value);
  if (!positive) {
    return "0";
  }

  const scale = Math.max(decimalScale(positive), precision);
  const scaled = scaledDecimal(positive, scale);
  const divisor = BigInt(10) ** BigInt(Math.max(scale - precision, 0));
  const rounded = scale > precision ? scaled / divisor : scaled;
  return scaledNumberToString(rounded, precision);
}

/** Normalize an exchange decimal string to tick size and price precision. */
export function normalizeOrderPrice(value: string, symbol: SodexSpotSymbol) {
  const tickAligned = quantizeDecimalString(value, symbol.tickSize, "floor");
  if (tickAligned === "0") {
    return "0";
  }

  return formatDecimalToPrecision(tickAligned, symbol.pricePrecision);
}

export function formatOrderQuantity(rawQuantity: number, symbol: SodexSpotSymbol) {
  const quantized = quantizeToStep(rawQuantity, symbol.stepSize, "floor");
  if (quantized === "0") {
    return "0";
  }

  return formatDecimalToPrecision(quantized, symbol.quantityPrecision);
}

export function formatOrderPrice(rawPrice: number, symbol: SodexSpotSymbol) {
  return normalizeOrderPrice(rawPrice.toString(), symbol);
}

export function maxLimitBuyPrice(lastTradePrice: string, symbol: SodexSpotSymbol) {
  const last = parsePositiveDecimal(lastTradePrice);
  if (!last) {
    return "0";
  }

  const ratio = parseBuyLimitUpRatio(symbol.buyLimitUpRatio);
  const cap = Number(last) * (1 + ratio);
  if (!Number.isFinite(cap) || cap <= 0) {
    return "0";
  }

  return formatOrderPrice(cap, symbol);
}

/**
 * Basket limit buys use the exchange last trade price so orders stay inside
 * SoDEX price bands and avoid stale/wide book quotes on testnet.
 */
export function formatLimitBuyPrice(
  referencePrice: number,
  lastTradePrice: string | undefined,
  symbol: SodexSpotSymbol,
) {
  const fromLast = lastTradePrice ? normalizeOrderPrice(lastTradePrice, symbol) : "0";

  if (fromLast !== "0") {
    const cap = maxLimitBuyPrice(lastTradePrice!, symbol);
    if (cap !== "0" && Number(fromLast) - Number(cap) > 1e-12) {
      return cap;
    }

    return fromLast;
  }

  let target = referencePrice;
  const minPrice = Number(symbol.minPrice);
  if (Number.isFinite(minPrice) && minPrice > 0) {
    target = Math.max(target, minPrice);
  }

  return formatOrderPrice(target, symbol);
}

export function validateOrderFilters(
  quantity: string,
  price: string,
  symbol: SodexSpotSymbol,
  lastTradePrice?: string,
): string | undefined {
  const qty = Number(quantity);
  const px = Number(price);
  const minQty = Number(symbol.minQuantity);
  const minNotional = Number(symbol.minNotional);
  const minPrice = Number(symbol.minPrice);
  const maxPrice = Number(symbol.maxPrice);

  if (!Number.isFinite(qty) || qty <= 0) {
    return "Quantity rounds to zero for this market step size.";
  }

  if (!Number.isFinite(px) || px <= 0) {
    return "Price rounds to zero for this market tick size.";
  }

  if (Number.isFinite(minQty) && minQty > 0 && qty + 1e-12 < minQty) {
    return `Quantity ${quantity} is below market minimum ${symbol.minQuantity}.`;
  }

  if (Number.isFinite(minPrice) && minPrice > 0 && px + 1e-12 < minPrice) {
    return `Price ${price} is below market minimum ${symbol.minPrice}.`;
  }

  if (Number.isFinite(maxPrice) && maxPrice > 0 && px - 1e-12 > maxPrice) {
    return `Price ${price} is above market maximum ${symbol.maxPrice}.`;
  }

  if (lastTradePrice) {
    const maxBuy = Number(maxLimitBuyPrice(lastTradePrice, symbol));

    if (Number.isFinite(maxBuy) && maxBuy > 0 && px - 1e-12 > maxBuy) {
      return `Limit buy price ${price} exceeds SoDEX cap ${maxBuy} (last ${lastTradePrice} + ${symbol.buyLimitUpRatio}).`;
    }
  }

  if (Number.isFinite(px) && px > 0 && Number.isFinite(minNotional) && minNotional > 0) {
    const notional = qty * px;
    if (notional + 1e-8 < minNotional) {
      return `Order notional ~$${notional.toFixed(2)} is below minimum $${minNotional} for ${symbol.displayName}.`;
    }
  }

  return undefined;
}

export function createClientOrderId(asset: string, index: number) {
  const token = asset.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const id = `sn-${token}-${Date.now()}-${index}`;
  return id.slice(0, 36);
}
