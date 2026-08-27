import type { FastifyInstance } from "fastify";

import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from "../../config/runtime-config";
import { initializeCareerRuntime } from "../../runtime/career-runtime";
import { buildApiApp } from "./app";

export {
  LOOPBACK_HOST,
  resolveLoopbackPort,
} from "../../config/runtime-config";

export interface LoopbackApp {
  listen(options: { host: string; port: number }): Promise<string>;
  close(): Promise<void>;
}

export interface RunningLoopbackServer {
  readonly address: string;
  readonly config: Omit<RuntimeConfig, "encryptionKeyHex">;
  stop(): Promise<void>;
}

export interface StartLoopbackServerOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly buildApp?: () => Promise<LoopbackApp>;
}

function asLoopbackApp(app: FastifyInstance): LoopbackApp {
  return app;
}

export async function startLoopbackServer(
  options: StartLoopbackServerOptions = {},
): Promise<RunningLoopbackServer> {
  const config = loadRuntimeConfig(options.environment);
  const app = options.buildApp === undefined ? await buildRuntimeApp(config) : await options.buildApp();

  let address: string;
  try {
    address = await app.listen({ host: config.host, port: config.port });
  } catch (startError: unknown) {
    try {
      await app.close();
    } catch (closeError: unknown) {
      throw new AggregateError(
        [startError, closeError],
        "后端启动失败，且启动回滚关闭也失败。",
      );
    }
    throw startError;
  }

  let stopPromise: Promise<void> | undefined;

  return Object.freeze({
    address,
    config: Object.freeze({
      host: config.host,
      port: config.port,
      dataDirectory: config.dataDirectory,
      corsOrigins: config.corsOrigins,
      tenantId: config.tenantId,
      accountId: config.accountId,
    }),
    stop(): Promise<void> {
      stopPromise ??= app.close();
      return stopPromise;
    },
  });
}

async function buildRuntimeApp(config: RuntimeConfig): Promise<LoopbackApp> {
  const runtime = await initializeCareerRuntime(config);
  try {
    return asLoopbackApp(
      await buildApiApp({
        runtime,
        tenantId: config.tenantId,
        accountId: config.accountId,
        corsOrigins: config.corsOrigins,
        logger: true,
      }),
    );
  } catch (error) {
    runtime.close();
    throw error;
  }
}
