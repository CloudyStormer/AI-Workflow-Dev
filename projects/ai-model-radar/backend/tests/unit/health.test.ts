import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

describe("health routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("reports only process liveness", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/live",
      headers: { "x-request-id": "request-live-001" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-request-id"]).toBe("request-live-001");
    expect(response.json()).toMatchObject({
      schema_version: "1.0",
      request_id: "request-live-001",
      request_mode: "control",
      data_mode: null,
      operation_id: "health-live",
      operation_state: "healthy",
      data: {
        liveness: "live",
        proves: "process_event_loop_responsive",
      },
      errors: [],
    });
  });

  it("reports query readiness as not_ready until migrations exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready?capability=query",
      headers: { "x-request-id": "request-ready-query-001" },
    });

    expect(response.statusCode).toBe(503);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.json()).toMatchObject({
      request_id: "request-ready-query-001",
      operation_id: "health-ready-query",
      operation_state: "not_ready",
      data: {
        capability: "query",
        readiness: "not_ready",
        migration_state: "not_applied",
        missing_gates: ["schema_migrations", "live_database", "snapshot_pointer"],
      },
      errors: [
        {
          code: "DEPENDENCY_NOT_READY",
          impact_scope: {
            project_id: "ai-model-radar",
            capability: "query",
          },
          retryable: false,
        },
      ],
    });
  });

  it("keeps runtime readiness separate and not_ready", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready?capability=runtime",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      operation_id: "health-ready-runtime",
      operation_state: "not_ready",
      data: {
        capability: "runtime",
        readiness: "not_ready",
        migration_state: "not_applied",
      },
    });
  });

  it("rejects unknown readiness capabilities", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health/ready?capability=everything",
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });
});
