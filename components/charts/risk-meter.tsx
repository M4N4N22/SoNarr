"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

type RiskLevel = "Low" | "Medium" | "Medium-high" | "High";

const levelIndex: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  "Medium-high": 2,
  High: 3,
};

type RiskMeterProps = {
  label: string;
  level: RiskLevel;
  hint: string;
  className?: string;
};

export function RiskMeter({ label, level, hint, className }: RiskMeterProps) {
  const active = levelIndex[level];

  return (
    <div className={cn("rounded-xl border border-border bg-background/50 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <InfoTip label={label} side="bottom">
          {hint}
        </InfoTip>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{level}</p>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {(["Low", "Med", "Med+", "High"] as const).map((step, index) => (
          <div
            key={step}
            className={cn(
              "h-1.5 rounded-full",
              index <= active ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
