import { getWalletClient, switchChain } from "wagmi/actions";
import type { Config } from "wagmi";
import type { Address } from "viem";

import { getSodexChain } from "./sodex-chains";

function isUserRejected(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const record = error as { code?: number; message?: string };
  return (
    record.code === 4001 ||
    record.message?.toLowerCase().includes("user rejected") === true ||
    record.message?.toLowerCase().includes("user denied") === true
  );
}

/**
 * Ensures the wallet is on the SoDEX ValueChain used for EIP-712 order signing.
 * Adds the network if missing, then switches.
 */
export async function ensureSodexChain(
  config: Config,
  {
    chainId,
    account,
  }: {
    chainId: number;
    account: Address;
  },
) {
  const chain = getSodexChain(chainId);

  try {
    await switchChain(config, { chainId: chain.id });
    return;
  } catch (error) {
    if (isUserRejected(error)) {
      throw error;
    }
  }

  const walletClient = await getWalletClient(config, { account });

  if (!walletClient) {
    throw new Error("Could not access your wallet to switch to ValueChain.");
  }

  try {
    await walletClient.addChain({ chain });
  } catch (error) {
    if (isUserRejected(error)) {
      throw error;
    }
  }

  await switchChain(config, { chainId: chain.id });
}
