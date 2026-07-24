import { and, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";

import { workouts as workoutTable } from "@/db/schema";
import { DB } from "@/services/database";
import {
  WorkoutDataError,
  type Workout,
  type WorkoutPayload,
  type WorkoutSummary,
} from "./schema";

type ListInput = {
  readonly limit?: number;
  readonly activityType?: string;
  readonly after?: string;
  readonly before?: string;
};

const databaseError = (message: string) => (cause: unknown) =>
  new WorkoutDataError({ message, cause });

const plannedWorkoutMatchWindowMs = 12 * 60 * 60 * 1000;

const fromRow = (row: typeof workoutTable.$inferSelect): Workout => ({
  id: row.id,
  activityType: row.activityType,
  status: row.status === "planned" ? "planned" : "completed",
  startDate: row.startDate,
  endDate: row.endDate,
  durationMinutes: row.durationMinutes,
  sourceName: row.sourceName,
  indoor: row.indoor,
  ...(row.distanceKilometres === null
    ? {}
    : { distanceKilometres: row.distanceKilometres }),
  ...(row.activeEnergyKilocalories === null
    ? {}
    : { activeEnergyKilocalories: row.activeEnergyKilocalories }),
  ...(row.heartRateAverage === null ||
  row.heartRateMinimum === null ||
  row.heartRateMaximum === null
    ? {}
    : {
        heartRate: {
          average: row.heartRateAverage,
          minimum: row.heartRateMinimum,
          maximum: row.heartRateMaximum,
        },
      }),
  ...(row.notes === null ? {} : { notes: row.notes }),
});

const payloadValues = (payload: WorkoutPayload) => ({
  activityType: payload.activityType.trim(),
  status: payload.status,
  startDate: payload.startDate,
  endDate: new Date(
    Date.parse(payload.startDate) + payload.durationMinutes * 60_000,
  ).toISOString(),
  durationMinutes: payload.durationMinutes,
  sourceName: "Manual",
  indoor: payload.indoor ?? false,
  distanceKilometres: payload.distanceKilometres ?? null,
  notes: payload.notes?.trim() || null,
  imported: false,
  updatedAt: new Date().toISOString(),
});

export type WorkoutsService = {
  readonly list: (
    input: ListInput,
  ) => Effect.Effect<ReadonlyArray<Workout>, WorkoutDataError>;
  readonly summary: (input: {
    readonly days?: number;
  }) => Effect.Effect<WorkoutSummary, WorkoutDataError>;
  readonly create: (
    payload: WorkoutPayload,
  ) => Effect.Effect<Workout, WorkoutDataError>;
  readonly update: (input: {
    readonly id: string;
    readonly payload: WorkoutPayload;
  }) => Effect.Effect<Workout | undefined, WorkoutDataError>;
  readonly import: (
    items: ReadonlyArray<Workout>,
  ) => Effect.Effect<number, WorkoutDataError>;
};

const make = Effect.gen(function* () {
  const db = yield* DB;

  const list = Effect.fn("Workouts.list")((input: ListInput) => {
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 500);
    const filters = [
      input.activityType
        ? ilike(workoutTable.activityType, input.activityType)
        : undefined,
      input.after ? gte(workoutTable.startDate, input.after) : undefined,
      input.before ? lte(workoutTable.startDate, input.before) : undefined,
    ].filter((filter) => filter !== undefined);

    return db
      .select()
      .from(workoutTable)
      .where(filters.length === 0 ? undefined : and(...filters))
      .orderBy(desc(workoutTable.startDate))
      .limit(limit)
      .pipe(
        Effect.map((rows) => rows.map(fromRow)),
        Effect.mapError(databaseError("Could not load workouts")),
      );
  });

  const summary = Effect.fn("Workouts.summary")((input: {
    readonly days?: number;
  }) => {
    const days = Math.min(Math.max(input.days ?? 28, 1), 3650);
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    return db
      .select()
      .from(workoutTable)
      .where(
        and(
          gte(workoutTable.startDate, cutoff),
          eq(workoutTable.status, "completed"),
        ),
      )
      .pipe(
        Effect.map((rows) => {
          const byActivityType: Record<string, number> = {};
          for (const row of rows) {
            byActivityType[row.activityType] =
              (byActivityType[row.activityType] ?? 0) + 1;
          }
          return {
            days,
            workoutCount: rows.length,
            totalDurationMinutes: rows.reduce(
              (total, row) => total + row.durationMinutes,
              0,
            ),
            totalDistanceKilometres: rows.reduce(
              (total, row) => total + (row.distanceKilometres ?? 0),
              0,
            ),
            totalActiveEnergyKilocalories: rows.reduce(
              (total, row) => total + (row.activeEnergyKilocalories ?? 0),
              0,
            ),
            byActivityType,
          };
        }),
        Effect.mapError(databaseError("Could not summarize workouts")),
      );
  });

  const create = Effect.fn("Workouts.create")((payload: WorkoutPayload) =>
    db
      .insert(workoutTable)
      .values({ id: crypto.randomUUID(), ...payloadValues(payload) })
      .returning()
      .pipe(
        Effect.map(([row]) => fromRow(row!)),
        Effect.mapError(databaseError("Could not create workout")),
      ),
  );

  const update = Effect.fn("Workouts.update")(
    ({
      id,
      payload,
    }: {
      readonly id: string;
      readonly payload: WorkoutPayload;
    }) =>
      db
        .update(workoutTable)
        .set(payloadValues(payload))
        .where(eq(workoutTable.id, id))
        .returning()
        .pipe(
          Effect.map(([row]) => (row ? fromRow(row) : undefined)),
          Effect.mapError(databaseError("Could not update workout")),
        ),
  );

  const importWorkouts = Effect.fn("Workouts.import")((
    items: ReadonlyArray<Workout>,
  ) => {
    if (items.length === 0) return Effect.succeed(0);
    return db
      .transaction((tx) =>
        Effect.gen(function* () {
          const existingImports = yield* tx
            .select({ id: workoutTable.id })
            .from(workoutTable)
            .where(eq(workoutTable.imported, true));
          const existingImportIds = new Set(
            existingImports.map((workout) => workout.id),
          );
          const plannedWorkouts = yield* tx
            .select({
              id: workoutTable.id,
              activityType: workoutTable.activityType,
              startDate: workoutTable.startDate,
              notes: workoutTable.notes,
            })
            .from(workoutTable)
            .where(eq(workoutTable.status, "planned"));

          const usedPlanIds = new Set<string>();
          const matchedPlans = new Map<
            string,
            (typeof plannedWorkouts)[number]
          >();
          for (const workout of items) {
            if (existingImportIds.has(workout.id)) continue;

            const workoutStart = Date.parse(workout.startDate);
            let closestPlan: (typeof plannedWorkouts)[number] | undefined;
            let closestDifference = plannedWorkoutMatchWindowMs + 1;
            for (const plan of plannedWorkouts) {
              if (
                usedPlanIds.has(plan.id) ||
                plan.activityType.trim().toLowerCase() !==
                  workout.activityType.trim().toLowerCase()
              ) {
                continue;
              }

              const difference = Math.abs(
                Date.parse(plan.startDate) - workoutStart,
              );
              if (
                difference <= plannedWorkoutMatchWindowMs &&
                difference < closestDifference
              ) {
                closestPlan = plan;
                closestDifference = difference;
              }
            }

            if (closestPlan) {
              usedPlanIds.add(closestPlan.id);
              matchedPlans.set(workout.id, closestPlan);
            }
          }

          if (usedPlanIds.size > 0) {
            yield* tx
              .delete(workoutTable)
              .where(inArray(workoutTable.id, Array.from(usedPlanIds)));
          }

          const updatedAt = new Date().toISOString();
          yield* tx
            .insert(workoutTable)
            .values(
              items.map((workout) => ({
                id: workout.id,
                activityType: workout.activityType,
                status: "completed",
                startDate: workout.startDate,
                endDate: workout.endDate,
                durationMinutes: workout.durationMinutes,
                sourceName: workout.sourceName,
                indoor: workout.indoor,
                distanceKilometres: workout.distanceKilometres ?? null,
                activeEnergyKilocalories:
                  workout.activeEnergyKilocalories ?? null,
                heartRateAverage: workout.heartRate?.average ?? null,
                heartRateMinimum: workout.heartRate?.minimum ?? null,
                heartRateMaximum: workout.heartRate?.maximum ?? null,
                notes:
                  workout.notes ?? matchedPlans.get(workout.id)?.notes ?? null,
                imported: true,
                updatedAt,
              })),
            )
            .onConflictDoUpdate({
              target: workoutTable.id,
              set: {
                activityType: sql`excluded.activity_type`,
                status: "completed",
                startDate: sql`excluded.start_date`,
                endDate: sql`excluded.end_date`,
                durationMinutes: sql`excluded.duration_minutes`,
                sourceName: sql`excluded.source_name`,
                indoor: sql`excluded.indoor`,
                distanceKilometres: sql`coalesce(excluded.distance_kilometres, ${workoutTable.distanceKilometres})`,
                activeEnergyKilocalories: sql`coalesce(excluded.active_energy_kilocalories, ${workoutTable.activeEnergyKilocalories})`,
                heartRateAverage: sql`coalesce(excluded.heart_rate_average, ${workoutTable.heartRateAverage})`,
                heartRateMinimum: sql`coalesce(excluded.heart_rate_minimum, ${workoutTable.heartRateMinimum})`,
                heartRateMaximum: sql`coalesce(excluded.heart_rate_maximum, ${workoutTable.heartRateMaximum})`,
                imported: true,
                updatedAt,
              },
            });

          return items.length;
        }),
      )
      .pipe(Effect.mapError(databaseError("Could not import workouts")));
  });

  return {
    list,
    summary,
    create,
    update,
    import: importWorkouts,
  } satisfies WorkoutsService;
});

export class Workouts extends Context.Service<Workouts, WorkoutsService>()(
  "Workouts",
) {}

export const WorkoutsLive = Layer.effect(Workouts, make);
