"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

import { signedColor } from "./chart-utils";

export type DivergingBarItem = {
  id: string;
  label: string;
  value: number;
  hint?: string;
};

type DivergingBarsProps = {
  items: DivergingBarItem[];
  maxAbs?: number;
  title?: string;
  titleHint?: string;
  className?: string;
};

export function DivergingBars({
  items,
  maxAbs,
  title,
  titleHint,
  className,
}: DivergingBarsProps) {
  const computedMax =
    maxAbs ??
    Math.max(5, ...items.map((item) => Math.abs(item.value)), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {title ? (
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {titleHint ? (
            <InfoTip label={title} side="bottom">
              {titleHint}
            </InfoTip>
          ) : null}
        </div>
      ) : null}
      {items.map((item) => {
        const pct = (Math.abs(item.value) / computedMax) * 50;
        const positive = item.value >= 0;

        return (
          <div key={item.id} className="grid grid-cols-[72px_1fr_56px] items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground">{item.label}</span>
              {item.hint ? (
                <InfoTip label={item.label} side="bottom">
                  {item.hint}
                </InfoTip>
              ) : null}
            </div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  left: positive ? "50%" : `${50 - pct}%`,
                  backgroundColor: signedColor(item.value),
                }}
              />
            </div>
            <span
              className="text-right text-xs font-semibold"
              style={{ color: signedColor(item.value) }}
            >
              {item.value > 0 ? "+" : ""}
              {item.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
