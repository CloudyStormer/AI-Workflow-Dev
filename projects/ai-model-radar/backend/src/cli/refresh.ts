import { RadarService } from "../application/radar-service.js";
import { readServerConfig } from "../config.js";
import { RadarRepository } from "../infrastructure/repository.js";
import { PublicSourceCollector } from "../sources/collector.js";

const config = readServerConfig();
const repository = new RadarRepository(config.dataDir);
try {
  const service = new RadarService(
    repository,
    new PublicSourceCollector(config.sourceTimeoutMs, config.sourceRetries),
  );
  service.initialize();
  const requestedKey = process.argv[2];
  const key = requestedKey ?? `cli:${new Date().toISOString()}`;
  const result = await service.refresh(key, "cli_manual");
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== "completed") process.exitCode = 1;
} finally {
  repository.close();
}
