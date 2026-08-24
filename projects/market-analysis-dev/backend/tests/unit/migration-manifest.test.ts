import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  MIGRATION_DATABASE_MODES,
  MigrationManifestError,
  loadMigrationManifest,
} from "../../src/infrastructure/sqlite/migrations/manifest";

const MIGRATIONS_ROOT = resolve(process.cwd(), "migrations");
const FIXTURES_ROOT = resolve(process.cwd(), "tests/fixtures/migrations");
const temporaryDirectories: string[] = [];
const invalidCases: ReadonlyArray<
  readonly [string, (manifest: MutableManifest) => void]
> = [
  ["unknown root field", (manifest) => {
    manifest.unreviewed = true;
  }],
  ["duplicate migration id", (manifest) => {
    manifest.migrations.push({ ...firstMigration(manifest) });
    manifest.state.declared_schema_head = 2;
  }],
  ["non-contiguous version", (manifest) => {
    const first = firstMigration(manifest);
    first.version = 2;
    first.id = "0002_contract_probe";
    first.up_file = "0002_contract_probe.up.sql";
    manifest.state.declared_schema_head = 2;
  }],
  ["unsupported rollback", (manifest) => {
    firstMigration(manifest).rollback = { strategy: "down-sql" };
  }],
];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("CR-DATA-101 migration manifest contract", () => {
  it.each(MIGRATION_DATABASE_MODES)(
    "loads the independent %s contract without claiming a materialized database",
    async (mode) => {
      const manifest = await loadMigrationManifest(
        join(MIGRATIONS_ROOT, mode, "manifest.json"),
        mode,
      );

      expect(manifest.database.mode).toBe(mode);
      expect(manifest.state).toEqual({
        database_materialized: false,
        applied_schema_version: 0,
        declared_schema_head: 0,
        contract_status: "contract-only-not-applied",
      });
      expect(manifest.migrations).toEqual([]);
      expect(Object.isFrozen(manifest)).toBe(true);
      expect(Object.isFrozen(manifest.database)).toBe(true);
      expect(Object.isFrozen(manifest.migrations)).toBe(true);
    },
  );

  it("verifies the SHA-256 of exact migration file bytes", async () => {
    const manifest = await loadMigrationManifest(
      join(FIXTURES_ROOT, "valid-governance/manifest.json"),
      "governance",
    );

    expect(manifest.state.declared_schema_head).toBe(1);
    expect(manifest.migrations[0]?.up_sha256).toBe(
      "0ec46af114e91344f3ba5562dffe832a0a505b61f685d59b60d8d27d7e5eb873",
    );
  });

  it("verifies an explicit down file independently when rollback is reversible", async () => {
    const manifest = await loadMigrationManifest(
      join(FIXTURES_ROOT, "explicit-down/manifest.json"),
      "governance",
    );

    expect(manifest.migrations[0]?.rollback).toEqual({
      strategy: "explicit-down",
      down_file: "0001_contract_probe.down.sql",
      down_sha256:
        "d1ca12b5fce5af68bde335021d21c59ebb5c756c8a4a71b7fbe8d3d252844780",
    });
  });

  it("fails closed when exact file bytes do not match the registered checksum", async () => {
    await expect(
      loadMigrationManifest(
        join(FIXTURES_ROOT, "checksum-mismatch/manifest.json"),
        "governance",
      ),
    ).rejects.toThrow("checksum mismatch");
  });

  it("fails closed on a cross-database manifest", async () => {
    await expect(
      loadMigrationManifest(
        join(MIGRATIONS_ROOT, "public/manifest.json"),
        "private",
      ),
    ).rejects.toThrow("database.mode must equal expected mode private");
  });

  it.each(invalidCases)("fails closed on %s", async (_label, mutate) => {
    const manifestPath = await copyMutableFixture();
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MutableManifest;
    mutate(manifest);
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await expect(
      loadMigrationManifest(manifestPath, "governance"),
    ).rejects.toBeInstanceOf(MigrationManifestError);
  });

  it("fails closed on an unsafe migration path", async () => {
    const manifestPath = await copyMutableFixture();
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as MutableManifest;
    firstMigration(manifest).up_file = "../0001_contract_probe.up.sql";
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    await expect(
      loadMigrationManifest(manifestPath, "governance"),
    ).rejects.toBeInstanceOf(MigrationManifestError);
  });
});

interface MutableManifest {
  [key: string]: unknown;
  state: {
    declared_schema_head: number;
  };
  migrations: Array<{
    id: string;
    version: number;
    up_file: string;
    up_sha256: string;
    rollback: {
      strategy: string;
      down_file?: string;
      down_sha256?: string;
    };
  }>;
}

async function copyMutableFixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "career-migration-manifest-"));
  temporaryDirectories.push(directory);
  await cp(join(FIXTURES_ROOT, "valid-governance"), directory, {
    recursive: true,
  });
  return join(directory, "manifest.json");
}

function firstMigration(
  manifest: MutableManifest,
): MutableManifest["migrations"][number] {
  const migration = manifest.migrations[0];
  if (migration === undefined) {
    throw new Error("test fixture must contain one migration");
  }
  return migration;
}
