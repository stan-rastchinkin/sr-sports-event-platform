import { z } from "zod";

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const commonErrorResponses = {
  422: errorResponseSchema,
  500: errorResponseSchema,
  503: errorResponseSchema,
};

export const notFoundResponse = {
  404: errorResponseSchema.extend({
    eventId: z.uuid().optional(),
    teamId: z.uuid().optional(),
  }),
};

export const conflictResponse = {
  409: errorResponseSchema,
};
