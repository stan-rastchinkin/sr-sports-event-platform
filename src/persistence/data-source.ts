import { entitySchemas } from "./schemas/index.js";
import { DataSource } from "typeorm";

import type { DataSourceOptions } from "typeorm";

function dataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: "postgres",
    url: databaseUrl,
    entities: entitySchemas,
    synchronize: false,
  };
}

export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource(dataSourceOptions(databaseUrl));
}

function requireDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required");
  }
  return databaseUrl;
}

/**
 * DataSource used by the TypeORM CLI. Migrations are TypeScript sources and are
 * loaded only when this instance is initialized. The running app uses createDataSource().
 */
const cliDataSource = new DataSource({
  ...dataSourceOptions(requireDatabaseUrl()),
  migrations: ["migrations/*.ts"],
});

export default cliDataSource;
