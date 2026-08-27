import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  installGracefulShutdown,
  type LifecycleLogger,
  type SignalTarget,
} from "../../src/apps/api/process-lifecycle";
import {
  startLoopbackServer,
  type LoopbackApp,
} from "../../src/apps/api/server";

class FakeSignalTarget extends EventEmitter implements SignalTarget {
  exitCode: NodeJS.Process["exitCode"];

  override on(signal: "SIGINT" | "SIGTERM", handler: () => void): this {
    return super.on(signal, handler);
  }

  override off(signal: "SIGINT" | "SIGTERM", handler: () => void): this {
    return super.off(signal, handler);
  }
}

function createLogger(): LifecycleLogger {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

describe("server lifecycle", () => {
  const runtimeEnvironment = {
    PORT: "4178",
    DATA_DIR: "/tmp/career-radar-data",
    CORS_ORIGINS: "http://127.0.0.1:4177,http://127.0.0.1:5173",
    LOCAL_TENANT_ID: "local-career-owner",
    LOCAL_ACCOUNT_ID: "local-career-account",
    MATERIAL_ENCRYPTION_KEY_HEX: "5a".repeat(32),
  } as const;

  it("starts only on configured loopback and stops idempotently", async () => {
    const listen = vi.fn(async () => "http://127.0.0.1:4178");
    const close = vi.fn(async () => undefined);
    const app: LoopbackApp = { listen, close };

    const server = await startLoopbackServer({
      environment: runtimeEnvironment,
      buildApp: async () => app,
    });

    expect(listen).toHaveBeenCalledWith({ host: "127.0.0.1", port: 4178 });
    expect(server.address).toBe("http://127.0.0.1:4178");
    expect(server.config).not.toHaveProperty("encryptionKeyHex");
    await Promise.all([server.stop(), server.stop()]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes a partially initialized app and preserves the startup failure", async () => {
    const startError = new Error("listen failed");
    const close = vi.fn(async () => undefined);

    await expect(
      startLoopbackServer({
        environment: runtimeEnvironment,
        buildApp: async () => ({
          listen: vi.fn(async () => {
            throw startError;
          }),
          close,
        }),
      }),
    ).rejects.toBe(startError);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("handles SIGINT and SIGTERM through one graceful stop", async () => {
    const stop = vi.fn(async () => undefined);
    const signalTarget = new FakeSignalTarget();
    const logger = createLogger();
    const controller = installGracefulShutdown({ stop }, signalTarget, logger);

    signalTarget.emit("SIGINT");
    signalTarget.emit("SIGTERM");
    await controller.shutdown("SIGTERM");

    expect(stop).toHaveBeenCalledTimes(1);
    expect(signalTarget.listenerCount("SIGINT")).toBe(0);
    expect(signalTarget.listenerCount("SIGTERM")).toBe(0);
    expect(signalTarget.exitCode).toBeUndefined();
  });

  it("reports a truthful failed shutdown through a non-zero exit code", async () => {
    const stopError = new Error("close failed");
    const signalTarget = new FakeSignalTarget();
    const logger = createLogger();
    const controller = installGracefulShutdown(
      {
        stop: vi.fn(async () => {
          throw stopError;
        }),
      },
      signalTarget,
      logger,
    );

    await controller.shutdown("SIGTERM");

    expect(signalTarget.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "Frontend Career Radar backend 停止失败。",
      stopError,
    );
  });

  it("keeps the required npm command contract explicit", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };

    for (const command of ["dev", "build", "lint", "typecheck", "test"]) {
      expect(packageJson.scripts?.[command]).toEqual(expect.any(String));
      expect(packageJson.scripts?.[command]).not.toHaveLength(0);
    }
  });
});
