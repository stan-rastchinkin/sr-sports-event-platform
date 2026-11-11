export class OptimisticLockError extends Error {
  public constructor(
    public readonly eventId: string,
    public readonly expectedVersion: number,
  ) {
    super(`Sports event ${eventId} was not saved at version ${expectedVersion}`);
    this.name = new.target.name;
  }
}

export class SportsEventNotFoundError extends Error {
  public constructor(public readonly eventId: string) {
    super(`Sports event ${eventId} was not found`);
    this.name = new.target.name;
  }
}

export class TeamNotFoundError extends Error {
  public constructor(public readonly teamId: string) {
    super(`Team ${teamId} was not found`);
    this.name = new.target.name;
  }
}
