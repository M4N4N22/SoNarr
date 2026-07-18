"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BasketExecutionReadiness, SodexNetwork } from "@/lib/sodex";
import {
  clampBasketNotionalForBalance,
  clampBasketNotionalUsd,
  formatWeightedAssetsParam,
  getSodexBasketNotionalLimits,
} from "@/lib/sodex/basket-notional";

type WeightedAsset = { asset: string; weight: number };

export function useBasketExecutionReadiness(
  weightedAssets: WeightedAsset[],
  initialReadiness: BasketExecutionReadiness,
  networkOverride?: SodexNetwork,
) {
  const network = networkOverride ?? initialReadiness.network;
  const limits = getSodexBasketNotionalLimits(network);
  const [basketNotionalUsd, setBasketNotionalUsdState] = useState(() =>
    clampBasketNotionalUsd(initialReadiness.totalNotionalUsd, network),
  );
  const [executionReadiness, setExecutionReadiness] = useState(initialReadiness);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  const setBasketNotionalUsd = useCallback(
    (value: number, availableUsdc?: number) => {
      setBasketNotionalUsdState(
        clampBasketNotionalForBalance(value, network, availableUsdc),
      );
    },
    [network],
  );

  const skipInitialFetch = useRef(true);
  const networkChanged = network !== initialReadiness.network;

  useEffect(() => {
    setBasketNotionalUsdState((current) => clampBasketNotionalUsd(current, network));
  }, [network]);

  useEffect(() => {
    if (
      skipInitialFetch.current &&
      !networkChanged &&
      basketNotionalUsd === initialReadiness.totalNotionalUsd
    ) {
      skipInitialFetch.current = false;
      setExecutionReadiness(initialReadiness);
      return;
    }

    skipInitialFetch.current = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingReadiness(true);

      try {
        const assetsParam = formatWeightedAssetsParam(weightedAssets);
        const response = await fetch(
          `/api/execution/readiness?assets=${encodeURIComponent(assetsParam)}&notionalUsd=${basketNotionalUsd}&network=${network}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as BasketExecutionReadiness;
        setExecutionReadiness(payload);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingReadiness(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [basketNotionalUsd, initialReadiness, network, networkChanged, weightedAssets]);

  return {
    basketNotionalUsd,
    setBasketNotionalUsd,
    executionReadiness,
    loadingReadiness,
    limits,
    network,
  };
}
