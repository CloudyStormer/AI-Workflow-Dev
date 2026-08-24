import { installGracefulShutdown } from "./process-lifecycle";
import { startLoopbackServer } from "./server";

async function main(): Promise<void> {
  const server = await startLoopbackServer();
  console.info(`Frontend Career Radar backend listening on ${server.address}`);
  installGracefulShutdown(server);
}

void main().catch((error: unknown) => {
  console.error("Frontend Career Radar backend failed to start.", error);
  process.exitCode = 1;
});
