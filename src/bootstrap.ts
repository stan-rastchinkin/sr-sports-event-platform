import "reflect-metadata";
import { buildApp } from "./app.js";
import "./container.js";
import { loadEnv } from "./config/env.js";
import { createDataSource } from "./persistence/data-source.js";
import { Container } from "typedi";
import { DataSource } from "typeorm";

import type { FastifyInstance } from "fastify";

export async function bootstrap(): Promise<FastifyInstance> {
  const env = loadEnv();
  const dataSource = createDataSource(env.DATABASE_URL);
  Container.set(DataSource, dataSource);

  await dataSource.initialize();

  try {
    return await buildApp({ env, dataSource });
  } catch (error) {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    throw error;
  }
}

export async function shutdown(app: FastifyInstance): Promise<void> {
  await app.close();
}
