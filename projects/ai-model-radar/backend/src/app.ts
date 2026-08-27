import Fastify, { type FastifyInstance } from "fastify";

import { registerHealthRoutes } from "./http/health.js";

export interface AppOptions {
  readonly logger?: boolean;
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

  await registerHealthRoutes(app);
  return app;
}
