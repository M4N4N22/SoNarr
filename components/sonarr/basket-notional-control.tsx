"use client";

import {
  SODEX_TESTNET_FAUCET_USDC,
  getSodexBasketNotionalLimits,
} from "@/lib/sodex/basket-notional";
import type { SodexNetwork } from "@/lib/sodex";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = [0.25, 0.5, 0.75, 1] as const;

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
  const quote = network === "mainnet" ? "USDC" : "vUSDC";
  const hasBalance = typeof availableUsdc === "number" && Number.isFinite(availableUsdc);
  const spendable = hasBalance
    ? Math.min(availableUsdc, limits.max)
    : limits.max;
  const exceedsBalance = hasBalance && value > availableUsdc;

  function applyPreset(fraction: number) {
    const next = Math.max(limits.min, Math.floor(spendable * fraction));
    onChange(Math.min(next, limits.max));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Total ({quote})
        </label>
        {hasBalance ? (
          <p
            className={cn(
              "text-xs tabular-nums",
              exceedsBalance ? "text-negative" : "text-muted-foreground",
            )}
          >
            Available {availableUsdc.toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Max {limits.max.toLocaleString()}</p>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
        <input
          type="number"
          min={limits.min}
          max={limits.max}
          step={10}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full bg-transparent text-lg font-semibold tabular-nums text-foreground outline-none"
          aria-label={`Basket size in ${quote}`}
        />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{quote}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {SIZE_PRESETS.map((fraction) => (
          <button
            key={fraction}
            type="button"
            disabled={!hasBalance && fraction < 1}
            onClick={() => applyPreset(fraction)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-40"
          >
            {fraction === 1 ? "Max" : `${fraction * 100}%`}
          </button>
        ))}
      </div>

      <p className="text-[11px] leading-4 text-muted-foreground">
        Split across legs by index weight
        {network === "testnet" ? ` · faucet ${SODEX_TESTNET_FAUCET_USDC}` : ""}
        {network === "mainnet" && limits.feeBufferUsd > 0
          ? ` · keep ~$${limits.feeBufferUsd} fee buffer`
          : ""}
        {loading ? " · updating route" : ""}
      </p>
    </div>
  );
}
