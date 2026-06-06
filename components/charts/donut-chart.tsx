"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

import { donutPalette } from "./chart-utils";

export type DonutSegment = {
  id: string;
  label: string;
  value: number;
  hint?: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  size?: number;
  className?: string;
};

export function DonutChart({ segments, size = 180, className }: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-4 lg:flex-row lg:items-start", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/30"
          />
          {segments.map((segment, index) => {
            const pct = total > 0 ? segment.value / total : 0;
            const dash = circumference * pct;
            const circle = (
              <circle
                key={segment.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={donutPalette[index % donutPalette.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-foreground">100%</p>
          <p className="text-[11px] text-muted-foreground">Basket</p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 px-3 py-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: donutPalette[index % donutPalette.length] }}
              />
              <span className="truncate text-sm font-medium text-foreground">{segment.label}</span>
              {segment.hint ? (
                <InfoTip label={segment.label} side="bottom">
                  {segment.hint}
                </InfoTip>
              ) : null}
            </div>
            <span className="text-sm font-semibold text-primary">{segment.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
