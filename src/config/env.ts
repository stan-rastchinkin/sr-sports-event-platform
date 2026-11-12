import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
});

export type Env = z.output<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse({
    DATABASE_URL: source["DATABASE_URL"],
    HOST: source["HOST"],
    PORT: source["PORT"],
    NODE_ENV: source["NODE_ENV"],
    SHUTDOWN_TIMEOUT_MS: source["SHUTDOWN_TIMEOUT_MS"],
  });
}
