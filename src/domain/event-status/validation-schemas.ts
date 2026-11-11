import { z } from "zod";
import { omitNulls } from "../core/index.js"

export enum EventStatusName {
  Scheduled = "scheduled",
  InProgress = "in_progress",
  Finished = "finished",
  Cancelled = "cancelled",
}

export type EventKind = `${EventStatusName}`;

const scheduledStateSchema = z.preprocess(
  omitNulls,
  z.strictObject({
    status: z.literal(EventStatusName.Scheduled),
  }),
);

const inProgressStateSchema = z.preprocess(
  omitNulls,
  z.strictObject({
    status: z.literal(EventStatusName.InProgress),
    startedAt: z.date(),
  }),
);

const finishedStateSchema = z.preprocess(
  omitNulls,
  z
    .strictObject({
      status: z.literal(EventStatusName.Finished),
      startedAt: z.date(),
      finishedAt: z.date(),
    })
    .refine(
      (state) => state.finishedAt.getTime() >= state.startedAt.getTime(),
      "Finish timestamp must not precede the start timestamp",
    ),
);

const cancelledStateSchema = z.preprocess(
  omitNulls,
  z.strictObject({
    status: z.literal(EventStatusName.Cancelled),
    cancelledAt: z.date(),
    cancelationReason: z
      .string("Cancellation reason must be nonempty")
      .trim()
      .min(1, "Cancellation reason must be nonempty"),
  }),
);

export const stateSchemaValidators = {
  [EventStatusName.Scheduled]: scheduledStateSchema,
  [EventStatusName.InProgress]: inProgressStateSchema,
  [EventStatusName.Finished]: finishedStateSchema,
  [EventStatusName.Cancelled]: cancelledStateSchema,
} as const satisfies Record<EventKind, z.ZodType>;

export type EventState = z.output<(typeof stateSchemaValidators)[EventKind]>;
