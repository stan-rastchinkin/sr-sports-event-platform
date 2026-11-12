import "reflect-metadata";
import { buildApp } from "./app.js";
import "./container.js";
import { loadEnv } from "./config/env.js";
import { createDataSource } from "./persistence/data-source.js";
import { Container } from "typedi";
import { DataSource } from "typeorm";

import type { Env } from "./config/env.js";
import type { FastifyInstance } from "fastify";

export interface Application {
  app: FastifyInstance;
  dataSource: DataSource;
  env: Env;
}

export async function bootstrap(): Promise<Application> {
  const env = loadEnv();
  const dataSource = createDataSource(env.DATABASE_URL);
  Container.set({
    id: DataSource,
    value: dataSource,
    global: true,
  });

  await dataSource.initialize();

  try {
    return {
      app: await buildApp({ env, dataSource }),
      dataSource,
      env,
    };
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
