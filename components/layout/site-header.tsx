"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { SonarrLogo } from "@/components/layout/sonarr-logo";
import { WalletHeaderControls } from "@/components/layout/wallet-header-controls";
import { cn } from "@/lib/utils";

function sodexHref(narrativeId?: string) {
  return narrativeId ? `/narratives/${narrativeId}?tab=launch` : "/sodex";
}

function SiteHeaderInner({
  variant = "app",
  narrativeId,
}: {
  variant?: "marketing" | "app";
  narrativeId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const sodexLink = sodexHref(narrativeId);

  const links = [
    { id: "radar", href: "/radar", label: "Radar", active: pathname === "/radar" },
    {
      id: "sodex",
      href: sodexLink,
      label: "SoDEX",
      active: pathname === "/sodex" || (pathname.startsWith("/narratives/") && tab === "launch"),
    },
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-b from-background/95 to-background/80 py-3 backdrop-blur-sm">
      <div className="relative mx-auto flex min-h-12 max-w-7xl items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <SonarrLogo href={variant === "marketing" ? "/" : "/radar"} size="sm" showWordmark />

        {variant === "app" ? (
          <nav className="flex h-full items-stretch gap-4 sm:gap-6" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className={cn(
                  "relative flex items-center text-sm font-medium transition",
                  link.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={link.active ? "page" : undefined}
              >
                {link.label}
                {link.active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                ) : null}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hidden items-center gap-5 md:flex">
            {["Problem", "Solution", "Workflow"].map((label, index) => (
              <a
                key={label}
                href={["#problem", "#solution", "#workflow"][index]}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        )}

        {variant === "marketing" ? (
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/radar"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Launch app
            </Link>
          </div>
        ) : (
          <WalletHeaderControls />
        )}
      </div>
    </header>
  );
}

function SiteHeaderFallback() {
  return <div className="sticky top-0 z-50 h-12 border-b border-border bg-card" />;
}

export function SiteHeader(props: { variant?: "marketing" | "app"; narrativeId?: string }) {
  return (
    <Suspense fallback={<SiteHeaderFallback />}>
      <SiteHeaderInner {...props} />
    </Suspense>
  );
}
