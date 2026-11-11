import "reflect-metadata";
import {
  eventId,
  SportsEvent,
  sportId,
  Team,
  teamId,
} from "../../../src/domain/index.js";
import { SportsEventMapper } from "../../../src/persistence/mappers/sports-event-mapper.js";
import { TeamMapper } from "../../../src/persistence/mappers/team-mapper.js";
import { afterEach, describe, expect, it } from "@jest/globals";
import { Container } from "typedi";

const homeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const awayId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const eventUuid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("mappers", () => {
  afterEach(() => {
    Container.reset();
  });

  it("round-trips a team and a scheduled event", () => {
    const teams = Container.get(TeamMapper);
    const events = Container.get(SportsEventMapper);
    const sport = sportId(1);
    const scheduledAt = new Date("2030-01-01T15:00:00.000Z");
    const homeTeam = new Team(teamId(homeId), sport, "Home");
    const awayTeam = new Team(teamId(awayId), sport, "Away");

    const teamRow = teams.toPersistence(homeTeam);

    expect(teamRow).toEqual({ id: homeId, sportId: 1, name: "Home" });
    expect(teams.toDomain(teamRow)).toMatchObject({
      id: homeId,
      sportId: 1,
      name: "Home",
    });

    const event = SportsEvent.create({
      id: eventId(eventUuid),
      sportId: sport,
      homeTeam,
      awayTeam,
      scheduledAt,
    });
    const record = events.toPersistence(event);

    expect(record).toEqual({
      id: eventUuid,
      sportId: 1,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeTeam: { id: homeId, sportId: 1, name: "Home" },
      awayTeam: { id: awayId, sportId: 1, name: "Away" },
      scheduledAt,
      version: 0,
      status: "scheduled",
    });

    const restored = events.toDomain(record);

    expect(restored.id).toBe(eventUuid);
    expect(restored.version).toBe(0);
    expect(restored.sportId).toBe(sport);
    expect(restored.scheduledAt).toEqual(scheduledAt);
    expect(restored.homeTeam.name).toBe("Home");
    expect(restored.awayTeam.name).toBe("Away");
    expect(restored.status.state).toEqual({ status: "scheduled" });
  });
});
