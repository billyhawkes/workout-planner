import { Schema } from "effect";

export const HeartRate = Schema.Struct({
  average: Schema.Number,
  minimum: Schema.Number,
  maximum: Schema.Number,
}).annotate({ identifier: "HeartRate" });

export const Workout = Schema.Struct({
  id: Schema.String,
  activityType: Schema.String,
  status: Schema.Union([
    Schema.Literal("planned"),
    Schema.Literal("completed"),
  ]),
  startDate: Schema.String,
  endDate: Schema.String,
  durationMinutes: Schema.Number,
  sourceName: Schema.String,
  indoor: Schema.Boolean,
  distanceKilometres: Schema.optional(Schema.Number),
  activeEnergyKilocalories: Schema.optional(Schema.Number),
  heartRate: Schema.optional(HeartRate),
  notes: Schema.optional(Schema.String),
}).annotate({ identifier: "Workout" });

export const WorkoutIndex = Schema.Array(Workout).annotate({
  identifier: "WorkoutIndex",
});

export const WorkoutListQuery = Schema.Struct({
  limit: Schema.optional(Schema.Number),
  activityType: Schema.optional(Schema.String),
  after: Schema.optional(Schema.String),
  before: Schema.optional(Schema.String),
}).annotate({ identifier: "WorkoutListQuery" });

export const WorkoutSummaryQuery = Schema.Struct({
  days: Schema.optional(Schema.Number),
}).annotate({ identifier: "WorkoutSummaryQuery" });

export const WorkoutSummary = Schema.Struct({
  days: Schema.Number,
  workoutCount: Schema.Number,
  totalDurationMinutes: Schema.Number,
  totalDistanceKilometres: Schema.Number,
  totalActiveEnergyKilocalories: Schema.Number,
  byActivityType: Schema.Record(Schema.String, Schema.Number),
}).annotate({ identifier: "WorkoutSummary" });

export const WorkoutPayload = Schema.Struct({
  activityType: Schema.NonEmptyString,
  status: Schema.Union([
    Schema.Literal("planned"),
    Schema.Literal("completed"),
  ]),
  startDate: Schema.NonEmptyString,
  durationMinutes: Schema.Number,
  indoor: Schema.optional(Schema.Boolean),
  distanceKilometres: Schema.optional(Schema.Number),
  notes: Schema.optional(Schema.String),
}).annotate({ identifier: "WorkoutPayload" });

export const WorkoutIdParams = Schema.Struct({
  id: Schema.String,
}).annotate({ identifier: "WorkoutIdParams" });

export class WorkoutDataError extends Schema.TaggedErrorClass<WorkoutDataError>()(
  "WorkoutDataError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) },
) {}

export type Workout = typeof Workout.Type;
export type WorkoutPayload = typeof WorkoutPayload.Type;
export type WorkoutSummary = typeof WorkoutSummary.Type;
