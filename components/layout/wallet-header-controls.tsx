"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
  useChainId,
  useConfig,
  useConnect,
  useDisconnect,
} from "wagmi";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SODEX_CHAIN_IDS } from "@/lib/sodex/config";
import type { SodexNetwork } from "@/lib/sodex/network-preference";
import {
  SODEx_NETWORK_CHANGE_EVENT,
  SODEx_NETWORK_STORAGE_KEY,
} from "@/lib/sodex/network-preference";
import { ensureSodexChain } from "@/lib/wagmi/ensure-sodex-chain";
import { sodexMainnet, sodexTestnet } from "@/lib/wagmi/sodex-chains";
import { cn } from "@/lib/utils";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function networkFromChainId(chainId: number): SodexNetwork | undefined {
  if (chainId === SODEX_CHAIN_IDS.testnet) {
    return "testnet";
  }
  if (chainId === SODEX_CHAIN_IDS.mainnet) {
    return "mainnet";
  }
  return undefined;
}

function readStoredNetwork(): SodexNetwork {
  try {
    const stored = window.localStorage.getItem(SODEx_NETWORK_STORAGE_KEY);
    if (stored === "mainnet" || stored === "testnet") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "testnet";
}

async function syncAppNetwork(network: SodexNetwork) {
  try {
    await fetch("/api/sodex/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network }),
    });
  } catch {
    // Preference sync is best-effort.
  }

  try {
    window.localStorage.setItem(SODEx_NETWORK_STORAGE_KEY, network);
  } catch {
    // ignore
  }

  window.dispatchEvent(
    new CustomEvent(SODEx_NETWORK_CHANGE_EVENT, { detail: { network } }),
  );
}

export function WalletHeaderControls({ className }: { className?: string }) {
  const config = useConfig();
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect, isPending: isDisconnectPending } = useDisconnect();

  const [preferredNetwork, setPreferredNetwork] = useState<SodexNetwork>("testnet");
  const [confirmMainnet, setConfirmMainnet] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const lastSyncedNetwork = useRef<SodexNetwork | null>(null);

  const connector = connectors[0];
  const walletNetwork = networkFromChainId(chainId);
  const onSodexChain = Boolean(walletNetwork);
  /** Active selection: wallet chain when on ValueChain, else preferred / stored. */
  const activeNetwork = walletNetwork ?? preferredNetwork;
  const busy = isConnecting || isConnectPending || isDisconnectPending || switching;

  useEffect(() => {
    setPreferredNetwork(readStoredNetwork());
  }, []);

  // Keep SoDEX API preference aligned when the wallet is on ValueChain.
  useEffect(() => {
    if (!isConnected || !walletNetwork) {
      return;
    }
    setPreferredNetwork(walletNetwork);
    if (lastSyncedNetwork.current === walletNetwork) {
      return;
    }
    lastSyncedNetwork.current = walletNetwork;
    void syncAppNetwork(walletNetwork);
  }, [isConnected, walletNetwork]);

  const switchToNetwork = useCallback(
    async (network: SodexNetwork) => {
      setLocalError(null);
      setPreferredNetwork(network);

      if (!isConnected || !address) {
        lastSyncedNetwork.current = network;
        await syncAppNetwork(network);
        setConfirmMainnet(false);
        return;
      }

      setSwitching(true);
      const targetId = network === "mainnet" ? SODEX_CHAIN_IDS.mainnet : SODEX_CHAIN_IDS.testnet;

      try {
        await ensureSodexChain(config, {
          chainId: targetId,
          account: address as Address,
        });
        lastSyncedNetwork.current = network;
        await syncAppNetwork(network);
        setConfirmMainnet(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not switch network.";
        if (
          message.toLowerCase().includes("user rejected") ||
          message.toLowerCase().includes("user denied")
        ) {
          setLocalError("Network switch cancelled in wallet.");
        } else {
          setLocalError(message);
        }
        setConfirmMainnet(false);
      } finally {
        setSwitching(false);
      }
    },
    [address, config, isConnected],
  );

  function requestNetwork(network: SodexNetwork) {
    if (busy || activeNetwork === network) {
      // Still allow recovery when wallet is on the wrong chain but preference matches.
      if (!(isConnected && !onSodexChain && preferredNetwork === network)) {
        return;
      }
    }
    if (network === "mainnet") {
      setConfirmMainnet(true);
      return;
    }
    void switchToNetwork("testnet");
  }

  function handleConnect() {
    setLocalError(null);
    if (!connector) {
      setLocalError("No injected wallet found. Install MetaMask or another browser wallet.");
      return;
    }
    const target = preferredNetwork === "mainnet" ? sodexMainnet : sodexTestnet;
    connect(
      { connector, chainId: target.id },
      {
        onSuccess: () => {
          lastSyncedNetwork.current = preferredNetwork;
          void syncAppNetwork(preferredNetwork);
        },
        onError: (error) => {
          setLocalError(error.message);
        },
      },
    );
  }

  return (
    <>
      <div
        className={cn(
          "ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2",
          className,
        )}
      >
        <div
          className="flex overflow-hidden rounded-md border border-border"
          role="group"
          aria-label="SoDEX network"
        >
          <Button
            type="button"
            size="sm"
            variant={activeNetwork === "testnet" ? "default" : "ghost"}
            disabled={busy}
            onClick={() => requestNetwork("testnet")}
            className="h-8 rounded-none px-2.5 text-xs sm:px-3"
          >
            {switching && preferredNetwork === "testnet" ? "Switching…" : "Testnet"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeNetwork === "mainnet" ? "default" : "ghost"}
            disabled={busy}
            onClick={() => requestNetwork("mainnet")}
            className="h-8 rounded-none px-2.5 text-xs sm:px-3"
          >
            {switching && preferredNetwork === "mainnet" ? "Switching…" : "Mainnet"}
          </Button>
        </div>

        {isConnected && !onSodexChain ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => requestNetwork(preferredNetwork)}
            className="h-8"
          >
            Switch to ValueChain
          </Button>
        ) : null}

        {isConnected && address ? (
          <>
            <span
              className="hidden max-w-[9.5rem] truncate font-mono text-xs text-muted-foreground sm:inline"
              title={address}
            >
              {shortenAddress(address)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => disconnect()}
              className="h-8"
            >
              Disconnect
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy || !connector}
            onClick={handleConnect}
            className="h-8"
          >
            {isConnecting || isConnectPending ? "Connecting…" : "Connect"}
          </Button>
        )}
      </div>

      {localError ? (
        <p
          className="absolute right-4 top-full z-50 mt-1 max-w-xs rounded-md border border-negative/30 bg-card px-2 py-1 text-[11px] text-negative shadow-sm sm:right-6 lg:right-8"
          role="status"
        >
          {localError}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmMainnet}
        onOpenChange={setConfirmMainnet}
        title="Switch to ValueChain mainnet?"
        description={
          isConnected
            ? "Your wallet will switch to SoDEX mainnet (real USDC). Public demos should stay on testnet."
            : "Mainnet uses real USDC. Connect will target ValueChain mainnet. Public demos should stay on testnet."
        }
        confirmLabel={isConnected ? "Switch to mainnet" : "Use mainnet"}
        confirmVariant="destructive"
        loading={switching}
        onConfirm={() => void switchToNetwork("mainnet")}
      />
    </>
  );
}
