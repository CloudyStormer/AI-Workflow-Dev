import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HealthService } from "../application/health-service";

const HEALTH_CACHE_CONTROL = "private, no-store";

export async function registerHealthRoutes(
  app: FastifyInstance,
  healthService: HealthService,
): Promise<void> {
  const live = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply
      .header("cache-control", HEALTH_CACHE_CONTROL)
      .send(healthService.getProcessHealth(request.id));
  };
  app.get("/healthz", live);
  app.get("/health/live", live);

  const ready = async (request: FastifyRequest, reply: FastifyReply) => {
    const readiness = healthService.getReadiness(request.id);
    return reply
      .header("cache-control", HEALTH_CACHE_CONTROL)
      .code(readiness.data.ready ? 200 : 503)
      .send(readiness);
  };
  app.get("/readyz", ready);
  app.get("/health/ready", ready);
}
