import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: "default" | "outline" | "muted" | "positive" | "negative";
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        variant === "default" && "bg-primary/15 text-primary",
        variant === "outline" && "bg-muted text-muted-foreground",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "positive" && "bg-positive/10 text-positive",
        variant === "negative" && "bg-negative/10 text-negative",
        className,
      )}
      {...props}
    />
  );
}
