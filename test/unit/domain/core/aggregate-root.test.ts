import { AggregateRoot, DomainError } from "../../../../src/domain/core/index.js";
import { eventId } from "../../../../src/domain/index.js";
import { describe, expect, it } from "@jest/globals";

class Sample extends AggregateRoot<ReturnType<typeof eventId>> {
  public constructor(id: ReturnType<typeof eventId>, version?: number) {
    super(id, version);
  }
}

describe("AggregateRoot", () => {
  const id = eventId("11111111-1111-4111-8111-111111111111");

  it("starts newly created aggregates at version 0", () => {
    expect(new Sample(id).version).toBe(0);
  });

  it("accepts a non-negative safe integer version", () => {
    expect(new Sample(id, 0).version).toBe(0);
    expect(new Sample(id, 5).version).toBe(5);
    expect(new Sample(id, Number.MAX_SAFE_INTEGER).version).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects version %s",
    (version) => {
      expect(() => new Sample(id, version)).toThrow(DomainError);
      expect(() => new Sample(id, version)).toThrow(
        "Aggregate version must be a non-negative safe integer",
      );
    },
  );
});
