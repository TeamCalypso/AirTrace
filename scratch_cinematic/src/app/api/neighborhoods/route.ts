import { db } from "@/db";
import { neighborhoods } from "@/db/schema";
import { NEIGHBORHOOD_SEED, ensureSeeded, slugify } from "@/db/seed";
import { haversine } from "@/lib/geo";
import { and, asc, ilike, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export type NeighborhoodHit = {
  slug: string;
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  profile: string;
  baselinePm25: number;
  distanceKm?: number;
};

export async function GET(request: Request) {
  await ensureSeeded();
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  try {
    // --- nearest-neighbour lookup ("use my location") -------------------
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      const rows = await db.select().from(neighborhoods);
      const ranked = rows
        .map((r) => ({ ...r, distanceKm: haversine(lat, lng, r.lat, r.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 6)
        .map<NeighborhoodHit>((r) => ({
          slug: r.slug,
          name: r.name,
          district: r.district,
          state: r.state,
          lat: r.lat,
          lng: r.lng,
          profile: r.profile,
          baselinePm25: r.baselinePm25,
          distanceKm: Math.round(r.distanceKm),
        }));
      return Response.json({ query: "", mode: "geo", results: ranked });
    }

    if (!q) {
      const rows = await db
        .select()
        .from(neighborhoods)
        .orderBy(sql`population desc nulls last`)
        .limit(6);
      return Response.json({
        query: "",
        mode: "popular",
        results: rows.map<NeighborhoodHit>((r) => ({
          slug: r.slug,
          name: r.name,
          district: r.district,
          state: r.state,
          lat: r.lat,
          lng: r.lng,
          profile: r.profile,
          baselinePm25: r.baselinePm25,
        })),
      });
    }

    const like = `%${q}%`;
    const rows = await db
      .select()
      .from(neighborhoods)
      .where(
        or(
          ilike(neighborhoods.name, like),
          ilike(neighborhoods.district, like),
          ilike(neighborhoods.state, like),
          and(ilike(neighborhoods.name, `${q}%`))
        )
      )
      .orderBy(asc(sql`case when ${neighborhoods.name} = ${q} then 0 when ${neighborhoods.name} ilike ${q + "%"} then 1 else 2 end`), sql`population desc nulls last`)
      .limit(8);

    return Response.json({
      query: q,
      mode: "search",
      results: rows.map<NeighborhoodHit>((r) => ({
        slug: r.slug,
        name: r.name,
        district: r.district,
        state: r.state,
        lat: r.lat,
        lng: r.lng,
        profile: r.profile,
        baselinePm25: r.baselinePm25,
      })),
    });
  } catch {
    // DB not ready: fall back to the static seed list so the demo still works.
    const lowered = q.toLowerCase();
    const results = NEIGHBORHOOD_SEED.filter((n) => !q || (n.name ?? "").toLowerCase().includes(lowered))
      .slice(0, 8)
      .map<NeighborhoodHit>((n) => ({
        slug: slugify(n.name ?? ""),
        name: n.name ?? "",
        district: n.district ?? "",
        state: n.state ?? "Delhi",
        lat: n.lat ?? 28.6139,
        lng: n.lng ?? 77.209,
        profile: n.profile ?? "dense",
        baselinePm25: n.baselinePm25 ?? 0,
      }));
    return Response.json({ query: q, mode: "static", results });
  }
}
