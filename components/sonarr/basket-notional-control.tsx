"use client";

import {
  SODEX_TESTNET_FAUCET_USDC,
  getSodexBasketNotionalLimits,
} from "@/lib/sodex/basket-notional";
import type { SodexNetwork } from "@/lib/sodex";

const inputClassName =
  "mt-1 w-full max-w-[140px] rounded-md bg-muted px-3 py-2 text-sm tabular-nums text-foreground outline-none focus:ring-1 focus:ring-primary";

export function BasketNotionalControl({
  network,
  value,
  onChange,
  loading = false,
  availableUsdc,
}: {
  network: SodexNetwork;
  value: number;
  onChange: (value: number) => void;
  loading?: boolean;
  availableUsdc?: number;
}) {
  const limits = getSodexBasketNotionalLimits(network);
  const exceedsBalance =
    typeof availableUsdc === "number" && Number.isFinite(availableUsdc) && value > availableUsdc;

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-md bg-muted/40 px-3 py-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Basket size</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground/80">
          Total {network === "mainnet" ? "USDC" : "vUSDC"} notional — split across legs by index
          weights
          {network === "mainnet" ? " · fee buffer reserved from spot balance" : ""}
        </p>
        <input
          type="number"
          min={limits.min}
          max={limits.max}
          step={10}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={inputClassName}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Max {limits.max.toLocaleString()} {network === "mainnet" ? "USDC" : "vUSDC"}
          {network === "testnet" ? ` · faucet ${SODEX_TESTNET_FAUCET_USDC}` : ""}
          {network === "mainnet" && limits.feeBufferUsd > 0
            ? ` · keep ~$${limits.feeBufferUsd} fee buffer`
            : ""}
          {loading ? " · updating" : ""}
        </p>
      </div>
      {typeof availableUsdc === "number" ? (
        <p className={`text-xs tabular-nums ${exceedsBalance ? "text-negative" : "text-muted-foreground"}`}>
          Balance {availableUsdc.toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
