import { Card } from "@/components/ui/card";
import type { RadarData } from "@/lib/sosovalue";

import { formatUpdatedAt } from "./radar-utils";

type RadarStatsProps = {
  hotMentions: number;
  radar: RadarData;
};

export function RadarStats({ hotMentions, radar }: RadarStatsProps) {
  const stats = [
    { label: "Hot feed items", value: radar.hotNews.length },
    { label: "Narratives checked", value: radar.narratives.length },
    { label: "Leader mentions in hot feed", value: hotMentions },
    { label: "Updated", value: formatUpdatedAt(radar.updatedAt), compact: true },
  ];

  return (
    <div className="mt-10 grid gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/80 p-5">
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p
            className={
              stat.compact
                ? "mt-3 text-xl font-semibold text-foreground"
                : "mt-3 text-3xl font-semibold text-foreground"
            }
          >
            {stat.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
