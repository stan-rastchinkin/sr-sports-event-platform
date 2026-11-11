import { DomainError } from "./core/index.js";
import { z } from "zod";

const uuidSchema = z.uuid();

export type EventId = string & { readonly __brand: "EventId" };
export type TeamId = string & { readonly __brand: "TeamId" };
export type SportId = number & { readonly __brand: "SportId" };

export function eventId(value: string): EventId {
  return parseUuid<EventId>(value, "EventId");
}

export function teamId(value: string): TeamId {
  return parseUuid<TeamId>(value, "TeamId");
}

export function sportId(value: number): SportId {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError("SportId must be an integer", { value });
  }

  return value as SportId;
}

function parseUuid<Id extends string>(value: string, label: string): Id {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new DomainError(`${label} must be a UUID`, { value });
  }

  return result.data as Id;
}
