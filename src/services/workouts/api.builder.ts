import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { AppApi } from "@/api";
import { Workouts } from "./index";

const internalServerError = () => new HttpApiError.InternalServerError({});

export const workoutsHandler = HttpApiBuilder.group(
  AppApi,
  "workouts",
  (handlers) =>
    handlers
      .handle("listWorkouts", ({ query }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .list(query)
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("createWorkout", ({ payload }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .create(payload)
            .pipe(Effect.mapError(internalServerError));
        }),
      )
      .handle("updateWorkout", ({ params, payload }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          const workout = yield* workouts
            .update({ id: params.id, payload })
            .pipe(Effect.mapError(internalServerError));
          if (!workout) return yield* new HttpApiError.NotFound({});
          return workout;
        }),
      )
      .handle("summarizeWorkouts", ({ query }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .summary(query)
            .pipe(Effect.mapError(internalServerError));
        }),
      ),
);
