import { Context, Effect, FileSystem, Layer, Schema } from "effect";

import {
  WorkoutDataError,
  WorkoutIndex,
  type Workout,
  type WorkoutSummary,
} from "./schema";

const indexPath = "tmp/apple-health-workouts.json";

export type WorkoutsService = {
  readonly list: (input: {
    readonly limit?: number;
    readonly activityType?: string;
    readonly after?: string;
    readonly before?: string;
  }) => Effect.Effect<ReadonlyArray<Workout>>;
  readonly summary: (input: {
    readonly days?: number;
  }) => Effect.Effect<WorkoutSummary>;
};

const make = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const json = yield* fileSystem.readFileString(indexPath).pipe(
    Effect.mapError(
      (cause) =>
        new WorkoutDataError({
          message: `Workout index not found. Run bun run health:import first.`,
          cause,
        }),
    ),
  );
  const workouts = yield* Schema.decodeUnknownEffect(
    Schema.fromJsonString(WorkoutIndex),
  )(json).pipe(
    Effect.mapError(
      (cause) =>
        new WorkoutDataError({
          message: "Workout index is invalid. Run bun run health:import again.",
          cause,
        }),
    ),
  );

  const list = Effect.fn("Workouts.list")(
    (input: {
      readonly limit?: number;
      readonly activityType?: string;
      readonly after?: string;
      readonly before?: string;
    }) =>
      Effect.sync(() => {
        const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
        const activityType = input.activityType?.toLowerCase();

        return workouts
          .filter(
            (workout) =>
              (activityType === undefined ||
                workout.activityType.toLowerCase() === activityType) &&
              (input.after === undefined || workout.startDate >= input.after) &&
              (input.before === undefined || workout.startDate <= input.before),
          )
          .slice(0, limit);
      }),
  );

  const summary = Effect.fn("Workouts.summary")(
    (input: { readonly days?: number }) =>
      Effect.sync(() => {
        const days = Math.min(Math.max(input.days ?? 28, 1), 3650);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const selected = workouts.filter(
          (workout) => Date.parse(workout.startDate) >= cutoff,
        );
        const byActivityType: Record<string, number> = {};

        for (const workout of selected) {
          byActivityType[workout.activityType] =
            (byActivityType[workout.activityType] ?? 0) + 1;
        }

        return {
          days,
          workoutCount: selected.length,
          totalDurationMinutes: selected.reduce(
            (total, workout) => total + workout.durationMinutes,
            0,
          ),
          totalDistanceKilometres: selected.reduce(
            (total, workout) => total + (workout.distanceKilometres ?? 0),
            0,
          ),
          totalActiveEnergyKilocalories: selected.reduce(
            (total, workout) => total + (workout.activeEnergyKilocalories ?? 0),
            0,
          ),
          byActivityType,
        };
      }),
  );

  return { list, summary } satisfies WorkoutsService;
});

export class Workouts extends Context.Service<Workouts, WorkoutsService>()(
  "Workouts",
) {}

export const WorkoutsLive = Layer.effect(Workouts, make);
