import { Entity } from "../../../../src/domain/core/index.js";
import { describe, expect, it } from "@jest/globals";

class Player extends Entity<string> {
  public constructor(id: string) {
    super(id);
  }
}

class Venue extends Entity<string> {
  public constructor(id: string) {
    super(id);
  }
}

describe("Entity", () => {
  it("treats the same instance as equal", () => {
    const player = new Player("p1");

    expect(player.equals(player)).toBe(true);
  });

  it("compares entities of the same class by identity", () => {
    const first = new Player("p1");
    const second = new Player("p1");
    const other = new Player("p2");

    expect(first.equals(second)).toBe(true);
    expect(first === second).toBe(false);
    expect(first.equals(other)).toBe(false);
  });

  it("does not treat different classes with the same id as equal", () => {
    const player = new Player("same");
    const venue = new Venue("same");

    expect(player.equals(venue)).toBe(false);
  });

  it("returns false for null and undefined", () => {
    const player = new Player("p1");

    expect(player.equals(null)).toBe(false);
    expect(player.equals(undefined)).toBe(false);
  });
});
