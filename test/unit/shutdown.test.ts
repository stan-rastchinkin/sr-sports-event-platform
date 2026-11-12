import { registerShutdownHandlers } from "../../src/shutdown.js";
import { afterEach, describe, expect, it, jest } from "@jest/globals";

import type { FastifyInstance } from "fastify";
import type { DataSource } from "typeorm";

const signals = ["SIGINT", "SIGTERM"] as const;

describe("registerShutdownHandlers", () => {
  const previousExitCode = process.exitCode;
  const previousListeners = {
    SIGINT: process.listeners("SIGINT"),
    SIGTERM: process.listeners("SIGTERM"),
  };

  afterEach(() => {
    process.exitCode = previousExitCode;
    for (const signal of signals) {
      process.removeAllListeners(signal);
      for (const listener of previousListeners[signal]) {
        process.on(signal, listener);
      }
    }
    jest.restoreAllMocks();
  });

  it("closes the server and the database on SIGINT, and ignores a second signal", async () => {
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const destroy = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const info = jest.fn();
    const { dataSource, fastify } = fakes({ close, destroy, info });

    registerShutdownHandlers(fastify, dataSource, 20_000);
    process.emit("SIGINT");
    process.emit("SIGTERM");
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith({ signal: "SIGINT" }, "Shutting down");
    expect(info).toHaveBeenCalledWith("Graceful shutdown completed");
    expect(process.exitCode).toBe(0);
  });

  it("leaves an uninitialized database alone", async () => {
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const destroy = jest.fn<() => Promise<void>>();
    const { dataSource, fastify } = fakes({
      close,
      destroy,
      initialized: false,
    });

    registerShutdownHandlers(fastify, dataSource, 20_000);
    process.emit("SIGTERM");
    await flush();

    expect(close).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it("records a failure when close rejects", async () => {
    const error = new Error("close failed");
    const close = jest.fn<() => Promise<void>>().mockRejectedValue(error);
    const logError = jest.fn();
    const { dataSource, fastify } = fakes({ close, error: logError });

    registerShutdownHandlers(fastify, dataSource, 20_000);
    process.emit("SIGINT");
    await flush();

    expect(logError).toHaveBeenCalledWith(error, "Shutdown failed");
    expect(process.exitCode).toBe(1);
  });

  it("exits when shutdown exceeds the configured timeout", async () => {
    const exit = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const logError = jest.fn();
    const { dataSource, fastify } = fakes({
      close: () => new Promise<void>(() => undefined),
      error: logError,
      initialized: false,
    });

    registerShutdownHandlers(fastify, dataSource, 15);
    process.emit("SIGINT");
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(logError).toHaveBeenCalledWith("Graceful shutdown timed out");
    expect(exit).toHaveBeenCalledWith(1);
  });
});

function fakes(options: {
  close: () => Promise<void>;
  destroy?: () => Promise<void>;
  error?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
  initialized?: boolean;
}): { dataSource: DataSource; fastify: FastifyInstance } {
  return {
    dataSource: {
      destroy: options.destroy ?? ((): Promise<void> => Promise.resolve()),
      isInitialized: options.initialized ?? true,
    } as unknown as DataSource,
    fastify: {
      close: options.close,
      log: {
        error: options.error ?? jest.fn(),
        info: options.info ?? jest.fn(),
      },
    } as unknown as FastifyInstance,
  };
}

function flush(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
