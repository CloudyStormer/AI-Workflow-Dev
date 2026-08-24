import type { FastifyInstance } from "fastify";

import { HealthService } from "../application/health-service";

export async function registerHealthRoutes(
  app: FastifyInstance,
  healthService: HealthService,
): Promise<void> {
  app.get("/healthz", async () => healthService.getProcessHealth());

  app.get("/readyz", async (_request, reply) => {
    return reply.code(503).send(healthService.getReadiness());
  });
}
