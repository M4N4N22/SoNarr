import type { BasketTradePlan } from "@/lib/sodex";

type WeightedAsset = { asset: string; weight: number };

function formatUsd(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPrice(value?: string) {
  if (!value) return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { maximumFractionDigits: 6 }) : value;
}

function formatQuantity(value?: string) {
  if (!value) return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: 8 })
    : value;
}

function weightForAsset(weightedAssets: WeightedAsset[] | undefined, asset: string) {
  return weightedAssets?.find((item) => item.asset.toUpperCase() === asset.toUpperCase())?.weight;
}

export function BasketOrderPlanTable({
  plan,
  totalNotionalUsd,
  weightedAssets,
}: {
  plan: BasketTradePlan;
  totalNotionalUsd?: number;
  weightedAssets?: WeightedAsset[];
}) {
  const totalEstimate =
    plan.orders.reduce((sum, order) => sum + order.legNotionalUsd, 0) || totalNotionalUsd;

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>
          {plan.orders.length} limit {plan.orders.length === 1 ? "order" : "orders"} ready
        </span>
        {totalEstimate ? <span className="tabular-nums">~{formatUsd(totalEstimate)}</span> : null}
      </div>
      <table className="min-w-full text-left text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-medium">Asset</th>
            <th className="px-3 py-2 font-medium">Market</th>
            <th className="px-3 py-2 font-medium">Wt</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Limit @ last</th>
            <th className="px-3 py-2 font-medium">Notional</th>
          </tr>
        </thead>
        <tbody>
          {plan.orders.map((order) => (
            <tr key={order.clOrdID} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium text-positive">BUY {order.asset}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {order.displayName ?? order.sodexSymbol ?? "—"}
              </td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {weightForAsset(weightedAssets, order.asset) ?? "—"}%
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatQuantity(order.quantity)}</td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatPrice(order.price)}</td>
              <td className="px-3 py-2 tabular-nums">{formatUsd(order.legNotionalUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {plan.skipped.length > 0 ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            Not included ({plan.skipped.length})
          </p>
          <ul className="space-y-1">
            {plan.skipped.map((item) => (
              <li key={item.asset} className="text-[11px] leading-4 text-muted-foreground">
                <span className="font-medium text-foreground">{item.asset}</span>
                {" — "}
                {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
