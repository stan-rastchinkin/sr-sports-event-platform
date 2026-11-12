import {
  sportId,
  Team,
  TeamDomainError,
  teamId,
} from "../../../src/domain/index.js";
import { describe, expect, it } from "@jest/globals";

const salzburgId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const viennaId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("Team", () => {
  const sport = sportId(1);

  it("trims the name and keeps sport affiliation", () => {
    const team = new Team(teamId(salzburgId), sport, "  Salzburg  ");

    expect(team.id).toBe(teamId(salzburgId));
    expect(team.sportId).toBe(sport);
    expect(team.name).toBe("Salzburg");
  });

  it.each(["", "   "])("rejects a blank name %j", (name) => {
    const create = () => new Team(teamId(salzburgId), sport, name);

    expect(create).toThrow(TeamDomainError);
    expect(create).toThrow("Team name must be nonempty");
    expect(create).toThrow(
      expect.objectContaining({
        extras: { name },
      }),
    );
  });

  it("is equal to another team with the same id", () => {
    const id = teamId(salzburgId);
    const first = new Team(id, sport, "Salzburg");
    const renamed = new Team(id, sportId(2), "Red Bull");

    expect(first.equals(renamed)).toBe(true);
    expect(first.equals(new Team(teamId(viennaId), sport, "Salzburg"))).toBe(
      false,
    );
  });
});
