import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Separator({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full bg-border", className)}
      {...props}
    />
  );
}
