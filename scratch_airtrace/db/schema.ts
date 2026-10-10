import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Threshold-based alert signups for the illustrative Airtrace forecast.
 * (email, neighborhood, threshold) is unique so repeated submissions
 * are idempotent: re-signing the same combination is a no-op.
 */
export const alertSubscriptions = pgTable(
  "alert_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    neighborhoodId: text("neighborhood_id").notNull(),
    neighborhoodName: text("neighborhood_name").notNull(),
    threshold: integer("threshold").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("alert_subscriptions_unique").on(
      t.email,
      t.neighborhoodId,
      t.threshold,
    ),
  ],
);
