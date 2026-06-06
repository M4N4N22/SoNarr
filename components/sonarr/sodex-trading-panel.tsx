"use client";

import { getWalletClient } from "wagmi/actions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useConfig, useConnect, useDisconnect } from "wagmi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BasketNotionalControl } from "@/components/sonarr/basket-notional-control";
import { BasketOrderPlanTable } from "@/components/sonarr/basket-order-plan-table";
import { SodexNetworkBadge } from "@/components/sonarr/sodex-network-badge";
import {
  findWalletApiKeyName,
  formatSodexSignature,
  getBatchNewOrderDigest,
  planToBatchNewOrderRequest,
  SODEX_CHAIN_IDS,
  type BasketExecutionReadiness,
  type BasketTradePlan,
  type BasketTradeResult,
} from "@/lib/sodex";

type WeightedAsset = { asset: string; weight: number };

type SodexTradingPanelProps = {
  executionReadiness: BasketExecutionReadiness;
  weightedAssets: WeightedAsset[];
  narrativeTitle: string;
  basketNotionalUsd: number;
  onBasketNotionalChange: (value: number) => void;
  loadingReadiness?: boolean;
};

type AccountSnapshot = {
  accountId?: number;
  apiKeyName?: string;
  balances: Array<{ coin: string; available?: number; total?: number }>;
  orders: Array<{ symbol?: string; side?: string; price?: number; quantity?: number }>;
};

async function prepareTradePlan(
  weightedAssets: WeightedAsset[],
  totalNotionalUsd: number,
) {
  const response = await fetch("/api/sodex/trade/basket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assets: weightedAssets,
      totalNotionalUsd,
      dryRun: true,
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

export function SodexTradingPanel({
  executionReadiness,
  weightedAssets,
  basketNotionalUsd,
  onBasketNotionalChange,
  loadingReadiness = false,
}: SodexTradingPanelProps) {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot | null>(null);
  const [tradePlan, setTradePlan] = useState<BasketTradePlan | null>(null);
  const [tradeResult, setTradeResult] = useState<BasketTradeResult | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const connector = connectors[0];
  const tradableLegs = executionReadiness.legs.filter((leg) => leg.tradable);
  const chainId = SODEX_CHAIN_IDS[executionReadiness.network];

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

    if (!confirmed) {
      return "Check the confirmation box above to enable submit.";
    }

    if (tradableLegs.length === 0) {
      return "No basket legs are tradable on SoDEX for this narrative.";
    }

    const availableUsdc = usdcBalance?.available ?? usdcBalance?.total;
    if (typeof availableUsdc === "number" && basketNotionalUsd > availableUsdc) {
      return `Basket size ($${basketNotionalUsd.toLocaleString()}) exceeds your spot balance (${availableUsdc.toLocaleString()} USDC). Lower the basket size or add funds.`;
    }

    return undefined;
  }, [
    address,
    basketNotionalUsd,
    confirmed,
    isConnected,
    loadingTrade,
    tradableLegs.length,
    usdcBalance,
  ]);

  useEffect(() => {
    setTradePlan(null);
    setTradeResult(null);
  }, [basketNotionalUsd]);

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

  async function runPreview() {
    setLoadingTrade(true);
    setTradeResult(null);

    try {
      const prepared = await prepareTradePlan(weightedAssets, basketNotionalUsd);
      setTradePlan(prepared.plan);
      setTradeResult(prepared.result);
    } catch (error) {
      setTradeResult({
        ok: false,
        message: error instanceof Error ? error.message : "Preview failed.",
      });
    } finally {
      setLoadingTrade(false);
    }
  }

  async function runWalletSubmit() {
    if (!address) {
      setTradeResult({
        ok: false,
        message: "Connect a wallet before submitting orders to SoDEX.",
      });
      return;
    }

    setLoadingTrade(true);
    setTradeResult(null);

    try {
      const walletClient = await getWalletClient(config, { account: address });

      if (!walletClient) {
        setTradeResult({
          ok: false,
          message:
            "Could not access your wallet for signing. Disconnect and reconnect, then try again.",
        });
        return;
      }

      const prepared = await prepareTradePlan(weightedAssets, basketNotionalUsd);
      setTradePlan(prepared.plan);

      if (prepared.plan.orders.length === 0) {
        setTradeResult({
          ok: false,
          message: "No tradable basket legs are ready for SoDEX submission.",
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

      const batchRequest = planToBatchNewOrderRequest(prepared.plan, accountId);
      const nonce = BigInt(Date.now());
      const digest = getBatchNewOrderDigest(batchRequest, nonce, chainId);
      const walletSignature = await walletClient.signMessage({
        account: address,
        message: { raw: digest },
      });
      const signature = formatSodexSignature(walletSignature);

      const response = await fetch("/api/sodex/trade/basket/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: prepared.plan,
          accountId,
          apiKeyName,
          nonce: nonce.toString(),
          signature,
        }),
      });

      const payload = await response.json();
      setTradeResult(
        payload.result ?? {
          ok: false,
          message: payload.error ?? "SoDEX submission failed.",
        },
      );

      if (payload.result?.ok) {
        await refreshAccount();
      }
    } catch (error) {
      setTradeResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Wallet signing or SoDEX submission failed.",
      });
    } finally {
      setLoadingTrade(false);
    }
  }

  return (
    <div className="rounded-lg bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Trade on SoDEX</span>
          <SodexNetworkBadge network={executionReadiness.network} />
          <Badge variant="muted">Wallet sign</Badge>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Connect wallet → set basket size in vUSDC → preview limit legs → confirm → sign & submit. Orders
          stay in your wallet; SoNarr never holds keys.
        </p>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {isConnected && address ? (
            <>
              <Badge variant="outline">{`${address.slice(0, 6)}…${address.slice(-4)}`}</Badge>
              {usdcBalance ? (
                <Badge variant="positive">
                  {usdcBalance.available ?? usdcBalance.total ?? 0} USDC
                </Badge>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => disconnect()}>
                Disconnect
              </Button>
              <Button variant="ghost" size="sm" onClick={refreshAccount} disabled={loadingAccount}>
                Refresh
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={!connector || isConnecting}
              onClick={() => connector && connect({ connector })}
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
                <span className="tabular-nums font-medium">{balance.available ?? balance.total ?? 0}</span>
              </div>
            ))}
          </div>
        ) : null}

        <BasketNotionalControl
          network={executionReadiness.network}
          value={basketNotionalUsd}
          onChange={onBasketNotionalChange}
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

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Confirm live limit orders on SoDEX
        </label>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={loadingTrade} onClick={runPreview}>
            Preview
          </Button>
          <Button size="sm" disabled={Boolean(submitDisabledReason)} onClick={runWalletSubmit}>
            {loadingTrade ? "Submitting…" : "Sign & submit"}
          </Button>
        </div>

        {submitDisabledReason ? (
          <p className="text-xs text-muted-foreground">{submitDisabledReason}</p>
        ) : null}

        {tradeResult ? (
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              tradeResult.ok ? "bg-positive/10 text-foreground" : "bg-negative/10 text-foreground"
            }`}
          >
            {tradeResult.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
