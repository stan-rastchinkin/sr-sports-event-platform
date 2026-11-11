export class ApplicationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {}

export class TeamScheduleConflictError extends ApplicationError {
  public constructor() {
    super("Team is already booked for an overlapping interval");
  }
}
