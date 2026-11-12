import { z } from "zod";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

export const pageQuerySchema = z.object({
  limit: z.int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  offset: z.int().nonnegative().default(0),
});

export type PageQueryInput = z.input<typeof pageQuerySchema>;
