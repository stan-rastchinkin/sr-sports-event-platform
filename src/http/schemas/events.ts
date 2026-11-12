import { dateTimeSchema } from "./query.js";
import { z } from "zod";

const eventId = "550e8400-e29b-41d4-a716-446655440000";
const homeTeamId = "550e8400-e29b-41d4-a716-446655440001";
const awayTeamId = "550e8400-e29b-41d4-a716-446655440002";
const kickoff = "2027-01-15T18:30:00Z";

const eventIdParamsShape = z.object({
  id: z.uuid(),
});

const scheduleBodyShape = z.object({
  sportId: z.int(),
  homeTeamId: z.uuid(),
  awayTeamId: z.uuid(),
  scheduledAt: dateTimeSchema,
});

const rescheduleBodyShape = z.object({
  scheduledAt: dateTimeSchema,
});

const timestampBodyShape = z.object({
  at: dateTimeSchema,
});

const cancelBodyShape = z.object({
  reason: z.string(),
  at: dateTimeSchema,
});

export const eventIdParamsSchema = eventIdParamsShape.meta({
  examples: [{ id: eventId } satisfies z.input<typeof eventIdParamsShape>],
});

export const scheduleBodySchema = scheduleBodyShape.meta({
  examples: [
    {
      sportId: 1,
      homeTeamId,
      awayTeamId,
      scheduledAt: kickoff,
    } satisfies z.input<typeof scheduleBodyShape>,
  ],
});

export const rescheduleBodySchema = rescheduleBodyShape.meta({
  examples: [
    { scheduledAt: "2027-01-16T18:30:00Z" } satisfies z.input<typeof rescheduleBodyShape>,
  ],
});

export const timestampBodySchema = timestampBodyShape.meta({
  examples: [{ at: "2027-01-15T18:32:00Z" } satisfies z.input<typeof timestampBodyShape>],
});

export const cancelBodySchema = cancelBodyShape.meta({
  examples: [
    {
      reason: "Pitch unplayable",
      at: "2027-01-14T09:00:00Z",
    } satisfies z.input<typeof cancelBodyShape>,
  ],
});
