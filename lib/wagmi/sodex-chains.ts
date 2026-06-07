import { defineChain } from "viem";

import { SODEX_CHAIN_IDS } from "@/lib/sodex/config";

/** SoDEX / ValueChain testnet — EIP-712 domain chain for spot signing. */
export const sodexTestnet = defineChain({
  id: SODEX_CHAIN_IDS.testnet,
  name: "ValueChain Testnet",
  nativeCurrency: {
    name: "SOSO",
    symbol: "SOSO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.valuechain.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Testnet Explorer",
      url: "https://testnet-scan.valuechain.xyz",
    },
  },
});

/** SoDEX / ValueChain mainnet — EIP-712 domain chain for spot signing. */
export const sodexMainnet = defineChain({
  id: SODEX_CHAIN_IDS.mainnet,
  name: "ValueChain",
  nativeCurrency: {
    name: "SOSO",
    symbol: "SOSO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.valuechain.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "ValueChain Explorer",
      url: "https://main-scan.valuechain.xyz",
    },
  },
});

export function getSodexChain(chainId: number) {
  if (chainId === SODEX_CHAIN_IDS.testnet) {
    return sodexTestnet;
  }

  if (chainId === SODEX_CHAIN_IDS.mainnet) {
    return sodexMainnet;
  }

  throw new Error(`Unsupported SoDEX chain ID: ${chainId}`);
}
