import { NextResponse } from "next/server";
import { searchNeighborhoods } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=
 * Neighborhood suggestions for the Delhi–NCR demo dataset.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length > 60) {
    return NextResponse.json(
      { error: "Query too long." },
      { status: 400 },
    );
  }
  const results = searchNeighborhoods(q).map((n) => ({
    id: n.id,
    name: n.name,
    zone: n.zone,
    lat: n.lat,
    lng: n.lng,
  }));
  return NextResponse.json({ demo: true, results });
}
