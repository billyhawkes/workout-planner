import { Bike, Footprints, Gauge, Ruler } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/paraglide/messages";
import type { Workout } from "../schema";

type Props = {
  readonly workouts: ReadonlyArray<Workout>;
  readonly activity: ActivityType;
  readonly metric: Metric;
  readonly onActivityChange: (activity: ActivityType) => void;
  readonly onMetricChange: (metric: Metric) => void;
};

type ActivityType = "running" | "cycling";
type Metric = "pace" | "distance";

const formatPace = (pace: number) => {
  const totalSeconds = Math.round(pace * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const hasDistance = (
  workout: Workout,
): workout is Workout & { readonly distanceKilometres: number } =>
  workout.status === "completed" &&
  (workout.activityType === "Running" || workout.activityType === "Cycling") &&
  workout.distanceKilometres !== undefined &&
  workout.distanceKilometres > 0;

const dateTick = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

const paddedDomain = (
  values: ReadonlyArray<number>,
  minimumPadding: number,
) => {
  if (values.length === 0) return [0, 1];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.15, minimumPadding);
  return [Math.max(0, minimum - padding), maximum + padding];
};

export function PaceChart({
  workouts,
  activity,
  metric,
  onActivityChange,
  onMetricChange,
}: Props) {
  const selected = workouts
    .filter(hasDistance)
    .filter(
      (workout) =>
        workout.activityType ===
        (activity === "running" ? "Running" : "Cycling"),
    )
    .slice(0, 20)
    .reverse();
  const data = selected.map((workout) => ({
    date: workout.startDate,
    value:
      metric === "pace"
        ? workout.durationMinutes / workout.distanceKilometres
        : workout.distanceKilometres,
  }));
  const values = data.map(({ value }) => value);
  const domain = paddedDomain(values, metric === "pace" ? 0.2 : 0.5);
  const config = {
    value: {
      label: metric === "pace" ? m.pace() : m.distance_chart(),
      color:
        activity === "running" ? "oklch(0.62 0.2 255)" : "oklch(0.72 0.19 55)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="mb-6 rounded-sm shadow-xs">
      <CardHeader className="flex flex-row items-end justify-between gap-6 max-lg:flex-col max-lg:items-start">
        <div>
          <CardTitle className="font-serif text-3xl font-normal">
            {m.training_trends()}
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.training_trends_description()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs
            value={activity}
            onValueChange={(value) =>
              onActivityChange(value === "cycling" ? "cycling" : "running")
            }
          >
            <TabsList>
              <TabsTrigger value="running">
                <Footprints data-icon="inline-start" />
                {m.activity_running()}
              </TabsTrigger>
              <TabsTrigger value="cycling">
                <Bike data-icon="inline-start" />
                {m.activity_cycling()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={metric}
            onValueChange={(value) =>
              onMetricChange(value === "distance" ? "distance" : "pace")
            }
          >
            <TabsList>
              <TabsTrigger value="pace">
                <Gauge data-icon="inline-start" />
                {m.pace()}
              </TabsTrigger>
              <TabsTrigger value="distance">
                <Ruler data-icon="inline-start" />
                {m.distance_chart()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {selected.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {m.no_pace_data()}
          </p>
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ left: 8, right: 12, top: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={dateTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={metric === "pace" ? 44 : 58}
                domain={domain}
                tickCount={5}
                allowDataOverflow
                tickFormatter={(value) =>
                  metric === "pace"
                    ? formatPace(Number(value))
                    : `${Number(value).toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })} km`
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const date = payload[0]?.payload.date;
                      return date
                        ? new Date(date).toLocaleDateString()
                        : m.training_trends();
                    }}
                    formatter={(value) => (
                      <div className="flex min-w-32 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {metric === "pace" ? m.pace() : m.distance_chart()}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {metric === "pace"
                            ? `${formatPace(Number(value))} /km`
                            : `${Number(value).toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                              })} km`}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2.5}
                dot={{ fill: "var(--color-value)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
