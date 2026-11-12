export class ApplicationError extends Error {
  public readonly extras: unknown;

  public constructor(message: string, extras?: unknown) {
    super(message);
    this.name = new.target.name;
    this.extras = extras;
  }
}

export class NotFoundError extends ApplicationError {}

export class TeamScheduleConflictError extends ApplicationError {
  public constructor(extras?: unknown) {
    super("Requested time is not available for team", extras);
  }
}
