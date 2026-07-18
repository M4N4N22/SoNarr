export type SodexNetwork = "testnet" | "mainnet";

export const SODEx_NETWORK_COOKIE = "sonarr_sodex_network";
export const SODEx_NETWORK_STORAGE_KEY = "sonarr_sodex_network";
/** Same-tab broadcast when header (or preference API) changes network. */
export const SODEx_NETWORK_CHANGE_EVENT = "sonarr:sodex-network";

export function parseSodexNetwork(value: string | null | undefined): SodexNetwork | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "mainnet" || normalized === "testnet") {
    return normalized;
  }
  return undefined;
}

/** Env / gateway default — not operator cookie override. */
export function getDefaultSodexNetwork(): SodexNetwork {
  const configured = process.env.SODEX_NETWORK?.trim().toLowerCase();

  if (configured === "mainnet") {
    return "mainnet";
  }

  if (configured === "testnet") {
    return "testnet";
  }

  if (process.env.SODEX_API_BASE_URL?.includes("mainnet")) {
    return "mainnet";
  }

  return "testnet";
}

/**
 * Resolve operator network. Optional override wins (query/body/cookie).
 * Deployments may set SODEX_NETWORK_LOCK=mainnet|testnet to disable switching.
 */
export function resolveSodexNetwork(override?: string | null): SodexNetwork {
  const lock = parseSodexNetwork(process.env.SODEX_NETWORK_LOCK);
  if (lock) {
    return lock;
  }

  return parseSodexNetwork(override) ?? getDefaultSodexNetwork();
}

export function isSodexNetworkLocked() {
  return Boolean(parseSodexNetwork(process.env.SODEX_NETWORK_LOCK));
}

export function sodexNetworkCookieOptions(network: SodexNetwork) {
  return {
    name: SODEx_NETWORK_COOKIE,
    value: network,
    path: "/",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 180,
    httpOnly: false,
  };
}
