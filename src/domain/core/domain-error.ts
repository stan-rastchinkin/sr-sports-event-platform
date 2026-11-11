import type { z } from "zod";

export class DomainError extends Error {
  constructor(message: string, extras?: unknown) {
    message = extras === undefined 
      ? message
      : `${message}; extras: ${JSON.stringify(extras)}` 

    super(message);
    this.name = new.target.name;
  }
}


export function validateAgainstSchema<T>(schema: z.ZodType<T>, input: unknown, errorConstructor: new (message: string) => DomainError): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const message = result.error.issues
      .map(({ path, message }) => {
        const field = path.map(String).join(".");
        return field ? `${field}: ${message}` : message;
      })
      .join("; ");

    throw new errorConstructor(message);
  }

  return result.data;
}