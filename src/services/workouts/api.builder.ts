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
      .handle("summarizeWorkouts", ({ query }) =>
        Effect.gen(function* () {
          const workouts = yield* Workouts;
          return yield* workouts
            .summary(query)
            .pipe(Effect.mapError(internalServerError));
        }),
      ),
);
