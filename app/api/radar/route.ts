import { getRadarData } from "@/lib/sosovalue";

export const dynamic = "force-dynamic";

export async function GET() {
  const radar = await getRadarData();

  return Response.json(radar);
}
