import { registerOpenApi } from "./http/plugins/openapi.js";
import { healthRoutes } from "./http/routes/health.js";
import {
  serializerCompiler,
  validatorCompiler,
} from "@fastify/type-provider-zod";
import Fastify from "fastify";

import type { Env } from "./config/env.js";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import type { DataSource } from "typeorm";

export interface AppDependencies {
  env: Env;
  dataSource: DataSource;
}

export async function buildApp(dependencies: AppDependencies) {
  const app = Fastify({
    logger:
      dependencies.env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
            },
          }
        : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook("onClose", async () => {
    if (dependencies.dataSource.isInitialized) {
      await dependencies.dataSource.destroy();
    }
  });

  try {
    await registerOpenApi(app);
    await app.register(healthRoutes(dependencies.dataSource));
  } catch (error) {
    await app.close();
    throw error;
  }

  return app;
}
