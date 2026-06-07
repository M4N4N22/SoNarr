import { hashTypedData, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSodexChainId, getSodexNetwork } from "./config";

const EXCHANGE_ACTION_TYPES = {
  ExchangeAction: [
    { name: "payloadHash", type: "bytes32" },
    { name: "nonce", type: "uint64" },
  ],
} as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const SODEX_ORDER_SIDE = {
  BUY: 1,
  SELL: 2,
} as const;

export const SODEX_ORDER_TYPE = {
  LIMIT: 1,
  MARKET: 2,
} as const;

export const SODEX_TIME_IN_FORCE = {
  GTC: 1,
  FOK: 2,
  IOC: 3,
  GTX: 4,
} as const;

export type BatchNewOrderItem = {
  clOrdID: string;
  price?: string;
  quantity?: string;
  side: number;
  symbolID: number;
  timeInForce: number;
  type: number;
};

export type BatchNewOrderRequest = {
  accountID: number;
  orders: BatchNewOrderItem[];
};

function serializeOrderItem(item: BatchNewOrderItem) {
  const parts = [
    `"symbolID":${item.symbolID}`,
    `"clOrdID":${JSON.stringify(item.clOrdID)}`,
    `"side":${item.side}`,
    `"type":${item.type}`,
    `"timeInForce":${item.timeInForce}`,
  ];

  if (item.price !== undefined) {
    parts.push(`"price":${JSON.stringify(item.price)}`);
  }

  if (item.quantity !== undefined) {
    parts.push(`"quantity":${JSON.stringify(item.quantity)}`);
  }

  return `{${parts.join(",")}}`;
}

function serializeBatchNewOrderRequest(request: BatchNewOrderRequest) {
  const orders = request.orders.map(serializeOrderItem).join(",");
  return `{"accountID":${request.accountID},"orders":[${orders}]}`;
}

function serializeActionPayload(type: string, paramsJson: string) {
  return `{"type":${JSON.stringify(type)},"params":${paramsJson}}`;
}

function hashPayload(payloadJson: string) {
  return keccak256(toBytes(payloadJson));
}

export function getBatchNewOrderPayloadHash(request: BatchNewOrderRequest): Hex {
  const paramsJson = serializeBatchNewOrderRequest(request);
  const payloadJson = serializeActionPayload("batchNewOrder", paramsJson);
  return hashPayload(payloadJson);
}

export function getSodexExchangeTypedData(
  payloadHash: Hex,
  nonce: bigint,
  chainId: number,
) {
  return {
    domain: {
      name: "spot" as const,
      version: "1" as const,
      chainId,
      verifyingContract: ZERO_ADDRESS,
    },
    types: EXCHANGE_ACTION_TYPES,
    primaryType: "ExchangeAction" as const,
    message: {
      payloadHash,
      nonce,
    },
  };
}

export function buildBatchNewOrderBody(request: BatchNewOrderRequest) {
  return serializeBatchNewOrderRequest(request);
}

export function getBatchNewOrderDigest(
  request: BatchNewOrderRequest,
  nonce: bigint,
  chainId: number,
): Hex {
  const payloadHash = getBatchNewOrderPayloadHash(request);
  return hashTypedData(getSodexExchangeTypedData(payloadHash, nonce, chainId));
}

export function formatSodexSignature(signature: Hex): Hex {
  return (`0x01${signature.slice(2)}`) as Hex;
}

export async function signBatchNewOrderRequest(
  request: BatchNewOrderRequest,
  nonce: bigint,
  privateKeyHex: Hex,
) {
  const chainId = getSodexChainId(getSodexNetwork());
  const payloadHash = getBatchNewOrderPayloadHash(request);
  const digest = hashTypedData(getSodexExchangeTypedData(payloadHash, nonce, chainId));
  const account = privateKeyToAccount(privateKeyHex);
  const signature = await account.sign({ hash: digest });

  return formatSodexSignature(signature);
}
