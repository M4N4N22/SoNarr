"use client";

import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SodexNetwork } from "@/lib/sodex";
import { SODEx_NETWORK_STORAGE_KEY } from "@/lib/sodex/network-preference";

type SodexNetworkSwitchProps = {
  network: SodexNetwork;
  onNetworkChange: (network: SodexNetwork) => void;
  locked?: boolean;
  compact?: boolean;
};

export function SodexNetworkSwitch({
  network,
  onNetworkChange,
  locked = false,
  compact = false,
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
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : ""}`}>
        <Badge variant={network === "mainnet" ? "muted" : "outline"}>
          {network === "mainnet" ? "MAINNET" : "TESTNET"}
        </Badge>
        {!locked ? (
          <div className="flex overflow-hidden rounded-md border border-border">
            <Button
              type="button"
              size="sm"
              variant={network === "testnet" ? "default" : "ghost"}
              className="rounded-none"
              disabled={pending}
              onClick={() => requestSwitch("testnet")}
            >
              Testnet
            </Button>
            <Button
              type="button"
              size="sm"
              variant={network === "mainnet" ? "default" : "ghost"}
              className="rounded-none"
              disabled={pending}
              onClick={() => requestSwitch("mainnet")}
            >
              Mainnet
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Locked by deploy config</span>
        )}
      </div>

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

export function usePersistedSodexNetwork(initial: SodexNetwork) {
  const [network, setNetwork] = useState<SodexNetwork>(initial);
  const [locked, setLocked] = useState(false);

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

  return { network, setNetwork, locked };
}
