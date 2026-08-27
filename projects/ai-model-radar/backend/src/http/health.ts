import type { FastifyInstance } from "fastify";

import {
  OPERATION_SCHEMA_VERSION,
  createControlEnvelope,
  type RadarError,
} from "./operation-envelope.js";

const CAPABILITIES = ["query", "runtime"] as const;
type Capability = (typeof CAPABILITIES)[number];

interface ReadinessQuery {
  readonly capability?: Capability;
}

const healthResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schema_version",
    "request_id",
    "request_mode",
    "data_mode",
    "coverage_applicability",
    "coverage_policy",
    "operation_id",
    "refresh_run_id",
    "fetch_run_id",
    "operation_state",
    "status_revision",
    "observed_at",
    "data",
    "errors",
  ],
  properties: {
    schema_version: { type: "string", const: OPERATION_SCHEMA_VERSION },
    request_id: { type: "string", minLength: 1 },
    request_mode: { type: "string", const: "control" },
    data_mode: { type: "null" },
    coverage_applicability: { type: "string", const: "not_applicable" },
    coverage_policy: { type: "null" },
    operation_id: { type: "string", minLength: 1 },
    refresh_run_id: { type: "null" },
    fetch_run_id: { type: "null" },
    operation_state: { type: "string", enum: ["healthy", "not_ready"] },
    status_revision: { type: "null" },
    observed_at: { type: "string", format: "date-time" },
    data: { type: "object", additionalProperties: true },
    errors: { type: "array", items: { type: "object", additionalProperties: true } },
  },
} as const;

function createNotReadyError(input: {
  readonly requestId: string;
  readonly observedAt: string;
  readonly capability: Capability;
  readonly missingGates: readonly string[];
}): RadarError {
  return {
    schema_version: OPERATION_SCHEMA_VERSION,
    code: "DEPENDENCY_NOT_READY",
    message_zh_cn: "目标能力尚未就绪。",
    impact_scope: {
      project_id: "ai-model-radar",
      capability: input.capability,
    },
    retryable: false,
    occurred_at: input.observedAt,
    request_id: input.requestId,
    source: null,
    version: {},
    as_of: null,
    observed_at: input.observedAt,
    last_success_at: null,
    freshness: null,
    coverage: null,
    safe_details: {
      missing_gates: input.missingGates,
    },
  };
}

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/health/live",
    {
      schema: {
        response: { 200: healthResponseSchema },
      },
    },
    async (request) => {
      const observedAt = new Date().toISOString();

      return createControlEnvelope({
        requestId: request.id,
        operationId: "health-live",
        operationState: "healthy",
        observedAt,
        data: {
          liveness: "live",
          proves: "process_event_loop_responsive",
        },
      });
    },
  );

  app.get<{ Querystring: ReadinessQuery }>(
    "/health/ready",
    {
      schema: {
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            capability: { type: "string", enum: CAPABILITIES, default: "query" },
          },
        },
        response: { 503: healthResponseSchema },
      },
    },
    async (request, reply) => {
      const capability = request.query.capability ?? "query";
      const observedAt = new Date().toISOString();
      const missingGates =
        capability === "query"
          ? ["schema_migrations", "live_database", "snapshot_pointer"]
          : [
              "schema_migrations",
              "governance_consistency",
              "coverage_policy",
              "runtime_registration",
              "worker_write_path",
            ];

      const error = createNotReadyError({
        requestId: request.id,
        observedAt,
        capability,
        missingGates,
      });

      return reply.status(503).send(
        createControlEnvelope({
          requestId: request.id,
          operationId: `health-ready-${capability}`,
          operationState: "not_ready",
          observedAt,
          data: {
            capability,
            readiness: "not_ready",
            migration_state: "not_applied",
            missing_gates: missingGates,
          },
          errors: [error],
        }),
      );
    },
  );
}
