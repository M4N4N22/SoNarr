"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export type WorkflowStepItem = {
  id: string;
  title: string;
  detail: string;
  hint: string;
  active?: boolean;
  complete?: boolean;
};

type WorkflowTrackProps = {
  steps: WorkflowStepItem[];
  className?: string;
};

export function WorkflowTrack({ steps, className }: WorkflowTrackProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border xl:grid-cols-4", className)}>
      {steps.map((step) => (
        <div key={step.id} className="bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {step.complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-positive" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{step.title}</p>
            </div>
            {step.hint ? (
              <InfoTip label={step.title} side="bottom">
                {step.hint}
              </InfoTip>
            ) : null}
          </div>
          <p className="mt-2 tabular-nums text-lg font-semibold text-foreground">{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
