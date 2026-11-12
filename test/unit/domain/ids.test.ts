import {
  DomainError,
  eventId,
  sportId,
  teamId,
} from "../../../src/domain/index.js";
import { describe, expect, it } from "@jest/globals";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("identifiers", () => {
  it("accepts a UUID EventId", () => {
    expect(eventId(uuid)).toBe(uuid);
  });

  it("accepts a UUID TeamId", () => {
    expect(teamId(uuid)).toBe(uuid);
  });

  it("accepts an integer SportId", () => {
    expect(sportId(1)).toBe(1);
  });

  it.each([
    ["EventId", () => eventId("event-1")],
    ["TeamId", () => teamId("team-1")],
  ] as const)("rejects an invalid %s", (_label, create) => {
    expect(create).toThrow(DomainError);
    expect(create).toThrow("must be a UUID");
  });

  it("rejects a SportId that is not an integer", () => {
    expect(() => sportId(1.5)).toThrow(DomainError);
    expect(() => sportId(1.5)).toThrow("SportId must be an integer");
    expect(() => sportId(Number.NaN)).toThrow(
      expect.objectContaining({
        extras: { value: Number.NaN },
      }),
    );
  });
});
