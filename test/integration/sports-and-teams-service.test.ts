import "reflect-metadata";
import "../../src/container.js";
import { SportsService } from "../../src/application/sports-service.js";
import { TeamsService } from "../../src/application/teams-service.js";
import { createDataSource } from "../../src/persistence/data-source.js";
import { SportSchema } from "../../src/persistence/schemas/sport.js";
import { TeamSchema } from "../../src/persistence/schemas/team.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Container } from "typedi";
import { DataSource } from "typeorm";

const sports = [
  { id: 32201, name: "Catalog sport 1" },
  { id: 32202, name: "Catalog sport 2" },
  { id: 32203, name: "Catalog sport 3" },
] as const;

const teams = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    sportId: sports[0].id,
    name: "Catalog team 1",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    sportId: sports[1].id,
    name: "Catalog team 2",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    sportId: sports[2].id,
    name: "Catalog team 3",
  },
] as const;

const sportIds = sports.map((sport) => sport.id);
const teamIds = teams.map((team) => team.id);

describe("SportsService and TeamsService", () => {
  let dataSource: DataSource;
  let sportsService: SportsService;
  let teamsService: TeamsService;

  beforeAll(async () => {
    dataSource = createDataSource(requireDatabaseUrl());
    Container.set(DataSource, dataSource);
    await dataSource.initialize();
    sportsService = Container.get(SportsService);
    teamsService = Container.get(TeamsService);

    await removeCatalog(dataSource);
    await dataSource.createQueryBuilder().insert().into(SportSchema).values([...sports]).execute();
    await dataSource.createQueryBuilder().insert().into(TeamSchema).values([...teams]).execute();
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await removeCatalog(dataSource);
      await dataSource.destroy();
    }

    // A later Container.reset() calls destroy() again. Once disconnected that
    // call rejects, and TypeDI does not await it.
    dataSource.destroy = () => Promise.resolve();
  });

  it("lists sports in id order and honors limit and offset", async () => {
    const all = await sportsService.listSports({ limit: 100, offset: 0 });
    const ids = all.map((row) => row.id);

    expect(ids).toEqual([...ids].sort((left, right) => left - right));
    expect(ids).toEqual(expect.arrayContaining([...sportIds]));

    const start = ids.indexOf(sports[0].id);
    const page = await sportsService.listSports({ limit: 2, offset: start });

    expect(page.map((row) => row.id)).toEqual(ids.slice(start, start + 2));
  });

  it("lists teams in id order and honors limit and offset", async () => {
    const all = await teamsService.listTeams({ limit: 100, offset: 0 });
    const ids = all.map((row) => row.id);

    expect(ids).toEqual([...ids].sort());
    expect(ids).toEqual(expect.arrayContaining([...teamIds]));

    const start = ids.indexOf(teams[0].id);
    const page = await teamsService.listTeams({ limit: 1, offset: start });

    expect(page.map((row) => row.id)).toEqual(ids.slice(start, start + 1));
  });

  it("applies the default page when the query is empty", async () => {
    const sportsPage = await sportsService.listSports({});
    const teamsPage = await teamsService.listTeams({});

    expect(sportsPage.length).toBeLessThanOrEqual(50);
    expect(teamsPage.length).toBeLessThanOrEqual(50);
    expect(sportsPage.map((row) => row.id)).toEqual(
      [...sportsPage.map((row) => row.id)].sort((left, right) => left - right),
    );
    expect(teamsPage.map((row) => row.id)).toEqual([...teamsPage.map((row) => row.id)].sort());
  });
});

function requireDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

async function removeCatalog(dataSource: DataSource): Promise<void> {
  await dataSource.query(`DELETE FROM sports_events WHERE sport_id = ANY($1::int[])`, [sportIds]);
  await dataSource.query(`DELETE FROM teams WHERE sport_id = ANY($1::int[])`, [sportIds]);
  await dataSource.query(`DELETE FROM sports WHERE id = ANY($1::int[])`, [sportIds]);
}
