import { Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { Atom } from "effect/unstable/reactivity";

import { AppApi } from "@/api";

const runtime = Atom.runtime(FetchHttpClient.layer);

export const workoutDashboardAtom = runtime.atom(
  Effect.gen(function* () {
    const client = yield* HttpApiClient.make(AppApi);
    const [workouts, summary] = yield* Effect.all([
      client.workouts.listWorkouts({ query: { limit: 50 } }),
      client.workouts.summarizeWorkouts({ query: { days: 28 } }),
    ]);
    return { workouts, summary };
  }),
);
