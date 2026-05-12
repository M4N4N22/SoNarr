import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "default" | "outline" | "ghost";
};

const variantClasses = {
  default:
    "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:text-foreground",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function buttonVariants({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost";
} = {}) {
  return cn(baseClasses, variantClasses[variant], className);
}

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ variant, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & {
  variant?: "default" | "outline" | "ghost";
};

export function ButtonLink({
  className,
  variant = "default",
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={buttonVariants({ variant, className })}
      {...props}
    />
  );
}
