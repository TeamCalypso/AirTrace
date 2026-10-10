import { NextResponse } from "next/server";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { validateAlertPayload } from "@/lib/validation";
import { findNeighborhood } from "@/lib/neighborhoods";

export const dynamic = "force-dynamic";

/**
 * POST /api/alerts
 * { email, neighborhoodId, neighborhoodName?, threshold }
 *
 * Idempotent: the unique (email, neighborhood, threshold) index means a
 * repeated submission returns created:false instead of inserting a row.
 * Note: the prototype stores the intent only — no real-time warnings
 * are sent by this build.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const result = validateAlertPayload(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const { email, neighborhoodId, neighborhoodName, threshold } = result.data;
  const neighborhood = findNeighborhood(neighborhoodId);
  if (!neighborhood) {
    return NextResponse.json(
      { ok: false, error: "Unknown neighborhood id." },
      { status: 400 },
    );
  }

  try {
    const rows = await db
      .insert(alertSubscriptions)
      .values({
        email,
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        threshold,
      })
      .onConflictDoNothing()
      .returning({ email: alertSubscriptions.email });

    if (rows.length > 0) {
      return NextResponse.json(
        {
          ok: true,
          created: true,
          email,
          neighborhood: neighborhood.name,
          threshold,
          message: `You're on the list for ${neighborhood.name} at AQI ≥ ${threshold}.`,
          note: "Demo prototype: signups are stored but no real-time warnings are sent.",
        },
        { status: 201 },
      );
    }
    return NextResponse.json({
      ok: true,
      created: false,
      email,
      neighborhood: neighborhood.name,
      threshold,
      message: `You're already set up for ${neighborhood.name} at AQI ≥ ${threshold}.`,
      note: "Demo prototype: signups are stored but no real-time warnings are sent.",
    });
  } catch (err) {
    console.error("alert signup failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not save your signup. Please try again." },
      { status: 500 },
    );
  }
}
