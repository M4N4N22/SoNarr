import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCell({
  label,
  value,
  sub,
  help,
  icon: Icon,
  className,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  help?: string;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 text-primary" /> : null}
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      {help ? <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground/80">{help}</p> : null}
      <p className={cn("mt-1 tabular-nums text-xl font-semibold text-foreground", valueClassName)}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function StatGrid({
  children,
  className,
  columns = 4,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid divide-x divide-border rounded-lg bg-card",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 md:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
