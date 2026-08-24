import { startLoopbackServer } from "./server";

void startLoopbackServer()
  .then((address) => {
    console.info(`Frontend Career Radar backend listening on ${address}`);
  })
  .catch((error: unknown) => {
    console.error("Frontend Career Radar backend failed to start.", error);
    process.exitCode = 1;
  });
