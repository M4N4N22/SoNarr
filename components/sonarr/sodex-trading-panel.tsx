"use client";

import { getWalletClient } from "wagmi/actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAccount, useChainId, useConfig } from "wagmi";

import { BasketNotionalControl } from "@/components/sonarr/basket-notional-control";
import { BasketOrderPlanTable } from "@/components/sonarr/basket-order-plan-table";
import { BasketTradeStatus } from "@/components/sonarr/basket-trade-status";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  findWalletApiKeyName,
  formatSodexSignature,
  getBatchCancelTypedData,
  getBatchNewOrderPayloadHash,
  getSodexExchangeTypedData,
  planToBatchCancelRequest,
  planToBatchNewOrderRequest,
  singleOrderPlan,
  SODEX_CHAIN_IDS,
  sodexOnboardingUrl,
  type BasketExecutionReadiness,
  type BasketTradePlan,
  type BasketTradeResult,
  type PreparedBasketOrder,
} from "@/lib/sodex";
import { ensureSodexChain } from "@/lib/wagmi/ensure-sodex-chain";
import { getSodexChain } from "@/lib/wagmi/sodex-chains";

type WeightedAsset = { asset: string; weight: number };

type SodexTradingPanelProps = {
  executionReadiness: BasketExecutionReadiness;
  weightedAssets: WeightedAsset[];
  narrativeTitle: string;
  narrativeId?: string;
  basketNotionalUsd: number;
  onBasketNotionalChange: (value: number, availableUsdc?: number) => void;
  loadingReadiness?: boolean;
  onTradeRecorded?: () => void;
};

type AccountSnapshot = {
  accountId?: number;
  apiKeyName?: string;
  onboarded: boolean;
  onboardingUrl?: string;
  balances: Array<{ coin: string; available?: number; total?: number }>;
  orders: Array<{
    symbol?: string;
    side?: string;
    price?: number;
    quantity?: number;
    filledQuantity?: number;
    remainingQuantity?: number;
    status?: string;
    clOrdId?: string;
    orderId?: number;
    symbolId?: number;
  }>;
};

type DialogKind = "notional" | "submit" | "cancel" | null;

async function prepareTradePlan(
  weightedAssets: WeightedAsset[],
  totalNotionalUsd: number,
  network: BasketExecutionReadiness["network"],
) {
  const response = await fetch("/api/sodex/trade/basket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assets: weightedAssets,
      totalNotionalUsd,
      dryRun: true,
      network,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not prepare the basket trade plan.");
  }

  return {
    plan: payload.plan as BasketTradePlan,
    result: payload.result as BasketTradeResult,
  };
}

async function submitSignedPlanLeg(
  order: PreparedBasketOrder,
  accountId: number,
  apiKeyName: string,
  walletClient: Awaited<ReturnType<typeof getWalletClient>>,
  address: `0x${string}`,
  chainId: number,
  network: BasketExecutionReadiness["network"],
) {
  const plan = singleOrderPlan(order);
  const batchRequest = planToBatchNewOrderRequest(plan, accountId);
  const nonce = BigInt(Date.now());
  const typedData = getSodexExchangeTypedData(getBatchNewOrderPayloadHash(batchRequest), nonce, chainId);
  const walletSignature = await walletClient!.signTypedData({
    account: address,
    ...typedData,
  });
  const signature = formatSodexSignature(walletSignature);

  const response = await fetch("/api/sodex/trade/basket/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      accountId,
      apiKeyName,
      nonce: nonce.toString(),
      signature,
      network,
    }),
  });

  const payload = await response.json();
  return (payload.result ?? {
    ok: false,
    message: payload.error ?? "SoDEX submission failed.",
  }) as BasketTradeResult;
}

export function SodexTradingPanel({
  executionReadiness,
  weightedAssets,
  narrativeTitle,
  narrativeId,
  basketNotionalUsd,
  onBasketNotionalChange,
  loadingReadiness = false,
  onTradeRecorded,
}: SodexTradingPanelProps) {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot | null>(null);
  const [tradePlan, setTradePlan] = useState<BasketTradePlan | null>(null);
  const [tradeResult, setTradeResult] = useState<BasketTradeResult | null>(null);
  const [submittingMessage, setSubmittingMessage] = useState<string | undefined>();
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(false);
  const [pollingFills, setPollingFills] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null);
  const [pendingNotional, setPendingNotional] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const tradableLegs = executionReadiness.legs.filter((leg) => leg.tradable);
  const skippedReadinessLegs = executionReadiness.legs.filter((leg) => !leg.tradable);
  const chainId = SODEX_CHAIN_IDS[executionReadiness.network];
  const sodexChain = getSodexChain(chainId);
  const onSodexChain = walletChainId === chainId;

  const usdcBalance = useMemo(() => {
    return accountSnapshot?.balances.find((balance) =>
      balance.coin.toUpperCase().includes("USDC"),
    );
  }, [accountSnapshot]);

  const submitDisabledReason = useMemo(() => {
    if (loadingTrade) {
      return undefined;
    }

    if (!isConnected || !address) {
      return "Connect wallet in the header";
    }

    if (tradableLegs.length === 0) {
      return "No tradable legs on SoDEX";
    }

    if (accountSnapshot && !accountSnapshot.onboarded) {
      return "Open SoDEX once with this wallet, then refresh";
    }

    const availableUsdc = usdcBalance?.available ?? usdcBalance?.total;
    if (typeof availableUsdc === "number" && basketNotionalUsd > availableUsdc) {
      return `Size exceeds balance (${availableUsdc.toLocaleString()} USDC)`;
    }

    if (!onSodexChain) {
      return `Switch to ${sodexChain.name} in the header`;
    }

    return undefined;
  }, [
    accountSnapshot,
    address,
    basketNotionalUsd,
    isConnected,
    loadingTrade,
    onSodexChain,
    sodexChain.name,
    tradableLegs.length,
    usdcBalance,
  ]);

  const refreshAccount = useCallback(async () => {
    if (!address) {
      return null;
    }

    setLoadingAccount(true);
    const network = executionReadiness.network;
    const qs = `?network=${encodeURIComponent(network)}`;

    try {
      const [balancesResponse, ordersResponse, stateResponse, apiKeysResponse] =
        await Promise.all([
          fetch(`/api/sodex/account/${address}/balances${qs}`),
          fetch(`/api/sodex/account/${address}/orders${qs}`),
          fetch(`/api/sodex/account/${address}/state${qs}`),
          fetch(`/api/sodex/account/${address}/api-keys${qs}`),
        ]);

      const balancesJson = balancesResponse.ok ? await balancesResponse.json() : { balances: [] };
      const ordersJson = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      const stateJson = stateResponse.ok
        ? await stateResponse.json()
        : { state: undefined, onboarded: false };
      const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };

      const apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []);
      const accountId =
        typeof stateJson.state?.accountId === "number" && stateJson.state.accountId > 0
          ? stateJson.state.accountId
          : undefined;

      const snapshot: AccountSnapshot = {
        balances: balancesJson.balances ?? [],
        orders: ordersJson.orders ?? [],
        accountId,
        apiKeyName,
        onboarded: stateJson.onboarded === true && Boolean(accountId),
        onboardingUrl:
          typeof stateJson.onboardingUrl === "string"
            ? stateJson.onboardingUrl
            : sodexOnboardingUrl(network),
      };
      setAccountSnapshot(snapshot);
      return snapshot;
    } finally {
      setLoadingAccount(false);
    }
  }, [address, executionReadiness.network]);

  useEffect(() => {
    if (address) {
      void refreshAccount();
    } else {
      setAccountSnapshot(null);
    }
  }, [address, refreshAccount]);

  useEffect(() => {
    setTradePlan(null);
    setTradeResult(null);
    setPreviewError(null);
  }, [basketNotionalUsd, weightedAssets]);

  const failedLegAssets = useMemo(() => {
    const legs = tradeResult?.legResults ?? [];
    return new Set(legs.filter((leg) => !leg.ok).map((leg) => leg.asset));
  }, [tradeResult]);

  const trackedOrders = useMemo(() => {
    const clOrdIds = new Set(
      (tradeResult?.legResults ?? [])
        .filter((leg) => leg.ok)
        .map((leg) => leg.clOrdID)
        .filter(Boolean),
    );
    if (clOrdIds.size === 0) {
      return accountSnapshot?.orders.slice(0, 8) ?? [];
    }
    return (accountSnapshot?.orders ?? []).filter(
      (order) => order.clOrdId && clOrdIds.has(order.clOrdId),
    );
  }, [accountSnapshot?.orders, tradeResult]);

  async function appendJournal(
    result: BasketTradeResult,
    fills: AccountSnapshot["orders"],
  ) {
    try {
      await fetch("/api/trade-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          narrativeId: narrativeId ?? narrativeTitle.toLowerCase().replace(/\s+/g, "-"),
          narrativeTitle,
          wallet: address,
          network: executionReadiness.network,
          submittedLegs: result.legResults?.length ?? 0,
          successLegs: result.legResults?.filter((leg) => leg.ok).length ?? 0,
          message: result.message || summarizeSubmitMessage(result),
          fills: fills.map((order) => ({
            symbol: order.symbol,
            status: order.status,
            side: order.side,
            price: order.price,
            quantity: order.quantity,
            filledQuantity: order.filledQuantity,
            clOrdId: order.clOrdId,
          })),
        }),
      });
      onTradeRecorded?.();
    } catch {
      // Journal persistence is best-effort.
    }
  }

  function summarizeSubmitMessage(result: BasketTradeResult) {
    const ok = result.legResults?.filter((leg) => leg.ok).length ?? 0;
    const total = result.legResults?.length ?? 0;
    return `Submitted ${ok}/${total} legs`;
  }

  async function pollFillsAfterSubmit(result: BasketTradeResult) {
    if (!address) {
      return;
    }

    const watchedIds = new Set(
      (result.legResults ?? [])
        .filter((leg) => leg.ok && leg.clOrdID)
        .map((leg) => leg.clOrdID as string),
    );
    const seenIds = new Set<string>();

    function isTerminalStatus(status?: string) {
      const value = (status ?? "").toLowerCase();
      if (!value) {
        return false;
      }
      if (
        value.includes("open") ||
        value.includes("new") ||
        value.includes("live") ||
        value.includes("partial") ||
        value.includes("pending")
      ) {
        return false;
      }
      return (
        value.includes("fill") ||
        value.includes("cancel") ||
        value.includes("reject") ||
        value.includes("expire") ||
        value.includes("done") ||
        value.includes("closed")
      );
    }

    function isStillOpen(status?: string) {
      const value = (status ?? "").toLowerCase();
      return (
        value.includes("open") ||
        value.includes("new") ||
        value.includes("live") ||
        value.includes("partial") ||
        value.includes("pending")
      );
    }

    /** SoDEX open-orders lists drop filled/cancelled rows — absence after grace = left the book. */
    function allWatchedResolved(orders: AccountSnapshot["orders"], attempt: number) {
      if (watchedIds.size === 0) {
        return false;
      }
      const byClOrdId = new Map(
        orders
          .filter((order) => order.clOrdId)
          .map((order) => [order.clOrdId!, order]),
      );

      for (const id of watchedIds) {
        const order = byClOrdId.get(id);
        if (!order) {
          if (attempt >= 2 || seenIds.has(id)) {
            continue;
          }
          return false;
        }
        seenIds.add(id);
        if (isStillOpen(order.status) && !isTerminalStatus(order.status)) {
          return false;
        }
      }
      return true;
    }

    function snapshotFills(orders: AccountSnapshot["orders"]): AccountSnapshot["orders"] {
      const byClOrdId = new Map(
        orders
          .filter((order) => order.clOrdId)
          .map((order) => [order.clOrdId!, order]),
      );
      const fills: AccountSnapshot["orders"] = [];

      for (const id of watchedIds) {
        const live = byClOrdId.get(id);
        if (live) {
          fills.push(live);
          continue;
        }
        const leg = (result.legResults ?? []).find((item) => item.clOrdID === id);
        fills.push({
          clOrdId: id,
          symbol: leg?.displayName ?? leg?.asset,
          status: seenIds.has(id) || watchedIds.has(id) ? "left_open_book" : undefined,
          side: "BUY",
        });
      }

      return fills;
    }

    setPollingFills(true);
    let latestOrders: AccountSnapshot["orders"] = [];
    let fillSnapshot: AccountSnapshot["orders"] = [];
    const maxAttempts = 12;
    const startedAt = Date.now();
    const timeoutMs = 45_000;
    let resolvedEarly = false;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, attempt === 0 ? 600 : 1500);
        });

        const snapshot = await refreshAccount();
        latestOrders = snapshot?.orders ?? [];

        if (allWatchedResolved(latestOrders, attempt)) {
          resolvedEarly = true;
          fillSnapshot = snapshotFills(latestOrders);
          break;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          break;
        }
      }

      if (!resolvedEarly) {
        fillSnapshot = snapshotFills(latestOrders);
      }
    } finally {
      setPollingFills(false);
      const stillOpen = fillSnapshot.filter((order) => isStillOpen(order.status)).length;
      const leftBook = fillSnapshot.filter((order) =>
        (order.status ?? "").toLowerCase().includes("left_open_book"),
      ).length;
      const note =
        stillOpen > 0
          ? `${summarizeSubmitMessage(result)} · poll timeout with ${stillOpen} still open`
          : leftBook > 0
            ? `${summarizeSubmitMessage(result)} · ${leftBook} left open book (filled/cancelled off-list)`
            : summarizeSubmitMessage(result);
      await appendJournal({ ...result, message: note }, fillSnapshot);
    }
  }

  function handleNotionalChange(nextValue: number) {
    if (tradePlan && nextValue !== basketNotionalUsd) {
      setPendingNotional(nextValue);
      setActiveDialog("notional");
      return;
    }

    onBasketNotionalChange(nextValue, usdcBalance?.available ?? usdcBalance?.total);
  }

  function confirmNotionalChange() {
    if (pendingNotional === null) {
      return;
    }

    onBasketNotionalChange(pendingNotional, usdcBalance?.available ?? usdcBalance?.total);
    setPendingNotional(null);
    setActiveDialog(null);
  }

  async function runPreview() {
    setLoadingTrade(true);
    setTradeResult(null);
    setSubmittingMessage(undefined);
    setPreviewError(null);

    try {
      const prepared = await prepareTradePlan(
        weightedAssets,
        basketNotionalUsd,
        executionReadiness.network,
      );
      setTradePlan(prepared.plan);
      setTradeResult(null);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setLoadingTrade(false);
    }
  }

  async function runWalletSubmit(options?: { failedOnly?: boolean }) {
    if (!address) {
      return;
    }

    const assetsToRetry = options?.failedOnly ? new Set(failedLegAssets) : null;
    const priorOkLegs = options?.failedOnly
      ? (tradeResult?.legResults ?? []).filter((leg) => leg.ok)
      : [];

    setLoadingTrade(true);
    if (!options?.failedOnly) {
      setTradeResult(null);
    }
    setSubmittingMessage(undefined);
    setActiveDialog(null);

    try {
      await ensureSodexChain(config, { chainId, account: address });

      const walletClient = await getWalletClient(config, {
        account: address,
        chainId,
      });

      if (!walletClient) {
        setTradeResult({
          ok: false,
          message:
            "Could not access your wallet on ValueChain. Approve the network switch and try again.",
        });
        return;
      }

      const prepared =
        tradePlan ??
        (await prepareTradePlan(weightedAssets, basketNotionalUsd, executionReadiness.network))
          .plan;
      setTradePlan(prepared);

      const ordersToSubmit = assetsToRetry
        ? prepared.orders.filter((order) => assetsToRetry.has(order.asset))
        : prepared.orders;

      if (ordersToSubmit.length === 0) {
        setTradeResult({
          ok: false,
          message: options?.failedOnly
            ? "No failed legs remain to retry."
            : "No tradable basket legs are ready for SoDEX submission.",
        });
        return;
      }

      let accountId = accountSnapshot?.accountId;
      let apiKeyName = accountSnapshot?.apiKeyName;
      const networkQs = `?network=${encodeURIComponent(executionReadiness.network)}`;

      if (!accountId || !apiKeyName) {
        const [stateResponse, apiKeysResponse] = await Promise.all([
          fetch(`/api/sodex/account/${address}/state${networkQs}`),
          fetch(`/api/sodex/account/${address}/api-keys${networkQs}`),
        ]);

        const stateJson = stateResponse.ok ? await stateResponse.json() : {};
        const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };

        accountId =
          typeof stateJson.state?.accountId === "number" && stateJson.state.accountId > 0
            ? stateJson.state.accountId
            : undefined;
        apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []);
      }

      if (!accountId) {
        const url = sodexOnboardingUrl(executionReadiness.network);
        setTradeResult({
          ok: false,
          message:
            executionReadiness.network === "mainnet"
              ? `No SoDEX mainnet account for this wallet yet. Connect once at ${url}, then click Load balance / refresh here.`
              : `No SoDEX testnet account for this wallet yet. Open ${url}, connect this wallet, claim faucet, transfer to Spot, then refresh here.`,
        });
        return;
      }

      if (!apiKeyName) {
        setTradeResult({
          ok: false,
          message:
            "No SoDEX API key matches this wallet. Use the default key on SoDEX testnet or register addAPIKey with your wallet address as the public key.",
        });
        return;
      }

      const legResults: NonNullable<BasketTradeResult["legResults"]> = [...priorOkLegs];
      let submittedOrders = priorOkLegs.length;

      for (const [index, order] of ordersToSubmit.entries()) {
        setSubmittingMessage(
          `Signing leg ${index + 1} of ${ordersToSubmit.length}: ${order.displayName ?? order.asset}`,
        );

        if (index > 0) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 25);
          });
        }

        const legResult = await submitSignedPlanLeg(
          order,
          accountId,
          apiKeyName,
          walletClient,
          address,
          chainId,
          executionReadiness.network,
        );

        if (legResult.legResults?.length) {
          legResults.push(...legResult.legResults);
        } else {
          legResults.push({
            asset: order.asset,
            clOrdID: order.clOrdID,
            displayName: order.displayName,
            ok: legResult.ok,
            message: legResult.message,
          });
        }

        if (legResult.ok) {
          submittedOrders += legResult.submittedOrders ?? 1;
        }
      }

      setSubmittingMessage(undefined);
      const anyOk = legResults.some((leg) => leg.ok);

      const nextResult: BasketTradeResult = {
        ok: anyOk,
        message: "",
        submittedOrders,
        legResults,
      };

      setTradeResult(nextResult);

      if (anyOk) {
        await pollFillsAfterSubmit(nextResult);
      }
    } catch (error) {
      setSubmittingMessage(undefined);
      const message =
        error instanceof Error ? error.message : "Wallet signing or SoDEX submission failed.";
      const rejected =
        message.toLowerCase().includes("user rejected") ||
        message.toLowerCase().includes("user denied");

      setTradeResult({
        ok: false,
        message: rejected
          ? `Network switch or signing was cancelled. SoDEX requires ${sodexChain.name} (chain ${chainId}) in your wallet.`
          : message,
      });
    } finally {
      setLoadingTrade(false);
    }
  }

  async function openSubmitDialog() {
    setLoadingTrade(true);
    setPreviewError(null);

    try {
      const prepared = await prepareTradePlan(
        weightedAssets,
        basketNotionalUsd,
        executionReadiness.network,
      );
      setTradePlan(prepared.plan);

      if (prepared.plan.orders.length === 0) {
        setPreviewError("No tradable legs are ready. Check Market legs or adjust size.");
        return;
      }

      setActiveDialog("submit");
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Could not prepare orders.");
    } finally {
      setLoadingTrade(false);
    }
  }

  const cancelableOrders = useMemo(() => {
    return (accountSnapshot?.orders ?? []).filter((order) => {
      const status = (order.status ?? "").toLowerCase();
      const openish =
        !status ||
        status.includes("new") ||
        status.includes("open") ||
        status.includes("live") ||
        status.includes("partial");
      return openish && (typeof order.orderId === "number" || Boolean(order.clOrdId));
    });
  }, [accountSnapshot?.orders]);

  async function runCancelOpenOrders() {
    if (!address || cancelableOrders.length === 0) {
      return;
    }

    setLoadingTrade(true);
    setActiveDialog(null);
    setSubmittingMessage("Preparing cancel signatures…");

    try {
      await ensureSodexChain(config, { chainId, account: address });
      const walletClient = await getWalletClient(config, { account: address, chainId });
      if (!walletClient) {
        setPreviewError("Could not access wallet for cancel signing.");
        return;
      }

      let accountId = accountSnapshot?.accountId;
      let apiKeyName = accountSnapshot?.apiKeyName;
      if (!accountId || !apiKeyName) {
        await refreshAccount();
        accountId = accountSnapshot?.accountId;
        apiKeyName = accountSnapshot?.apiKeyName;
      }

      // Re-fetch credentials after refresh
      const networkQs = `?network=${encodeURIComponent(executionReadiness.network)}`;
      const [stateResponse, apiKeysResponse] = await Promise.all([
        fetch(`/api/sodex/account/${address}/state${networkQs}`),
        fetch(`/api/sodex/account/${address}/api-keys${networkQs}`),
      ]);
      const stateJson = stateResponse.ok ? await stateResponse.json() : {};
      const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };
      accountId =
        typeof stateJson.state?.accountId === "number" && stateJson.state.accountId > 0
          ? stateJson.state.accountId
          : accountId;
      apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []) ?? apiKeyName;

      if (!accountId || !apiKeyName) {
        setPreviewError(
          !accountId
            ? `Missing SoDEX account — onboard at ${sodexOnboardingUrl(executionReadiness.network)} then refresh.`
            : "Missing SoDEX API key for cancel.",
        );
        return;
      }

      // Resolve symbolIDs from current readiness legs when order.symbolId missing
      const symbolIdByName = new Map(
        executionReadiness.legs
          .filter((leg) => leg.sodexSymbol && leg.symbolId)
          .map((leg) => [leg.sodexSymbol!, leg.symbolId!]),
      );

      const cancels = cancelableOrders
        .map((order) => {
          const symbolID =
            order.symbolId ??
            (order.symbol ? symbolIdByName.get(order.symbol) : undefined);
          if (!symbolID) {
            return undefined;
          }
          return {
            symbolID,
            orderID: order.orderId,
            origClOrdID: order.clOrdId,
            asset: order.symbol?.split("/")[0] ?? order.symbol,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (cancels.length === 0) {
        setPreviewError(
          "Open orders are missing symbol IDs — refresh account after submit so cancels can resolve markets.",
        );
        return;
      }

      const batchRequest = planToBatchCancelRequest(cancels, accountId);
      const nonce = BigInt(Date.now());
      const typedData = getBatchCancelTypedData(batchRequest, nonce, chainId);
      setSubmittingMessage(`Sign cancel for ${cancels.length} order(s)…`);
      const walletSignature = await walletClient.signTypedData({
        account: address,
        ...typedData,
      });
      const signature = formatSodexSignature(walletSignature);

      const response = await fetch("/api/sodex/trade/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          apiKeyName,
          nonce: nonce.toString(),
          signature,
          network: executionReadiness.network,
          cancels,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.result?.ok) {
        setPreviewError(payload.result?.message ?? payload.error ?? "Cancel failed.");
        return;
      }

      setSubmittingMessage(undefined);
      await refreshAccount();
    } catch (error) {
      setSubmittingMessage(undefined);
      setPreviewError(error instanceof Error ? error.message : "Cancel failed.");
    } finally {
      setLoadingTrade(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-positive/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-positive">
                Buy
              </span>
              <h2 className="truncate text-sm font-semibold text-foreground">
                {narrativeTitle || "Basket"}
              </h2>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {weightedAssets.map((leg) => `${leg.asset} ${leg.weight}%`).join(" · ") ||
                "No legs selected"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {isConnected && usdcBalance ? (
              <button
                type="button"
                onClick={refreshAccount}
                disabled={loadingAccount}
                className="tabular-nums transition hover:text-foreground disabled:opacity-50"
                title="Refresh balances"
              >
                {usdcBalance.available ?? usdcBalance.total ?? 0} USDC
              </button>
            ) : isConnected ? (
              <button
                type="button"
                onClick={refreshAccount}
                disabled={loadingAccount}
                className="transition hover:text-foreground disabled:opacity-50"
              >
                {loadingAccount ? "Loading…" : "Load balance"}
              </button>
            ) : (
              <span>Wallet offline</span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4">
          {isConnected && accountSnapshot && !accountSnapshot.onboarded ? (
            <div className="rounded-md border border-chart-4/30 bg-chart-4/10 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
              <p className="font-medium text-foreground">SoDEX account not found on {executionReadiness.network}</p>
              <p className="mt-1">
                Connect this wallet on SoDEX once (faucet → transfer to Spot on testnet), then refresh
                here. Account ID is created by SoDEX, not by SoNarr.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={accountSnapshot.onboardingUrl ?? sodexOnboardingUrl(executionReadiness.network)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Open SoDEX {executionReadiness.network}
                </a>
                <button
                  type="button"
                  onClick={() => void refreshAccount()}
                  disabled={loadingAccount}
                  className="text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {loadingAccount ? "Refreshing…" : "I onboarded — refresh"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Basket contents
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {tradableLegs.length}/{executionReadiness.legs.length || weightedAssets.length}{" "}
                routable
              </span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              {weightedAssets.map((leg, index) => (
                <div
                  key={leg.asset}
                  className="h-full bg-primary/85 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${leg.weight}%`,
                    opacity: 1 - index * 0.1,
                  }}
                  title={`${leg.asset} ${leg.weight}%`}
                />
              ))}
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {(executionReadiness.legs.length > 0
                ? executionReadiness.legs.map((leg) => ({
                    asset: leg.asset,
                    weight: leg.weight,
                    legNotionalUsd: leg.legNotionalUsd,
                    tradable: leg.tradable,
                    displayName: leg.displayName,
                    sodexSymbol: leg.sodexSymbol,
                    message: leg.message,
                    slippagePct: leg.slippagePct,
                  }))
                : weightedAssets.map((leg) => ({
                    asset: leg.asset,
                    weight: leg.weight,
                    legNotionalUsd: (basketNotionalUsd * leg.weight) / 100,
                    tradable: false,
                    displayName: undefined as string | undefined,
                    sodexSymbol: undefined as string | undefined,
                    message: "Route pending" as string | undefined,
                    slippagePct: undefined as number | undefined,
                  }))
              ).map((leg) => {
                const notional =
                  typeof leg.legNotionalUsd === "number" && leg.legNotionalUsd > 0
                    ? leg.legNotionalUsd
                    : (basketNotionalUsd * leg.weight) / 100;
                const slip = typeof leg.slippagePct === "number" ? leg.slippagePct : undefined;
                return (
                  <li
                    key={leg.asset}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{leg.asset}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {leg.weight}%
                        </span>
                        {leg.tradable ? (
                          <span className="rounded bg-positive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-positive">
                            Buy
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Skip
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {leg.displayName ?? leg.sodexSymbol ?? leg.message ?? "SoDEX route"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium tabular-nums text-foreground">
                        ${Math.round(notional).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {typeof slip === "number"
                          ? `slip ${slip > 0 && slip < 0.01 ? "<0.01" : slip.toFixed(2)}%`
                          : executionReadiness.network === "mainnet"
                            ? "USDC"
                            : "vUSDC"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {skippedReadinessLegs.length > 0 ? (
              <p className="text-[11px] leading-4 text-muted-foreground">
                Skipped legs stay in the research basket but are not signed on Buy.
              </p>
            ) : null}
          </div>

          <BasketNotionalControl
            network={executionReadiness.network}
            value={basketNotionalUsd}
            onChange={handleNotionalChange}
            loading={loadingReadiness}
            availableUsdc={usdcBalance?.available ?? usdcBalance?.total}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Limit orders
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingTrade}
                onClick={runPreview}
                className="h-7 px-2 text-xs"
              >
                {loadingTrade && !submittingMessage && !tradePlan ? "Building…" : "Refresh preview"}
              </Button>
            </div>

            {tradePlan ? (
              <BasketOrderPlanTable
                plan={tradePlan}
                totalNotionalUsd={basketNotionalUsd}
                weightedAssets={weightedAssets}
              />
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-xs leading-5 text-muted-foreground">
                Preview prices after you tap Buy or Refresh. Buy signs only the{" "}
                <span className="font-medium text-foreground">
                  {tradableLegs.map((leg) => leg.asset).join(", ") || "routable"}
                </span>{" "}
                leg{tradableLegs.length === 1 ? "" : "s"}
                {skippedReadinessLegs.length > 0
                  ? ` (${skippedReadinessLegs.map((leg) => leg.asset).join(", ")} skipped)`
                  : ""}
                .
              </div>
            )}
          </div>

          {previewError ? (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
              <p>{previewError}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Button
              type="button"
              className="h-11 w-full text-sm font-semibold"
              disabled={Boolean(submitDisabledReason) || loadingTrade}
              onClick={() => void openSubmitDialog()}
            >
              {loadingTrade && activeDialog !== "submit" && !submittingMessage
                ? "Preparing…"
                : executionReadiness.network === "mainnet"
                  ? "Buy basket · Mainnet"
                  : "Buy basket"}
            </Button>

            {submitDisabledReason ? (
              <p className="text-center text-[11px] text-muted-foreground">{submitDisabledReason}</p>
            ) : (
              <p className="text-center text-[11px] leading-4 text-muted-foreground">
                Buys{" "}
                <span className="font-medium text-foreground">
                  {tradableLegs.map((leg) => `${leg.asset} ${leg.weight}%`).join(" · ") ||
                    "routable legs"}
                </span>{" "}
                · ~${basketNotionalUsd.toLocaleString()} · one signature per leg
              </p>
            )}
          </div>

          {failedLegAssets.size > 0 || cancelableOrders.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {failedLegAssets.size > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingTrade || Boolean(submitDisabledReason)}
                  onClick={() => void runWalletSubmit({ failedOnly: true })}
                >
                  Retry failed ({failedLegAssets.size})
                </Button>
              ) : null}
              {cancelableOrders.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingTrade || !isConnected}
                  onClick={() => setActiveDialog("cancel")}
                >
                  Cancel open ({cancelableOrders.length})
                </Button>
              ) : null}
            </div>
          ) : null}

          <BasketTradeStatus
            result={tradeResult}
            submittingMessage={submittingMessage}
            pollingFills={pollingFills}
            trackedOrders={trackedOrders}
          />
        </div>
      </div>

      <ConfirmDialog
        open={activeDialog === "notional"}
        onOpenChange={(open) => {
          if (!open) {
            setPendingNotional(null);
          }
          setActiveDialog(open ? "notional" : null);
        }}
        title="Change basket size?"
        description="Updating size clears the current order preview."
        confirmLabel="Update size"
        onConfirm={confirmNotionalChange}
      />

      <ConfirmDialog
        open={activeDialog === "submit"}
        onOpenChange={(open) => setActiveDialog(open ? "submit" : null)}
        title={
          executionReadiness.network === "mainnet"
            ? "Confirm mainnet basket buy?"
            : "Confirm basket buy?"
        }
        description={
          executionReadiness.network === "mainnet"
            ? `Buys ${tradableLegs.map((leg) => `${leg.asset} ${leg.weight}%`).join(", ") || "routable legs"} on SoDEX mainnet (~$${basketNotionalUsd.toLocaleString()} USDC). You will approve ${tradePlan?.orders.length ?? tradableLegs.length} wallet signature(s).`
            : `Buys ${tradableLegs.map((leg) => `${leg.asset} ${leg.weight}%`).join(", ") || "routable legs"} on SoDEX testnet (~$${basketNotionalUsd.toLocaleString()} vUSDC). You will approve ${tradePlan?.orders.length ?? tradableLegs.length} wallet signature(s).`
        }
        confirmLabel={
          executionReadiness.network === "mainnet" ? "Sign mainnet buys" : "Sign & buy"
        }
        confirmVariant={executionReadiness.network === "mainnet" ? "destructive" : "default"}
        loading={loadingTrade}
        onConfirm={() => void runWalletSubmit()}
      >
        {tradePlan ? (
          <BasketOrderPlanTable
            plan={tradePlan}
            totalNotionalUsd={basketNotionalUsd}
            weightedAssets={weightedAssets}
          />
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={activeDialog === "cancel"}
        onOpenChange={(open) => setActiveDialog(open ? "cancel" : null)}
        title="Cancel open SoDEX orders?"
        description={`Signs a batch cancel for ${cancelableOrders.length} open order(s) on ${executionReadiness.network}. Filled size is kept.`}
        confirmLabel="Sign cancels"
        confirmVariant="destructive"
        loading={loadingTrade}
        onConfirm={() => void runCancelOpenOrders()}
      />
    </>
  );
}
