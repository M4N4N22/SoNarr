import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function RadarNav() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SoNarr home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-sm font-semibold text-primary">
            SN
          </span>
          <div>
            <p className="font-semibold leading-none text-foreground">SoNarr</p>
            <p className="mt-1 text-xs text-muted-foreground">Narrative sonar</p>
          </div>
        </Link>
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a className="transition hover:text-foreground" href="#hot-feed">
            Hot feed
          </a>
          <a className="transition hover:text-foreground" href="#narratives">
            Narrative checks
          </a>
          <a className="transition hover:text-foreground" href="#package">
            Product package
          </a>
        </div>
        <Link
          href="/"
          className={buttonVariants({ variant: "outline", className: "px-4" })}
        >
          Back to landing
        </Link>
      </nav>
    </header>
  );
}
