import Link from "next/link";

const navItems = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "Workflow", href: "#workflow" },
  { label: "Stack", href: "#stack" },
];

const problemCards = [
  {
    title: "Scattered signals",
    body: "News, prices, token flows, and sector movements live in different places.",
  },
  {
    title: "Weak conviction",
    body: "Most traders see a narrative but cannot explain why it matters.",
  },
  {
    title: "No product layer",
    body: "A good market insight rarely becomes a reusable index, report, or strategy.",
  },
  {
    title: "Execution gap",
    body: "Even when the idea is right, users still need risk checks and execution planning.",
  },
];

const featureCards = [
  {
    title: "Narrative Radar",
    body: "Detects rising sectors, assets, and market themes before they become obvious.",
  },
  {
    title: "Index Builder",
    body: "Converts a narrative into a weighted crypto basket with methodology and rationale.",
  },
  {
    title: "Research Briefs",
    body: "Generates public-facing thesis pages backed by data, not vibes.",
  },
  {
    title: "Risk Layer",
    body: "Adds confidence, volatility, concentration, liquidity, and rebalance checks.",
  },
  {
    title: "Execution Preview",
    body: "Shows how a basket could be prepared for SoDEX orderbook execution.",
  },
  {
    title: "Public Product Pages",
    body: "Publish shareable index pages that make one person look like a full research desk.",
  },
];

const steps = [
  {
    label: "Step 1",
    title: "Scan",
    body: "SoNarr reads SoSoValue market data, news, and narrative signals.",
  },
  {
    label: "Step 2",
    title: "Detect",
    body: "The AI identifies which themes are gaining attention, volume, or momentum.",
  },
  {
    label: "Step 3",
    title: "Package",
    body: "The narrative becomes an index idea, research brief, and risk-controlled methodology.",
  },
  {
    label: "Step 4",
    title: "Preview",
    body: "The app prepares a SoDEX-ready execution plan for future trading integration.",
  },
];

const assets = [
  { symbol: "TAO", weight: "30%" },
  { symbol: "FET", weight: "25%" },
  { symbol: "RNDR", weight: "20%" },
  { symbol: "NEAR", weight: "15%" },
  { symbol: "AKT", weight: "10%" },
];

const stackCards = [
  {
    title: "Data and news",
    body: "Use SoSoValue feeds to understand what the market is paying attention to.",
  },
  {
    title: "Index thinking",
    body: "Turn sector movements into transparent baskets and methodology.",
  },
  {
    title: "Execution path",
    body: "Use SoDEX market data and orderbook infrastructure for execution previews and future trading.",
  },
];

const targetUsers = [
  {
    title: "Solo analysts",
    body: "Publish better research without building a full research team.",
  },
  {
    title: "Crypto creators",
    body: "Turn market takes into structured, shareable products.",
  },
  {
    title: "Small funds",
    body: "Prototype index strategies and rebalance logic faster.",
  },
  {
    title: "Builders",
    body: "Use SoSoValue APIs to create agentic finance workflows.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 text-lg leading-8 text-muted-foreground">{body}</p>
      ) : null}
    </div>
  );
}

function Card({
  title,
  body,
  className = "",
}: {
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <article
      className={`rounded-2xl border border-border bg-card/80 p-6 shadow-2xl shadow-black/20 backdrop-blur ${className}`}
    >
      <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
      <p className="mt-3 leading-7 text-muted-foreground">{body}</p>
    </article>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl">
      <div className="absolute -inset-6 rounded-[2rem] bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/70 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <span className="text-sm text-muted-foreground">
              Narrative radar / live market workspace
            </span>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Heating up
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Detected narrative</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  AI Agent Momentum
                </h3>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-4 text-right">
                <p className="text-sm text-muted-foreground">Signal score</p>
                <p className="mt-1 text-3xl font-semibold text-foreground">87/100</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-5">
              {assets.map((asset) => (
                <div
                  key={asset.symbol}
                  className="rounded-2xl border border-border bg-muted/50 p-4"
                >
                  <p className="text-sm text-muted-foreground">{asset.symbol}</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {asset.weight}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 h-28 overflow-hidden rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex h-full items-end gap-2">
                {[34, 48, 41, 58, 66, 61, 76, 72, 87, 82, 92, 88].map(
                  (height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className="flex-1 rounded-t-lg bg-primary/70"
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm text-muted-foreground">Suggested product</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                AI Agent Momentum Index
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm text-muted-foreground">Risk summary</p>
              <p className="mt-2 leading-7 text-foreground">
                Medium-high risk. High narrative momentum, but elevated volatility
                and concentration risk.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Suggested action</p>
              <p className="mt-2 font-semibold">
                Publish index thesis and monitor rebalance trigger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NarrativePreview() {
  return (
    <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card p-6 shadow-2xl shadow-black/30 sm:p-8">
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">
            Narrative
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            AI Agent Momentum
          </h3>
        </div>
        <div className="rounded-2xl border border-border bg-muted px-5 py-4">
          <p className="text-sm text-muted-foreground">Signal score</p>
          <p className="text-2xl font-semibold text-foreground">87/100</p>
        </div>
      </div>

      <div className="grid gap-4 py-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/60 p-5">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-2 text-lg font-semibold text-foreground">Heating up</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-5">
          <p className="text-sm text-muted-foreground">Suggested product</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            AI Agent Momentum Index
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/50 p-5">
        <p className="text-sm text-muted-foreground">Assets</p>
        <div className="mt-4 space-y-3">
          {assets.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-4">
              <span className="w-12 font-medium text-foreground">{asset.symbol}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: asset.weight }}
                />
              </div>
              <span className="w-10 text-right text-muted-foreground">
                {asset.weight}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background/60 p-5">
          <p className="text-sm text-muted-foreground">Risk summary</p>
          <p className="mt-2 leading-7 text-foreground">
            Medium-high risk. High narrative momentum, but elevated volatility and
            concentration risk.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/60 p-5">
          <p className="text-sm text-muted-foreground">Suggested action</p>
          <p className="mt-2 leading-7 text-foreground">
            Publish index thesis and monitor rebalance trigger.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(43,68,231,0.22),transparent_28rem),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_24rem)]" />

      <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <a href="#" className="flex items-center gap-3" aria-label="SoNarr home">
            <span className="font-semibold tracking-tight text-foreground">SoNarr</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
          <Link
            href="/radar"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            Open narrative radar
          </Link>
        </nav>
      </header>

      <section className="px-6 pb-20 pt-20 sm:pt-28 lg:px-8" id="radar">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Built for the SoSoValue Buildathon
          </div>
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
            Turn market noise into your one-person finance desk.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
            SoNarr detects emerging crypto narratives from SoSoValue-powered
            market data and news, then converts them into publishable index ideas,
            research briefs, risk checks, and SoDEX-ready execution previews.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/radar"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:bg-primary/90"
            >
              Open narrative radar
            </Link>
            <a
              href="#example"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              View example index
            </a>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Powered by SoSoValue data, news feeds, index tooling, and SoDEX
            execution infrastructure.
          </p>
        </div>

        <ProductPreview />
      </section>

      <section className="px-6 py-20 lg:px-8" id="problem">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="Crypto moves through narratives. Most people see them too late."
            body="Retail traders, analysts, and creators are flooded with news, token movements, social noise, and market rotations. By the time a trend becomes obvious, the best opportunity is often gone."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemCards.map((card) => (
              <Card key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8" id="solution">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="SoNarr turns signals into structured finance products."
            body="SoNarr watches market data and news, identifies emerging narratives, and packages them into products a solo operator can publish, explain, and eventually execute."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card) => (
              <Card key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8" id="workflow">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="From signal to product in four steps." />
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {steps.map((step) => (
              <article
                key={step.title}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
                <p className="text-sm font-medium text-primary">{step.label}</p>
                <h3 className="mt-4 text-2xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8" id="example">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Example" title="Example: AI Agent Momentum" />
          <div className="mt-12">
            <NarrativePreview />
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8" id="stack">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="Built on the SoSoValue stack."
            body="SoNarr is designed around SoSoValue's research-to-execution ecosystem: market intelligence from SoSoValue Terminal, index logic inspired by SSI Protocol, and future execution through SoDEX and ValueChain."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {stackCards.map((card) => (
              <Card key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="Who is SoNarr for?" />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {targetUsers.map((card) => (
              <Card key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-2xl shadow-black/30 sm:p-14">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Become a one-person narrative finance business.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            SoNarr helps one person discover, package, publish, and prepare
            execution for crypto market narratives.
          </p>
          <Link
            href="/radar"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:bg-primary/90"
          >
            Launch narrative radar
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>SoNarr - built for the SoSoValue Buildathon.</p>
          <p>Narrative sonar for one-person finance desks.</p>
        </div>
      </footer>
    </main>
  );
}
