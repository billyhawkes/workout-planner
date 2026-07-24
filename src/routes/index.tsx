import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import {
  Activity,
  Bike,
  CalendarCheck,
  CalendarDays,
  Footprints,
  Gauge,
  HeartPulse,
  List,
  Pencil,
  Plus,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableRowAction } from "@/components/ui/data-table";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import { workoutDashboardAtom } from "@/services/workouts/client/atom";
import { WorkoutForm } from "@/services/workouts/client/form";
import { PaceChart } from "@/services/workouts/client/pace-chart";
import type { Workout } from "@/services/workouts/schema";

export const Route = createFileRoute("/")({ component: Dashboard });

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const formatPace = (pace: number) => {
  const totalSeconds = Math.round(pace * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
};

const activityIcon = (type: string) => {
  if (type === "Running" || type === "Walking") return Footprints;
  if (type === "Cycling") return Bike;
  return Activity;
};

function Dashboard() {
  const result = useAtomValue(workoutDashboardAtom);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingWorkout, setEditingWorkout] = useState<
    Workout | null | undefined
  >();
  const [creatingDate, setCreatingDate] = useState<Date | undefined>();

  return AsyncResult.match(result, {
    onInitial: () => (
      <main className="grid min-h-screen place-content-center" />
    ),
    onFailure: () => (
      <main className="grid min-h-screen place-content-center gap-3 text-center">
        <p>{m.load_error()}</p>
      </main>
    ),
    onSuccess: ({ value }) => {
      const { workouts } = value;
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
      const runningDistanceThisWeek = completedThisWeek.reduce(
        (total, workout) =>
          total +
          (workout.activityType === "Running"
            ? (workout.distanceKilometres ?? 0)
            : 0),
        0,
      );
      const cyclingDistanceThisWeek = completedThisWeek.reduce(
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
      const workoutDates = workouts.map(
        (workout) => new Date(workout.startDate),
      );
      const activeDate = selectedDate ?? workoutDates[0];
      const rowActions: Array<DataTableRowAction<Workout>> = [
        {
          name: m.edit_workout(),
          icon: <Pencil />,
          onClick: (workout) => {
            setCreatingDate(undefined);
            setEditingWorkout(workout);
          },
        },
      ];
      const columns: Array<ColumnDef<Workout>> = [
        {
          accessorKey: "status",
          header: m.workout_status(),
          cell: ({ row }) => (
            <Badge
              variant={
                row.original.status === "planned" ? "outline" : "secondary"
              }
            >
              {row.original.status === "planned" ? m.planned() : m.completed()}
            </Badge>
          ),
        },
        {
          accessorKey: "startDate",
          header: m.date(),
          cell: ({ row }) =>
            new Date(row.original.startDate).toLocaleDateString(),
        },
        {
          accessorKey: "activityType",
          header: m.activity(),
          cell: ({ row }) => {
            const Icon = activityIcon(row.original.activityType);
            return (
              <span className="[&_svg]:text-primary inline-flex items-center gap-2 [&_svg]:w-4">
                <Icon />
                {row.original.activityType}
              </span>
            );
          },
        },
        {
          accessorKey: "durationMinutes",
          header: m.duration(),
          cell: ({ row }) =>
            `${number.format(row.original.durationMinutes)} min`,
        },
        {
          accessorKey: "notes",
          header: m.notes(),
          cell: ({ row }) =>
            row.original.notes ? (
              <span className="block max-w-64 whitespace-normal">
                {row.original.notes}
              </span>
            ) : (
              "—"
            ),
        },
        {
          accessorKey: "distanceKilometres",
          header: m.distance(),
          cell: ({ row }) =>
            row.original.distanceKilometres === undefined
              ? "—"
              : `${number.format(row.original.distanceKilometres)} km`,
        },
        {
          id: "heartRate",
          header: m.heart_rate(),
          cell: ({ row }) =>
            row.original.heartRate === undefined ? (
              "—"
            ) : (
              <span className="[&_svg]:text-primary inline-flex items-center gap-2 [&_svg]:w-4">
                <HeartPulse />
                {Math.round(row.original.heartRate.average)} bpm
              </span>
            ),
        },
      ];

      return (
        <main className="mx-auto w-[min(1180px,calc(100%-2rem))] py-14 max-md:w-[min(640px,calc(100%-1.25rem))] max-md:pt-7">
          <header className="mb-10 flex items-start justify-between gap-8 max-md:flex-col">
            <div>
              <p className="text-muted-foreground mb-2 text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                {m.workouts()}
              </p>
              <h1 className="my-1 font-serif text-[clamp(3rem,8vw,6.8rem)] leading-[0.9] font-normal tracking-[-0.065em] max-sm:text-6xl">
                {m.app_title()}
              </h1>
              <p className="text-muted-foreground mt-5 max-w-xl text-lg">
                {m.app_description()}
              </p>
            </div>
            <LocaleSwitcher />
          </header>

          <section
            className="mb-6 grid grid-cols-3 gap-3.5 max-sm:grid-cols-1"
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
              value={number.format(
                runningDistanceThisWeek + cyclingDistanceThisWeek,
              )}
              description={`${m.activity_running()} ${number.format(runningDistanceThisWeek)} km · ${m.activity_cycling()} ${number.format(cyclingDistanceThisWeek)} km`}
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

          <PaceChart workouts={workouts} />

          <Card className="rounded-sm shadow-xs">
            <Tabs defaultValue="table">
              <CardHeader className="flex flex-row items-end justify-between gap-6 max-md:flex-col max-md:items-start">
                <div>
                  <CardTitle className="font-serif text-3xl font-normal">
                    {m.recent_workouts()}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {m.source_note()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 max-md:justify-start">
                  <Button
                    onClick={() => {
                      setCreatingDate(undefined);
                      setEditingWorkout(null);
                    }}
                  >
                    <Plus data-icon="inline-start" />
                    {m.add_workout()}
                  </Button>
                  <TabsList>
                    <TabsTrigger value="table">
                      <List data-icon="inline-start" />
                      {m.table_view()}
                    </TabsTrigger>
                    <TabsTrigger value="calendar">
                      <CalendarDays data-icon="inline-start" />
                      {m.calendar_view()}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                {editingWorkout !== undefined ? (
                  <WorkoutForm
                    key={
                      editingWorkout?.id ??
                      creatingDate?.toISOString() ??
                      "create"
                    }
                    workout={editingWorkout ?? undefined}
                    initialDate={creatingDate}
                    onClose={() => {
                      setCreatingDate(undefined);
                      setEditingWorkout(undefined);
                    }}
                  />
                ) : null}
                <TabsContent value="table" className="mt-0">
                  <DataTable
                    columns={columns}
                    data={Array.from(workouts)}
                    searchState="local"
                    emptyLabel={m.empty()}
                    features={{
                      pagination: {
                        mode: "client",
                        pageSizes: [10, 25, 50],
                      },
                      search: true,
                      export: {
                        baseName: "apple-health-workouts",
                        scope: "filteredRows",
                      },
                      sorting: true,
                      columnVisibility: true,
                      gallery: false,
                      rowActions: { items: rowActions },
                    }}
                  />
                </TabsContent>
                <TabsContent value="calendar" className="mt-0">
                  <div className="overflow-x-auto rounded-lg">
                    <Calendar
                      mode="single"
                      selected={activeDate}
                      onSelect={setSelectedDate}
                      defaultMonth={activeDate}
                      className="w-full min-w-[700px] rounded-lg border p-0 shadow-xs [--cell-size:auto]"
                      classNames={{
                        root: "w-full",
                        months: "w-full",
                        month: "w-full gap-0",
                        month_caption: "h-12 border-b px-12 font-serif text-lg",
                        month_grid: "w-full table-fixed border-collapse",
                        weekdays: "grid grid-cols-7 border-b",
                        weekday:
                          "py-2 text-center text-xs font-medium text-muted-foreground",
                        week: "grid grid-cols-7",
                        day: "min-h-28 rounded-none border-r border-b p-0 last:border-r-0",
                        outside: "bg-muted/20 text-muted-foreground/50",
                        today: "bg-secondary/30",
                      }}
                      components={{
                        DayButton: ({ day, modifiers, onClick, ...props }) => {
                          const dayWorkouts = workouts.filter(
                            (workout) =>
                              new Date(workout.startDate).toDateString() ===
                              day.date.toDateString(),
                          );

                          return (
                            <Button
                              {...props}
                              variant="ghost"
                              className="hover:bg-accent/60 data-[selected-single=true]:text-foreground data-[selected-single=true]:ring-ring h-full min-h-28 w-full flex-col items-stretch justify-start gap-1 rounded-none p-2 text-left data-[selected-single=true]:bg-transparent data-[selected-single=true]:ring-2 data-[selected-single=true]:ring-inset"
                              data-selected-single={modifiers.selected}
                              onClick={(event) => {
                                if (
                                  event.target instanceof Element &&
                                  event.target.closest("[data-calendar-add]")
                                ) {
                                  event.preventDefault();
                                  setSelectedDate(day.date);
                                  setCreatingDate(day.date);
                                  setEditingWorkout(null);
                                  return;
                                }
                                onClick?.(event);
                              }}
                            >
                              <span className="flex w-full items-center justify-between">
                                <span className="text-xs font-medium">
                                  {day.date.getDate()}
                                </span>
                                <span
                                  data-calendar-add
                                  className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-5 place-items-center rounded-sm"
                                  title={m.add_workout()}
                                >
                                  <Plus className="size-3" />
                                </span>
                              </span>
                              <span className="flex w-full flex-col gap-1">
                                {dayWorkouts.map((workout) => {
                                  const Icon = activityIcon(
                                    workout.activityType,
                                  );
                                  return (
                                    <span
                                      key={workout.id}
                                      className="bg-muted/70 text-foreground flex w-full flex-col gap-0.5 overflow-hidden rounded-sm border px-1.5 py-1 text-[0.68rem]"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <Icon className="size-3 shrink-0" />
                                        <span className="truncate font-medium">
                                          {workout.activityType}
                                        </span>
                                        <span className="ml-auto shrink-0 opacity-60">
                                          {workout.status === "planned"
                                            ? m.planned()
                                            : m.completed()}
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1.5 pl-[1.125rem] opacity-65">
                                        <span>
                                          {number.format(
                                            workout.durationMinutes,
                                          )}
                                          m
                                        </span>
                                        {workout.distanceKilometres !==
                                        undefined ? (
                                          <span>
                                            {number.format(
                                              workout.distanceKilometres,
                                            )}
                                            km
                                          </span>
                                        ) : null}
                                      </span>
                                    </span>
                                  );
                                })}
                              </span>
                            </Button>
                          );
                        },
                      }}
                    />
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </main>
      );
    },
  });
}
