"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { BasketExecutionReadiness } from "@/lib/sodex";
import {
  clampBasketNotionalUsd,
  formatWeightedAssetsParam,
  getSodexBasketNotionalLimits,
} from "@/lib/sodex/basket-notional";

type WeightedAsset = { asset: string; weight: number };

export function useBasketExecutionReadiness(
  weightedAssets: WeightedAsset[],
  initialReadiness: BasketExecutionReadiness,
) {
  const network = initialReadiness.network;
  const limits = getSodexBasketNotionalLimits(network);
  const [basketNotionalUsd, setBasketNotionalUsdState] = useState(() =>
    clampBasketNotionalUsd(initialReadiness.totalNotionalUsd, network),
  );
  const [executionReadiness, setExecutionReadiness] = useState(initialReadiness);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  const setBasketNotionalUsd = useCallback(
    (value: number) => {
      setBasketNotionalUsdState(clampBasketNotionalUsd(value, network));
    },
    [network],
  );

  const skipInitialFetch = useRef(true);

  useEffect(() => {
    if (
      skipInitialFetch.current &&
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
          `/api/execution/readiness?assets=${encodeURIComponent(assetsParam)}&notionalUsd=${basketNotionalUsd}`,
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
  }, [basketNotionalUsd, initialReadiness, weightedAssets]);

  return {
    basketNotionalUsd,
    setBasketNotionalUsd,
    executionReadiness,
    loadingReadiness,
    limits,
  };
}
