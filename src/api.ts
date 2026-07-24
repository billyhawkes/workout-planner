import { HttpApi, OpenApi } from "effect/unstable/httpapi";

import { WorkoutsApiGroup } from "@/services/workouts/api.group";

export const AppApi = HttpApi.make("AppApi")
  .annotateMerge(
    OpenApi.annotations({
      title: "Training Ledger API",
      version: "1.0.0",
      description: "Read-only Apple Health workout data indexed locally.",
    }),
  )
  .add(WorkoutsApiGroup)
  .prefix("/api");
