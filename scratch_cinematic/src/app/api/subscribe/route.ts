import { db } from "@/db";
import { alertEvents, forecastRuns, subscribers } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { and, eq, gt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9]{10,14}$/;

export async function GET() {
  try {
    await ensureSeeded();
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers);
    return Response.json({ subscribers: row?.count ?? 0 });
  } catch {
    return Response.json({ subscribers: 0 });
  }
}

export async function POST(request: Request) {
  await ensureSeeded();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const contact = String(body.contact ?? "").trim();
  const channel = contact.startsWith("+") || /^[0-9]{10}$/.test(contact) ? "whatsapp" : "email";
  const aqiThreshold = Math.min(500, Math.max(50, Number(body.aqiThreshold ?? 200) || 200));
  const neighborhoodSlug = body.neighborhoodSlug ? String(body.neighborhoodSlug) : null;
  const neighborhoodName = body.neighborhoodName ? String(body.neighborhoodName) : null;
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!EMAIL.test(contact) && !PHONE.test(contact)) {
    return Response.json(
      { ok: false, error: "Enter a valid email address or a phone number in +91XXXXXXXXXX format." },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(subscribers)
      .where(and(eq(subscribers.contact, contact), neighborhoodSlug ? eq(subscribers.neighborhoodSlug, neighborhoodSlug) : sql`true`))
      .limit(1);

    if (existing) {
      return Response.json({
        ok: true,
        alreadySubscribed: true,
        message: `${contact} is already watching ${neighborhoodName ?? "this area"}.`,
        id: existing.id,
      });
    }

    const [row] = await db
      .insert(subscribers)
      .values({
        contact,
        channel,
        neighborhoodSlug,
        neighborhoodName,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        aqiThreshold,
        morningBriefing: body.morningBriefing === false ? false : true,
        source: String(body.source ?? "journey"),
      })
      .returning();

    // Log a preview alert if the cached forecast for this place crosses the bar.
    let alertMessage: string | null = null;
    if (neighborhoodSlug) {
      const [run] = await db
        .select()
        .from(forecastRuns)
        .where(and(eq(forecastRuns.neighborhoodSlug, neighborhoodSlug), gt(forecastRuns.peakAqi, aqiThreshold)))
        .limit(1);
      if (run) {
        alertMessage = `Forecast for ${run.label}: peak AQI ${run.peakAqi} exceeds your ${aqiThreshold} threshold.`;
        await db.insert(alertEvents).values({
          subscriberId: row.id,
          neighborhoodSlug,
          peakAqi: run.peakAqi,
          message: alertMessage,
        });
      }
    }

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(subscribers);

    return Response.json({
      ok: true,
      id: row.id,
      channel,
      subscribers: countRow?.count ?? 1,
      alertMessage,
      message: `Locked in. We'll ping ${channel === "email" ? "your inbox" : "WhatsApp"} when ${neighborhoodName ?? "your area"} is forecast to cross AQI ${aqiThreshold}.`,
    });
  } catch {
    return Response.json(
      { ok: false, error: "Could not save that right now — the database is warming up. Try again in a moment." },
      { status: 500 }
    );
  }
}
