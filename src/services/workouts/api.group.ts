import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";

import {
  Workout,
  WorkoutIdParams,
  WorkoutListQuery,
  WorkoutPayload,
  WorkoutSummary,
  WorkoutSummaryQuery,
} from "./schema";

export const WorkoutsApiGroup = HttpApiGroup.make("workouts")
  .add(
    HttpApiEndpoint.get("listWorkouts", "/workouts", {
      query: WorkoutListQuery,
      success: Schema.Array(Workout),
      error: HttpApiError.InternalServerError,
    })
      .annotate(OpenApi.Summary, "List Apple Health workouts")
      .annotate(
        OpenApi.Description,
        "Returns recent workouts from the local Apple Health export index, with optional activity and date filters.",
      ),
  )
  .add(
    HttpApiEndpoint.post("createWorkout", "/workouts", {
      payload: WorkoutPayload,
      success: Workout,
      error: HttpApiError.InternalServerError,
    }).annotate(OpenApi.Summary, "Create a workout or planned session"),
  )
  .add(
    HttpApiEndpoint.patch("updateWorkout", "/workouts/:id", {
      params: WorkoutIdParams,
      payload: WorkoutPayload,
      success: Workout,
      error: [HttpApiError.NotFound, HttpApiError.InternalServerError],
    }).annotate(OpenApi.Summary, "Update a workout or planned session"),
  )
  .add(
    HttpApiEndpoint.get("summarizeWorkouts", "/workouts/summary", {
      query: WorkoutSummaryQuery,
      success: WorkoutSummary,
      error: HttpApiError.InternalServerError,
    })
      .annotate(OpenApi.Summary, "Summarize Apple Health workouts")
      .annotate(
        OpenApi.Description,
        "Aggregates workout count, duration, distance, active energy, and activity types over a requested number of days.",
      ),
  );
