import type { FastifyInstance } from "fastify";
import type { DataSource } from "typeorm";

export function registerShutdownHandlers(
  fastify: FastifyInstance,
  dataSource: DataSource,
  shutdownTimeoutMs: number,
): void {
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    fastify.log.info({ signal }, "Shutting down");

    const timeout = setTimeout(() => {
      fastify.log.error("Graceful shutdown timed out");
      process.exit(1);
    }, shutdownTimeoutMs);

    timeout.unref();

    try {
      await fastify.close();

      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }

      fastify.log.info("Graceful shutdown completed");
      process.exitCode = 0;
    } catch (error) {
      fastify.log.error(error, "Shutdown failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(timeout);
    }
  }

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
