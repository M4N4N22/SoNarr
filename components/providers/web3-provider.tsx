"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { sodexMainnet, sodexTestnet } from "@/lib/wagmi/sodex-chains";

const wagmiConfig = createConfig({
  chains: [sodexTestnet, sodexMainnet],
  connectors: [injected()],
  transports: {
    [sodexTestnet.id]: http(sodexTestnet.rpcUrls.default.http[0]),
    [sodexMainnet.id]: http(sodexMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});

export { wagmiConfig };

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
