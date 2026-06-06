import {
  Bitcoin,
  Bot,
  Building2,
  Coins,
  Layers,
  Radar,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type NarrativeIconMeta = {
  icon: LucideIcon;
  color: string;
  bg: string;
};

const narrativeIconMap: Record<string, NarrativeIconMeta> = {
  ai: { icon: Bot, color: "text-violet-400", bg: "bg-violet-400/10" },
  "bitcoin-etf": { icon: Bitcoin, color: "text-amber-400", bg: "bg-amber-400/10" },
  rwa: { icon: Building2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  defi: { icon: Coins, color: "text-sky-400", bg: "bg-sky-400/10" },
  stablecoin: { icon: Shield, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  "layer-2": { icon: Layers, color: "text-orange-400", bg: "bg-orange-400/10" },
};

const fallbackMeta: NarrativeIconMeta = {
  icon: Radar,
  color: "text-primary",
  bg: "bg-primary/10",
};

export function getNarrativeIcon(id: string): NarrativeIconMeta {
  return narrativeIconMap[id] ?? fallbackMeta;
}

export function getNarrativeHeadline(narrative: {
  latestTitle?: string;
  items?: Array<{ title?: string }>;
}) {
  const fromLatest = narrative.latestTitle?.trim();
  if (fromLatest) {
    return fromLatest;
  }

  return narrative.items?.[0]?.title?.trim() ?? "No headline matched this theme yet.";
}
