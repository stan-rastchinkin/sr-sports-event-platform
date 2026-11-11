import { DomainError } from "./domain-error.js";
import { Entity } from "./entity.js";

export abstract class AggregateRoot<
  Id extends string | number,
> extends Entity<Id> {
  protected constructor(
    id: Id,
    public readonly version: number = 0,
  ) {
    super(id);

    if (!Number.isSafeInteger(version) || version < 0) {
      throw new DomainError(
        "Aggregate version must be a non-negative safe integer",
        { version },
      );
    }
  }
}
