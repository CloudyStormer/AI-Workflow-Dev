import type { RunningLoopbackServer } from "./server";

export type ShutdownSignal = "SIGINT" | "SIGTERM";

export interface SignalTarget {
  exitCode: NodeJS.Process["exitCode"];
  on(signal: ShutdownSignal, handler: () => void): unknown;
  off(signal: ShutdownSignal, handler: () => void): unknown;
}

export interface LifecycleLogger {
  info(message: string): void;
  error(message: string, error: unknown): void;
}

export interface ShutdownController {
  shutdown(signal: ShutdownSignal): Promise<void>;
  dispose(): void;
}

export function installGracefulShutdown(
  server: Pick<RunningLoopbackServer, "stop">,
  signalTarget: SignalTarget = process,
  logger: LifecycleLogger = console,
): ShutdownController {
  let shutdownPromise: Promise<void> | undefined;
  let disposed = false;

  const handlers: Record<ShutdownSignal, () => void> = {
    SIGINT: () => {
      void shutdown("SIGINT");
    },
    SIGTERM: () => {
      void shutdown("SIGTERM");
    },
  };

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    signalTarget.off("SIGINT", handlers.SIGINT);
    signalTarget.off("SIGTERM", handlers.SIGTERM);
  }

  function shutdown(signal: ShutdownSignal): Promise<void> {
    shutdownPromise ??= (async () => {
      logger.info(`收到 ${signal}，正在优雅停止 Frontend Career Radar backend。`);
      try {
        await server.stop();
        logger.info("Frontend Career Radar backend 已停止。");
      } catch (error: unknown) {
        signalTarget.exitCode = 1;
        logger.error("Frontend Career Radar backend 停止失败。", error);
      } finally {
        dispose();
      }
    })();

    return shutdownPromise;
  }

  signalTarget.on("SIGINT", handlers.SIGINT);
  signalTarget.on("SIGTERM", handlers.SIGTERM);

  return Object.freeze({ shutdown, dispose });
}
