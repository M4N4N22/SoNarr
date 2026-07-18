import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function PageSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg bg-card", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className="p-4">{children}</div> : null}
    </section>
  );
}

export function WorkspacePanelHeader({
  title,
  description,
  icon: Icon,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <div className={cn("mb-4", compact ? "px-0.5 py-1" : "rounded-lg bg-muted/30 px-4 py-3")}>
      <h2
        className={cn(
          "flex items-center gap-2 font-semibold text-foreground",
          compact ? "text-sm" : "text-base",
        )}
      >
        {Icon ? <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-primary")} /> : null}
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "text-muted-foreground",
            compact ? "mt-0.5 text-xs leading-5" : "mt-1 text-sm leading-6",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
