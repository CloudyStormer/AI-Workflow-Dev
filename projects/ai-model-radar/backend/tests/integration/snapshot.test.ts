import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { CollectedEvent, RefreshResult, SourceDefinition, SourceRunResult } from "../../src/domain/types.js";
import { RadarRepository } from "../../src/infrastructure/repository.js";

const source: SourceDefinition = {
  sourceId: "test-official-source",
  name: "Test Official Source",
  publisher: "Test Publisher",
  region: "GLOBAL",
  sourceKind: "github_releases",
  endpointUrl: "https://api.github.com/repos/test/project/releases",
  homepageUrl: "https://github.com/test/project/releases",
  pollIntervalMinutes: 60,
};

function event(collectedAt: string): CollectedEvent {
  return {
    sourceId: source.sourceId,
    publisher: source.publisher,
    region: source.region,
    canonicalUrl: "https://github.com/test/project/releases/tag/v1.0.0",
    title: "Test Publisher v1.0.0",
    summary: "Official release",
    category: "open_source",
    eventKind: "open_source_release",
    versionLabel: "v1.0.0",
    publishedAt: "2026-08-27T01:00:00.000Z",
    collectedAt,
    confidence: "high",
  };
}

function successfulRun(collectedAt: string): SourceRunResult {
  return {
    source,
    outcome: "success",
    startedAt: collectedAt,
    finishedAt: collectedAt,
    durationMs: 5,
    httpStatus: 200,
    bytesReceived: 100,
    retryCount: 0,
    events: [event(collectedAt)],
    safeError: null,
  };
}

function result(requestId: string, snapshotId: string, newRevisions: number): RefreshResult {
  return {
    requestId,
    reused: false,
    status: "completed",
    truth: "live",
    snapshotId,
    eventCount: 1,
    insertedEvents: newRevisions,
    newRevisions,
    sourceSuccessCount: 1,
    sourceFailureCount: 0,
    completedAt: new Date().toISOString(),
  };
}

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("snapshot publication", () => {
  it("deduplicates stable payloads, replays idempotently, and preserves the last safe pointer on failure", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "amr-snapshot-"));
    temporaryDirectories.push(directory);
    const repository = new RadarRepository(directory);
    try {
      repository.migrate();
      repository.seedSources([source]);

      const firstReservation = repository.reserveRefresh("snapshot-test-001", "manual");
      const first = repository.publish(firstReservation.requestId, [successfulRun("2026-08-27T02:00:00.000Z")]);
      expect(first).not.toBeNull();
      repository.completeRefresh(firstReservation.requestId, result(firstReservation.requestId, first!.snapshotId, 1));

      const replay = repository.reserveRefresh("snapshot-test-001", "manual");
      expect(replay.existingResult?.snapshotId).toBe(first!.snapshotId);

      const secondReservation = repository.reserveRefresh("snapshot-test-002", "manual");
      const second = repository.publish(secondReservation.requestId, [successfulRun("2026-08-27T03:00:00.000Z")]);
      expect(second?.newRevisions).toBe(0);
      expect(repository.listSnapshots()).toHaveLength(2);
      expect(() => repository.live.prepare("UPDATE snapshots SET truth='failed'").run()).toThrow();

      const safePointer = repository.getCurrentSnapshot()?.snapshot_id;
      const failedReservation = repository.reserveRefresh("snapshot-test-003", "manual");
      const failed = repository.publish(failedReservation.requestId, [
        {
          ...successfulRun("2026-08-27T04:00:00.000Z"),
          outcome: "failed",
          httpStatus: 503,
          events: [],
          safeError: "HTTP_503",
        },
      ]);
      expect(failed).toBeNull();
      expect(repository.getCurrentSnapshot()?.snapshot_id).toBe(safePointer);
    } finally {
      repository.close();
    }
  });

  it("rejects a concurrent reuse of an in-progress idempotency key", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "amr-idempotency-"));
    temporaryDirectories.push(directory);
    const repository = new RadarRepository(directory);
    try {
      repository.migrate();
      repository.reserveRefresh("snapshot-running-001", "manual");
      expect(() => repository.reserveRefresh("snapshot-running-001", "manual")).toThrowError(
        "REFRESH_IN_PROGRESS",
      );
    } finally {
      repository.close();
    }
  });

  it("preserves legacy unrelated events but excludes them from a newly published safe snapshot", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "amr-relevance-snapshot-"));
    temporaryDirectories.push(directory);
    const repository = new RadarRepository(directory);
    const googleSource: SourceDefinition = {
      sourceId: "google-ai-blog-rss",
      name: "Google AI Blog RSS",
      publisher: "Google",
      region: "GLOBAL",
      sourceKind: "rss",
      endpointUrl: "https://blog.google/technology/ai/rss/",
      homepageUrl: "https://blog.google/technology/ai/",
      pollIntervalMinutes: 120,
    };
    try {
      repository.migrate();
      repository.seedSources([googleSource]);
      repository.live
        .prepare(`INSERT INTO events
          (event_id, canonical_url, source_id, publisher, region, title, summary, category,
           event_kind, version_label, published_at, first_seen_at, last_seen_at,
           current_revision, current_payload_sha256, confidence)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ai_news', 'news', NULL, ?, ?, ?, 1, ?, 'high')`)
        .run(
          "event_legacy_google_home_decor",
          "https://blog.google/products/search/home-decor/",
          googleSource.sourceId,
          googleSource.publisher,
          googleSource.region,
          "5 ways to upgrade your home decor with Google Search",
          "Google product tips for decorating a home.",
          "2026-08-26T01:00:00.000Z",
          "2026-08-26T02:00:00.000Z",
          "2026-08-26T02:00:00.000Z",
          "legacy-payload-sha",
        );
      repository.live
        .prepare(`INSERT INTO event_revisions
          (event_id, revision, previous_revision, payload_json, payload_sha256, observed_at,
           revision_reason) VALUES (?, 1, NULL, '{}', ?, ?, 'initial_observation')`)
        .run(
          "event_legacy_google_home_decor",
          "legacy-payload-sha",
          "2026-08-26T02:00:00.000Z",
        );

      const collectedAt = "2026-08-27T08:00:00.000Z";
      const reservation = repository.reserveRefresh("snapshot-relevance-001", "manual");
      const publication = repository.publish(reservation.requestId, [
        {
          source: googleSource,
          outcome: "success",
          startedAt: collectedAt,
          finishedAt: collectedAt,
          durationMs: 4,
          httpStatus: 200,
          bytesReceived: 200,
          retryCount: 0,
          events: [
            {
              sourceId: googleSource.sourceId,
              publisher: googleSource.publisher,
              region: googleSource.region,
              canonicalUrl: "https://blog.google/technology/ai/gemini-api-structured-output/",
              title: "Gemini API adds structured outputs for AI developers",
              summary: "A new language model API capability for developers.",
              category: "ai_news",
              eventKind: "news",
              versionLabel: null,
              publishedAt: "2026-08-27T07:00:00.000Z",
              collectedAt,
              confidence: "high",
            },
          ],
          safeError: null,
        },
      ]);

      expect(publication?.eventCount).toBe(1);
      expect(repository.listEvents()).toHaveLength(1);
      expect(repository.listEvents()[0]?.title).toBe(
        "Gemini API adds structured outputs for AI developers",
      );
      expect(repository.getEvent("event_legacy_google_home_decor")).not.toBeNull();
    } finally {
      repository.close();
    }
  });
});
