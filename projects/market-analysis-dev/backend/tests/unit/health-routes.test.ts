import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApiApp } from "../../src/apps/api/app";
import {
  LOOPBACK_HOST,
  resolveLoopbackPort,
} from "../../src/apps/api/server";

describe("health routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApiApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it("reports process liveness without declaring dependencies ready", async () => {
    const response = await app.inject({ method: "GET", url: "/healthz" });
    const secondResponse = await app.inject({ method: "GET", url: "/healthz" });
    const body = response.json();
    const secondBody = secondResponse.json();

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(body).toMatchObject({
      project_id: "market-analysis-dev",
      status: "ok",
      data: {
        process: "alive",
        network_requests_permitted: 0,
      },
    });
    expect(body.request_id).toEqual(expect.any(String));
    expect(body.request_id).not.toHaveLength(0);
    expect(secondBody.request_id).toEqual(expect.any(String));
    expect(secondBody.request_id).not.toBe(body.request_id);
  });

  it("truthfully blocks readiness until later dependencies exist", async () => {
    const response = await app.inject({ method: "GET", url: "/readyz" });
    const body = response.json();

    expect(response.statusCode).toBe(503);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(body).toMatchObject({
      project_id: "market-analysis-dev",
      status: "not_ready",
      data: {
        ready: false,
        truth: "not_ready",
        network_requests_permitted: 0,
      },
      errors: [
        {
          code: "DEPENDENCY_NOT_READY",
          retryable: false,
        },
      ],
    });
    expect(body.request_id).toEqual(expect.any(String));
    expect(body.request_id).not.toHaveLength(0);
    expect(body.data.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "api_schema",
          status: "not_ready",
        }),
        expect.objectContaining({ id: "sqlite", status: "not_ready" }),
        expect.objectContaining({ id: "source_runtime", status: "not_ready" }),
        expect.objectContaining({ id: "worker", status: "not_ready" }),
      ]),
    );
  });

  it("keeps a future listener constrained to loopback and validates its port", () => {
    expect(LOOPBACK_HOST).toBe("127.0.0.1");
    expect(resolveLoopbackPort(undefined)).toBe(0);
    expect(resolveLoopbackPort("0")).toBe(0);
    expect(resolveLoopbackPort("4178")).toBe(4178);
    expect(() => resolveLoopbackPort("not-a-port")).toThrow();
    expect(() => resolveLoopbackPort("65536")).toThrow();
  });
});
