import { commonErrorResponses } from "../errors/error-response.js";
import { z } from "zod";

import type { FastifyPluginCallbackZod } from "@fastify/type-provider-zod";
import type { DataSource } from "typeorm";

const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

export function healthRoutes(dataSource: DataSource): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/health",
      {
        schema: {
          response: {
            200: healthResponseSchema,
            ...commonErrorResponses,
          },
        },
      },
      async (): Promise<z.output<typeof healthResponseSchema>> => {
        await dataSource.query("SELECT 1");
        return { status: "ok" };
      },
    );
    done();
  };
}
