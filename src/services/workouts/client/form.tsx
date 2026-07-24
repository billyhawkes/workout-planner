import { useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Effect, Option, Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ErrorMessage,
  SelectField,
  SubmitButton,
  SubmitError,
  TextAreaField,
  TextField,
} from "@/components/ui/effect-form";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";
import type { Workout, WorkoutPayload } from "../schema";
import { createWorkoutAtom, updateWorkoutAtom } from "./atom";

type Props = {
  readonly workout?: Workout;
  readonly initialDate?: Date;
  readonly onClose: () => void;
};

const builder = FormBuilder.empty
  .addField("activityType", Schema.NonEmptyString)
  .addField(
    "status",
    Schema.Union([Schema.Literal("planned"), Schema.Literal("completed")]),
  )
  .addField("startDate", Schema.NonEmptyString)
  .addField("durationMinutes", Schema.Number)
  .addField("distance", Schema.String)
  .addField("notes", Schema.String);

const toLocalDateTime = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const DurationField: FormReact.FieldComponent<number, { label: string }> = ({
  field,
  props,
}) => {
  const totalSeconds = Math.round(field.value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <Field data-invalid={Option.isSome(field.error)}>
      <FieldLabel>{props.label}</FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor={`${field.path}-minutes`} className="text-xs">
            {m.minutes()}
          </FieldLabel>
          <Input
            id={`${field.path}-minutes`}
            name={`${field.path}.minutes`}
            type="number"
            min="0"
            step="1"
            value={minutes}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isFinite(value)) {
                field.onChange(Math.max(0, value) + seconds / 60);
              }
            }}
            aria-invalid={Option.isSome(field.error)}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor={`${field.path}-seconds`} className="text-xs">
            {m.seconds()}
          </FieldLabel>
          <Input
            id={`${field.path}-seconds`}
            name={`${field.path}.seconds`}
            type="number"
            min="0"
            max="59"
            step="1"
            value={seconds}
            onBlur={field.onBlur}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isFinite(value)) {
                field.onChange(minutes + Math.min(59, Math.max(0, value)) / 60);
              }
            }}
            aria-invalid={Option.isSome(field.error)}
          />
        </div>
      </div>
      {Option.isSome(field.error) ? (
        <ErrorMessage text={field.error.value} />
      ) : null}
    </Field>
  );
};

const makeForm = ({ workout, onClose }: Props) =>
  FormReact.make(builder, {
    fields: {
      activityType: SelectField,
      status: SelectField,
      startDate: TextField,
      durationMinutes: DurationField,
      distance: TextField,
      notes: TextAreaField,
    },
    mode: { validation: "onSubmit" },
    onSubmit: (_, { decoded }) => {
      const payload: WorkoutPayload = {
        activityType: decoded.activityType.trim(),
        status: decoded.status,
        startDate: new Date(decoded.startDate).toISOString(),
        durationMinutes: decoded.durationMinutes,
        indoor: workout?.indoor ?? false,
        ...(decoded.distance.trim()
          ? { distanceKilometres: Number(decoded.distance) }
          : {}),
        ...(decoded.notes.trim() ? { notes: decoded.notes.trim() } : {}),
      };
      if (workout) {
        return Effect.gen(function* () {
          yield* Atom.set(updateWorkoutAtom, { id: workout.id, payload });
          yield* Atom.getResult(updateWorkoutAtom, {
            suspendOnWaiting: true,
          });
          yield* Effect.sync(onClose);
        });
      }

      return Effect.gen(function* () {
        yield* Atom.set(createWorkoutAtom, payload);
        yield* Atom.getResult(createWorkoutAtom, { suspendOnWaiting: true });
        yield* Effect.sync(onClose);
      });
    },
  });

export function WorkoutForm(props: Props) {
  const [form] = useState(() => makeForm(props));
  const submitResult = useAtomValue(form.submit);
  const { workout } = props;
  const initialStartDate = props.initialDate
    ? new Date(props.initialDate)
    : new Date();
  if (props.initialDate) initialStartDate.setHours(9, 0, 0, 0);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {workout ? m.edit_workout() : m.add_workout()}
          </DialogTitle>
          <DialogDescription>{m.workout_form_description()}</DialogDescription>
        </DialogHeader>
        <form.Initialize
          defaultValues={{
            activityType: workout?.activityType ?? "Running",
            status: workout?.status ?? "planned",
            startDate: workout
              ? toLocalDateTime(workout.startDate)
              : toLocalDateTime(initialStartDate.toISOString()),
            durationMinutes: workout?.durationMinutes ?? 45,
            distance: workout?.distanceKilometres?.toString() ?? "",
            notes: workout?.notes ?? "",
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <form.activityType
              label={m.activity()}
              options={[
                { label: m.activity_cycling(), value: "Cycling" },
                { label: m.activity_running(), value: "Running" },
              ]}
            />
            <form.status
              label={m.workout_status()}
              options={[
                { label: m.planned(), value: "planned" },
                { label: m.completed(), value: "completed" },
              ]}
            />
            <form.startDate label={m.date()} type="datetime-local" />
            <form.durationMinutes label={m.duration()} />
            <form.distance
              label={m.distance_optional()}
              type="number"
              min="0"
              step="0.1"
            />
            <form.notes label={m.notes()} />
            <div className="md:col-span-2">
              <SubmitError result={submitResult} />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={props.onClose}>
                {m.cancel()}
              </Button>
              <SubmitButton form={form}>{m.save_workout()}</SubmitButton>
            </div>
          </div>
        </form.Initialize>
      </DialogContent>
    </Dialog>
  );
}
