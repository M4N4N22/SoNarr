"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export type CoverageSegment = {
  id: string;
  label: string;
  value: number;
  color: string;
  hint?: string;
};

type CoverageChartProps = {
  segments: CoverageSegment[];
  title: string;
  titleHint: string;
  className?: string;
};

export function CoverageChart({
  segments,
  title,
  titleHint,
  className,
}: CoverageChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <InfoTip label={title} side="bottom">
          {titleHint}
        </InfoTip>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="h-full"
            style={{
              width: total > 0 ? `${(segment.value / total) * 100}%` : "0%",
              backgroundColor: segment.color,
            }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map((segment) => (
          <div key={segment.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span>
              {segment.label}: {segment.value}
            </span>
            {segment.hint ? (
              <InfoTip label={segment.label} side="bottom">
                {segment.hint}
              </InfoTip>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
