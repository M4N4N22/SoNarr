import { NextResponse } from "next/server";
import type { Hex } from "viem";

import {
  buildBatchNewOrderBody,
  planToBatchNewOrderRequest,
  submitSignedBasketTrade,
  type BasketTradePlan,
} from "@/lib/sodex";

type SubmitBody = {
  accountId?: number;
  apiKeyName?: string;
  nonce?: number | string;
  plan?: BasketTradePlan;
  signature?: string;
};

function parsePlan(raw: unknown): BasketTradePlan | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const orders = Array.isArray(record.orders) ? record.orders : [];
  const skipped = Array.isArray(record.skipped) ? record.skipped : [];

  if (orders.length === 0) {
    return undefined;
  }

  return {
    orders: orders as BasketTradePlan["orders"],
    skipped: skipped as BasketTradePlan["skipped"],
  };
}

export async function POST(request: Request) {
  let body: SubmitBody;

  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const plan = parsePlan(body.plan);
  const accountId = Number(body.accountId);
  const apiKeyName = body.apiKeyName?.trim();
  const signature = body.signature?.trim();
  const nonceValue = body.nonce === undefined ? undefined : BigInt(body.nonce);

  if (!plan || !Number.isFinite(accountId) || accountId <= 0) {
    return NextResponse.json(
      { error: "Provide a prepared trade plan and valid accountId." },
      { status: 400 },
    );
  }

  if (!apiKeyName || !signature || nonceValue === undefined) {
    return NextResponse.json(
      { error: "Provide apiKeyName, signature, and nonce from the connected wallet." },
      { status: 400 },
    );
  }

  const batchRequest = planToBatchNewOrderRequest(plan, accountId);
  const result = await submitSignedBasketTrade(batchRequest, plan, {
    apiKeyName,
    nonce: nonceValue,
    signature: signature as Hex,
  });

  return NextResponse.json({
    requestBody: buildBatchNewOrderBody(batchRequest),
    result,
  });
}
