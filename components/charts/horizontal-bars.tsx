"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { clamp, scoreColor } from "./chart-utils";

export type HorizontalBarItem = {
  id: string;
  label: string;
  value: number | null;
  hint?: string;
  suffix?: string;
  status?: string;
  dataMode?: string;
};

type HorizontalBarsProps = {
  items: HorizontalBarItem[];
  max?: number;
  className?: string;
  compact?: boolean;
};

export function HorizontalBars({
  items,
  max = 100,
  className,
  compact = false,
}: HorizontalBarsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const width =
          item.value === null ? 8 : clamp((item.value / max) * 100, 4, 100);
        const color =
          item.value === null ? "var(--chart-neutral)" : scoreColor(item.value);

        return (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                {item.hint ? (
                  <InfoTip label={item.label} side="bottom">
                    {item.hint}
                  </InfoTip>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {item.value === null
                    ? item.status ?? "Pending"
                    : `${Math.round(item.value)}${item.suffix ?? ""}`}
                </span>
                {item.dataMode ? (
                  <Badge variant={item.dataMode === "Live" ? "default" : "outline"} className="text-[10px]">
                    {item.dataMode}
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className={cn("overflow-hidden rounded-full bg-muted", compact ? "h-2" : "h-2.5")}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
