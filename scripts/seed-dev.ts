import { createDataSource } from "../src/persistence/data-source.js";

const devDatabase = "sports_events";

const sports = [
  { id: 1, name: "Football" },
  { id: 2, name: "Basketball" },
  { id: 3, name: "Ice Hockey" },
  { id: 4, name: "Handball" },
  { id: 5, name: "Volleyball" },
];

// 550e8400-…440001 and …440002 are the Salzburg and Sturm ids used in the OpenAPI examples.
const teams = [
  { id: "550e8400-e29b-41d4-a716-446655440001", sportId: 1, name: "Salzburg" },
  { id: "550e8400-e29b-41d4-a716-446655440002", sportId: 1, name: "Sturm" },
  { id: "550e8400-e29b-41d4-a716-446655440003", sportId: 1, name: "Rapid" },
  { id: "550e8400-e29b-41d4-a716-446655440004", sportId: 1, name: "Austria Wien" },
  { id: "550e8400-e29b-41d4-a716-446655440005", sportId: 2, name: "Kapfenberg" },
  { id: "550e8400-e29b-41d4-a716-446655440006", sportId: 2, name: "Klosterneuburg" },
  { id: "550e8400-e29b-41d4-a716-446655440007", sportId: 2, name: "Oberwart" },
  { id: "550e8400-e29b-41d4-a716-446655440008", sportId: 2, name: "Gmunden" },
  { id: "550e8400-e29b-41d4-a716-446655440009", sportId: 3, name: "Vienna Capitals" },
  { id: "550e8400-e29b-41d4-a716-44665544000a", sportId: 3, name: "EC Salzburg" },
  { id: "550e8400-e29b-41d4-a716-44665544000b", sportId: 3, name: "Black Wings" },
  { id: "550e8400-e29b-41d4-a716-44665544000c", sportId: 3, name: "HC Innsbruck" },
  { id: "550e8400-e29b-41d4-a716-44665544000d", sportId: 4, name: "Fivers" },
  { id: "550e8400-e29b-41d4-a716-44665544000e", sportId: 4, name: "Bregenz" },
  { id: "550e8400-e29b-41d4-a716-44665544000f", sportId: 4, name: "West Wien" },
  { id: "550e8400-e29b-41d4-a716-446655440010", sportId: 4, name: "Hard" },
  { id: "550e8400-e29b-41d4-a716-446655440011", sportId: 5, name: "Hotvolleys" },
  { id: "550e8400-e29b-41d4-a716-446655440012", sportId: 5, name: "Aich/Dob" },
  { id: "550e8400-e29b-41d4-a716-446655440013", sportId: 5, name: "Hartberg" },
  { id: "550e8400-e29b-41d4-a716-446655440014", sportId: 5, name: "Sokol" },
];

function requireDevDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required");
  }

  const database = new URL(databaseUrl).pathname.slice(1);
  if (database !== devDatabase) {
    throw new Error(`seed-dev only writes to ${devDatabase}, not ${database}`);
  }

  return databaseUrl;
}

const dataSource = createDataSource(requireDevDatabaseUrl());
await dataSource.initialize();

try {
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO sports (id, name)
       SELECT * FROM UNNEST($1::smallint[], $2::varchar[])
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [sports.map((sport) => sport.id), sports.map((sport) => sport.name)],
    );
    await manager.query(
      `INSERT INTO teams (id, sport_id, name)
       SELECT * FROM UNNEST($1::uuid[], $2::smallint[], $3::varchar[])
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [
        teams.map((team) => team.id),
        teams.map((team) => team.sportId),
        teams.map((team) => team.name),
      ],
    );
  });
} finally {
  await dataSource.destroy();
}

console.log(`Seeded ${String(sports.length)} sports and ${String(teams.length)} teams`);
