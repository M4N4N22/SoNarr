"use client";

import { getWalletClient } from "wagmi/actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, Wallet } from "lucide-react";
import { useAccount, useChainId, useConfig, useConnect, useDisconnect } from "wagmi";

import { BasketNotionalControl } from "@/components/sonarr/basket-notional-control";
import { BasketOrderPlanTable } from "@/components/sonarr/basket-order-plan-table";
import { BasketTradeStatus } from "@/components/sonarr/basket-trade-status";
import { SodexNetworkBadge } from "@/components/sonarr/sodex-network-badge";
import { Badge } from "@/components/ui/badge";
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
};

type AccountSnapshot = {
  accountId?: number;
  apiKeyName?: string;
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

type DialogKind = "connect" | "disconnect" | "notional" | "submit" | "cancel" | null;

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
}: SodexTradingPanelProps) {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
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

  const connector = connectors[0];
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
      return "Connect your wallet to enable submit.";
    }

    if (!tradePlan || tradePlan.orders.length === 0) {
      return "Preview the basket first to review limit orders before signing.";
    }

    if (tradableLegs.length === 0) {
      return "No basket legs are tradable on SoDEX for this narrative.";
    }

    const availableUsdc = usdcBalance?.available ?? usdcBalance?.total;
    if (typeof availableUsdc === "number" && basketNotionalUsd > availableUsdc) {
      return `Basket size ($${basketNotionalUsd.toLocaleString()}) exceeds your spot balance (${availableUsdc.toLocaleString()} USDC). Lower the basket size or add funds.`;
    }

    if (!onSodexChain) {
      return `Switch your wallet to ${sodexChain.name} before signing.`;
    }

    return undefined;
  }, [
    address,
    basketNotionalUsd,
    isConnected,
    loadingTrade,
    onSodexChain,
    sodexChain.name,
    tradePlan,
    tradableLegs.length,
    usdcBalance,
  ]);

  const refreshAccount = useCallback(async () => {
    if (!address) {
      return;
    }

    setLoadingAccount(true);

    try {
      const [balancesResponse, ordersResponse, stateResponse, apiKeysResponse] =
        await Promise.all([
          fetch(`/api/sodex/account/${address}/balances`),
          fetch(`/api/sodex/account/${address}/orders`),
          fetch(`/api/sodex/account/${address}/state`),
          fetch(`/api/sodex/account/${address}/api-keys`),
        ]);

      const balancesJson = balancesResponse.ok ? await balancesResponse.json() : { balances: [] };
      const ordersJson = ordersResponse.ok ? await ordersResponse.json() : { orders: [] };
      const stateJson = stateResponse.ok ? await stateResponse.json() : { state: undefined };
      const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };

      const apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []);

      setAccountSnapshot({
        balances: balancesJson.balances ?? [],
        orders: ordersJson.orders ?? [],
        accountId: stateJson.state?.accountId,
        apiKeyName,
      });
    } finally {
      setLoadingAccount(false);
    }
  }, [address]);

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

    setPollingFills(true);
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, attempt === 0 ? 800 : 2000);
        });
        await refreshAccount();
      }
    } finally {
      setPollingFills(false);
      try {
        const ordersResponse = await fetch(`/api/sodex/account/${address}/orders`);
        const ordersJson = ordersResponse.ok
          ? await ordersResponse.json()
          : { orders: [] };
        await appendJournal(result, ordersJson.orders ?? []);
      } catch {
        await appendJournal(result, []);
      }
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

      if (!accountId || !apiKeyName) {
        const [stateResponse, apiKeysResponse] = await Promise.all([
          fetch(`/api/sodex/account/${address}/state`),
          fetch(`/api/sodex/account/${address}/api-keys`),
        ]);

        const stateJson = stateResponse.ok ? await stateResponse.json() : {};
        const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };

        accountId = stateJson.state?.accountId;
        apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []);
      }

      if (!accountId) {
        setTradeResult({
          ok: false,
          message:
            "Could not resolve your SoDEX account ID. Open testnet SoDEX once with this wallet, then refresh.",
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
        setPreviewError("No tradable legs are ready. Check readiness below or adjust the basket.");
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
      const [stateResponse, apiKeysResponse] = await Promise.all([
        fetch(`/api/sodex/account/${address}/state`),
        fetch(`/api/sodex/account/${address}/api-keys`),
      ]);
      const stateJson = stateResponse.ok ? await stateResponse.json() : {};
      const apiKeysJson = apiKeysResponse.ok ? await apiKeysResponse.json() : { apiKeys: [] };
      accountId = stateJson.state?.accountId ?? accountId;
      apiKeyName = findWalletApiKeyName(address, apiKeysJson.apiKeys ?? []) ?? apiKeyName;

      if (!accountId || !apiKeyName) {
        setPreviewError("Missing SoDEX account or API key for cancel.");
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
      <div className="rounded-lg bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Trade on SoDEX</span>
            <SodexNetworkBadge network={executionReadiness.network} />
            <Badge variant="muted">Wallet sign</Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Preview limit orders, confirm in a dialog, then sign each leg on{" "}
            {executionReadiness.network === "mainnet" ? "ValueChain mainnet" : "ValueChain testnet"}.
            SoNarr never holds your keys.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>{executionReadiness.summary}</p>
            </div>
            {skippedReadinessLegs.length > 0 ? (
              <p className="mt-2 pl-6">
                Unmapped on SoDEX:{" "}
                {skippedReadinessLegs.map((leg) => leg.asset).join(", ")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isConnected && address ? (
              <>
                <Badge variant="outline">{`${address.slice(0, 6)}…${address.slice(-4)}`}</Badge>
                {usdcBalance ? (
                  <Badge variant="positive">
                    {usdcBalance.available ?? usdcBalance.total ?? 0} USDC
                  </Badge>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setActiveDialog("disconnect")}>
                  Disconnect
                </Button>
                <Button variant="ghost" size="sm" onClick={refreshAccount} disabled={loadingAccount}>
                  Refresh
                </Button>
                {!onSodexChain ? (
                  <Badge variant="outline">Switch to {sodexChain.name} to sign</Badge>
                ) : null}
              </>
            ) : (
              <Button
                size="sm"
                disabled={!connector || isConnecting}
                onClick={() => setActiveDialog("connect")}
              >
                {isConnecting ? "Connecting…" : "Connect wallet"}
              </Button>
            )}
          </div>

          {accountSnapshot?.balances.length ? (
            <div className="divide-y divide-border rounded-md bg-muted/40 text-sm">
              {accountSnapshot.balances.slice(0, 4).map((balance) => (
                <div key={balance.coin} className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">{balance.coin}</span>
                  <span className="tabular-nums font-medium">
                    {balance.available ?? balance.total ?? 0}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <BasketNotionalControl
            network={executionReadiness.network}
            value={basketNotionalUsd}
            onChange={handleNotionalChange}
            loading={loadingReadiness}
            availableUsdc={usdcBalance?.available ?? usdcBalance?.total}
          />

          {tradePlan ? (
            <BasketOrderPlanTable
              plan={tradePlan}
              totalNotionalUsd={basketNotionalUsd}
              weightedAssets={weightedAssets}
            />
          ) : null}

          {previewError ? (
            <div className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
              <p>{previewError}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={loadingTrade} onClick={runPreview}>
              {loadingTrade && !submittingMessage ? "Loading…" : "Preview orders"}
            </Button>
            <Button
              size="sm"
              disabled={Boolean(submitDisabledReason) || loadingTrade}
              onClick={() => void openSubmitDialog()}
            >
              Sign & submit
            </Button>
            {failedLegAssets.size > 0 ? (
              <Button
                variant="outline"
                size="sm"
                disabled={loadingTrade || Boolean(submitDisabledReason)}
                onClick={() => void runWalletSubmit({ failedOnly: true })}
              >
                Retry failed legs ({failedLegAssets.size})
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

          {submitDisabledReason ? (
            <p className="text-xs text-muted-foreground">{submitDisabledReason}</p>
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
        open={activeDialog === "connect"}
        onOpenChange={(open) => setActiveDialog(open ? "connect" : null)}
        title="Connect wallet for SoDEX?"
        description={`SoNarr will connect your wallet and target ${sodexChain.name} (chain ${chainId}). You will sign orders yourself; keys never leave your wallet.`}
        confirmLabel="Connect wallet"
        onConfirm={() => {
          if (connector) {
            connect({ connector, chainId });
          }
          setActiveDialog(null);
        }}
      />

      <ConfirmDialog
        open={activeDialog === "disconnect"}
        onOpenChange={(open) => setActiveDialog(open ? "disconnect" : null)}
        title="Disconnect wallet?"
        description="You can reconnect anytime. Open orders on SoDEX are not canceled by disconnecting."
        confirmLabel="Disconnect"
        confirmVariant="destructive"
        onConfirm={() => {
          disconnect();
          setActiveDialog(null);
        }}
      />

      <ConfirmDialog
        open={activeDialog === "notional"}
        onOpenChange={(open) => {
          if (!open) {
            setPendingNotional(null);
          }
          setActiveDialog(open ? "notional" : null);
        }}
        title="Change basket size?"
        description="Updating the basket size clears your current preview. You will need to preview again before submitting."
        confirmLabel="Update size"
        onConfirm={confirmNotionalChange}
      />

      <ConfirmDialog
        open={activeDialog === "submit"}
        onOpenChange={(open) => setActiveDialog(open ? "submit" : null)}
        title={
          executionReadiness.network === "mainnet"
            ? "Submit live limit buys on SoDEX mainnet?"
            : "Submit live limit buys to SoDEX?"
        }
        description={
          executionReadiness.network === "mainnet"
            ? `This places real GTC limit orders on SoDEX mainnet using ~$${basketNotionalUsd.toLocaleString()} USDC. You will approve ${tradePlan?.orders.length ?? 0} separate wallet signatures. Double-check legs and size before continuing.`
            : `This places real GTC limit orders on SoDEX testnet using ~$${basketNotionalUsd.toLocaleString()} vUSDC. You will approve ${tradePlan?.orders.length ?? 0} separate wallet signatures.`
        }
        confirmLabel={
          executionReadiness.network === "mainnet" ? "Sign mainnet orders" : "Sign & submit"
        }
        confirmVariant={executionReadiness.network === "mainnet" ? "destructive" : "default"}
        loading={loadingTrade}
        onConfirm={() => void runWalletSubmit()}
      >
        {tradePlan ? (
          <div className="space-y-3 text-xs">
            <div className="rounded-md border border-chart-4/30 bg-chart-4/10 px-3 py-2 text-muted-foreground">
              <p className="font-medium text-foreground">Before you sign</p>
              <ul className="mt-2 list-inside list-disc space-y-1 leading-5">
                <li>Stay on {sodexChain.name} for every signature popup.</li>
                <li>
                  Testnet markets may enter cancel-only mode during maintenance — failed legs can be
                  retried later.
                </li>
                <li>Limit prices use each market&apos;s last trade, not the orderbook ask.</li>
              </ul>
            </div>
            <BasketOrderPlanTable
              plan={tradePlan}
              totalNotionalUsd={basketNotionalUsd}
              weightedAssets={weightedAssets}
            />
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={activeDialog === "cancel"}
        onOpenChange={(open) => setActiveDialog(open ? "cancel" : null)}
        title="Cancel open SoDEX orders?"
        description={`This signs a batch cancel for ${cancelableOrders.length} open order(s) on ${executionReadiness.network}. Filled size is kept; only residual open quantity is canceled.`}
        confirmLabel="Sign cancels"
        confirmVariant="destructive"
        loading={loadingTrade}
        onConfirm={() => void runCancelOpenOrders()}
      />
    </>
  );
}
