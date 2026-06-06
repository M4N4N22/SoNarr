import type { Metadata } from "next";

import { EndpointDiagnostics } from "@/components/sonarr/endpoint-diagnostics";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FeaturedResearchStrip } from "./_components/featured-research-strip";
import { HotNewsFeed } from "./_components/hot-news-feed";
import { NarrativeThemesPanel } from "./_components/narrative-checks";
import { RadarHero } from "./_components/radar-hero";
import { RadarStats } from "./_components/radar-stats";
import { RadarStatusNote } from "./_components/radar-status-note";
import { getFeaturedNews } from "@/lib/sosovalue/enrichment";
import { getRadarData } from "@/lib/sosovalue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Narrative Radar | SoNarr",
  description:
    "Track live SoSoValue market news and package emerging narratives into finance product ideas.",
};

export default async function RadarPage() {
  const [radar, featuredNews] = await Promise.all([
    getRadarData(),
    getFeaturedNews(6),
  ]);
  const topNarrative = radar.narratives[0];
  const hotMentions = topNarrative
    ? radar.hotNews.filter((item) =>
        [item.title, item.content, ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(topNarrative.keyword.toLowerCase()),
      ).length
    : 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="app" />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <RadarHero radar={radar} />
        <RadarStatusNote radar={radar} />
        <RadarStats hotMentions={hotMentions} radar={radar} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch lg:gap-6 lg:px-8">
        <HotNewsFeed hotNews={radar.hotNews} className="min-h-0" />
        <NarrativeThemesPanel narratives={radar.narratives} className="min-h-0" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <FeaturedResearchStrip items={featuredNews.data} />
      </section>

      {radar.mode !== "live" ? (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <EndpointDiagnostics endpoints={radar.endpoints} />
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
