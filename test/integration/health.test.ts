import { bootstrap, shutdown } from "../../src/bootstrap.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import type { FastifyInstance } from "fastify";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootstrap();
  });

  afterAll(async () => {
    await shutdown(app);
  });

  it("returns ok when the database answers", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
