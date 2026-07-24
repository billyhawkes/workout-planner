import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import {
  Activity,
  Bike,
  CalendarDays,
  Clock3,
  Flame,
  Footprints,
  HeartPulse,
  List,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import { workoutDashboardAtom } from "@/services/workouts/client/atom";
import type { Workout } from "@/services/workouts/schema";

export const Route = createFileRoute("/")({ component: Dashboard });

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const activityIcon = (type: string) => {
  if (type === "Running" || type === "Walking") return Footprints;
  if (type === "Cycling") return Bike;
  return Activity;
};

function Dashboard() {
  const result = useAtomValue(workoutDashboardAtom);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  return AsyncResult.match(result, {
    onInitial: () => (
      <main className="grid min-h-screen place-content-center" />
    ),
    onFailure: () => (
      <main className="grid min-h-screen place-content-center gap-3 text-center">
        <p>{m.load_error()}</p>
        <code>bun run health:import</code>
      </main>
    ),
    onSuccess: ({ value }) => {
      const { workouts, summary } = value;
      const workoutDates = workouts.map(
        (workout) => new Date(workout.startDate),
      );
      const activeDate = selectedDate ?? workoutDates[0];
      const columns: Array<ColumnDef<Workout>> = [
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
            className="mb-6 grid grid-cols-[1.35fr_repeat(3,1fr)] gap-3.5 max-md:grid-cols-2 max-sm:grid-cols-1"
            aria-label={m.last_28_days()}
          >
            <StatsCard
              className="border-primary bg-primary text-primary-foreground [&_[data-slot=card-description]]:text-primary-foreground/70 [&_[data-slot=card-footer]]:text-primary-foreground/70 rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.last_28_days()}
              value={summary.workoutCount}
              description={m.sessions()}
              icon={<Activity />}
            />
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.duration()}
              value={number.format(summary.totalDurationMinutes)}
              description={m.minutes()}
              icon={<Clock3 />}
            />
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.distance()}
              value={number.format(summary.totalDistanceKilometres)}
              description={m.distance()}
              icon={<Footprints />}
            />
            <StatsCard
              className="rounded-sm shadow-xs [&_[data-slot=card-title]]:font-serif [&_[data-slot=card-title]]:font-normal"
              title={m.energy()}
              value={number.format(summary.totalActiveEnergyKilocalories)}
              description={m.energy()}
              icon={<Flame />}
            />
          </section>

          <Card className="rounded-sm shadow-xs">
            <CardHeader className="flex flex-row justify-between gap-6 max-md:flex-col">
              <div>
                <p className="text-muted-foreground mb-2 text-[0.7rem] font-bold tracking-[0.16em] uppercase">
                  {m.source_note()}
                </p>
                <CardTitle className="font-serif text-3xl font-normal">
                  {m.recent_workouts()}
                </CardTitle>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 max-md:justify-start">
                {Object.entries(summary.byActivityType).map(([type, count]) => (
                  <Badge key={type} variant="secondary">
                    {type} · {count}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="table">
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
                <TabsContent value="table">
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
                      rowActions: false,
                    }}
                  />
                </TabsContent>
                <TabsContent value="calendar">
                  <Calendar
                    mode="single"
                    selected={activeDate}
                    onSelect={setSelectedDate}
                    defaultMonth={activeDate}
                    className="w-full rounded-lg border p-0 shadow-xs [--cell-size:auto]"
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
                      DayButton: ({ day, modifiers, ...props }) => {
                        const dayWorkouts = workouts.filter(
                          (workout) =>
                            new Date(workout.startDate).toDateString() ===
                            day.date.toDateString(),
                        );

                        return (
                          <Button
                            {...props}
                            variant="ghost"
                            className="data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground hover:bg-accent/60 h-full min-h-28 w-full flex-col items-stretch justify-start gap-1 rounded-none p-2 text-left"
                            data-selected-single={modifiers.selected}
                          >
                            <span className="self-end text-xs font-medium">
                              {day.date.getDate()}
                            </span>
                            <span className="flex w-full flex-col gap-1">
                              {dayWorkouts.map((workout) => {
                                const Icon = activityIcon(workout.activityType);
                                return (
                                  <span
                                    key={workout.id}
                                    className="bg-primary/10 group-data-[selected=true]/day:bg-primary-foreground/15 text-foreground flex w-full items-center gap-1.5 overflow-hidden rounded-sm px-1.5 py-1 text-[0.68rem]"
                                  >
                                    <Icon className="size-3 shrink-0" />
                                    <span className="truncate">
                                      {workout.activityType}
                                    </span>
                                    <span className="ml-auto shrink-0 opacity-60">
                                      {Math.round(workout.durationMinutes)}m
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
      );
    },
  });
}
