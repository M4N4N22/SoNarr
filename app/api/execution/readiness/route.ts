import { getBasketExecutionReadiness, getSodexNetwork } from "@/lib/sodex";
import { resolveBasketNotionalUsd } from "@/lib/sodex/basket-notional";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetsParam = url.searchParams.get("assets");
  const notionalParam = url.searchParams.get("notionalUsd");

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

  const parsedNotional = notionalParam ? Number(notionalParam) : undefined;
  const notionalUsd = resolveBasketNotionalUsd(
    Number.isFinite(parsedNotional) ? parsedNotional : undefined,
    getSodexNetwork(),
  );
  const readiness = await getBasketExecutionReadiness(weightedAssets, notionalUsd);

  return Response.json(readiness);
}
