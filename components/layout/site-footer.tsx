import Link from "next/link";

import { SonarrLogo } from "@/components/layout/sonarr-logo";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="border-t border-border/80 bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <SonarrLogo href="/" size="sm" />
          {!compact ? (
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <Link href="/radar" className="transition hover:text-foreground">
                Narrative radar
              </Link>
              <a
                href="https://sosovalue.com"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-foreground"
              >
                SoSoValue
              </a>
              <a
                href="https://sodex.com"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-foreground"
              >
                SoDEX
              </a>
            </div>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          SoNarr — narrative intelligence for one-person finance desks. Built for the SoSoValue
          Buildathon.
        </p>
      </div>
    </footer>
  );
}
