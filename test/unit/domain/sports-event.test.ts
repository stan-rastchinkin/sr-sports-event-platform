import {
  eventId,
  EventStatus,
  sportId,
  SportsEvent,
  Team,
  teamId,
} from "../../../src/domain/index.js";
import { describe, expect, it } from "@jest/globals";

const eventUuid = "11111111-1111-4111-8111-111111111111";
const otherEventUuid = "22222222-2222-4222-8222-222222222222";
const homeTeamUuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const awayTeamUuid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const kickoff = new Date("2026-06-01T15:00:00.000Z");
const startedAt = new Date("2026-06-01T15:05:00.000Z");
const finishedAt = new Date("2026-06-01T16:50:00.000Z");
const cancelledAt = new Date("2026-05-30T09:00:00.000Z");

function opponents(sport = sportId(1)) {
  return {
    sport,
    home: new Team(teamId(homeTeamUuid), sport, "Salzburg"),
    away: new Team(teamId(awayTeamUuid), sport, "Vienna"),
  };
}

function createEvent(scheduledAt = kickoff): SportsEvent {
  const { sport, home, away } = opponents();
  return SportsEvent.create({
    id: eventId(eventUuid),
    sportId: sport,
    homeTeam: home,
    awayTeam: away,
    scheduledAt,
  });
}

describe("SportsEvent", () => {
  it("schedules a new event at version 0", () => {
    const { sport, home, away } = opponents();
    const event = SportsEvent.create({
      id: eventId(eventUuid),
      sportId: sport,
      homeTeam: home,
      awayTeam: away,
      scheduledAt: kickoff,
    });

    expect(event.id).toBe(eventId(eventUuid));
    expect(event.version).toBe(0);
    expect(event.sportId).toBe(sport);
    expect(event.homeTeam).toBe(home);
    expect(event.awayTeam).toBe(away);
    expect(event.scheduledAt).toEqual(kickoff);
    expect(event.status.state.status).toBe("scheduled");
  });

  it("rejects the same team on both sides", () => {
    const sport = sportId(1);
    const id = teamId(homeTeamUuid);
    const home = new Team(id, sport, "Salzburg");
    const away = new Team(id, sport, "Salzburg B");

    expect(() =>
      SportsEvent.create({
        id: eventId(eventUuid),
        sportId: sport,
        homeTeam: home,
        awayTeam: away,
        scheduledAt: kickoff,
      }),
    ).toThrow("Home and away teams must be different");
  });

  it("rejects teams that do not share the event sport", () => {
    const sport = sportId(1);
    const home = new Team(teamId(homeTeamUuid), sport, "Salzburg");
    const away = new Team(teamId(awayTeamUuid), sportId(2), "Vienna");

    expect(() =>
      SportsEvent.create({
        id: eventId(eventUuid),
        sportId: sport,
        homeTeam: home,
        awayTeam: away,
        scheduledAt: kickoff,
      }),
    ).toThrow("Event and both teams must belong to the same sport");
  });

  it("isolates stored dates from later mutation", () => {
    const input = new Date(kickoff.getTime());
    const event = createEvent(input);
    input.setUTCFullYear(1999);

    const exposed = event.scheduledAt;
    exposed.setUTCFullYear(1999);

    expect(event.scheduledAt.toISOString()).toBe("2026-06-01T15:00:00.000Z");
    expect(event.scheduledAt).not.toBe(input);
  });

  it("reschedules only while scheduled and keeps identity and version", () => {
    const event = createEvent();
    const nextKickoff = new Date("2026-06-08T18:00:00.000Z");

    event.reschedule(nextKickoff);

    expect(event.id).toBe(eventId(eventUuid));
    expect(event.version).toBe(0);
    expect(event.scheduledAt).toEqual(nextKickoff);
    expect(event.status.state.status).toBe("scheduled");

    event.start(startedAt);

    expect(() => event.reschedule(kickoff)).toThrow(
      "Only scheduled events can be rescheduled",
    );
    expect(event.scheduledAt).toEqual(nextKickoff);
    expect(event.version).toBe(0);
  });

  it("starts, finishes, and cancels through the lifecycle without changing version", () => {
    const started = createEvent();
    const before = started.status;

    started.start(startedAt);

    expect(before.state.status).toBe("scheduled");
    expect(started.status.state).toEqual({
      status: "in_progress",
      startedAt,
    });
    expect(started.version).toBe(0);
    expect(() => started.finish(kickoff)).toThrow(
      "Finish timestamp must not precede the start timestamp",
    );

    started.finish(finishedAt);

    expect(started.status.state.status).toBe("finished");
    expect(started.version).toBe(0);
    expect(() => started.cancel("rain", cancelledAt)).toThrow(
      "Only scheduled events can be cancelled",
    );

    const cancelled = createEvent();
    cancelled.cancel("  pitch frozen  ", cancelledAt);

    expect(cancelled.status.state).toEqual({
      status: "cancelled",
      cancelledAt,
      cancelationReason: "pitch frozen",
    });
    expect(cancelled.version).toBe(0);
    expect(() => cancelled.start(startedAt)).toThrow(
      "Only scheduled events can start",
    );
  });

  it("reconstitutes a persisted event and still enforces participant rules", () => {
    const { sport, home, away } = opponents();
    const status = EventStatus.create({
      status: "in_progress",
      startedAt,
    });
    const event = SportsEvent.reconstitute({
      id: eventId(otherEventUuid),
      version: 5,
      sportId: sport,
      homeTeam: home,
      awayTeam: away,
      scheduledAt: kickoff,
      status,
    });

    event.finish(finishedAt);

    expect(event.version).toBe(5);
    expect(event.status.state.status).toBe("finished");

    expect(() =>
      SportsEvent.reconstitute({
        id: eventId(otherEventUuid),
        version: 5,
        sportId: sport,
        homeTeam: home,
        awayTeam: home,
        scheduledAt: kickoff,
        status,
      }),
    ).toThrow("Home and away teams must be different");

    expect(() =>
      SportsEvent.reconstitute({
        id: eventId(otherEventUuid),
        version: -1,
        sportId: sport,
        homeTeam: home,
        awayTeam: away,
        scheduledAt: kickoff,
        status,
      }),
    ).toThrow("Aggregate version must be a non-negative safe integer");
  });
});
