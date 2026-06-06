import { redirect } from "next/navigation";

import { getRadarData } from "@/lib/sosovalue";

export const dynamic = "force-dynamic";

export default async function SodexEntryPage() {
  const radar = await getRadarData();
  const topNarrative = radar.narratives[0];

  if (topNarrative) {
    redirect(`/narratives/${topNarrative.id}?tab=launch`);
  }

  redirect("/radar");
}
