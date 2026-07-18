import { asNumber, asString, isRecord, requestSodexGet } from "./client";

export type SodexBalance = {
  available?: number;
  coin: string;
  total?: number;
};

export type SodexOpenOrder = {
  clOrdId?: string;
  price?: number;
  quantity?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  side?: string;
  status?: string;
  symbol?: string;
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

export async function getAccountBalances(address: string) {
  const normalized = address.trim();

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
    10,
  );
}

export async function getAccountOrders(address: string) {
  const normalized = address.trim();

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
    10,
  );
}

function parseAccountState(payload: unknown): SodexAccountState | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const accountId = asNumber(payload.aid);
  const userId = asNumber(payload.uid);
  const user = asString(payload.user);

  if (accountId === undefined || userId === undefined || !user) {
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

export async function getAccountState(address: string) {
  const normalized = address.trim();

  return requestSodexGet(
    `/accounts/${encodeURIComponent(normalized)}/state`,
    `SoDEX State: ${normalized.slice(0, 8)}…`,
    (payload) => parseAccountState(payload),
    10,
  );
}

export async function getAccountApiKeys(address: string) {
  const normalized = address.trim();

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
    30,
  );
}
