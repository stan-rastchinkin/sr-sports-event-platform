import { eventId, EventStatusName, sportId, teamId } from "../domain/index.js";
import { ValidationError } from "./errors.js";
import { z } from "zod";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const timestampSchema = z.date().transform((value) => new Date(value.getTime()));
const sportIdSchema = z.int().transform((value) => sportId(value));
const teamIdSchema = z.uuid().transform((value) => teamId(value));
const eventIdSchema = z.uuid().transform((value) => eventId(value));

export const scheduleEventCommandSchema = z.object({
  sportId: sportIdSchema,
  homeTeamId: teamIdSchema,
  awayTeamId: teamIdSchema,
  scheduledAt: timestampSchema,
});

export const rescheduleEventCommandSchema = z.object({
  eventId: eventIdSchema,
  scheduledAt: timestampSchema,
});

export const startEventCommandSchema = z.object({
  eventId: eventIdSchema,
  at: timestampSchema,
});

export const finishEventCommandSchema = startEventCommandSchema;

export const cancelEventCommandSchema = z.object({
  eventId: eventIdSchema,
  reason: z.string(),
  at: timestampSchema,
});

export const getEventQuerySchema = eventIdSchema;

export const searchEventsQuerySchema = z
  .object({
    sportId: sportIdSchema.optional(),
    teamId: teamIdSchema.optional(),
    status: z.enum(EventStatusName).optional(),
    scheduledAfter: timestampSchema.optional(),
    scheduledBefore: timestampSchema.optional(),
    limit: z.int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
    offset: z.int().nonnegative().default(0),
    sort: z
      .enum(["asc", "desc"])
      .default("asc")
      .transform((value): "ASC" | "DESC" => (value === "asc" ? "ASC" : "DESC")),
  })
  .refine(
    (query) =>
      query.scheduledAfter === undefined ||
      query.scheduledBefore === undefined ||
      query.scheduledAfter.getTime() < query.scheduledBefore.getTime(),
    "Scheduled start range is invalid",
  );

export function validateInput<Schema extends z.ZodType>(
  schema: Schema,
  input: z.input<Schema>,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues
      .map(({ path, message }) => {
        const field = path.map(String).join(".");
        return field ? `${field}: ${message}` : message;
      })
      .join("; ");

    throw new ValidationError(message);
  }

  return result.data;
}
