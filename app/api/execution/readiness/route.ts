import { cookies } from "next/headers";

import { getBasketExecutionReadiness } from "@/lib/sodex";
import { resolveBasketNotionalUsd } from "@/lib/sodex/basket-notional";
import {
  resolveSodexNetwork,
  SODEx_NETWORK_COOKIE,
} from "@/lib/sodex/network-preference";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetsParam = url.searchParams.get("assets");
  const notionalParam = url.searchParams.get("notionalUsd");
  const networkParam = url.searchParams.get("network");

  if (!assetsParam) {
    return Response.json(
      { error: "Missing assets query parameter. Example: ?assets=BTC:30,ETH:25,LINK:20" },
      { status: 400 },
    );
  }

  const weightedAssets = assetsParam
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [asset, weightValue] = entry.split(":");
      const weight = Number(weightValue);

      if (!asset || !Number.isFinite(weight)) {
        return undefined;
      }

      return { asset: asset.toUpperCase(), weight };
    })
    .filter((entry): entry is { asset: string; weight: number } => Boolean(entry));

  if (weightedAssets.length === 0) {
    return Response.json(
      { error: "No valid assets provided. Use asset:weight pairs separated by commas." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const network = resolveSodexNetwork(networkParam ?? jar.get(SODEx_NETWORK_COOKIE)?.value);

  const parsedNotional = notionalParam ? Number(notionalParam) : undefined;
  const notionalUsd = resolveBasketNotionalUsd(
    Number.isFinite(parsedNotional) ? parsedNotional : undefined,
    network,
  );
  const readiness = await getBasketExecutionReadiness(weightedAssets, notionalUsd, network);

  return Response.json(readiness);
}
