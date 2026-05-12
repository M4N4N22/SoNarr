import type { Metadata } from "next";

import { HotNewsFeed } from "./_components/hot-news-feed";
import { NarrativeChecks } from "./_components/narrative-checks";
import { ProductPackagingPreview } from "./_components/product-packaging-preview";
import { RadarHero } from "./_components/radar-hero";
import { RadarNav } from "./_components/radar-nav";
import { RadarStats } from "./_components/radar-stats";
import { RadarStatusNote } from "./_components/radar-status-note";
import { getRadarData } from "@/lib/sosovalue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Narrative Radar | SoNarr",
  description:
    "Track live SoSoValue market news and package emerging narratives into finance product ideas.",
};

export default async function RadarPage() {
  const radar = await getRadarData();
  const topNarrative = radar.narratives[0];
  const remainingNarratives = radar.narratives.slice(1);
  const hotMentions = radar.hotNews.filter((item) =>
    [item.title, item.content, ...item.tags]
      .join(" ")
      .toLowerCase()
      .includes(topNarrative.keyword.toLowerCase()),
  ).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_8%,rgba(43,68,231,0.2),transparent_30rem),radial-gradient(circle_at_85%_12%,rgba(255,255,255,0.07),transparent_26rem)]" />

      <RadarNav />

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <RadarHero radar={radar} topNarrative={topNarrative} />
        <RadarStatusNote radar={radar} />
        <RadarStats hotMentions={hotMentions} radar={radar} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <HotNewsFeed hotNews={radar.hotNews} />

        <div className="space-y-6" id="narratives">
          <NarrativeChecks
            title="Top narrative"
            description="The strongest current category check from SoSoValue-powered search."
            narratives={[topNarrative]}
          />
       
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
        <NarrativeChecks
          title="Other narrative checks"
          description="Additional category probes from GET /news/search, ranked after the current leader."
          narratives={remainingNarratives}
          variant="grid"
        />
      </section>
    </main>
  );
}
