"use client";

import { CircleHelp } from "lucide-react";

import { cn } from "@/lib/utils";

type InfoTipProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  side?: "top" | "bottom";
};

export function InfoTip({
  label,
  children,
  className,
  side = "top",
}: InfoTipProps) {
  return (
    <span className={cn("group/tip relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        className="rounded-full p-0.5 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-56 rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs leading-5 text-popover-foreground opacity-0 shadow-lg transition group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" && "bottom-full left-1/2 mb-2 -translate-x-1/2",
          side === "bottom" && "top-full left-1/2 mt-2 -translate-x-1/2",
        )}
      >
        <span className="mb-1 block font-medium text-foreground">{label}</span>
        {children}
      </span>
    </span>
  );
}
