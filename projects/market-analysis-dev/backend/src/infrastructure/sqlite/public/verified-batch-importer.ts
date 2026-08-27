import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import { lstat, open, realpath, type FileHandle } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export class VerifiedBatchImportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "VerifiedBatchImportError";
  }
}

export interface VerifiedBatchImportOptions {
  readonly databasePath: string;
  readonly inputPath: string;
  readonly expectedSha256: string;
  readonly importerRevision: string;
  readonly idempotencyKey: string;
}

export interface PublicSnapshotRecord {
  readonly batchId: string;
  readonly snapshotId: string;
  readonly manifestSha256: string;
  readonly contentMode: "approved_static";
  readonly environment: "local";
  readonly snapshotDate: string;
  readonly recordCount: number;
  readonly technologyCount: number;
  readonly recruitmentCount: number;
  readonly mainlandChinaRecruitmentCount: number;
  readonly runtimeEnabled: false;
  readonly liveConnectors: 0;
  readonly pointerRevision: number;
}

interface VerifiedBatch {
  readonly schema_version: string;
  readonly project_id: "market-analysis-dev";
  readonly batch_date: string;
  readonly observed_at: string;
  readonly timezone: string;
  readonly collection_mode: "manual_public_web_verification";
  readonly runtime_truth: {
    readonly runtime_enabled: false;
    readonly live_connectors: 0;
  };
  readonly counts: {
    readonly records: number;
    readonly technology_records: number;
    readonly recruitment_records: number;
    readonly mainland_china_recruitment_samples: number;
  };
  readonly records: readonly VerifiedBatchItem[];
}

interface VerifiedBatchItem {
  readonly id: string;
  readonly title_zh: string;
  readonly publisher: string;
  readonly evidence_domain: "technology_trend" | "recruitment_skill";
  readonly category: string;
  readonly published_at: string | null;
  readonly observed_at: string;
  readonly canonical_url: string;
  readonly region: string;
  readonly claim_class: string;
  readonly confidence: "high" | "medium" | "low";
  readonly summary: string;
  readonly career_impact: string;
  readonly rights_access: string;
  readonly content_fingerprint: string;
}

interface ExistingSnapshotRow {
  readonly batch_id: string;
  readonly snapshot_id: string;
  readonly manifest_sha256: string;
  readonly snapshot_date: string;
  readonly record_count: number;
  readonly technology_count: number;
  readonly recruitment_count: number;
  readonly mainland_china_recruitment_count: number;
  readonly pointer_revision: number;
}

export async function importVerifiedBatch(
  options: VerifiedBatchImportOptions,
): Promise<PublicSnapshotRecord> {
  requireSha256(options.expectedSha256, "expected input SHA-256");
  requireNonEmpty(options.importerRevision, "importer revision");
  requireNonEmpty(options.idempotencyKey, "idempotency key");
  const bytes = await readExactRegularFile(options.inputPath);
  const actualSha256 = createHash("sha256").update(bytes).digest("hex");
  if (actualSha256 !== options.expectedSha256) {
    throw new VerifiedBatchImportError("verified batch exact-byte SHA-256 mismatch");
  }
  const batch = parseAndValidateBatch(bytes);
  const database = new DatabaseSync(options.databasePath);
  try {
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA journal_mode = WAL");
    database.prepare("SELECT 1 FROM import_batches LIMIT 1").get();
    const existingByKey = database
      .prepare("SELECT input_sha256 FROM import_batches WHERE idempotency_key = ?")
      .get(options.idempotencyKey) as { readonly input_sha256: string } | undefined;
    if (existingByKey !== undefined && existingByKey.input_sha256 !== actualSha256) {
      throw new VerifiedBatchImportError(
        "idempotency key was already used with a different verified batch",
      );
    }
    const existing = readExistingSnapshot(
      database,
      actualSha256,
      batch.schema_version,
      options.importerRevision,
    );
    if (existing !== undefined) {
      return snapshotFromRow(existing);
    }
    return importNewBatch(database, batch, actualSha256, options);
  } catch (error) {
    if (error instanceof VerifiedBatchImportError) {
      throw error;
    }
    throw new VerifiedBatchImportError(
      `verified batch import failed: ${error instanceof Error ? error.message : "unknown SQLite error"}`,
    );
  } finally {
    database.close();
  }
}

function importNewBatch(
  database: DatabaseSync,
  batch: VerifiedBatch,
  inputSha256: string,
  options: VerifiedBatchImportOptions,
): PublicSnapshotRecord {
  const now = new Date().toISOString();
  const batchId = `batch_${sha256(`${inputSha256}|${options.importerRevision}`).slice(0, 32)}`;
  const items = batch.records.map((record, ordinal) => {
    const identitySha256 = sha256(
      `${record.publisher}|${record.canonical_url}|${record.evidence_domain}`,
    );
    const contentSha256 = sha256(canonicalJson(record));
    return Object.freeze({
      ordinal,
      record,
      eventId: `event_${identitySha256.slice(0, 32)}`,
      identitySha256,
      eventRevisionId: `eventrev_${contentSha256.slice(0, 32)}`,
      contentSha256,
      evidenceId: `evidence_${sha256(`${contentSha256}|${record.canonical_url}`).slice(0, 32)}`,
    });
  });
  const manifest = {
    acquisitionMode: "manual_verified_import",
    batchDate: batch.batch_date,
    inputSha256,
    importerRevision: options.importerRevision,
    contentMode: "approved_static",
    environment: "local",
    runtimeEnabled: false,
    liveConnectors: 0,
    timezone: batch.timezone,
    counts: batch.counts,
    items: items.map((item) => ({
      eventId: item.eventId,
      eventRevisionId: item.eventRevisionId,
      evidenceId: item.evidenceId,
    })),
  };
  const manifestJson = canonicalJson(manifest);
  const manifestSha256 = sha256(manifestJson);
  const snapshotId = `snapshot_${manifestSha256.slice(0, 32)}`;

  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        `INSERT INTO import_batches (
          batch_id, input_sha256, schema_version, importer_revision,
          idempotency_key, batch_date, record_count, technology_count,
          recruitment_count, mainland_china_recruitment_count,
          acquisition_mode, runtime_enabled, live_connectors, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_verified_import', 0, 0, ?)`,
      )
      .run(
        batchId,
        inputSha256,
        batch.schema_version,
        options.importerRevision,
        options.idempotencyKey,
        batch.batch_date,
        batch.counts.records,
        batch.counts.technology_records,
        batch.counts.recruitment_records,
        batch.counts.mainland_china_recruitment_samples,
        now,
      );

    for (const item of items) {
      const domain = item.record.evidence_domain === "technology_trend"
        ? "technology_trend"
        : "recruitment_sample";
      const factLayer = domain === "technology_trend" ? "source_fact" : "purpose_sample";
      database
        .prepare(
          `INSERT INTO public_events (
            event_id, identity_sha256, evidence_domain, publisher,
            canonical_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          item.eventId,
          item.identitySha256,
          domain,
          item.record.publisher,
          item.record.canonical_url,
          now,
        );
      database
        .prepare(
          `INSERT INTO public_event_revisions (
            event_revision_id, event_id, revision_no, batch_id, source_record_id,
            title_zh, published_at, observed_at, region, category, summary,
            career_impact, rights_access, fact_layer, confidence,
            content_sha256, created_at
          ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          item.eventRevisionId,
          item.eventId,
          batchId,
          item.record.id,
          item.record.title_zh,
          item.record.published_at,
          item.record.observed_at,
          item.record.region,
          item.record.category,
          item.record.summary,
          item.record.career_impact,
          item.record.rights_access,
          factLayer,
          item.record.confidence,
          item.contentSha256,
          now,
        );
      database
        .prepare(
          `INSERT INTO public_evidence (
            evidence_id, event_revision_id, canonical_url, evidence_sha256,
            rights_access, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          item.evidenceId,
          item.eventRevisionId,
          item.record.canonical_url,
          sha256(
            `${item.record.canonical_url}|${item.record.summary}|${item.record.rights_access}`,
          ),
          item.record.rights_access,
          now,
        );
    }

    database
      .prepare(
        `INSERT INTO public_snapshots (
          snapshot_id, batch_id, snapshot_date, timezone, content_mode,
          environment, manifest_json, manifest_sha256, record_count,
          technology_count, recruitment_count, mainland_china_recruitment_count,
          created_at
        ) VALUES (?, ?, ?, ?, 'approved_static', 'local', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        snapshotId,
        batchId,
        batch.batch_date,
        batch.timezone,
        manifestJson,
        manifestSha256,
        batch.counts.records,
        batch.counts.technology_records,
        batch.counts.recruitment_records,
        batch.counts.mainland_china_recruitment_samples,
        now,
      );
    for (const item of items) {
      database
        .prepare(
          `INSERT INTO public_snapshot_items (
            snapshot_id, ordinal, event_id, event_revision_id, evidence_id
          ) VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          snapshotId,
          item.ordinal,
          item.eventId,
          item.eventRevisionId,
          item.evidenceId,
        );
    }

    const pointer = database
      .prepare(
        `SELECT snapshot_id, pointer_revision FROM public_snapshot_pointers
         WHERE content_mode = 'approved_static' AND environment = 'local'`,
      )
      .get() as
      | { readonly snapshot_id: string; readonly pointer_revision: number }
      | undefined;
    const pointerRevision = (pointer?.pointer_revision ?? 0) + 1;
    if (pointer === undefined) {
      database
        .prepare(
          `INSERT INTO public_snapshot_pointers (
            content_mode, environment, snapshot_id, pointer_revision, updated_at
          ) VALUES ('approved_static', 'local', ?, 1, ?)`,
        )
        .run(snapshotId, now);
    } else {
      const update = database
        .prepare(
          `UPDATE public_snapshot_pointers
           SET snapshot_id = ?, pointer_revision = ?, updated_at = ?
           WHERE content_mode = 'approved_static' AND environment = 'local'
             AND pointer_revision = ?`,
        )
        .run(snapshotId, pointerRevision, now, pointer.pointer_revision);
      if (Number(update.changes) !== 1) {
        throw new VerifiedBatchImportError("public snapshot pointer CAS failed");
      }
    }
    database.exec("COMMIT");
    return Object.freeze({
      batchId,
      snapshotId,
      manifestSha256,
      contentMode: "approved_static",
      environment: "local",
      snapshotDate: batch.batch_date,
      recordCount: batch.counts.records,
      technologyCount: batch.counts.technology_records,
      recruitmentCount: batch.counts.recruitment_records,
      mainlandChinaRecruitmentCount: batch.counts.mainland_china_recruitment_samples,
      runtimeEnabled: false,
      liveConnectors: 0,
      pointerRevision,
    });
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // Preserve the original import error.
    }
    throw error;
  }
}

function readExistingSnapshot(
  database: DatabaseSync,
  inputSha256: string,
  schemaVersion: string,
  importerRevision: string,
): ExistingSnapshotRow | undefined {
  return database
    .prepare(
      `SELECT batch.batch_id, snapshot.snapshot_id, snapshot.manifest_sha256,
              snapshot.snapshot_date, snapshot.record_count,
              snapshot.technology_count, snapshot.recruitment_count,
              snapshot.mainland_china_recruitment_count, pointer.pointer_revision
       FROM import_batches batch
       JOIN public_snapshots snapshot ON snapshot.batch_id = batch.batch_id
       JOIN public_snapshot_pointers pointer
         ON pointer.snapshot_id = snapshot.snapshot_id
        AND pointer.content_mode = 'approved_static' AND pointer.environment = 'local'
       WHERE batch.input_sha256 = ? AND batch.schema_version = ?
         AND batch.importer_revision = ?`,
    )
    .get(inputSha256, schemaVersion, importerRevision) as ExistingSnapshotRow | undefined;
}

function snapshotFromRow(row: ExistingSnapshotRow): PublicSnapshotRecord {
  return Object.freeze({
    batchId: row.batch_id,
    snapshotId: row.snapshot_id,
    manifestSha256: row.manifest_sha256,
    contentMode: "approved_static",
    environment: "local",
    snapshotDate: row.snapshot_date,
    recordCount: row.record_count,
    technologyCount: row.technology_count,
    recruitmentCount: row.recruitment_count,
    mainlandChinaRecruitmentCount: row.mainland_china_recruitment_count,
    runtimeEnabled: false,
    liveConnectors: 0,
    pointerRevision: row.pointer_revision,
  });
}

async function readExactRegularFile(pathInput: string): Promise<Buffer> {
  const path = resolve(pathInput);
  const before = await requireRegularFile(path);
  const canonicalPath = await realpath(path);
  if (dirname(canonicalPath) !== await realpath(dirname(path))) {
    throw new VerifiedBatchImportError("verified batch path escapes its directory");
  }
  let handle: FileHandle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new VerifiedBatchImportError("verified batch is missing or unreadable");
  }
  try {
    const opened = await handle.stat();
    if (!sameFile(before, opened) || !opened.isFile()) {
      throw new VerifiedBatchImportError("verified batch changed before read");
    }
    const bytes = await handle.readFile();
    const after = await requireRegularFile(path);
    if (!sameFile(opened, after) || after.size !== bytes.byteLength) {
      throw new VerifiedBatchImportError("verified batch changed during read");
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function requireRegularFile(path: string): Promise<Stats> {
  const stats = await lstat(path).catch(() => {
    throw new VerifiedBatchImportError("verified batch is missing or unreadable");
  });
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new VerifiedBatchImportError(
      "verified batch must be a regular non-symlink file",
    );
  }
  return stats;
}

function sameFile(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function parseAndValidateBatch(bytes: Buffer): VerifiedBatch {
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new VerifiedBatchImportError("verified batch must be valid UTF-8 JSON");
  }
  const batch = requireRecord(input, "batch");
  if (
    batch.project_id !== "market-analysis-dev" ||
    typeof batch.schema_version !== "string" ||
    typeof batch.batch_date !== "string" ||
    typeof batch.observed_at !== "string" ||
    typeof batch.timezone !== "string" ||
    batch.collection_mode !== "manual_public_web_verification"
  ) {
    throw new VerifiedBatchImportError("verified batch identity is invalid");
  }
  const runtime = requireRecord(batch.runtime_truth, "runtime_truth");
  if (runtime.runtime_enabled !== false || runtime.live_connectors !== 0) {
    throw new VerifiedBatchImportError("verified batch must not enable runtime or live connectors");
  }
  const counts = requireRecord(batch.counts, "counts");
  const records = batch.records;
  if (!Array.isArray(records) || records.length !== 8) {
    throw new VerifiedBatchImportError("verified batch must contain exactly 8 records");
  }
  const validatedRecords = records.map(validateRecord);
  const technologyCount = validatedRecords.filter(
    (record) => record.evidence_domain === "technology_trend",
  ).length;
  const recruitmentCount = validatedRecords.filter(
    (record) => record.evidence_domain === "recruitment_skill",
  ).length;
  if (
    counts.records !== 8 ||
    counts.technology_records !== technologyCount ||
    counts.recruitment_records !== recruitmentCount ||
    technologyCount !== 4 ||
    recruitmentCount !== 4 ||
    counts.mainland_china_recruitment_samples !== 0
  ) {
    throw new VerifiedBatchImportError("verified batch count contract is invalid");
  }
  return batch as unknown as VerifiedBatch;
}

function validateRecord(input: unknown, index: number): VerifiedBatchItem {
  const record = requireRecord(input, `records[${index}]`);
  for (const key of [
    "id",
    "title_zh",
    "publisher",
    "category",
    "observed_at",
    "canonical_url",
    "region",
    "claim_class",
    "confidence",
    "summary",
    "career_impact",
    "rights_access",
    "content_fingerprint",
  ]) {
    if (typeof record[key] !== "string" || record[key].length === 0) {
      throw new VerifiedBatchImportError(`records[${index}].${key} is invalid`);
    }
  }
  if (
    record.evidence_domain !== "technology_trend" &&
    record.evidence_domain !== "recruitment_skill"
  ) {
    throw new VerifiedBatchImportError(`records[${index}].evidence_domain is invalid`);
  }
  if (
    typeof record.canonical_url !== "string" ||
    !record.canonical_url.startsWith("https://")
  ) {
    throw new VerifiedBatchImportError(`records[${index}].canonical_url must use HTTPS`);
  }
  if (!new Set(["high", "medium", "low"]).has(record.confidence as string)) {
    throw new VerifiedBatchImportError(`records[${index}].confidence is invalid`);
  }
  if (record.published_at !== null && typeof record.published_at !== "string") {
    throw new VerifiedBatchImportError(`records[${index}].published_at is invalid`);
  }
  return record as unknown as VerifiedBatchItem;
}

function requireRecord(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new VerifiedBatchImportError(`${label} must be an object`);
  }
  return input as Record<string, unknown>;
}

function requireSha256(value: string, label: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    throw new VerifiedBatchImportError(`${label} must be 64 lowercase hexadecimal characters`);
  }
}

function requireNonEmpty(value: string, label: string): void {
  if (value.length < 1 || value.length > 200) {
    throw new VerifiedBatchImportError(`${label} must contain 1 to 200 characters`);
  }
}

function sha256(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

function canonicalJson(input: unknown): string {
  return JSON.stringify(canonicalValue(input));
}

function canonicalValue(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(canonicalValue);
  }
  if (typeof input === "object" && input !== null) {
    return Object.fromEntries(
      Object.entries(input)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, canonicalValue(value)]),
    );
  }
  return input;
}
