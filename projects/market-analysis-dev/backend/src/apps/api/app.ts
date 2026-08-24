import Fastify, { type FastifyInstance } from "fastify";

import { HealthService } from "../../modules/health/application/health-service";
import { registerHealthRoutes } from "../../modules/health/delivery/http-routes";

export async function buildApiApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const healthService = new HealthService();

  await registerHealthRoutes(app, healthService);
  return app;
}
