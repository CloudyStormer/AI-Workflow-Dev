import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { applyMigrationStream } from "../../src/infrastructure/sqlite/migrations/runtime";
import {
  importVerifiedBatch,
  VerifiedBatchImportError,
} from "../../src/infrastructure/sqlite/public/verified-batch-importer";

const MIGRATIONS_ROOT = resolve(process.cwd(), "migrations");
const VERIFIED_INPUT = resolve(process.cwd(), "../output/daily/2026-08-25.json");
const VERIFIED_INPUT_SHA256 = "0bbc8c56794e5e14dea5780616b40729464ffdb6fa6f20ab6df25f604b9d5c6f";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("CFR-DW-DATA-203 verified public batch importer", () => {
  it("imports the exact 8-record approved static batch and replays idempotently", async () => {
    const { databasePath } = await migratedPublicDatabase();
    const options = {
      databasePath,
      inputPath: VERIFIED_INPUT,
      expectedSha256: VERIFIED_INPUT_SHA256,
      importerRevision: "career-verified-batch-importer-1.0.0",
      idempotencyKey: "public-import-2026-08-25-0001",
    };
    const imported = await importVerifiedBatch(options);
    expect(imported).toMatchObject({
      snapshotDate: "2026-08-25",
      contentMode: "approved_static",
      environment: "local",
      recordCount: 8,
      technologyCount: 4,
      recruitmentCount: 4,
      mainlandChinaRecruitmentCount: 0,
      runtimeEnabled: false,
      liveConnectors: 0,
      pointerRevision: 1,
    });
    expect(imported.manifestSha256).toMatch(/^[0-9a-f]{64}$/u);

    const replayed = await importVerifiedBatch(options);
    expect(replayed).toEqual(imported);
    const database = new DatabaseSync(databasePath);
    try {
      expect(count(database, "import_batches")).toBe(1);
      expect(count(database, "public_events")).toBe(8);
      expect(count(database, "public_event_revisions")).toBe(8);
      expect(count(database, "public_evidence")).toBe(8);
      expect(count(database, "public_snapshots")).toBe(1);
      expect(count(database, "public_snapshot_items")).toBe(8);
      expect(count(database, "public_snapshot_pointers")).toBe(1);
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM public_events WHERE evidence_domain = 'recruitment_sample'")
          .get(),
      ).toEqual({ count: 4 });
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM public_event_revisions WHERE region LIKE 'CN-%'")
          .get(),
      ).toEqual({ count: 0 });
      const schemaText = database
        .prepare("SELECT group_concat(sql, ' ') AS sql FROM sqlite_schema")
        .get() as { readonly sql: string };
      expect(schemaText.sql).not.toMatch(/material_versions|body_ciphertext|account_id/iu);
    } finally {
      database.close();
    }
  });

  it("rejects wrong exact-byte SHA and idempotency drift", async () => {
    const { databasePath, dataRoot } = await migratedPublicDatabase();
    await expect(
      importVerifiedBatch({
        databasePath,
        inputPath: VERIFIED_INPUT,
        expectedSha256: "0".repeat(64),
        importerRevision: "career-verified-batch-importer-1.0.0",
        idempotencyKey: "public-import-negative-0001",
      }),
    ).rejects.toThrow("SHA-256 mismatch");

    await importVerifiedBatch({
      databasePath,
      inputPath: VERIFIED_INPUT,
      expectedSha256: VERIFIED_INPUT_SHA256,
      importerRevision: "career-verified-batch-importer-1.0.0",
      idempotencyKey: "public-import-drift-0001",
    });
    const mutatedPath = join(dataRoot, "mutated-batch.json");
    const original = JSON.parse(await readFile(VERIFIED_INPUT, "utf8")) as Record<string, unknown>;
    original.batch_date = "2026-08-24";
    const mutatedBytes = Buffer.from(`${JSON.stringify(original)}\n`, "utf8");
    await writeFile(mutatedPath, mutatedBytes);
    await expect(
      importVerifiedBatch({
        databasePath,
        inputPath: mutatedPath,
        expectedSha256: createHash("sha256").update(mutatedBytes).digest("hex"),
        importerRevision: "career-verified-batch-importer-1.0.0",
        idempotencyKey: "public-import-drift-0001",
      }),
    ).rejects.toBeInstanceOf(VerifiedBatchImportError);
  });
});

async function migratedPublicDatabase() {
  const dataRoot = await mkdtemp(join(tmpdir(), "career-public-import-"));
  temporaryDirectories.push(dataRoot);
  const result = await applyMigrationStream({
    manifestPath: join(MIGRATIONS_ROOT, "public", "manifest.json"),
    dataRoot,
    mode: "public",
  });
  return { dataRoot, databasePath: result.databasePath };
}

function count(database: DatabaseSync, table: string): number {
  const allowed = new Set([
    "import_batches",
    "public_events",
    "public_event_revisions",
    "public_evidence",
    "public_snapshots",
    "public_snapshot_items",
    "public_snapshot_pointers",
  ]);
  if (!allowed.has(table)) {
    throw new Error("test table is not allowlisted");
  }
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
    readonly count: number;
  };
  return row.count;
}
