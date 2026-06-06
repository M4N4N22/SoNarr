"use client";

import { cn } from "@/lib/utils";

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex gap-0 overflow-x-auto border-b border-border bg-card", className)}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  active,
  className,
  onClick,
  children,
}: {
  active: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative shrink-0 px-4 py-3 text-sm font-medium transition",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}
