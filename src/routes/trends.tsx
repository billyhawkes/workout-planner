import { useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { CalendarCheck, Footprints, Gauge } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SidebarPageHeader } from "@/components/ui/sidebar-layout";
import { StatsCard } from "@/components/ui/stats-card";
import { m } from "@/paraglide/messages";
import { workoutDashboardAtom } from "@/services/workouts/client/atom";
import { PaceChart } from "@/services/workouts/client/pace-chart";

const TrendsSearch = Schema.Struct({
  activity: Schema.optional(
    Schema.Union([Schema.Literal("running"), Schema.Literal("cycling")]),
  ),
  metric: Schema.optional(
    Schema.Union([Schema.Literal("pace"), Schema.Literal("distance")]),
  ),
}).annotate({ identifier: "TrendsSearch" });

export const Route = createFileRoute("/trends")({
  validateSearch: Schema.toStandardSchemaV1(TrendsSearch),
  component: TrendsPage,
});

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const formatPace = (pace: number) => {
  const totalSeconds = Math.round(pace * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

function TrendsPage() {
  const result = useAtomValue(workoutDashboardAtom);
  const { activity = "running", metric = "pace" } = Route.useSearch();
  const navigate = useNavigate({ from: "/trends" });

  return AsyncResult.match(result, {
    onInitial: () => <main className="min-h-96" />,
    onFailure: () => <p className="py-12 text-center">{m.load_error()}</p>,
    onSuccess: ({ value: { workouts } }) => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const completedThisWeek = workouts.filter((workout) => {
        const start = new Date(workout.startDate);
        return (
          workout.status === "completed" &&
          start >= weekStart &&
          start < weekEnd
        );
      });
      const runningDistance = completedThisWeek.reduce(
        (total, workout) =>
          total +
          (workout.activityType === "Running"
            ? (workout.distanceKilometres ?? 0)
            : 0),
        0,
      );
      const cyclingDistance = completedThisWeek.reduce(
        (total, workout) =>
          total +
          (workout.activityType === "Cycling"
            ? (workout.distanceKilometres ?? 0)
            : 0),
        0,
      );
      const latestRun = workouts.find(
        (workout) =>
          workout.status === "completed" &&
          workout.activityType === "Running" &&
          workout.distanceKilometres !== undefined &&
          workout.distanceKilometres > 0 &&
          new Date(workout.startDate) <= now,
      );
      const currentPace = latestRun?.distanceKilometres
        ? latestRun.durationMinutes / latestRun.distanceKilometres
        : undefined;

      return (
        <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
          <SidebarPageHeader
            title={m.training_trends()}
            description={m.training_trends_description()}
          />
          <section
            className="grid grid-cols-3 gap-3.5 max-sm:grid-cols-1"
            aria-label={m.current_training()}
          >
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.workouts_this_week()}
              value={completedThisWeek.length}
              description={m.completed_sessions()}
              icon={<CalendarCheck />}
            />
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.distance_this_week()}
              value={number.format(runningDistance + cyclingDistance)}
              description={`${m.activity_running()} ${number.format(runningDistance)} km · ${m.activity_cycling()} ${number.format(cyclingDistance)} km`}
              icon={<Footprints />}
            />
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.current_pace()}
              value={currentPace === undefined ? "—" : formatPace(currentPace)}
              description={m.minutes_per_kilometre()}
              icon={<Gauge />}
            />
          </section>
          <PaceChart
            workouts={workouts}
            activity={activity}
            metric={metric}
            onActivityChange={(nextActivity) => {
              void navigate({
                resetScroll: false,
                search: (current) => ({
                  ...current,
                  activity: nextActivity,
                }),
              });
            }}
            onMetricChange={(nextMetric) => {
              void navigate({
                resetScroll: false,
                search: (current) => ({ ...current, metric: nextMetric }),
              });
            }}
          />
        </main>
      );
    },
  });
}
