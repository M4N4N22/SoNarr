"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SODEX_CHAIN_IDS } from "@/lib/sodex/config";
import type { SodexNetwork } from "@/lib/sodex";
import {
  SODEx_NETWORK_CHANGE_EVENT,
  SODEx_NETWORK_STORAGE_KEY,
} from "@/lib/sodex/network-preference";

type SodexNetworkSwitchProps = {
  network: SodexNetwork;
  onNetworkChange: (network: SodexNetwork) => void;
  locked?: boolean;
  compact?: boolean;
};

/** Compact preference control when header wallet switch is not mounted (rare). Prefer header. */
export function SodexNetworkSwitch({
  network,
  onNetworkChange,
  locked = false,
}: SodexNetworkSwitchProps) {
  const [confirmMainnet, setConfirmMainnet] = useState(false);
  const [pending, setPending] = useState(false);

  const applyNetwork = useCallback(
    async (next: SodexNetwork) => {
      setPending(true);
      try {
        const response = await fetch("/api/sodex/network", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ network: next }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not switch network.");
        }
        try {
          window.localStorage.setItem(SODEx_NETWORK_STORAGE_KEY, next);
        } catch {
          // ignore
        }
        window.dispatchEvent(
          new CustomEvent(SODEx_NETWORK_CHANGE_EVENT, { detail: { network: next } }),
        );
        onNetworkChange(payload.network as SodexNetwork);
      } finally {
        setPending(false);
        setConfirmMainnet(false);
      }
    },
    [onNetworkChange],
  );

  function requestSwitch(next: SodexNetwork) {
    if (next === network || locked || pending) {
      return;
    }
    if (next === "mainnet") {
      setConfirmMainnet(true);
      return;
    }
    void applyNetwork(next);
  }

  return (
    <>
      <div
        className="flex overflow-hidden rounded-md border border-border"
        role="group"
        aria-label="SoDEX network"
      >
        <Button
          type="button"
          size="sm"
          variant={network === "testnet" ? "default" : "ghost"}
          className="rounded-none"
          disabled={locked || pending}
          onClick={() => requestSwitch("testnet")}
        >
          Testnet
        </Button>
        <Button
          type="button"
          size="sm"
          variant={network === "mainnet" ? "default" : "ghost"}
          className="rounded-none"
          disabled={locked || pending}
          onClick={() => requestSwitch("mainnet")}
        >
          Mainnet
        </Button>
      </div>
      {locked ? (
        <span className="ml-2 text-[11px] text-muted-foreground">Locked by deploy config</span>
      ) : null}

      <ConfirmDialog
        open={confirmMainnet}
        onOpenChange={setConfirmMainnet}
        title="Switch to SoDEX mainnet?"
        description="Mainnet uses real USDC and real fills on ValueChain. Review basket legs against live symbols, size against your spot balance, and confirm every wallet signature. Demo/public deploys should stay on testnet."
        confirmLabel="Use mainnet"
        confirmVariant="destructive"
        loading={pending}
        onConfirm={() => void applyNetwork("mainnet")}
      />
    </>
  );
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

export function usePersistedSodexNetwork(initial: SodexNetwork) {
  const [network, setNetwork] = useState<SodexNetwork>(initial);
  const [locked, setLocked] = useState(false);
  const { isConnected } = useAccount();
  const chainId = useChainId();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/sodex/network");
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (cancelled) {
          return;
        }
        if (payload.network === "testnet" || payload.network === "mainnet") {
          setNetwork(payload.network);
        }
        setLocked(payload.locked === true);
      } catch {
        try {
          const stored = window.localStorage.getItem(SODEx_NETWORK_STORAGE_KEY);
          if (stored === "testnet" || stored === "mainnet") {
            setNetwork(stored);
          }
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Follow wallet ValueChain when connected (header is source of truth).
  useEffect(() => {
    if (!isConnected) {
      return;
    }
    const fromWallet = networkFromChainId(chainId);
    if (fromWallet) {
      setNetwork(fromWallet);
    }
  }, [chainId, isConnected]);

  useEffect(() => {
    function onCustom(event: Event) {
      const detail = (event as CustomEvent<{ network?: SodexNetwork }>).detail;
      if (detail?.network === "testnet" || detail?.network === "mainnet") {
        setNetwork(detail.network);
      }
    }
    function onStorage(event: StorageEvent) {
      if (event.key !== SODEx_NETWORK_STORAGE_KEY) {
        return;
      }
      if (event.newValue === "testnet" || event.newValue === "mainnet") {
        setNetwork(event.newValue);
      }
    }
    window.addEventListener(SODEx_NETWORK_CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SODEx_NETWORK_CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { network, setNetwork, locked };
}
