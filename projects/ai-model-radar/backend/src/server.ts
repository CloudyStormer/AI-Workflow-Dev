import { createApp } from "./app.js";
import { RadarService } from "./application/radar-service.js";
import { readServerConfig } from "./config.js";
import { RadarRepository } from "./infrastructure/repository.js";
import { PublicSourceCollector } from "./sources/collector.js";

export async function startServer(): Promise<void> {
  const config = readServerConfig();
  const repository = new RadarRepository(config.dataDir);
  const service = new RadarService(
    repository,
    new PublicSourceCollector(config.sourceTimeoutMs, config.sourceRetries),
  );
  service.initialize();
  const app = await createApp({ logger: true, service, corsOrigins: config.corsOrigins });
  app.addHook("onClose", async () => {
    repository.close();
  });

  const stop = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, "shutdown requested");
    await app.close();
  };

  process.once("SIGINT", () => {
    void stop("SIGINT");
  });
  process.once("SIGTERM", () => {
    void stop("SIGTERM");
  });

  await app.listen({ host: config.host, port: config.port });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error: unknown) => {
    const safeError = error instanceof Error ? error.message : "unknown startup error";
    process.stderr.write(`AI Model Radar backend failed to start: ${safeError}\n`);
    process.exitCode = 1;
  });
}
