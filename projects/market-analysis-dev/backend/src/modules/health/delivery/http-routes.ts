import type { FastifyInstance } from "fastify";

import { HealthService } from "../application/health-service";

const HEALTH_CACHE_CONTROL = "private, no-store";

export async function registerHealthRoutes(
  app: FastifyInstance,
  healthService: HealthService,
): Promise<void> {
  app.get("/healthz", async (request, reply) => {
    return reply
      .header("cache-control", HEALTH_CACHE_CONTROL)
      .send(healthService.getProcessHealth(request.id));
  });

  app.get("/readyz", async (request, reply) => {
    return reply
      .header("cache-control", HEALTH_CACHE_CONTROL)
      .code(503)
      .send(healthService.getReadiness(request.id));
  });
}
