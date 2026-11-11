import { z } from "zod";

const absent = z.undefined("must be undefined").optional();

export enum EventStatusName {
  Scheduled = "scheduled",
  InProgress = "in_progress",
  Finished = "finished",
  Cancelled = "cancelled",
}

export type EventKind = `${EventStatusName}`;

const scheduledStateSchema = z.object({
  status: z.literal(EventStatusName.Scheduled),
  startedAt: absent,
  finishedAt: absent,
  cancelledAt: absent,
  cancelationReason: absent,
});

const inProgressStateSchema = z.object({
  status: z.literal(EventStatusName.InProgress),
  startedAt: z.date(),
  finishedAt: absent,
  cancelledAt: absent,
  cancelationReason: absent,
});

const finishedStateSchema = z
  .object({
    status: z.literal(EventStatusName.Finished),
    startedAt: z.date(),
    finishedAt: z.date(),
    cancelledAt: absent,
    cancelationReason: absent,
  })
  .refine(
    (state) => state.finishedAt.getTime() >= state.startedAt.getTime(),
    "Finish timestamp must not precede the start timestamp",
  );

const cancelledStateSchema = z.object({
  status: z.literal(EventStatusName.Cancelled),
  startedAt: absent,
  finishedAt: absent,
  cancelledAt: z.date(),
  cancelationReason: z
    .string("Cancellation reason must be nonempty")
    .trim()
    .min(1, "Cancellation reason must be nonempty"),
});

export const stateSchemaValidators = {
  [EventStatusName.Scheduled]: scheduledStateSchema,
  [EventStatusName.InProgress]: inProgressStateSchema,
  [EventStatusName.Finished]: finishedStateSchema,
  [EventStatusName.Cancelled]: cancelledStateSchema,
} as const satisfies Record<EventKind, z.ZodType>;

export type EventState = z.output<(typeof stateSchemaValidators)[EventKind]>;
