import "reflect-metadata";
import {
  eventId,
  SportsEvent,
  sportId,
  Team,
  teamId,
} from "../../src/domain/index.js";
import { createDataSource } from "../../src/persistence/data-source.js";
import { OptimisticLockError } from "../../src/persistence/repositories/optimistic-lock-error.js";
import { SportsEventRepository } from "../../src/persistence/repositories/sports-event-repository.js";
import { SportSchema } from "../../src/persistence/schemas/sport.js";
import { TeamSchema } from "../../src/persistence/schemas/team.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { Container } from "typedi";
import { DataSource } from "typeorm";

import type { SportId } from "../../src/domain/index.js";

const sport = sportId(32111);

describe("SportsEventRepository", () => {
  let dataSource: DataSource;
  let repository: SportsEventRepository;
  const homeId = randomUUID();
  const awayId = randomUUID();

  beforeAll(async () => {
    dataSource = createDataSource(requireDatabaseUrl());
    Container.set(DataSource, dataSource);
    await dataSource.initialize();
    repository = Container.get(SportsEventRepository);

    await removeSport(dataSource, sport);
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(SportSchema)
      .values({ id: sport, name: "Test sport" })
      .execute();
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(TeamSchema)
      .values([
        { id: homeId, sportId: sport, name: "Home" },
        { id: awayId, sportId: sport, name: "Away" },
      ])
      .execute();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await removeSport(dataSource, sport);
      await dataSource.destroy();
    }

    // A later Container.reset() calls destroy() again. Once disconnected that
    // call rejects, and TypeDI does not await it.
    dataSource.destroy = () => Promise.resolve();
  });

  it("inserts version 0 as 1, finds the event, updates it, and rejects a stale version", async () => {
    const id = eventId(randomUUID());
    const scheduledAt = new Date("2030-06-01T15:00:00.000Z");
    const created = SportsEvent.create({
      id,
      sportId: sport,
      homeTeam: new Team(teamId(homeId), sport, "Home"),
      awayTeam: new Team(teamId(awayId), sport, "Away"),
      scheduledAt,
    });

    const saved = await repository.save(created);

    expect(created.version).toBe(0);
    expect(saved.version).toBe(1);
    expect(saved.status.state).toEqual({ status: "scheduled" });

    const found = await repository.findById(id);

    expect(found?.version).toBe(1);
    expect(found?.homeTeam.name).toBe("Home");
    expect(found?.awayTeam.name).toBe("Away");
    expect(found?.scheduledAt).toEqual(scheduledAt);

    const rescheduledAt = new Date("2030-06-02T18:00:00.000Z");
    saved.reschedule(rescheduledAt);
    const updated = await repository.save(saved);

    expect(saved.version).toBe(1);
    expect(updated.version).toBe(2);
    expect(updated.scheduledAt).toEqual(rescheduledAt);
    await expect(repository.findById(id)).resolves.toMatchObject({
      version: 2,
      scheduledAt: rescheduledAt,
    });
    await expect(repository.save(saved)).rejects.toBeInstanceOf(OptimisticLockError);
  });
});

function requireDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

async function removeSport(dataSource: DataSource, sportId: SportId): Promise<void> {
  await dataSource.query(`DELETE FROM sports_events WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM teams WHERE sport_id = $1`, [sportId]);
  await dataSource.query(`DELETE FROM sports WHERE id = $1`, [sportId]);
}
