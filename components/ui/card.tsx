import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "rounded-3xl text-card-foreground shadow-md ",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-6 pb-3", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("p-4 pt-3", className)} {...props} />;
}
