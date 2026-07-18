import { NextResponse } from "next/server";
import type { Hex } from "viem";

import {
  buildBatchCancelOrderBody,
  planToBatchCancelRequest,
  submitSignedBatchCancel,
} from "@/lib/sodex";
import { resolveSodexNetwork } from "@/lib/sodex/network-preference";

type CancelBody = {
  accountId?: number;
  apiKeyName?: string;
  nonce?: number | string;
  signature?: string;
  network?: string;
  cancels?: Array<{
    symbolID: number;
    orderID?: number;
    origClOrdID?: string;
    asset?: string;
  }>;
};

export async function POST(request: Request) {
  let body: CancelBody;

  try {
    body = (await request.json()) as CancelBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const accountId = Number(body.accountId);
  const apiKeyName = body.apiKeyName?.trim();
  const signature = body.signature?.trim();
  const nonceValue = body.nonce === undefined ? undefined : BigInt(body.nonce);
  const network = resolveSodexNetwork(body.network);
  const cancels = Array.isArray(body.cancels) ? body.cancels : [];

  if (!Number.isFinite(accountId) || accountId <= 0 || cancels.length === 0) {
    return NextResponse.json(
      { error: "Provide accountId and at least one cancel target." },
      { status: 400 },
    );
  }

  if (!apiKeyName || !signature || nonceValue === undefined) {
    return NextResponse.json(
      { error: "Provide apiKeyName, signature, and nonce from the connected wallet." },
      { status: 400 },
    );
  }

  const validCancels = cancels.filter(
    (item) =>
      typeof item.symbolID === "number" &&
      (typeof item.orderID === "number" || typeof item.origClOrdID === "string"),
  );

  if (validCancels.length === 0) {
    return NextResponse.json(
      { error: "Each cancel needs symbolID plus orderID or origClOrdID." },
      { status: 400 },
    );
  }

  const batchRequest = planToBatchCancelRequest(validCancels, accountId);
  const result = await submitSignedBatchCancel(
    batchRequest,
    {
      apiKeyName,
      nonce: nonceValue,
      signature: signature as Hex,
    },
    network,
  );

  return NextResponse.json({
    requestBody: buildBatchCancelOrderBody(batchRequest),
    result,
    network,
  });
}
