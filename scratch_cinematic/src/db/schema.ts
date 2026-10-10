import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Hyper-local places inside Delhi-NCR that a user can search for. */
export const neighborhoods = pgTable(
  "neighborhoods",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    // Broad area shown as a chip, e.g. "South West Delhi"
    district: text("district").notNull(),
    state: text("state").notNull().default("Delhi"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    population: integer("population"),
    /** micro-environment modifier on top of the regional PM2.5 signal */
    baselinePm25: doublePrecision("baseline_pm25").notNull().default(0),
    /** arterial | industrial | ridge | riverside | dense | suburb | corridor */
    profile: text("profile").notNull().default("dense"),
  },
  (table) => [
    uniqueIndex("neighborhoods_slug_idx").on(table.slug),
    index("neighborhoods_name_idx").on(table.name),
  ],
);

/** Alert signups captured in the final scene. */
export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    contact: text("contact").notNull(),
    channel: text("channel").notNull().default("email"),
    neighborhoodSlug: text("neighborhood_slug"),
    neighborhoodName: text("neighborhood_name"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    aqiThreshold: integer("aqi_threshold").notNull().default(200),
    morningBriefing: boolean("morning_briefing").notNull().default(true),
    source: text("source").notNull().default("journey"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("subscribers_contact_idx").on(table.contact)],
);

/** Cached 48h forecast so a shared link reproduces the exact numbers. */
export const forecastRuns = pgTable(
  "forecast_runs",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    neighborhoodSlug: text("neighborhood_slug"),
    label: text("label").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    peakPm25: doublePrecision("peak_pm25").notNull(),
    peakAqi: integer("peak_aqi").notNull(),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("forecast_runs_slug_idx").on(table.slug)],
);

/** Alert log — filled when a cached run crosses a subscriber's threshold. */
export const alertEvents = pgTable("alert_events", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id"),
  neighborhoodSlug: text("neighborhood_slug"),
  peakAqi: integer("peak_aqi").notNull(),
  message: text("message").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Neighborhood = typeof neighborhoods.$inferSelect;
export type NewNeighborhood = typeof neighborhoods.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type ForecastRun = typeof forecastRuns.$inferSelect;
