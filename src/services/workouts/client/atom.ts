import { Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { Atom } from "effect/unstable/reactivity";

import { AppApi } from "@/api";
import type { WorkoutPayload } from "../schema";

const runtime = Atom.runtime(FetchHttpClient.layer);

export const workoutDashboardAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(AppApi);
    const workouts = yield* client.workouts.listWorkouts({
      query: { limit: 50 },
    });
    return { workouts };
  }),
);

export const createWorkoutAtom = runtime.fn<WorkoutPayload>()((payload, get) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(AppApi);
    const workout = yield* client.workouts.createWorkout({ payload });
    get.refresh(workoutDashboardAtom);
    return workout;
  }),
);

export const updateWorkoutAtom = runtime.fn<{
  readonly id: string;
  readonly payload: WorkoutPayload;
}>()((input, get) =>
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(AppApi);
    const workout = yield* client.workouts.updateWorkout({
      params: { id: input.id },
      payload: input.payload,
    });
    get.refresh(workoutDashboardAtom);
    return workout;
  }),
);
