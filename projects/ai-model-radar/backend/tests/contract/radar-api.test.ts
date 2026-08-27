import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { RadarService } from "../../src/application/radar-service.js";
import { createApp } from "../../src/app.js";
import type { SourceDefinition, SourceRunResult } from "../../src/domain/types.js";
import { RadarRepository } from "../../src/infrastructure/repository.js";
import { PublicSourceCollector } from "../../src/sources/collector.js";

class DeterministicCollector extends PublicSourceCollector {
  constructor() {
    super(1_000, 0);
  }

  override async collect(source: SourceDefinition): Promise<SourceRunResult> {
    const collectedAt = "2026-08-27T05:00:00.000Z";
    return {
      source,
      outcome: "success",
      startedAt: collectedAt,
      finishedAt: collectedAt,
      durationMs: 1,
      httpStatus: 200,
      bytesReceived: 10,
      retryCount: 0,
      events: [
        {
          sourceId: source.sourceId,
          publisher: source.publisher,
          region: source.region,
          canonicalUrl: `https://github.com/ai-model-radar/${source.sourceId}/releases/tag/v1`,
          title: `${source.publisher} v1`,
          summary: "Official public source record",
          category: source.sourceKind === "rss" ? "ai_news" : "open_source",
          eventKind: source.sourceKind === "rss" ? "news" : "open_source_release",
          versionLabel: source.sourceKind === "rss" ? null : "v1",
          publishedAt: "2026-08-27T04:00:00.000Z",
          collectedAt,
          confidence: "high",
        },
      ],
      safeError: null,
    };
  }
}

const resources: Array<{ app: FastifyInstance; repository: RadarRepository; directory: string }> = [];
afterEach(async () => {
  for (const resource of resources.splice(0)) {
    await resource.app.close();
    resource.repository.close();
    rmSync(resource.directory, { recursive: true, force: true });
  }
});

async function setup(): Promise<{ app: FastifyInstance; repository: RadarRepository }> {
  const directory = mkdtempSync(path.join(tmpdir(), "amr-contract-"));
  const repository = new RadarRepository(directory);
  const service = new RadarService(repository, new DeterministicCollector());
  service.initialize();
  const app = await createApp({
    service,
    corsOrigins: ["http://127.0.0.1:5173", "http://127.0.0.1:4174"],
  });
  resources.push({ app, repository, directory });
  return { app, repository };
}

describe("Radar HTTP contract", () => {
  it("keeps query readiness false until a snapshot exists, then serves all core resources", async () => {
    const { app } = await setup();
    const before = await app.inject({ method: "GET", url: "/health/ready?capability=query" });
    expect(before.statusCode).toBe(503);
    expect(before.json().data).toMatchObject({ migration_state: "applied", snapshot_available: false });

    const refresh = await app.inject({
      method: "POST",
      url: "/api/v1/radar/refresh",
      headers: { "idempotency-key": "contract-refresh-001", origin: "http://127.0.0.1:5173" },
      payload: { trigger_kind: "manual" },
    });
    expect(refresh.statusCode).toBe(201);
    expect(refresh.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    expect(refresh.json()).toMatchObject({ operation_state: "completed", data: { eventCount: 6 } });

    const after = await app.inject({ method: "GET", url: "/health/ready?capability=query" });
    expect(after.statusCode).toBe(200);

    const today = await app.inject({ method: "GET", url: "/api/v1/radar/today" });
    const todayPayload = today.json();
    expect(todayPayload.truth).toBe("live");
    expect(todayPayload.data.events).toHaveLength(6);
    expect(today.headers["cache-control"]).toBe("private, no-store");

    const fixedLocalFrontend = await app.inject({
      method: "GET",
      url: "/api/v1/radar/today",
      headers: { origin: "http://127.0.0.1:4174" },
    });
    expect(fixedLocalFrontend.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:4174",
    );
    const rejectedOrigin = await app.inject({
      method: "GET",
      url: "/api/v1/radar/today",
      headers: { origin: "http://localhost:4174" },
    });
    expect(rejectedOrigin.headers["access-control-allow-origin"]).toBeUndefined();

    const eventId = todayPayload.data.events[0].event_id as string;
    const snapshotId = todayPayload.snapshot_id as string;
    expect((await app.inject({ method: "GET", url: `/api/v1/radar/events/${eventId}` })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: `/api/v1/radar/snapshots/${snapshotId}` })).statusCode).toBe(200);
    for (const url of [
      "/api/v1/radar/events",
      "/api/v1/radar/history",
      "/api/v1/radar/sources",
      "/api/v1/radar/source-quality",
      "/api/v1/radar/trends",
      "/api/v1/radar/open-source",
    ]) {
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(200);
    }
  });

  it("replays completed refreshes and returns structured errors", async () => {
    const { app } = await setup();
    const request = {
      method: "POST" as const,
      url: "/api/v1/radar/refresh",
      headers: { "idempotency-key": "contract-refresh-002" },
      payload: { trigger_kind: "manual" },
    };
    expect((await app.inject(request)).statusCode).toBe(201);
    const replay = await app.inject(request);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().data.reused).toBe(true);

    const missing = await app.inject({ method: "POST", url: "/api/v1/radar/refresh", payload: {} });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toMatchObject({
      operation_state: "failed",
      errors: [{ code: "IDEMPOTENCY_KEY_REQUIRED", message_zh_cn: "刷新请求必须提供幂等键。" }],
    });
  });
});
