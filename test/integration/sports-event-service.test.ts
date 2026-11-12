import "reflect-metadata";
import "../../src/container.js";
import { TeamScheduleConflictError } from "../../src/application/errors.js";
import { SportsEventService } from "../../src/application/sports-event-service.js";
import {
  eventId,
  EventStatusName,
  SportsEvent,
  SportsEventDomainError,
  SportsEventStatusDomainError,
  sportId,
  teamId,
} from "../../src/domain/index.js";
import { createDataSource } from "../../src/persistence/data-source.js";
import {
  OptimisticLockError,
  SportsEventNotFoundError,
  TeamNotFoundError,
} from "../../src/persistence/repositories/errors.js";
import { SportSchema } from "../../src/persistence/schemas/sport.js";
import { TeamSchema } from "../../src/persistence/schemas/team.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { Container } from "typedi";
import { DataSource } from "typeorm";

import type { SportId } from "../../src/domain/index.js";

const sport = sportId(32112);
const otherSport = sportId(32113);
const MINUTE_MS = 60 * 1000;

describe("SportsEventService", () => {
  let dataSource: DataSource;
  let service: SportsEventService;
  const homeId = randomUUID();
  const awayId = randomUUID();
  const thirdId = randomUUID();
  const fourthId = randomUUID();
  const otherHomeId = randomUUID();
  const otherAwayId = randomUUID();

  beforeAll(async () => {
    dataSource = createDataSource(requireDatabaseUrl());
    Container.set(DataSource, dataSource);
    await dataSource.initialize();
    service = Container.get(SportsEventService);

    await removeSport(dataSource, sport);
    await removeSport(dataSource, otherSport);
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(SportSchema)
      .values([
        { id: sport, name: "Service sport" },
        { id: otherSport, name: "Other sport" },
      ])
      .execute();
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(TeamSchema)
      .values([
        { id: homeId, sportId: sport, name: "Home" },
        { id: awayId, sportId: sport, name: "Away" },
        { id: thirdId, sportId: sport, name: "Third" },
        { id: fourthId, sportId: sport, name: "Fourth" },
        { id: otherHomeId, sportId: otherSport, name: "Other home" },
        { id: otherAwayId, sportId: otherSport, name: "Other away" },
      ])
      .execute();
  });

  beforeEach(async () => {
    await dataSource.query(`DELETE FROM sports_events WHERE sport_id = ANY($1::int[])`, [
      [sport, otherSport],
    ]);
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await removeSport(dataSource, sport);
      await removeSport(dataSource, otherSport);
      await dataSource.destroy();
    }

    // A later Container.reset() calls destroy() again. Once disconnected that
    // call rejects, and TypeDI does not await it.
    dataSource.destroy = () => Promise.resolve();
  });

  it("schedules an event and returns it", async () => {
    const scheduledAt = new Date("2060-01-01T12:00:00.000Z");
    const saved = await service.schedule(booking(homeId, awayId, scheduledAt));

    expect(saved.version).toBe(1);
    expect(saved.sportId).toBe(sport);
    expect(saved.homeTeam.name).toBe("Home");
    expect(saved.awayTeam.name).toBe("Away");
    expect(saved.scheduledAt).toEqual(scheduledAt);
    expect(saved.status.state).toEqual({ status: EventStatusName.Scheduled });
    await expect(service.getById(saved.id)).resolves.toMatchObject({
      id: saved.id,
      version: 1,
    });
  });

  it("rejects a missing team, the same team twice, and a cross-sport team", async () => {
    const scheduledAt = new Date("2060-02-01T12:00:00.000Z");

    await expect(service.schedule(booking(randomUUID(), awayId, scheduledAt))).rejects.toBeInstanceOf(
      TeamNotFoundError,
    );
    await expect(service.schedule(booking(homeId, homeId, scheduledAt))).rejects.toBeInstanceOf(
      SportsEventDomainError,
    );
    await expect(
      service.schedule({
        sportId: sport,
        homeTeamId: teamId(homeId),
        awayTeamId: teamId(otherHomeId),
        scheduledAt,
      }),
    ).rejects.toBeInstanceOf(SportsEventDomainError);
    expect(await countEvents(dataSource, sport)).toBe(0);
  });

  it("reschedules a scheduled event and rejects a reschedule after start", async () => {
    const scheduledAt = new Date("2060-03-01T12:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, scheduledAt));
    const nextStart = new Date("2060-03-01T18:00:00.000Z");
    const moved = await service.reschedule({ eventId: created.id, scheduledAt: nextStart });

    expect(moved.version).toBe(2);
    expect(moved.scheduledAt).toEqual(nextStart);

    await service.start({ eventId: created.id, at: nextStart });
    await expect(
      service.reschedule({
        eventId: created.id,
        scheduledAt: new Date("2060-03-02T18:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(SportsEventDomainError);
  });

  it("starts a scheduled event once", async () => {
    const scheduledAt = new Date("2060-04-01T12:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, scheduledAt));
    const startedAt = new Date("2060-04-01T12:05:00.000Z");
    const started = await service.start({ eventId: created.id, at: startedAt });

    expect(started.status.state).toEqual({
      status: EventStatusName.InProgress,
      startedAt,
    });
    await expect(service.start({ eventId: created.id, at: startedAt })).rejects.toBeInstanceOf(
      SportsEventStatusDomainError,
    );
  });

  it("finishes an in-progress event and rejects finishing a scheduled event", async () => {
    const scheduledAt = new Date("2060-05-01T12:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, scheduledAt));
    const startedAt = new Date("2060-05-01T12:05:00.000Z");
    await expect(
      service.finish({ eventId: created.id, at: new Date("2060-05-01T14:00:00.000Z") }),
    ).rejects.toBeInstanceOf(SportsEventStatusDomainError);

    await service.start({ eventId: created.id, at: startedAt });
    const finishedAt = new Date("2060-05-01T13:30:00.000Z");
    const finished = await service.finish({ eventId: created.id, at: finishedAt });

    expect(finished.status.state).toEqual({
      status: EventStatusName.Finished,
      startedAt,
      finishedAt,
    });
  });

  it("cancels a scheduled event and rejects cancelling an in-progress event", async () => {
    const scheduledAt = new Date("2060-06-01T12:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, scheduledAt));
    const cancelledAt = new Date("2060-06-01T11:00:00.000Z");
    const cancelled = await service.cancel({
      eventId: created.id,
      reason: "rain",
      at: cancelledAt,
    });

    expect(cancelled.status.state).toEqual({
      status: EventStatusName.Cancelled,
      cancelledAt,
      cancelationReason: "rain",
    });

    const live = await service.schedule(
      booking(homeId, awayId, new Date("2060-06-02T12:00:00.000Z")),
    );
    await service.start({ eventId: live.id, at: new Date("2060-06-02T12:01:00.000Z") });
    await expect(
      service.cancel({ eventId: live.id, reason: "rain", at: cancelledAt }),
    ).rejects.toBeInstanceOf(SportsEventStatusDomainError);
  });

  it("throws when the event does not exist", async () => {
    await expect(service.getById(eventId(randomUUID()))).rejects.toBeInstanceOf(SportsEventNotFoundError);
  });

  it("searches upcoming team events, all team events, and upcoming sport events", async () => {
    const now = new Date("2062-01-01T00:00:00.000Z");
    const upcoming = await service.schedule(booking(homeId, awayId, minutesAfter(now, 200)));
    const later = await service.schedule(booking(awayId, thirdId, minutesAfter(now, 400)));
    const past = await service.schedule(booking(homeId, thirdId, minutesAfter(now, -400)));
    await service.schedule({
      sportId: otherSport,
      homeTeamId: teamId(otherHomeId),
      awayTeamId: teamId(otherAwayId),
      scheduledAt: minutesAfter(now, 200),
    });
    const started = await service.schedule(booking(homeId, fourthId, minutesAfter(now, 800)));
    await service.start({ eventId: started.id, at: minutesAfter(now, 800) });

    const upcomingForHome = await service.search({
      teamId: teamId(homeId),
      status: EventStatusName.Scheduled,
      scheduledAfter: now,
    });
    expect(upcomingForHome.map((event) => event.id)).toEqual([upcoming.id]);

    const allForHome = await service.search({ teamId: teamId(homeId) });
    expect(allForHome.map((event) => event.id)).toEqual([past.id, upcoming.id, started.id]);

    const upcomingForSport = await service.search({
      sportId: sport,
      status: EventStatusName.Scheduled,
      scheduledAfter: now,
    });
    expect(upcomingForSport.map((event) => event.id)).toEqual([upcoming.id, later.id]);
  });

  it("lets one of two overlapping creates win when they share a team on opposite sides", async () => {
    const start = new Date("2063-01-01T10:00:00.000Z");
    const results = await whileTeamsLocked(dataSource, [homeId, awayId, thirdId], () => [
      service.schedule(booking(homeId, awayId, start)),
      service.schedule(booking(thirdId, homeId, start)),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(TeamScheduleConflictError);
    }
    expect(await countEvents(dataSource, sport)).toBe(1);
  });

  it("schedules overlapping events for disjoint teams", async () => {
    const start = new Date("2063-02-01T10:00:00.000Z");
    const [first, second] = await Promise.all([
      service.schedule(booking(homeId, awayId, start)),
      service.schedule(booking(thirdId, fourthId, start)),
    ]);

    expect(first).toBeInstanceOf(SportsEvent);
    expect(second).toBeInstanceOf(SportsEvent);
  });

  it("rejects shared-team starts 89 minutes apart in either order and allows 90", async () => {
    const start = new Date("2063-03-01T10:00:00.000Z");
    await service.schedule(booking(homeId, awayId, start));
    await expect(
      service.schedule(booking(homeId, thirdId, minutesAfter(start, 89))),
    ).rejects.toBeInstanceOf(TeamScheduleConflictError);

    await dataSource.query(`DELETE FROM sports_events WHERE sport_id = $1`, [sport]);
    await service.schedule(booking(homeId, awayId, minutesAfter(start, 89)));
    await expect(service.schedule(booking(thirdId, homeId, start))).rejects.toBeInstanceOf(
      TeamScheduleConflictError,
    );

    await dataSource.query(`DELETE FROM sports_events WHERE sport_id = $1`, [sport]);
    await service.schedule(booking(homeId, awayId, start));
    await expect(
      service.schedule(booking(homeId, thirdId, minutesAfter(start, 90))),
    ).resolves.toBeInstanceOf(SportsEvent);
  });

  it("rejects a reschedule that overlaps another event and allows a move within its own interval", async () => {
    const start = new Date("2063-04-01T10:00:00.000Z");
    const first = await service.schedule(booking(homeId, awayId, start));
    const second = await service.schedule(booking(homeId, thirdId, minutesAfter(start, 200)));

    await expect(
      service.reschedule({ eventId: second.id, scheduledAt: minutesAfter(start, 30) }),
    ).rejects.toBeInstanceOf(TeamScheduleConflictError);

    const moved = await service.reschedule({
      eventId: first.id,
      scheduledAt: minutesAfter(start, 30),
    });
    expect(moved.scheduledAt).toEqual(minutesAfter(start, 30));
    expect(moved.version).toBe(2);
  });

  it("reports a stale reschedule as a version conflict", async () => {
    const start = new Date("2063-05-01T10:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, start));
    const results = await whileTeamsLocked(dataSource, [homeId, awayId], () => [
      service.reschedule({ eventId: created.id, scheduledAt: minutesAfter(start, 300) }),
      service.reschedule({ eventId: created.id, scheduledAt: minutesAfter(start, 600) }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(OptimisticLockError);
      expect(rejected.reason).not.toBeInstanceOf(TeamScheduleConflictError);
    }
  });

  it("lets a later event book an interval freed by cancellation", async () => {
    const start = new Date("2063-06-01T10:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, start));
    await service.cancel({
      eventId: created.id,
      reason: "postponed",
      at: new Date("2063-06-01T09:00:00.000Z"),
    });

    await expect(service.schedule(booking(homeId, awayId, start))).resolves.toBeInstanceOf(
      SportsEvent,
    );
  });

  it("keeps an in-progress event in its planned interval", async () => {
    const start = new Date("2063-07-01T10:00:00.000Z");
    const created = await service.schedule(booking(homeId, awayId, start));
    await service.start({ eventId: created.id, at: start });

    await expect(service.schedule(booking(homeId, thirdId, start))).rejects.toBeInstanceOf(
      TeamScheduleConflictError,
    );
  });
});

function booking(homeTeamId: string, awayTeamId: string, scheduledAt: Date) {
  return {
    sportId: sport,
    homeTeamId: teamId(homeTeamId),
    awayTeamId: teamId(awayTeamId),
    scheduledAt,
  };
}

function minutesAfter(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * MINUTE_MS);
}

async function whileTeamsLocked<T>(
  dataSource: DataSource,
  teamIds: readonly string[],
  start: () => Promise<T>[],
): Promise<PromiseSettledResult<T>[]> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  let operations: Promise<T>[] = [];

  try {
    await queryRunner.startTransaction();
    await queryRunner.query(
      `SELECT id FROM teams WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`,
      [teamIds],
    );
    const holderRows: { pid: number }[] = await queryRunner.query(`SELECT pg_backend_pid() AS pid`);
    const holderPid = holderRows[0]?.pid;
    if (holderPid === undefined) {
      throw new Error("Could not read the team lock connection");
    }
    operations = start();
    await waitForTeamLockWait(dataSource, holderPid, operations.length);
    await queryRunner.commitTransaction();
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    await Promise.allSettled(operations);
    throw error;
  } finally {
    await queryRunner.release();
  }

  return Promise.allSettled(operations);
}

async function waitForTeamLockWait(
  dataSource: DataSource,
  holderPid: number,
  waiters: number,
): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const rows: { waiting: number }[] = await dataSource.query(
      `SELECT COUNT(*)::int AS waiting
       FROM pg_stat_activity
       WHERE datname = current_database()
         AND wait_event_type = 'Lock'
         AND pid <> $1`,
      [holderPid],
    );
    if (Number(rows[0]?.waiting ?? 0) >= waiters) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Timed out waiting for both transactions to block on the team lock");
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

async function countEvents(dataSource: DataSource, sportId: SportId): Promise<number> {
  const rows: { count: number }[] = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM sports_events WHERE sport_id = $1`,
    [sportId],
  );
  return Number(rows[0]?.count ?? 0);
}

async function removeSport(dataSource: DataSource, sportId: SportId): Promise<void> {
  await dataSource.query(`DELETE FROM sports_events WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM teams WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM sports WHERE id = $1`, [sportId]);
}
