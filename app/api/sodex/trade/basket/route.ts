import { NextResponse } from "next/server";

import {
  buildBasketTradePlan,
  getBasketExecutionReadiness,
  submitBasketTradePlan,
} from "@/lib/sodex";
import { resolveBasketNotionalUsd } from "@/lib/sodex/basket-notional";
import { resolveSodexNetwork } from "@/lib/sodex/network-preference";

type TradeBody = {
  assets?: Array<{ asset: string; weight: number }>;
  dryRun?: boolean;
  totalNotionalUsd?: number;
  network?: string;
};

function parseAssets(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return undefined;
      }

      const record = item as Record<string, unknown>;
      const asset = typeof record.asset === "string" ? record.asset.trim() : "";
      const weight = Number(record.weight);

      if (!asset || !Number.isFinite(weight) || weight <= 0) {
        return undefined;
      }

      return { asset: asset.toUpperCase(), weight };
    })
    .filter((item): item is { asset: string; weight: number } => Boolean(item));
}

export async function POST(request: Request) {
  let body: TradeBody;

  try {
    body = (await request.json()) as TradeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const assets = parseAssets(body.assets);

  if (assets.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one asset with weight, e.g. [{ asset: 'AAVE', weight: 30 }]." },
      { status: 400 },
    );
  }

  const network = resolveSodexNetwork(body.network);
  const totalNotionalUsd = resolveBasketNotionalUsd(body.totalNotionalUsd, network);
  const readiness = await getBasketExecutionReadiness(assets, totalNotionalUsd, network);
  const plan = await buildBasketTradePlan(readiness);

  if (body.dryRun !== true) {
    return NextResponse.json(
      {
        error:
          "Live basket submit requires wallet signing. Use Sign & submit on the Launch tab, or call /api/sodex/trade/basket/submit.",
        plan,
        readiness,
      },
      { status: 400 },
    );
  }

  const result = await submitBasketTradePlan(plan, { dryRun: true });

  return NextResponse.json({
    readiness,
    plan,
    result,
  });
}
