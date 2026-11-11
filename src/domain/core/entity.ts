export abstract class Entity<Id extends string | number> {
  protected constructor(
    public readonly id: Id,
  ) {}

  public equals(other: Entity<Id> | null | undefined): boolean {
    if (other == null) {
      return false;
    }

    if (this === other) {
      return true;
    }

    return (
      this.constructor === other.constructor &&
      this.id === other.id
    );
  }
}