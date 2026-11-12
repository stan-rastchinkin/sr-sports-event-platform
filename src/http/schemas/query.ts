import { z } from "zod";

export const dateTimeSchema = z.iso.datetime({ offset: true });

export const optionalDateTimeSchema = dateTimeSchema.optional();

export const optionalLimitSchema = z.coerce.number().int().min(1).max(100).optional();

export const optionalOffsetSchema = z.coerce.number().int().nonnegative().optional();

export const pageQuerySchema = z
  .object({
    limit: optionalLimitSchema,
    offset: optionalOffsetSchema,
  })
  .meta({
    examples: [{ limit: 50, offset: 0 }],
  });

const eventSearchExample = {
  after: "2027-01-01T00:00:00Z",
  before: "2027-02-01T00:00:00Z",
  limit: 50,
  offset: 0,
  sort: "asc" as const,
};

export const eventSearchQuerySchema = z
  .object({
    after: optionalDateTimeSchema,
    before: optionalDateTimeSchema,
    limit: optionalLimitSchema,
    offset: optionalOffsetSchema,
    sort: z.enum(["asc", "desc"]).optional(),
  })
  .refine(
    (query) =>
      query.after === undefined ||
      query.before === undefined ||
      new Date(query.after).getTime() < new Date(query.before).getTime(),
    "Scheduled start range is invalid",
  )
  .meta({
    examples: [eventSearchExample],
  });
