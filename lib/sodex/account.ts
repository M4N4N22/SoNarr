import { asNumber, asString, isRecord, requestSodexGet } from "./client";
import type { SodexNetwork } from "./network-preference";
import { getDefaultSodexNetwork } from "./network-preference";

export type SodexBalance = {
  available?: number;
  coin: string;
  total?: number;
};

export type SodexOpenOrder = {
  clOrdId?: string;
  orderId?: number;
  price?: number;
  quantity?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  side?: string;
  status?: string;
  symbol?: string;
  symbolId?: number;
};

export type SodexAccountState = {
  accountId: number;
  user: string;
  userId: number;
};

export type SodexApiKey = {
  expiresAt?: number;
  name: string;
  publicKey: string;
  type?: string;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizeWalletAddress(address: string) {
  const trimmed = address.trim();
  // SoDEX account lookups are case-sensitive on some gateways; prefer lowercase.
  return trimmed.toLowerCase();
}

function parseBalance(value: unknown): SodexBalance | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const coin = asString(value.coin) ?? asString(value.asset) ?? asString(value.symbol);

  if (!coin) {
    return undefined;
  }

  return {
    coin,
    available: asNumber(value.available) ?? asNumber(value.free),
    total: asNumber(value.total) ?? asNumber(value.balance),
  };
}

function parseOrder(value: unknown): SodexOpenOrder | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const symbol = asString(value.symbol) ?? asString(value.symbolName);

  return {
    symbol,
    clOrdId: asString(value.clOrdID) ?? asString(value.clOrdId),
    orderId: asNumber(value.orderID) ?? asNumber(value.orderId) ?? asNumber(value.id),
    symbolId: asNumber(value.symbolID) ?? asNumber(value.symbolId),
    side: asString(value.side),
    status: asString(value.status),
    price: asNumber(value.price),
    quantity: asNumber(value.quantity) ?? asNumber(value.qty),
    filledQuantity:
      asNumber(value.filledQuantity) ??
      asNumber(value.filledQty) ??
      asNumber(value.cumQty) ??
      asNumber(value.executedQty),
    remainingQuantity:
      asNumber(value.remainingQuantity) ??
      asNumber(value.leavesQty) ??
      asNumber(value.remainingQty),
  };
}

export async function getAccountBalances(
  address: string,
  network: SodexNetwork = getDefaultSodexNetwork(),
) {
  const normalized = normalizeWalletAddress(address);

  return requestSodexGet(
    `/accounts/${encodeURIComponent(normalized)}/balances`,
    `SoDEX Balances: ${normalized.slice(0, 8)}…`,
    (payload) => {
      if (!isRecord(payload) || !Array.isArray(payload.balances)) {
        return [];
      }

      return payload.balances
        .map(parseBalance)
        .filter((balance): balance is SodexBalance => Boolean(balance));
    },
    0,
    network,
    { cache: "no-store" },
  );
}

export async function getAccountOrders(
  address: string,
  network: SodexNetwork = getDefaultSodexNetwork(),
) {
  const normalized = normalizeWalletAddress(address);

  return requestSodexGet(
    `/accounts/${encodeURIComponent(normalized)}/orders`,
    `SoDEX Orders: ${normalized.slice(0, 8)}…`,
    (payload) => {
      if (!isRecord(payload) || !Array.isArray(payload.orders)) {
        return [];
      }

      return payload.orders
        .map(parseOrder)
        .filter((order): order is SodexOpenOrder => Boolean(order));
    },
    0,
    network,
    { cache: "no-store" },
  );
}

/**
 * Parses WsSpotState. Unregistered wallets return aid=0 / zero user — treat as not found.
 */
function parseAccountState(payload: unknown): SodexAccountState | null | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const accountId =
    asNumber(payload.aid) ?? asNumber(payload.accountID) ?? asNumber(payload.accountId);
  const userId = asNumber(payload.uid) ?? asNumber(payload.userID) ?? asNumber(payload.userId);
  const user = asString(payload.user);

  // Gateway returns a zeroed placeholder when the wallet has never onboarded on this network.
  if (
    accountId === 0 ||
    userId === 0 ||
    !user ||
    user.toLowerCase() === ZERO_ADDRESS
  ) {
    return null;
  }

  if (accountId === undefined || userId === undefined) {
    return undefined;
  }

  return { accountId, userId, user };
}

function parseApiKey(value: unknown): SodexApiKey | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const name = asString(value.name);
  const publicKey = asString(value.publicKey);

  if (!name || !publicKey) {
    return undefined;
  }

  return {
    name,
    publicKey,
    type: asString(value.type),
    expiresAt: asNumber(value.expiresAt),
  };
}

export async function getAccountState(
  address: string,
  network: SodexNetwork = getDefaultSodexNetwork(),
) {
  const normalized = normalizeWalletAddress(address);

  return requestSodexGet(
    `/accounts/${encodeURIComponent(normalized)}/state`,
    `SoDEX State: ${normalized.slice(0, 8)}…`,
    (payload) => {
      const parsed = parseAccountState(payload);
      // null = not onboarded (valid response); undefined = bad shape
      if (parsed === null) {
        return null;
      }
      return parsed;
    },
    0,
    network,
    { cache: "no-store" },
  );
}

export async function getAccountApiKeys(
  address: string,
  network: SodexNetwork = getDefaultSodexNetwork(),
) {
  const normalized = normalizeWalletAddress(address);

  return requestSodexGet(
    `/accounts/${encodeURIComponent(normalized)}/api-keys`,
    `SoDEX API Keys: ${normalized.slice(0, 8)}…`,
    (payload) => {
      if (!Array.isArray(payload)) {
        return [];
      }

      return payload
        .map(parseApiKey)
        .filter((key): key is SodexApiKey => Boolean(key));
    },
    0,
    network,
    { cache: "no-store" },
  );
}

export function sodexOnboardingUrl(network: SodexNetwork) {
  return network === "mainnet" ? "https://sodex.com" : "https://testnet.sodex.com/faucet";
}
