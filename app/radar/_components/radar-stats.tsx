import { Clock3, Flame, Radio, Search } from "lucide-react";

import { StatCell, StatGrid } from "@/components/ui/stat";
import type { RadarData } from "@/lib/sosovalue";

import { formatUpdatedAt } from "./radar-utils";

type RadarStatsProps = {
  hotMentions: number;
  radar: RadarData;
};

export function RadarStats({ hotMentions, radar }: RadarStatsProps) {
  return (
    <StatGrid className="mt-4">
      <StatCell label="Hot feed" help="Live tape items" icon={Flame} value={radar.hotNews.length} />
      <StatCell label="Narratives" help="Tracked themes" icon={Radio} value={radar.narratives.length} />
      <StatCell label="Leader hits" help="Hot news mentions" icon={Search} value={hotMentions} />
      <StatCell
        label="Updated"
        help="Last radar refresh"
        icon={Clock3}
        value={formatUpdatedAt(radar.updatedAt)}
        valueClassName="text-base"
      />
    </StatGrid>
  );
}
