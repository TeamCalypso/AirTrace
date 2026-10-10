import { NextResponse } from "next/server";
import { buildForecast } from "@/lib/forecast";
import { findNeighborhood } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

/**
 * GET /api/forecast?id=karol-bagh | ?name=Karol Bagh
 * Returns a deterministic illustrative 48-hour scenario.
 * Replace `buildForecast` with a validated upstream provider
 * (TROPOMI + ERA5 + CPCB monitors) behind this same contract.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("id") ?? url.searchParams.get("name") ?? "";
  const neighborhood = findNeighborhood(q);
  if (!neighborhood) {
    return NextResponse.json(
      {
        error:
          "Location not found in the illustrative Delhi–NCR dataset. Try one of the quick picks.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: buildForecast(neighborhood) });
}
