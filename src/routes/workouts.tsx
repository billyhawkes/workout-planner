import { useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import {
  Activity,
  Bike,
  CalendarDays,
  Footprints,
  HeartPulse,
  List,
  Pencil,
  Plus,
} from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { enUS, fr } from "react-day-picker/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable, type DataTableRowAction } from "@/components/ui/data-table";
import { SidebarPageHeader } from "@/components/ui/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { workoutDashboardAtom } from "@/services/workouts/client/atom";
import { WorkoutForm } from "@/services/workouts/client/form";
import type { Workout } from "@/services/workouts/schema";

const WorkoutsSearch = Schema.Struct({
  view: Schema.optional(
    Schema.Union([Schema.Literal("table"), Schema.Literal("calendar")]),
  ),
}).annotate({ identifier: "WorkoutsSearch" });

export const Route = createFileRoute("/workouts")({
  validateSearch: Schema.toStandardSchemaV1(WorkoutsSearch),
  component: WorkoutsPage,
});

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

const activityIcon = (type: string) => {
  if (type === "Running" || type === "Walking") return Footprints;
  if (type === "Cycling") return Bike;
  return Activity;
};

function WorkoutsPage() {
  const result = useAtomValue(workoutDashboardAtom);
  const { view = "table" } = Route.useSearch();
  const navigate = useNavigate({ from: "/workouts" });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingWorkout, setEditingWorkout] = useState<
    Workout | null | undefined
  >();
  const [creatingDate, setCreatingDate] = useState<Date | undefined>();

  return AsyncResult.match(result, {
    onInitial: () => <main className="min-h-96" />,
    onFailure: () => <p className="py-12 text-center">{m.load_error()}</p>,
    onSuccess: ({ value: { workouts } }) => {
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
      ];
      const workoutDates = workouts.map(
        (workout) => new Date(workout.startDate),
      );
      const activeDate = selectedDate ?? workoutDates[0];

      return (
        <Tabs
          value={view}
          onValueChange={(nextView) => {
            if (nextView !== "table" && nextView !== "calendar") return;
            void navigate({
              resetScroll: false,
              search: (current) => ({ ...current, view: nextView }),
            });
          }}
          className="mx-auto w-full max-w-[1180px] gap-6"
        >
          <SidebarPageHeader
            title={m.workouts()}
            description={m.source_note()}
            actions={
              <Button
                onClick={() => {
                  setCreatingDate(undefined);
                  setEditingWorkout(null);
                }}
              >
                <Plus data-icon="inline-start" />
                {m.add_workout()}
              </Button>
            }
          />
          <TabsList variant="line" className="w-full justify-start border-b">
            <TabsTrigger value="table" className="flex-none">
              <List data-icon="inline-start" />
              {m.table_view()}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-none">
              <CalendarDays data-icon="inline-start" />
              {m.calendar_view()}
            </TabsTrigger>
          </TabsList>
          <div className="min-w-0">
            {editingWorkout !== undefined ? (
              <WorkoutForm
                key={
                  editingWorkout?.id ?? creatingDate?.toISOString() ?? "create"
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
                  pagination: { mode: "client", pageSizes: [10, 25, 50] },
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
                  captionLayout="dropdown-months"
                  locale={getLocale().startsWith("fr") ? fr : enUS}
                  className="w-full min-w-[700px] rounded-lg border p-0 shadow-xs [--cell-size:auto]"
                  classNames={{
                    root: "w-full",
                    months: "w-full",
                    month: "w-full gap-0",
                    month_caption: "h-12 border-b px-12 font-serif text-lg",
                    dropdowns:
                      "flex h-12 w-full items-center justify-center gap-1.5 font-serif text-lg",
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
                            if (!(event.target instanceof Element)) {
                              onClick?.(event);
                              return;
                            }

                            const workoutItem = event.target.closest(
                              "[data-calendar-workout]",
                            );
                            const workout = workouts.find(
                              (item) =>
                                item.id ===
                                workoutItem?.getAttribute(
                                  "data-calendar-workout",
                                ),
                            );
                            if (workout) {
                              event.preventDefault();
                              setSelectedDate(day.date);
                              setCreatingDate(undefined);
                              setEditingWorkout(workout);
                              return;
                            }

                            if (event.target.closest("[data-calendar-add]")) {
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
                              const Icon = activityIcon(workout.activityType);
                              return (
                                <span
                                  key={workout.id}
                                  data-calendar-workout={workout.id}
                                  title={m.edit_workout()}
                                  className="bg-muted/70 text-foreground hover:bg-muted flex w-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-sm border px-1.5 py-1 text-[0.68rem] transition-colors"
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
                                      {number.format(workout.durationMinutes)}m
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
          </div>
        </Tabs>
      );
    },
  });
}
