"use client";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export type TimelineItem = {
  id: string;
  date: string;
  title: string;
  hint?: string;
};

type MiniTimelineProps = {
  items: TimelineItem[];
  title?: string;
  titleHint?: string;
  className?: string;
};

export function MiniTimeline({ items, title, titleHint, className }: MiniTimelineProps) {
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
      <div className="relative space-y-3 pl-4 before:absolute before:bottom-1 before:left-[7px] before:top-1 before:w-px before:bg-border">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <span className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-primary">{item.date}</p>
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{item.title}</p>
              </div>
              {item.hint ? (
                <InfoTip label={item.date} side="bottom">
                  {item.hint}
                </InfoTip>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
