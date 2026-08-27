import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import type { RadarService } from "./application/radar-service.js";
import { registerHealthRoutes } from "./http/health.js";
import { registerRadarRoutes } from "./http/radar.js";

export interface AppOptions {
  readonly logger?: boolean;
  readonly service?: RadarService;
  readonly corsOrigin?: string;
}

export async function createApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
    requestIdHeader: "x-request-id",
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("cache-control", "private, no-store");
    return payload;
  });

  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  if (options.corsOrigin !== undefined) {
    await app.register(cors, {
      origin: options.corsOrigin,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["content-type", "idempotency-key", "x-request-id"],
      exposedHeaders: ["x-request-id"],
      credentials: false,
    });
  }

  await registerHealthRoutes(app, options.service ?? null);
  if (options.service !== undefined) {
    await registerRadarRoutes(app, options.service);
  }
  return app;
}
