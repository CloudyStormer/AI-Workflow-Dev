import { lstat, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { MIGRATION_DATABASE_MODES } from "../../src/infrastructure/sqlite/migrations/manifest";
import {
  MigrationRuntimeError,
  applyAllMigrationStreams,
  applyMigrationStream,
  rollbackLastMigration,
} from "../../src/infrastructure/sqlite/migrations/runtime";

const MIGRATIONS_ROOT = resolve(process.cwd(), "migrations");
const FIXTURES_ROOT = resolve(process.cwd(), "tests/fixtures/migrations");
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("CFR-DW-DATA-201 SQLite migration runtime", () => {
  it("materializes five isolated empty stream baselines with required pragmas", async () => {
    const dataRoot = await temporaryDataRoot();
    const results = await applyAllMigrationStreams(MIGRATIONS_ROOT, dataRoot, 7_500);

    expect(results.map((result) => result.mode)).toEqual(MIGRATION_DATABASE_MODES);
    expect(new Set(results.map((result) => dirname(result.databasePath))).size).toBe(5);
    for (const result of results) {
      expect(dirname(result.databasePath)).toBe(join(dataRoot, result.mode));
      expect(result).toMatchObject({
        schemaVersion: 0,
        appliedMigrationIds: [],
        journalMode: "wal",
        foreignKeys: true,
        busyTimeoutMs: 7_500,
      });
      expect((await lstat(result.databasePath)).isFile()).toBe(true);

      const database = new DatabaseSync(result.databasePath);
      try {
        expect(pragma(database, "PRAGMA journal_mode")).toBe("wal");
        expect(
          database
            .prepare("SELECT COUNT(*) AS count FROM __career_migration_history")
            .get(),
        ).toEqual({ count: 0 });
      } finally {
        database.close();
      }
    }
  });

  it("applies, replays, rolls down, and reapplies an exact-byte migration", async () => {
    const dataRoot = await temporaryDataRoot();
    const options = fixtureOptions("explicit-down", dataRoot);

    const applied = await applyMigrationStream(options);
    expect(applied.schemaVersion).toBe(1);
    expect(applied.appliedMigrationIds).toEqual(["0001_contract_probe"]);

    const replayed = await applyMigrationStream(options);
    expect(replayed.schemaVersion).toBe(1);
    expect(replayed.appliedMigrationIds).toEqual([]);
    expect(tableExists(replayed.databasePath, "contract_probe")).toBe(true);

    const rolledBack = await rollbackLastMigration(options);
    expect(rolledBack.schemaVersion).toBe(0);
    expect(tableExists(rolledBack.databasePath, "contract_probe")).toBe(false);

    const reapplied = await applyMigrationStream(options);
    expect(reapplied.appliedMigrationIds).toEqual(["0001_contract_probe"]);
    expect(tableExists(reapplied.databasePath, "contract_probe")).toBe(true);
  });

  it("rejects restore-only rollback and preserves the applied schema", async () => {
    const dataRoot = await temporaryDataRoot();
    const options = fixtureOptions("valid-governance", dataRoot);
    const applied = await applyMigrationStream(options);

    await expect(rollbackLastMigration(options)).rejects.toThrow("restore-only");
    expect(tableExists(applied.databasePath, "contract_probe")).toBe(true);
    expect(historyCount(applied.databasePath)).toBe(1);
  });

  it("rejects a checksum mismatch before creating a database", async () => {
    const dataRoot = await temporaryDataRoot();
    await expect(
      applyMigrationStream(fixtureOptions("checksum-mismatch", dataRoot)),
    ).rejects.toThrow("checksum mismatch");
    await expect(
      readFile(join(dataRoot, "governance", "career-governance.sqlite")),
    ).rejects.toThrow();
  });

  it("rolls back every up statement when a later statement fails", async () => {
    const dataRoot = await temporaryDataRoot();
    const options = fixtureOptions("failing-up", dataRoot);

    await expect(applyMigrationStream(options)).rejects.toThrow("failed to apply");
    const databasePath = join(dataRoot, "governance", "career-governance.sqlite");
    expect(tableExists(databasePath, "must_not_survive_failed_up")).toBe(false);
    expect(historyCount(databasePath)).toBe(0);
  });

  it("fails closed on ATTACH before another database can be opened", async () => {
    const dataRoot = await temporaryDataRoot();
    await expect(
      applyMigrationStream(fixtureOptions("forbidden-attach", dataRoot)),
    ).rejects.toThrow("forbidden SQL token ATTACH");
    expect(historyCount(join(dataRoot, "governance", "career-governance.sqlite"))).toBe(0);
  });

  it("rejects a symlinked mode directory", async () => {
    const dataRoot = await temporaryDataRoot();
    const outside = await temporaryDataRoot();
    await symlink(outside, join(dataRoot, "governance"));

    await expect(
      applyMigrationStream(fixtureOptions("valid-governance", dataRoot)),
    ).rejects.toBeInstanceOf(MigrationRuntimeError);
  });

  it("rejects invalid busy timeout values", async () => {
    const dataRoot = await temporaryDataRoot();
    await expect(
      applyMigrationStream({
        ...fixtureOptions("valid-governance", dataRoot),
        busyTimeoutMs: 0,
      }),
    ).rejects.toThrow("busy timeout");
  });
});

async function temporaryDataRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "career-sqlite-runtime-"));
  temporaryDirectories.push(directory);
  return directory;
}

function fixtureOptions(fixture: string, dataRoot: string) {
  return {
    manifestPath: join(FIXTURES_ROOT, fixture, "manifest.json"),
    dataRoot,
    mode: "governance" as const,
  };
}

function pragma(database: DatabaseSync, sql: string): unknown {
  const row = database.prepare(sql).get() as Record<string, unknown>;
  return Object.values(row)[0];
}

function tableExists(databasePath: string, table: string): boolean {
  const database = new DatabaseSync(databasePath);
  try {
    return database
      .prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ?")
      .get(table) !== undefined;
  } finally {
    database.close();
  }
}

function historyCount(databasePath: string): number {
  const database = new DatabaseSync(databasePath);
  try {
    const row = database
      .prepare("SELECT COUNT(*) AS count FROM __career_migration_history")
      .get() as { count: number };
    return row.count;
  } finally {
    database.close();
  }
}
