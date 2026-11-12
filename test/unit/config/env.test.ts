import { loadEnv } from "../../../src/config/env.js";
import { describe, expect, it } from "@jest/globals";

const databaseUrl = "postgres://sports:sports@localhost:5432/sports_events";

describe("loadEnv", () => {
  it("defaults the listen address and the shutdown timeout", () => {
    expect(loadEnv({ DATABASE_URL: databaseUrl })).toMatchObject({
      HOST: "0.0.0.0",
      PORT: 3000,
      NODE_ENV: "production",
      SHUTDOWN_TIMEOUT_MS: 20_000,
    });
  });

  it("reads the listen address and the shutdown timeout from the environment", () => {
    expect(
      loadEnv({
        DATABASE_URL: databaseUrl,
        HOST: "127.0.0.1",
        PORT: "8080",
        NODE_ENV: "test",
        SHUTDOWN_TIMEOUT_MS: "15000",
      }),
    ).toMatchObject({
      HOST: "127.0.0.1",
      PORT: 8080,
      NODE_ENV: "test",
      SHUTDOWN_TIMEOUT_MS: 15_000,
    });
  });
});
