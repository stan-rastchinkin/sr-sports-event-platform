import { ApplicationError, NotFoundError } from "../../application/errors.js";

export class OptimisticLockError extends ApplicationError {
  public constructor(eventId: string, expectedVersion: number) {
    super("The event has been modified by another request", {
      eventId,
      expectedVersion,
    });
  }
}

export class SportsEventNotFoundError extends NotFoundError {
  public constructor(eventId: string) {
    super("The event was not found", { eventId });
  }
}

export class TeamNotFoundError extends NotFoundError {
  public constructor(teamId: string) {
    super("The team was not found", { teamId });
  }
}
