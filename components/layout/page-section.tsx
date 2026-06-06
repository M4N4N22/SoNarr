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
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-4 rounded-lg bg-muted/30 px-4 py-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        {Icon ? <Icon className="h-5 w-5 text-primary" /> : null}
        {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
