import type { FastifyInstance } from "fastify";

import type { RadarService } from "../application/radar-service.js";
import {
  OPERATION_SCHEMA_VERSION,
  createControlEnvelope,
  type RadarError,
} from "./operation-envelope.js";

function withRequestId(requestId: string, envelope: Record<string, unknown>): Record<string, unknown> {
  return { ...envelope, request_id: requestId };
}

function radarError(requestId: string, code: string, message: string, retryable: boolean): RadarError {
  const occurredAt = new Date().toISOString();
  return {
    schema_version: OPERATION_SCHEMA_VERSION,
    code,
    message_zh_cn: message,
    impact_scope: { project_id: "ai-model-radar" },
    retryable,
    occurred_at: occurredAt,
    request_id: requestId,
    source: null,
    version: {},
    as_of: null,
    observed_at: occurredAt,
    last_success_at: null,
    freshness: null,
    coverage: null,
    safe_details: {},
  };
}

export async function registerRadarRoutes(app: FastifyInstance, service: RadarService): Promise<void> {
  app.get("/api/v1/radar/today", async (request) =>
    withRequestId(
      request.id,
      service.content({
        snapshot: service.repository.getCurrentSnapshot(),
        events: service.repository.listEvents(20),
      }),
    ),
  );

  app.get<{ Querystring: { limit?: number } }>(
    "/api/v1/radar/events",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: { limit: { type: "integer", minimum: 1, maximum: 100, default: 50 } },
        },
      },
    },
    async (request) =>
      withRequestId(
        request.id,
        service.content({ events: service.repository.listEvents(request.query.limit ?? 50) }),
      ),
  );

  app.get<{ Params: { eventId: string } }>(
    "/api/v1/radar/events/:eventId",
    async (request, reply) => {
      const event = service.repository.getEvent(request.params.eventId);
      if (event === null) {
        const error = radarError(request.id, "EVENT_NOT_FOUND", "未找到指定事件。", false);
        return reply.status(404).send({
          ...withRequestId(request.id, service.content({ event: null })),
          truth: "failed",
          errors: [error],
        });
      }
      return withRequestId(request.id, service.content({ event }));
    },
  );

  app.get("/api/v1/radar/history", async (request) =>
    withRequestId(request.id, service.content({ snapshots: service.repository.listSnapshots() })),
  );
  app.get<{ Params: { snapshotId: string } }>(
    "/api/v1/radar/snapshots/:snapshotId",
    async (request, reply) => {
      const snapshot = service.repository.getSnapshot(request.params.snapshotId);
      if (snapshot === null) {
        const error = radarError(request.id, "SNAPSHOT_NOT_FOUND", "未找到指定快照。", false);
        return reply.status(404).send({
          ...withRequestId(request.id, service.content({ snapshot: null })),
          truth: "failed",
          errors: [error],
        });
      }
      return withRequestId(request.id, service.content({ snapshot }));
    },
  );
  app.get("/api/v1/radar/sources", async (request) =>
    withRequestId(request.id, service.content({ sources: service.repository.listSources() })),
  );
  app.get("/api/v1/radar/source-quality", async (request) =>
    withRequestId(request.id, service.content({ sources: service.repository.listSources() })),
  );
  app.get("/api/v1/radar/trends", async (request) =>
    withRequestId(request.id, service.content({ points: service.repository.trends() })),
  );
  app.get("/api/v1/radar/open-source", async (request) =>
    withRequestId(
      request.id,
      service.content({ releases: service.repository.openSourceReleases() }),
    ),
  );

  app.post<{ Body: { trigger_kind?: "manual" } }>(
    "/api/v1/radar/refresh",
    {
      config: { rateLimit: { max: 4, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: { trigger_kind: { type: "string", const: "manual" } },
        },
      },
    },
    async (request, reply) => {
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string") {
        const error = radarError(
          request.id,
          "IDEMPOTENCY_KEY_REQUIRED",
          "刷新请求必须提供幂等键。",
          false,
        );
        return reply.status(400).send(
          createControlEnvelope({
            requestId: request.id,
            operationId: "refresh-rejected",
            operationState: "failed",
            observedAt: error.occurred_at,
            data: null,
            errors: [error],
          }),
        );
      }
      try {
        const result = await service.refresh(key);
        const statusCode = result.reused ? 200 : result.status === "completed" ? 201 : 502;
        return reply.status(statusCode).send(
          createControlEnvelope({
            requestId: request.id,
            operationId: result.requestId,
            operationState: result.status,
            observedAt: result.completedAt,
            data: result,
          }),
        );
      } catch (error) {
        const code = error instanceof Error ? error.message : "REFRESH_FAILED";
        const status =
          code === "IDEMPOTENCY_CONFLICT" || code === "REFRESH_IN_PROGRESS"
            ? 409
            : code === "IDEMPOTENCY_KEY_INVALID"
              ? 400
              : 500;
        const safe = radarError(
          request.id,
          code,
          code === "REFRESH_IN_PROGRESS"
            ? "相同幂等键的刷新仍在执行。"
            : code === "IDEMPOTENCY_CONFLICT"
              ? "幂等键与原请求不一致。"
              : code === "IDEMPOTENCY_KEY_INVALID"
                ? "幂等键格式不合法。"
                : "刷新未完成，最近安全快照保持不变。",
          code === "REFRESH_IN_PROGRESS" || status >= 500,
        );
        return reply.status(status).send(
          createControlEnvelope({
            requestId: request.id,
            operationId: "refresh-failed",
            operationState: "failed",
            observedAt: safe.occurred_at,
            data: null,
            errors: [safe],
          }),
        );
      }
    },
  );
}
