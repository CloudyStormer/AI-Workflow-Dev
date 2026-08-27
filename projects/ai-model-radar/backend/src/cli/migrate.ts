import { readServerConfig } from "../config.js";
import { RadarRepository } from "../infrastructure/repository.js";

const config = readServerConfig();
const repository = new RadarRepository(config.dataDir);
try {
  const result = repository.migrate();
  process.stdout.write(`${JSON.stringify(result)}\n`);
} finally {
  repository.close();
}
