export class OptimisticLockError extends Error {
  public constructor(
    public readonly eventId: string,
    public readonly expectedVersion: number,
  ) {
    super(
      `Sports event ${eventId} was not saved at version ${expectedVersion}`,
    );
    this.name = new.target.name;
  }
}
