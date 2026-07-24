import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Effect, FileSystem, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { SaxesParser, type SaxesTagPlain } from "saxes";

import {
  WorkoutDataError,
  WorkoutIndex,
  type Workout as WorkoutType,
} from "@/services/workouts/schema";

const archivePath = "export.zip";
const exportEntry = "apple_health_export/export.xml";
const indexPath = "tmp/apple-health-workouts.json";

type PendingWorkout = {
  activityType: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  sourceName: string;
  indoor: boolean;
  distanceKilometres?: number;
  activeEnergyKilocalories?: number;
  heartRate?: { average: number; minimum: number; maximum: number };
};

const appleDateToIso = (value: string) => {
  const match =
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(value);
  return match
    ? `${match[1]}T${match[2]}${match[3]}:${match[4]}`
    : new Date(value).toISOString();
};

const activityName = (value: string) =>
  value.replace(/^HKWorkoutActivityType/, "");

const finiteNumber = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const importWorkouts = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const workouts: Array<WorkoutType> = [];
  let current: PendingWorkout | undefined;

  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag: SaxesTagPlain) => {
    const attributes = tag.attributes;

    if (tag.name === "Workout") {
      current = {
        activityType: activityName(attributes.workoutActivityType),
        startDate: appleDateToIso(attributes.startDate),
        endDate: appleDateToIso(attributes.endDate),
        durationMinutes: Number(attributes.duration),
        sourceName: attributes.sourceName,
        indoor: false,
      };
      return;
    }

    if (current === undefined) return;

    if (tag.name === "MetadataEntry" && attributes.key === "HKIndoorWorkout") {
      current.indoor = attributes.value === "1";
    }

    if (tag.name !== "WorkoutStatistics") return;

    if (
      attributes.type === "HKQuantityTypeIdentifierDistanceWalkingRunning" ||
      attributes.type === "HKQuantityTypeIdentifierDistanceCycling" ||
      attributes.type === "HKQuantityTypeIdentifierDistanceSwimming"
    ) {
      const distance = finiteNumber(attributes.sum);
      if (distance !== undefined) {
        current.distanceKilometres =
          attributes.unit === "mi"
            ? distance * 1.609344
            : attributes.unit === "m"
              ? distance / 1000
              : distance;
      }
    }

    if (attributes.type === "HKQuantityTypeIdentifierActiveEnergyBurned") {
      current.activeEnergyKilocalories = finiteNumber(attributes.sum);
    }

    if (attributes.type === "HKQuantityTypeIdentifierHeartRate") {
      const average = finiteNumber(attributes.average);
      const minimum = finiteNumber(attributes.minimum);
      const maximum = finiteNumber(attributes.maximum);
      if (
        average !== undefined &&
        minimum !== undefined &&
        maximum !== undefined
      ) {
        current.heartRate = { average, minimum, maximum };
      }
    }
  });
  parser.on("closetag", (tag) => {
    if (tag.name !== "Workout" || current === undefined) return;
    const startMilliseconds = Date.parse(current.startDate);
    workouts.push({ ...current, id: `workout-${startMilliseconds}` });
    current = undefined;
  });

  const process = yield* spawner.spawn(
    ChildProcess.make("unzip", ["-p", archivePath, exportEntry]),
  );
  const decoder = new TextDecoder();
  yield* process.stdout.pipe(
    Stream.runForEach((chunk) =>
      Effect.sync(() => parser.write(decoder.decode(chunk, { stream: true }))),
    ),
  );
  parser.write(decoder.decode()).close();

  const exitCode = yield* process.exitCode;
  if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
    return yield* new WorkoutDataError({
      message: `Could not read ${exportEntry} from ${archivePath}`,
    });
  }

  workouts.sort((left, right) => right.startDate.localeCompare(left.startDate));
  const validated = yield* Schema.decodeUnknownEffect(WorkoutIndex)(workouts);
  const json = yield* Schema.encodeEffect(Schema.fromJsonString(WorkoutIndex))(
    validated,
  );
  yield* fileSystem.makeDirectory("tmp", { recursive: true });
  yield* fileSystem.writeFileString(indexPath, json);
  yield* Console.log(`Indexed ${workouts.length} workouts in ${indexPath}`);
}).pipe(
  Effect.mapError((cause) =>
    cause instanceof WorkoutDataError
      ? cause
      : new WorkoutDataError({ message: "Apple Health import failed", cause }),
  ),
  Effect.scoped,
  Effect.provide(NodeServices.layer),
);

NodeRuntime.runMain(importWorkouts);
