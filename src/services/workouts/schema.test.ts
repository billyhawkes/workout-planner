import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { Workout, WorkoutListQuery } from "./schema";

describe("workout schemas", () => {
  it("decodes typed API query input", () => {
    expect(
      Schema.decodeUnknownSync(WorkoutListQuery)({
        limit: 4,
        activityType: "Running",
      }),
    ).toEqual({ limit: 4, activityType: "Running" });
  });

  it("accepts a compact imported workout", () => {
    expect(
      Schema.decodeUnknownSync(Workout)({
        id: "workout-1",
        activityType: "Running",
        startDate: "2026-07-22T09:00:00-04:00",
        endDate: "2026-07-22T09:30:00-04:00",
        durationMinutes: 30,
        sourceName: "Apple Watch",
        indoor: false,
        distanceKilometres: 5,
      }),
    ).toMatchObject({ activityType: "Running", distanceKilometres: 5 });
  });
});
