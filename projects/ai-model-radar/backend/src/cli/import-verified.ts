import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import { readServerConfig } from "../config.js";
import type { CollectedEvent, RefreshResult, SourceDefinition, SourceRunResult } from "../domain/types.js";
import { RadarRepository } from "../infrastructure/repository.js";

const EXPECTED_SHA256 = "76d8f93aeac9a57f4e8fba959750a43e2775ca9da41eacb48de4de64f605be6c";
const IMPORTER_REVISION = "verified-batch-v1";

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

interface VerifiedRecord {
  readonly id: string;
  readonly title_zh: string;
  readonly publisher: string;
  readonly region: string;
  readonly canonical_url: string;
  readonly summary: string;
  readonly category: string;
  readonly source_type: string;
  readonly published_at: string;
  readonly observed_at: string;
  readonly confidence: string;
  readonly status: string;
}

interface VerifiedBatch {
  readonly schema_version: string;
  readonly project_id: string;
  readonly timezone: string;
  readonly collection_mode: string;
  readonly observed_at: string;
  readonly records: readonly VerifiedRecord[];
}

const backendRoot = path.resolve(process.cwd());
const projectRoot = path.resolve(backendRoot, "..");
const expectedPath = path.join(projectRoot, "output", "daily", "2026-08-25.json");
const requestedPath = path.resolve(process.argv[2] ?? expectedPath);
if (requestedPath !== expectedPath || realpathSync(requestedPath) !== realpathSync(expectedPath)) {
  throw new Error("IMPORT_PATH_NOT_ALLOWED");
}
const stat = lstatSync(requestedPath);
if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("IMPORT_PATH_NOT_ALLOWED");
const bytes = readFileSync(requestedPath);
if (sha256(bytes) !== EXPECTED_SHA256) throw new Error("IMPORT_INPUT_MISMATCH");
const batch = JSON.parse(bytes.toString("utf8")) as VerifiedBatch;
if (
  batch.schema_version !== "1.0" ||
  batch.project_id !== "ai-model-radar" ||
  batch.timezone !== "Asia/Shanghai" ||
  batch.collection_mode !== "manual_public_web_verification" ||
  !Array.isArray(batch.records) ||
  batch.records.length !== 6
) {
  throw new Error("IMPORT_INPUT_MISMATCH");
}
const collectedAt = new Date().toISOString();
const events: CollectedEvent[] = batch.records.map((record) => {
  const canonical = new URL(record.canonical_url);
  if (canonical.protocol !== "https:" || record.id === "" || record.title_zh === "") {
    throw new Error("IMPORT_RECORD_INVALID");
  }
  return {
    sourceId: `manual-${record.publisher.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    publisher: record.publisher,
    region: record.region.startsWith("CN") ? "CN" : "GLOBAL",
    canonicalUrl: canonical.toString(),
    title: record.title_zh,
    summary: record.summary,
    category: record.category,
    eventKind: record.source_type.includes("github") ? "open_source_release" : "news",
    versionLabel: record.status,
    publishedAt: new Date(`${record.published_at}T00:00:00+08:00`).toISOString(),
    collectedAt,
    confidence: "high",
  };
});
const manualSource: SourceDefinition = {
  sourceId: "manual-verified-2026-08-25",
  name: "2026-08-25 人工公开网页核验批次",
  publisher: "AI Model Radar Research",
  region: "GLOBAL",
  sourceKind: "github_releases",
  endpointUrl: "https://github.com/",
  homepageUrl: "https://github.com/",
  pollIntervalMinutes: 1_440,
};
const config = readServerConfig();
const repository = new RadarRepository(config.dataDir);
try {
  repository.migrate();
  repository.seedSources([manualSource]);
  const importBatchId = `import_${EXPECTED_SHA256.slice(0, 24)}`;
  const inserted = repository.recordImportBatch({
    importBatchId,
    inputPathAlias: "output/daily/2026-08-25.json",
    inputSha256: EXPECTED_SHA256,
    schemaVersion: batch.schema_version,
    importerRevision: IMPORTER_REVISION,
    collectionMode: batch.collection_mode,
    observedAt: batch.observed_at,
    validationReportSha256: sha256(JSON.stringify({ records: batch.records.length, project: batch.project_id })),
    records: batch.records.map((record, index) => ({
      id: record.id,
      sha256: sha256(JSON.stringify(record)),
      ordinal: index + 1,
    })),
  });
  const reservation = repository.reserveRefresh(`import:${EXPECTED_SHA256}`, "verified_import");
  let snapshotId = reservation.existingResult?.snapshotId ?? null;
  if (reservation.existingResult === null) {
    const run: SourceRunResult = {
      source: manualSource,
      outcome: "success",
      startedAt: batch.observed_at,
      finishedAt: collectedAt,
      durationMs: 0,
      httpStatus: null,
      bytesReceived: bytes.length,
      retryCount: 0,
      events,
      safeError: null,
    };
    const publication = repository.publish(reservation.requestId, [run]);
    snapshotId = publication?.snapshotId ?? null;
    const result: RefreshResult = {
      requestId: reservation.requestId,
      reused: false,
      status: publication === null ? "failed" : "completed",
      truth: publication?.truth ?? "failed",
      snapshotId,
      eventCount: publication?.eventCount ?? 0,
      insertedEvents: publication?.insertedEvents ?? 0,
      newRevisions: publication?.newRevisions ?? 0,
      sourceSuccessCount: publication === null ? 0 : 1,
      sourceFailureCount: publication === null ? 1 : 0,
      completedAt: new Date().toISOString(),
    };
    repository.completeRefresh(reservation.requestId, result);
  }
  process.stdout.write(`${JSON.stringify({ importBatchId, inserted, records: events.length, snapshotId })}\n`);
} finally {
  repository.close();
}
