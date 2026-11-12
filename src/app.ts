import { registerErrorHandler } from "./http/errors/error-handler.js";
import { registerOpenApi } from "./http/plugins/openapi.js";
import { registerRequestScope } from "./http/plugins/request-scope.js";
import { eventsRoutes } from "./http/routes/events.js";
import { healthRoutes } from "./http/routes/health.js";
import { sportsRoutes } from "./http/routes/sports.js";
import { teamsRoutes } from "./http/routes/teams.js";
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
    handlerTimeout: 10_000,
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
    registerErrorHandler(app);
    registerRequestScope(app);
    await registerOpenApi(app);
    await app.register(healthRoutes(dependencies.dataSource));
    await app.register(eventsRoutes());
    await app.register(teamsRoutes());
    await app.register(sportsRoutes());
  } catch (error) {
    await app.close();
    throw error;
  }

  return app;
}
