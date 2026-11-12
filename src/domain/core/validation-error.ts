export class ValidationError extends Error {
  public readonly extras: unknown;

  public constructor(extras?: unknown) {
    super("Invalid input");
    this.name = new.target.name;
    this.extras = extras;
  }
}
