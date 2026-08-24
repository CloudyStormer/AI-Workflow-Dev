import type { FastifyInstance } from "fastify";

import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from "../../config/runtime-config";
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
  readonly config: RuntimeConfig;
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
  const app = await (options.buildApp ?? (async () => asLoopbackApp(await buildApiApp())))();

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
    config,
    stop(): Promise<void> {
      stopPromise ??= app.close();
      return stopPromise;
    },
  });
}
