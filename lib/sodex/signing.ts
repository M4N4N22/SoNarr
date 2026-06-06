import { concat, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { getSodexChainId, getSodexNetwork } from "./config";

const EXCHANGE_ACTION_TYPE_HASH = keccak256(
  toBytes("ExchangeAction(bytes32 payloadHash,uint64 nonce)"),
);

const DOMAIN_TYPE_HASH = keccak256(
  toBytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
);

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

function domainSeparator(chainId: number) {
  const nameHash = keccak256(toBytes("spot"));
  const versionHash = keccak256(toBytes("1"));
  const chainIdBytes = `0x${chainId.toString(16).padStart(64, "0")}` as Hex;
  const verifyingContract = `0x${"0".repeat(64)}` as Hex;

  return keccak256(
    concat([DOMAIN_TYPE_HASH, nameHash, versionHash, chainIdBytes, verifyingContract]),
  );
}

function exchangeActionStructHash(payloadHash: Hex, nonce: bigint) {
  const nonceBytes = `0x${nonce.toString(16).padStart(64, "0")}` as Hex;
  return keccak256(concat([EXCHANGE_ACTION_TYPE_HASH, payloadHash, nonceBytes]));
}

function exchangeActionDigest(payloadHash: Hex, nonce: bigint, chainId: number) {
  const separator = domainSeparator(chainId);
  const structHash = exchangeActionStructHash(payloadHash, nonce);
  return keccak256(concat(["0x1901", separator, structHash]));
}

export function buildBatchNewOrderBody(request: BatchNewOrderRequest) {
  return serializeBatchNewOrderRequest(request);
}

export function getBatchNewOrderDigest(
  request: BatchNewOrderRequest,
  nonce: bigint,
  chainId: number,
): Hex {
  const paramsJson = serializeBatchNewOrderRequest(request);
  const payloadJson = serializeActionPayload("batchNewOrder", paramsJson);
  const payloadHash = hashPayload(payloadJson);
  return exchangeActionDigest(payloadHash, nonce, chainId);
}

export function formatSodexSignature(signature: Hex): Hex {
  return (`0x01${signature.slice(2)}`) as Hex;
}

export async function signBatchNewOrderRequest(
  request: BatchNewOrderRequest,
  nonce: bigint,
  privateKeyHex: Hex,
) {
  const digest = getBatchNewOrderDigest(request, nonce, getSodexChainId(getSodexNetwork()));
  const account = privateKeyToAccount(privateKeyHex);
  const signature = await account.sign({ hash: digest });

  return formatSodexSignature(signature);
}
