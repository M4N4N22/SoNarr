import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
};

const variantClasses = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "bg-muted text-foreground hover:bg-secondary",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
};

const sizeClasses = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

export function buttonVariants({
  className,
  variant = "default",
  size = "default",
}: {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
} = {}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props} />
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
};

export function ButtonLink({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonVariants({ variant, size, className })} {...props} />
  );
}
