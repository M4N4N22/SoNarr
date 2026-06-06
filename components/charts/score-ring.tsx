"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

import { clamp, scoreColor } from "./chart-utils";

type ScoreRingProps = {
  value: number;
  max?: number;
  label: string;
  hint: string;
  displayValue?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { box: 72, stroke: 6, text: "text-base" },
  md: { box: 96, stroke: 7, text: "text-xl" },
  lg: { box: 120, stroke: 8, text: "text-2xl" },
};

export function ScoreRing({
  value,
  max = 100,
  label,
  hint,
  displayValue,
  size = "md",
  className,
}: ScoreRingProps) {
  const config = sizes[size];
  const radius = (config.box - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = clamp(value / max, 0, 1);
  const dash = circumference * pct;
  const color = scoreColor(value);

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div className="relative" style={{ width: config.box, height: config.box }}>
        <svg width={config.box} height={config.box} className="-rotate-90">
          <circle
            cx={config.box / 2}
            cy={config.box / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/40"
          />
          <circle
            cx={config.box / 2}
            cy={config.box / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center px-1 text-center">
          <span
            className={cn(
              "font-semibold text-foreground",
              displayValue && displayValue.length > 5 ? "text-[10px] leading-tight" : config.text,
            )}
          >
            {displayValue ?? Math.round(value)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <InfoTip label={label}>{hint}</InfoTip>
      </div>
    </div>
  );
}
