import { Badge } from "@/components/ui/badge";
import type { SodexNetwork } from "@/lib/sodex/config";

export function SodexNetworkBadge({
  network,
  className,
}: {
  network: SodexNetwork;
  className?: string;
}) {
  return (
    <Badge variant="muted" className={className}>
      {network === "mainnet" ? "MAINNET" : "TESTNET"}
    </Badge>
  );
}
