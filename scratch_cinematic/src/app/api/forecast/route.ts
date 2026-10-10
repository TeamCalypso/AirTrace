import { db } from "@/db";
import { forecastRuns, neighborhoods } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { buildForecast } from "@/lib/forecast";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** GET /api/forecast?slug=dwarka  |  ?lat=28.6&lng=77.2&label=Dwarka */
export async function GET(request: Request) {
  await ensureSeeded();
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  let label = url.searchParams.get("label") ?? "Your location";
  let profile = "dense";
  let baseline = 0;
  let resolvedLat = lat;
  let resolvedLng = lng;
  let neighborhoodSlug: string | null = slug;

  if (slug) {
    try {
      const [row] = await db.select().from(neighborhoods).where(eq(neighborhoods.slug, slug)).limit(1);
      if (row) {
        label = row.name;
        profile = row.profile;
        baseline = row.baselinePm25;
        resolvedLat = row.lat;
        resolvedLng = row.lng;
      }
    } catch {
      /* fall through to raw coordinates */
    }
  }

  if (!Number.isFinite(resolvedLat) || !Number.isFinite(resolvedLng)) {
    // default: the capital itself
    resolvedLat = 28.6139;
    resolvedLng = 77.209;
  }

  const forecast = buildForecast({
    label,
    lat: resolvedLat,
    lng: resolvedLng,
    baseline,
    profile,
  });

  // cache for share links + the alert worker (best effort, never blocks)
  try {
    await db
      .insert(forecastRuns)
      .values({
        slug: `${neighborhoodSlug ?? "custom"}-${Math.round(resolvedLat * 100)}-${Math.round(resolvedLng * 100)}`,
        neighborhoodSlug,
        label,
        lat: resolvedLat,
        lng: resolvedLng,
        peakPm25: forecast.peak.pm25,
        peakAqi: forecast.peak.aqi,
        payload: { peak: forecast.peak, transport: forecast.transport },
      })
      .onConflictDoUpdate({
        target: forecastRuns.slug,
        set: { peakPm25: forecast.peak.pm25, peakAqi: forecast.peak.aqi, payload: { peak: forecast.peak, transport: forecast.transport } },
      });
  } catch {
    /* table may not exist yet */
  }

  return Response.json({
    ...forecast,
    neighborhoodSlug,
    baseline,
    profile,
  });
}
