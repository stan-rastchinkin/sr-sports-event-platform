import { z } from "zod";

const absent = z.undefined("must be undefined").optional();

const scheduledStateSchema = z.object({
  kind: z.literal("scheduled"),
  startedAt: absent,
  finishedAt: absent,
  cancelledAt: absent,
  reason: absent,
});

const inProgressStateSchema = z.object({
  kind: z.literal("in_progress"),
  startedAt: z.date(),
  finishedAt: absent,
  cancelledAt: absent,
  reason: absent,
});

const finishedStateSchema = z
  .object({
    kind: z.literal("finished"),
    startedAt: z.date(),
    finishedAt: z.date(),
    cancelledAt: absent,
    reason: absent,
  })
  .refine(
    (state) => state.finishedAt.getTime() >= state.startedAt.getTime(),
    "Finish timestamp must not precede the start timestamp",
  );

const cancelledStateSchema = z.object({
  kind: z.literal("cancelled"),
  startedAt: absent,
  finishedAt: absent,
  cancelledAt: z.date(),
  reason: z
    .string("Cancellation reason must be nonempty")
    .trim()
    .min(1, "Cancellation reason must be nonempty"),
});

export const stateSchemaValidators = {
  scheduled: scheduledStateSchema,
  in_progress: inProgressStateSchema,
  finished: finishedStateSchema,
  cancelled: cancelledStateSchema,
} as const;

export type EventKind = keyof typeof stateSchemaValidators;

export type EventState = z.output<(typeof stateSchemaValidators)[EventKind]>;
