import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";

export const workouts = pgTable("workouts", {
  id: text("id").primaryKey(),
  activityType: text("activity_type").notNull(),
  status: text("status").notNull(),
  startDate: timestamp("start_date", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  endDate: timestamp("end_date", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  durationMinutes: doublePrecision("duration_minutes").notNull(),
  sourceName: text("source_name").notNull(),
  indoor: boolean("indoor").notNull().default(false),
  distanceKilometres: doublePrecision("distance_kilometres"),
  activeEnergyKilocalories: doublePrecision("active_energy_kilocalories"),
  heartRateAverage: doublePrecision("heart_rate_average"),
  heartRateMinimum: doublePrecision("heart_rate_minimum"),
  heartRateMaximum: doublePrecision("heart_rate_maximum"),
  notes: text("notes"),
  imported: boolean("imported").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const relations = defineRelations({ workouts });
