import { ValidationError } from "./validation-error.js";

import type { z } from "zod";

export class DomainError extends Error {
  public readonly extras: unknown;

  public constructor(message: string, extras?: unknown) {
    super(message);
    this.name = new.target.name;
    this.extras = extras;
  }
}

export function validateAgainstSchema<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ValidationError({
      issues: result.error.issues.map(({ path, message }) => ({
        path: path.map(String).join("."),
        message,
      })),
    });
  }

  return result.data;
}
