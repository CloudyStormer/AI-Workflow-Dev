import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  CollectedEvent,
  RefreshResult,
  SourceDefinition,
  SourceRunResult,
  Truth,
} from "../domain/types.js";
import {
  AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
  assessAiDevelopmentRelevance,
} from "../relevance/ai-development.js";
import { applyMigrations, type MigrationResult } from "./migrations.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function shanghaiDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoTimestamp));
}

export interface RefreshReservation {
  readonly requestId: string;
  readonly existingResult: RefreshResult | null;
}

export interface SnapshotPublication {
  readonly snapshotId: string;
  readonly truth: Truth;
  readonly eventCount: number;
  readonly insertedEvents: number;
  readonly newRevisions: number;
}

export class RadarRepository {
  readonly live: DatabaseSync;
  readonly governance: DatabaseSync;
  readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    this.live = this.openDatabase(path.join(dataDir, "radar-live.sqlite"));
    this.governance = this.openDatabase(path.join(dataDir, "radar-governance.sqlite"));
  }

  private openDatabase(databasePath: string): DatabaseSync {
    const database = new DatabaseSync(databasePath);
    database.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    return database;
  }

  migrate(migrationsRoot = path.resolve(process.cwd(), "migrations")): {
    readonly live: MigrationResult;
    readonly governance: MigrationResult;
  } {
    return {
      live: applyMigrations(this.live, path.join(migrationsRoot, "live")),
      governance: applyMigrations(this.governance, path.join(migrationsRoot, "governance")),
    };
  }

  close(): void {
    this.live.close();
    this.governance.close();
  }

  isMigrated(): boolean {
    try {
      const live = this.live.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get() as {
        count: number;
      };
      const governance = this.governance
        .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
        .get() as { count: number };
      return Number(live.count) > 0 && Number(governance.count) > 0;
    } catch {
      return false;
    }
  }

  seedSources(sources: readonly SourceDefinition[], now = new Date().toISOString()): void {
    const statement = this.governance.prepare(`
      INSERT INTO sources (
        source_id, name, publisher, region, source_kind, endpoint_url, homepage_url,
        enabled, runtime_enabled, poll_interval_minutes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
      ON CONFLICT(source_id) DO UPDATE SET
        name=excluded.name, publisher=excluded.publisher, region=excluded.region,
        source_kind=excluded.source_kind, endpoint_url=excluded.endpoint_url,
        homepage_url=excluded.homepage_url, enabled=1, runtime_enabled=1,
        poll_interval_minutes=excluded.poll_interval_minutes, updated_at=excluded.updated_at
    `);
    this.governance.exec("BEGIN IMMEDIATE");
    try {
      for (const source of sources) {
        statement.run(
          source.sourceId,
          source.name,
          source.publisher,
          source.region,
          source.sourceKind,
          source.endpointUrl,
          source.homepageUrl,
          source.pollIntervalMinutes,
          now,
          now,
        );
      }
      this.governance.exec("COMMIT");
    } catch (error) {
      this.governance.exec("ROLLBACK");
      throw error;
    }
  }

  reserveRefresh(idempotencyKey: string, triggerKind: string): RefreshReservation {
    const requestHash = sha256(stableJson({ idempotencyKey, triggerKind }));
    const existing = this.live
      .prepare("SELECT request_id, request_hash, result_json FROM refresh_requests WHERE idempotency_key = ?")
      .get(idempotencyKey) as
      | { request_id: string; request_hash: string; result_json: string | null }
      | undefined;
    if (existing !== undefined) {
      if (existing.request_hash !== requestHash) {
        throw new Error("IDEMPOTENCY_CONFLICT");
      }
      if (existing.result_json === null) throw new Error("REFRESH_IN_PROGRESS");
      return { requestId: existing.request_id, existingResult: JSON.parse(existing.result_json) as RefreshResult };
    }
    const requestId = `refresh_${randomUUID()}`;
    this.live
      .prepare(`INSERT INTO refresh_requests
        (request_id, idempotency_key, request_hash, trigger_kind, status, requested_at)
        VALUES (?, ?, ?, ?, 'running', ?)`)
      .run(requestId, idempotencyKey, requestHash, triggerKind, new Date().toISOString());
    return { requestId, existingResult: null };
  }

  recordImportBatch(input: {
    readonly importBatchId: string;
    readonly inputPathAlias: string;
    readonly inputSha256: string;
    readonly schemaVersion: string;
    readonly importerRevision: string;
    readonly collectionMode: string;
    readonly observedAt: string;
    readonly validationReportSha256: string;
    readonly records: readonly { id: string; sha256: string; ordinal: number }[];
  }): boolean {
    const existing = this.live
      .prepare(`SELECT import_batch_id FROM import_batches
        WHERE input_sha256=? AND schema_version=? AND importer_revision=?`)
      .get(input.inputSha256, input.schemaVersion, input.importerRevision);
    if (existing !== undefined) return false;
    this.live.exec("BEGIN IMMEDIATE");
    try {
      this.live
        .prepare(`INSERT INTO import_batches
          (import_batch_id, input_path_alias, input_sha256, schema_version, importer_revision,
           collection_mode, observed_at, record_count, status, validation_report_sha256)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'validated', ?)`)
        .run(
          input.importBatchId,
          input.inputPathAlias,
          input.inputSha256,
          input.schemaVersion,
          input.importerRevision,
          input.collectionMode,
          input.observedAt,
          input.records.length,
          input.validationReportSha256,
        );
      const insert = this.live.prepare(`INSERT INTO import_records
        (import_batch_id, source_record_id, source_record_sha256, ordinal, status)
        VALUES (?, ?, ?, ?, 'validated')`);
      for (const record of input.records) {
        insert.run(input.importBatchId, record.id, record.sha256, record.ordinal);
      }
      this.live.exec("COMMIT");
      return true;
    } catch (error) {
      this.live.exec("ROLLBACK");
      throw error;
    }
  }

  recordSourceRun(run: SourceRunResult): void {
    this.governance.exec("BEGIN IMMEDIATE");
    try {
      this.governance
        .prepare(`INSERT INTO source_runs
          (source_run_id, source_id, started_at, finished_at, outcome, http_status, record_count,
           bytes_received, duration_ms, retry_count, safe_error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          `source_run_${randomUUID()}`,
          run.source.sourceId,
          run.startedAt,
          run.finishedAt,
          run.outcome,
          run.httpStatus,
          run.events.length,
          run.bytesReceived,
          run.durationMs,
          run.retryCount,
          run.safeError,
        );
      this.governance
        .prepare(`INSERT INTO source_status
          (source_id, last_attempt_at, last_success_at, last_outcome, last_http_status,
           last_record_count, consecutive_failures, safe_error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            last_attempt_at=excluded.last_attempt_at,
            last_success_at=CASE WHEN excluded.last_outcome='success' THEN excluded.last_attempt_at ELSE source_status.last_success_at END,
            last_outcome=excluded.last_outcome, last_http_status=excluded.last_http_status,
            last_record_count=excluded.last_record_count,
            consecutive_failures=CASE WHEN excluded.last_outcome='success' THEN 0 ELSE source_status.consecutive_failures+1 END,
            safe_error=excluded.safe_error`)
        .run(
          run.source.sourceId,
          run.finishedAt,
          run.outcome === "success" ? run.finishedAt : null,
          run.outcome,
          run.httpStatus,
          run.events.length,
          run.outcome === "success" ? 0 : 1,
          run.safeError,
        );
      this.governance.exec("COMMIT");
    } catch (error) {
      this.governance.exec("ROLLBACK");
      throw error;
    }
  }

  publish(requestId: string, runs: readonly SourceRunResult[]): SnapshotPublication | null {
    const successfulRuns = runs.filter((run) => run.outcome === "success");
    const collected = successfulRuns.flatMap((run) => run.events);
    if (successfulRuns.length === 0 || collected.length === 0) {
      this.live
        .prepare(`UPDATE refresh_requests SET status='failed', completed_at=?, safe_error=? WHERE request_id=?`)
        .run(new Date().toISOString(), "NO_SOURCE_RECORDS_AVAILABLE", requestId);
      return null;
    }

    let insertedEvents = 0;
    let newRevisions = 0;
    const publishedAt = new Date().toISOString();
    this.live.exec("BEGIN IMMEDIATE");
    try {
      for (const event of collected) {
        const outcome = this.upsertEvent(event);
        insertedEvents += outcome.inserted ? 1 : 0;
        newRevisions += outcome.revisionAdded ? 1 : 0;
      }

      const sourceKinds = new Map(
        (
          this.governance
            .prepare("SELECT source_id, source_kind FROM sources WHERE enabled=1")
            .all() as Array<{ source_id: string; source_kind: "rss" | "github_releases" }>
        ).map((source) => [source.source_id, source.source_kind] as const),
      );
      const rows = (this.live
        .prepare(`SELECT event_id, current_revision, current_payload_sha256, published_at,
            source_id, title, summary
          FROM events ORDER BY published_at DESC, event_id ASC LIMIT 1000`)
        .all() as Array<{
        event_id: string;
        current_revision: number;
        current_payload_sha256: string;
        published_at: string;
        source_id: string;
        title: string;
        summary: string;
      }>).filter((row) =>
        assessAiDevelopmentRelevance({
          sourceKind: sourceKinds.get(row.source_id) ?? null,
          title: row.title,
          summary: row.summary,
        }).relevant,
      ).slice(0, 200);
      const pointer = this.live
        .prepare("SELECT snapshot_id, revision FROM current_snapshot_pointer WHERE pointer_scope='live'")
        .get() as { snapshot_id: string; revision: number } | undefined;
      const manifest = stableJson({
        acquisitionMode: "runtime_connector",
        relevancePolicyVersion: AI_DEVELOPMENT_RELEVANCE_POLICY_VERSION,
        events: rows.map((row, index) => ({
          eventId: row.event_id,
          revision: Number(row.current_revision),
          rank: index + 1,
          payloadSha256: row.current_payload_sha256,
        })),
        sources: runs.map((run) => ({ sourceId: run.source.sourceId, outcome: run.outcome })),
        previousSnapshotId: pointer?.snapshot_id ?? null,
        publishedAt,
      });
      const manifestSha = sha256(manifest);
      const snapshotId = `snapshot_${manifestSha.slice(0, 24)}`;
      const truth: Truth = runs.some((run) => run.outcome === "failed") ? "degraded" : "live";
      this.live
        .prepare(`INSERT INTO snapshots
          (snapshot_id, snapshot_date, timezone, acquisition_mode, as_of, published_at,
           previous_snapshot_id, manifest_sha256, truth, event_count, source_success_count, source_failure_count)
          VALUES (?, ?, 'Asia/Shanghai', 'runtime_connector', ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          snapshotId,
          shanghaiDate(publishedAt),
          publishedAt,
          publishedAt,
          pointer?.snapshot_id ?? null,
          manifestSha,
          truth,
          rows.length,
          successfulRuns.length,
          runs.length - successfulRuns.length,
        );
      const insertItem = this.live.prepare(`INSERT INTO snapshot_items
        (snapshot_id, event_id, event_revision, rank, item_sha256) VALUES (?, ?, ?, ?, ?)`);
      rows.forEach((row, index) => {
        insertItem.run(
          snapshotId,
          row.event_id,
          row.current_revision,
          index + 1,
          sha256(`${snapshotId}|${row.event_id}|${row.current_revision}|${row.current_payload_sha256}`),
        );
      });
      const insertWatermark = this.live.prepare(`INSERT INTO snapshot_source_watermarks
        (snapshot_id, source_id, outcome, included_until, last_success_at, safe_error)
        VALUES (?, ?, ?, ?, ?, ?)`);
      for (const run of runs) {
        insertWatermark.run(
          snapshotId,
          run.source.sourceId,
          run.outcome,
          run.outcome === "success" ? run.finishedAt : null,
          run.outcome === "success" ? run.finishedAt : null,
          run.safeError,
        );
      }
      const pointerRevision = Number(pointer?.revision ?? 0) + 1;
      if (pointer === undefined) {
        this.live
          .prepare(`INSERT INTO current_snapshot_pointer (pointer_scope, snapshot_id, revision, updated_at)
            VALUES ('live', ?, 1, ?)`)
          .run(snapshotId, publishedAt);
      } else {
        const update = this.live
          .prepare(`UPDATE current_snapshot_pointer SET snapshot_id=?, revision=?, updated_at=?
            WHERE pointer_scope='live' AND revision=?`)
          .run(snapshotId, pointerRevision, publishedAt, pointer.revision);
        if (Number(update.changes) !== 1) {
          throw new Error("SNAPSHOT_POINTER_CONFLICT");
        }
      }
      this.live
        .prepare(`INSERT INTO publication_records
          (publication_id, request_id, candidate_manifest_sha256, result, snapshot_id,
           pointer_before, pointer_after, created_at) VALUES (?, ?, ?, 'published', ?, ?, ?, ?)`)
        .run(
          `publication_${randomUUID()}`,
          requestId,
          manifestSha,
          snapshotId,
          pointer?.snapshot_id ?? null,
          snapshotId,
          publishedAt,
        );
      this.live.exec("COMMIT");
      return { snapshotId, truth, eventCount: rows.length, insertedEvents, newRevisions };
    } catch (error) {
      this.live.exec("ROLLBACK");
      throw error;
    }
  }

  private upsertEvent(event: CollectedEvent): { inserted: boolean; revisionAdded: boolean } {
    const eventId = `event_${sha256(event.canonicalUrl).slice(0, 24)}`;
    const payload = stableJson({
      sourceId: event.sourceId,
      publisher: event.publisher,
      region: event.region,
      canonicalUrl: event.canonicalUrl,
      title: event.title,
      summary: event.summary,
      category: event.category,
      eventKind: event.eventKind,
      versionLabel: event.versionLabel,
      publishedAt: event.publishedAt,
      confidence: event.confidence,
    });
    const payloadSha = sha256(payload);
    const existing = this.live
      .prepare("SELECT current_revision, current_payload_sha256 FROM events WHERE event_id = ?")
      .get(eventId) as { current_revision: number; current_payload_sha256: string } | undefined;
    const revision = Number(existing?.current_revision ?? 0) + 1;
    const revisionAdded = existing?.current_payload_sha256 !== payloadSha;
    if (existing === undefined) {
      this.live
        .prepare(`INSERT INTO events
          (event_id, canonical_url, source_id, publisher, region, title, summary, category, event_kind,
           version_label, published_at, first_seen_at, last_seen_at, current_revision,
           current_payload_sha256, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`)
        .run(
          eventId,
          event.canonicalUrl,
          event.sourceId,
          event.publisher,
          event.region,
          event.title,
          event.summary,
          event.category,
          event.eventKind,
          event.versionLabel,
          event.publishedAt,
          event.collectedAt,
          event.collectedAt,
          payloadSha,
          event.confidence,
        );
    } else if (revisionAdded) {
      this.live
        .prepare(`UPDATE events SET source_id=?, publisher=?, region=?, title=?, summary=?, category=?,
          event_kind=?, version_label=?, published_at=?, last_seen_at=?, current_revision=?,
          current_payload_sha256=?, confidence=? WHERE event_id=?`)
        .run(
          event.sourceId,
          event.publisher,
          event.region,
          event.title,
          event.summary,
          event.category,
          event.eventKind,
          event.versionLabel,
          event.publishedAt,
          event.collectedAt,
          revision,
          payloadSha,
          event.confidence,
          eventId,
        );
    } else {
      this.live.prepare("UPDATE events SET last_seen_at=? WHERE event_id=?").run(event.collectedAt, eventId);
    }
    if (revisionAdded) {
      this.live
        .prepare(`INSERT INTO event_revisions
          (event_id, revision, previous_revision, payload_json, payload_sha256, observed_at, revision_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(
          eventId,
          revision,
          existing === undefined ? null : existing.current_revision,
          payload,
          payloadSha,
          event.collectedAt,
          existing === undefined ? "initial_observation" : "source_payload_changed",
        );
    }
    const sourceRecordSha = sha256(`${event.sourceId}|${event.canonicalUrl}|${payloadSha}`);
    const observationId = `observation_${sourceRecordSha.slice(0, 24)}`;
    this.live
      .prepare(`INSERT OR IGNORE INTO observations
        (observation_id, event_id, source_id, canonical_url, source_record_sha256, published_at, collected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(
        observationId,
        eventId,
        event.sourceId,
        event.canonicalUrl,
        sourceRecordSha,
        event.publishedAt,
        event.collectedAt,
      );
    this.live
      .prepare(`INSERT OR IGNORE INTO evidence
        (evidence_id, event_id, observation_id, source_id, url, evidence_kind,
         fact_or_assessment, confidence, collected_at) VALUES (?, ?, ?, ?, ?, 'official_primary', 'fact', ?, ?)`)
      .run(
        `evidence_${sha256(`${eventId}|${event.sourceId}|${event.canonicalUrl}`).slice(0, 24)}`,
        eventId,
        observationId,
        event.sourceId,
        event.canonicalUrl,
        event.confidence,
        event.collectedAt,
      );
    return { inserted: existing === undefined, revisionAdded };
  }

  completeRefresh(requestId: string, result: RefreshResult): void {
    this.live
      .prepare(`UPDATE refresh_requests SET status=?, completed_at=?, snapshot_id=?, result_json=?, safe_error=?
        WHERE request_id=?`)
      .run(
        result.status,
        result.completedAt,
        result.snapshotId,
        JSON.stringify(result),
        result.status === "failed" ? "NO_SAFE_SNAPSHOT_PUBLISHED" : null,
        requestId,
      );
  }

  getCurrentSnapshot(): Record<string, unknown> | null {
    const snapshot = this.live
      .prepare(`SELECT s.* FROM current_snapshot_pointer p JOIN snapshots s ON s.snapshot_id=p.snapshot_id
        WHERE p.pointer_scope='live'`)
      .get() as Record<string, unknown> | undefined;
    return snapshot ?? null;
  }

  listEvents(limit = 50): readonly Record<string, unknown>[] {
    return this.live
      .prepare(`SELECT e.*, si.rank, si.event_revision, si.snapshot_id
        FROM current_snapshot_pointer p
        JOIN snapshot_items si ON si.snapshot_id=p.snapshot_id
        JOIN events e ON e.event_id=si.event_id
        WHERE p.pointer_scope='live' ORDER BY si.rank LIMIT ?`)
      .all(limit) as readonly Record<string, unknown>[];
  }

  getEvent(eventId: string): Record<string, unknown> | null {
    const event = this.live.prepare("SELECT * FROM events WHERE event_id=?").get(eventId) as
      | Record<string, unknown>
      | undefined;
    if (event === undefined) return null;
    const revisions = this.live
      .prepare("SELECT revision, previous_revision, observed_at, revision_reason, payload_sha256 FROM event_revisions WHERE event_id=? ORDER BY revision")
      .all(eventId);
    const evidence = this.live
      .prepare("SELECT source_id, url, evidence_kind, fact_or_assessment, confidence, collected_at FROM evidence WHERE event_id=?")
      .all(eventId);
    return { ...event, revisions, evidence };
  }

  listSnapshots(limit = 30): readonly Record<string, unknown>[] {
    return this.live.prepare("SELECT * FROM snapshots ORDER BY published_at DESC LIMIT ?").all(limit) as readonly Record<
      string,
      unknown
    >[];
  }

  getSnapshot(snapshotId: string): Record<string, unknown> | null {
    const snapshot = this.live.prepare("SELECT * FROM snapshots WHERE snapshot_id=?").get(snapshotId) as
      | Record<string, unknown>
      | undefined;
    if (snapshot === undefined) return null;
    const events = this.live
      .prepare(`SELECT e.*, si.rank, si.event_revision
        FROM snapshot_items si JOIN events e ON e.event_id=si.event_id
        WHERE si.snapshot_id=? ORDER BY si.rank`)
      .all(snapshotId);
    const sources = this.live
      .prepare(`SELECT source_id, outcome, included_until, last_success_at, safe_error
        FROM snapshot_source_watermarks WHERE snapshot_id=? ORDER BY source_id`)
      .all(snapshotId);
    return { ...snapshot, events, sources };
  }

  listSources(): readonly Record<string, unknown>[] {
    return this.governance
      .prepare(`SELECT s.source_id, s.name, s.publisher, s.region, s.source_kind, s.endpoint_url,
        s.homepage_url, s.enabled, s.runtime_enabled, s.poll_interval_minutes,
        st.last_attempt_at, st.last_success_at, st.last_outcome, st.last_http_status,
        st.last_record_count, st.consecutive_failures, st.safe_error
        FROM sources s LEFT JOIN source_status st ON st.source_id=s.source_id ORDER BY s.region, s.name`)
      .all() as readonly Record<string, unknown>[];
  }

  trends(): readonly Record<string, unknown>[] {
    return this.live
      .prepare(`SELECT substr(published_at, 1, 10) AS date, COUNT(*) AS event_count,
        COUNT(DISTINCT source_id) AS source_count FROM events GROUP BY date ORDER BY date DESC LIMIT 30`)
      .all() as readonly Record<string, unknown>[];
  }

  openSourceReleases(limit = 50): readonly Record<string, unknown>[] {
    return this.live
      .prepare("SELECT * FROM events WHERE event_kind='open_source_release' ORDER BY published_at DESC LIMIT ?")
      .all(limit) as readonly Record<string, unknown>[];
  }
}
