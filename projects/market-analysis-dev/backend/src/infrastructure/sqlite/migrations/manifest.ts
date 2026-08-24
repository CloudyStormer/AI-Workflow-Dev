import { createHash } from "node:crypto";
import { constants, type Stats } from "node:fs";
import {
  lstat,
  open,
  readFile,
  realpath,
  type FileHandle,
} from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";

export const MIGRATION_DATABASE_MODES = [
  "governance",
  "public",
  "private",
  "seed",
  "ledger",
] as const;

export type MigrationDatabaseMode = (typeof MIGRATION_DATABASE_MODES)[number];

export interface MigrationEntry {
  readonly id: string;
  readonly version: number;
  readonly up_file: string;
  readonly up_sha256: string;
  readonly rollback:
    | { readonly strategy: "restore-only" }
    | {
        readonly strategy: "explicit-down";
        readonly down_file: string;
        readonly down_sha256: string;
      };
}

export interface MigrationManifest {
  readonly manifest_version: 1;
  readonly project_id: "market-analysis-dev";
  readonly database: {
    readonly mode: MigrationDatabaseMode;
    readonly filename: string;
    readonly stream_id: string;
  };
  readonly checksum: {
    readonly algorithm: "sha256";
    readonly encoding: "lowercase-hex";
    readonly scope: "exact-file-bytes";
  };
  readonly state: {
    readonly database_materialized: false;
    readonly applied_schema_version: 0;
    readonly declared_schema_head: number;
    readonly contract_status: "contract-only-not-applied";
  };
  readonly migrations: readonly MigrationEntry[];
}

const DATABASE_FILENAMES: Readonly<Record<MigrationDatabaseMode, string>> = {
  governance: "career-governance.sqlite",
  public: "career-public.sqlite",
  private: "career-private.sqlite",
  seed: "career-seed-demo.sqlite",
  ledger: "career-deletion-ledger.sqlite",
};

const MANIFEST_KEYS = [
  "manifest_version",
  "project_id",
  "database",
  "checksum",
  "state",
  "migrations",
] as const;
const DATABASE_KEYS = ["mode", "filename", "stream_id"] as const;
const CHECKSUM_KEYS = ["algorithm", "encoding", "scope"] as const;
const STATE_KEYS = [
  "database_materialized",
  "applied_schema_version",
  "declared_schema_head",
  "contract_status",
] as const;
const MIGRATION_KEYS = [
  "id",
  "version",
  "up_file",
  "up_sha256",
  "rollback",
] as const;
const RESTORE_ROLLBACK_KEYS = ["strategy"] as const;
const EXPLICIT_DOWN_ROLLBACK_KEYS = [
  "strategy",
  "down_file",
  "down_sha256",
] as const;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MIGRATION_ID_PATTERN = /^\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*$/u;

export class MigrationManifestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MigrationManifestError";
  }
}

export interface MigrationManifestLoadOptions {
  readonly afterFileOpenForTesting?: (filePath: string) => Promise<void>;
}

export async function loadMigrationManifest(
  manifestPath: string,
  expectedMode: MigrationDatabaseMode,
  options: MigrationManifestLoadOptions = {},
): Promise<MigrationManifest> {
  const bytes = await readFile(manifestPath);
  let input: unknown;

  try {
    input = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new MigrationManifestError("manifest must contain valid UTF-8 JSON");
  }

  const manifest = validateManifest(input, expectedMode);
  await verifyMigrationFiles(manifest, dirname(manifestPath), options);
  return deepFreeze(manifest);
}

function validateManifest(
  input: unknown,
  expectedMode: MigrationDatabaseMode,
): MigrationManifest {
  const manifest = requireRecord(input, "manifest");
  requireExactKeys(manifest, MANIFEST_KEYS, "manifest");

  if (manifest.manifest_version !== 1) {
    fail("manifest_version must equal 1");
  }
  if (manifest.project_id !== "market-analysis-dev") {
    fail("project_id must equal market-analysis-dev");
  }

  const database = requireRecord(manifest.database, "database");
  requireExactKeys(database, DATABASE_KEYS, "database");
  if (database.mode !== expectedMode) {
    fail(`database.mode must equal expected mode ${expectedMode}`);
  }
  if (database.filename !== DATABASE_FILENAMES[expectedMode]) {
    fail(`database.filename does not match mode ${expectedMode}`);
  }
  if (database.stream_id !== `career-${expectedMode}-migrations`) {
    fail(`database.stream_id does not match mode ${expectedMode}`);
  }

  const checksum = requireRecord(manifest.checksum, "checksum");
  requireExactKeys(checksum, CHECKSUM_KEYS, "checksum");
  if (
    checksum.algorithm !== "sha256" ||
    checksum.encoding !== "lowercase-hex" ||
    checksum.scope !== "exact-file-bytes"
  ) {
    fail("checksum contract must be sha256/lowercase-hex/exact-file-bytes");
  }

  const state = requireRecord(manifest.state, "state");
  requireExactKeys(state, STATE_KEYS, "state");
  if (
    state.database_materialized !== false ||
    state.applied_schema_version !== 0 ||
    state.contract_status !== "contract-only-not-applied"
  ) {
    fail("state must remain contract-only and not applied");
  }
  if (!Number.isSafeInteger(state.declared_schema_head)) {
    fail("state.declared_schema_head must be a safe integer");
  }

  if (!Array.isArray(manifest.migrations)) {
    fail("migrations must be an array");
  }

  const migrations = manifest.migrations.map((entry, index) =>
    validateMigration(entry, index),
  );
  const ids = new Set<string>();
  let previousVersion = 0;

  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      fail(`duplicate migration id ${migration.id}`);
    }
    ids.add(migration.id);
    if (migration.version !== previousVersion + 1) {
      fail("migration versions must be contiguous and strictly ascending from 1");
    }
    const idVersion = Number.parseInt(migration.id.slice(0, 4), 10);
    if (idVersion !== migration.version) {
      fail(`migration id ${migration.id} does not match version`);
    }
    previousVersion = migration.version;
  }

  if (state.declared_schema_head !== previousVersion) {
    fail("declared_schema_head must equal the last declared migration version");
  }

  return manifest as unknown as MigrationManifest;
}

function validateMigration(input: unknown, index: number): MigrationEntry {
  const label = `migrations[${index}]`;
  const migration = requireRecord(input, label);
  requireExactKeys(migration, MIGRATION_KEYS, label);

  if (typeof migration.id !== "string" || !MIGRATION_ID_PATTERN.test(migration.id)) {
    fail(`${label}.id must match NNNN_lowercase_slug`);
  }
  if (!Number.isSafeInteger(migration.version) || Number(migration.version) < 1) {
    fail(`${label}.version must be a positive safe integer`);
  }
  if (migration.up_file !== `${migration.id}.up.sql`) {
    fail(`${label}.up_file must be the canonical file for its id`);
  }
  requireSafeBasename(migration.up_file, `${label}.up_file`);
  if (
    typeof migration.up_sha256 !== "string" ||
    !SHA256_PATTERN.test(migration.up_sha256)
  ) {
    fail(`${label}.up_sha256 must be 64 lowercase hexadecimal characters`);
  }
  validateRollback(migration.rollback, migration.id, label);

  return migration as unknown as MigrationEntry;
}

function validateRollback(input: unknown, migrationId: string, label: string): void {
  const rollback = requireRecord(input, `${label}.rollback`);
  if (rollback.strategy === "restore-only") {
    requireExactKeys(rollback, RESTORE_ROLLBACK_KEYS, `${label}.rollback`);
    return;
  }
  if (rollback.strategy !== "explicit-down") {
    fail(`${label}.rollback.strategy is unsupported`);
  }
  requireExactKeys(rollback, EXPLICIT_DOWN_ROLLBACK_KEYS, `${label}.rollback`);
  if (rollback.down_file !== `${migrationId}.down.sql`) {
    fail(`${label}.rollback.down_file must be the canonical file for its id`);
  }
  requireSafeBasename(rollback.down_file, `${label}.rollback.down_file`);
  if (
    typeof rollback.down_sha256 !== "string" ||
    !SHA256_PATTERN.test(rollback.down_sha256)
  ) {
    fail(`${label}.rollback.down_sha256 must be 64 lowercase hexadecimal characters`);
  }
}

async function verifyMigrationFiles(
  manifest: MigrationManifest,
  manifestDirectory: string,
  options: MigrationManifestLoadOptions,
): Promise<void> {
  const root = resolve(manifestDirectory);
  const authoritativeRoot = await realpath(root).catch(() => {
    throw new MigrationManifestError(
      "manifest directory is missing or unreadable",
    );
  });
  const rootStats = await lstat(authoritativeRoot).catch(() => {
    throw new MigrationManifestError(
      "manifest directory is missing or unreadable",
    );
  });
  if (!rootStats.isDirectory()) {
    fail("manifest directory must be a directory");
  }

  for (const migration of manifest.migrations) {
    const filePath = resolve(root, migration.up_file);
    requireDirectChild(filePath, root, migration.up_file, "migration");
    const actualChecksum = await checksumAuthoritativeFile(
      filePath,
      authoritativeRoot,
      migration.up_file,
      "migration",
      options,
    );
    if (actualChecksum !== migration.up_sha256) {
      fail(`checksum mismatch for migration ${migration.id}`);
    }
    if (migration.rollback.strategy === "explicit-down") {
      const rollback = migration.rollback;
      const downFilePath = resolve(root, rollback.down_file);
      requireDirectChild(downFilePath, root, rollback.down_file, "rollback");
      const actualDownChecksum = await checksumAuthoritativeFile(
        downFilePath,
        authoritativeRoot,
        rollback.down_file,
        "rollback",
        options,
      );
      if (actualDownChecksum !== rollback.down_sha256) {
        fail(`checksum mismatch for rollback ${migration.id}`);
      }
    }
  }
}

function requireDirectChild(
  filePath: string,
  root: string,
  registeredName: string,
  kind: "migration" | "rollback",
): void {
  if (!filePath.startsWith(`${root}${sep}`) || dirname(filePath) !== root) {
    fail(`${kind} path escapes manifest directory: ${registeredName}`);
  }
}

async function checksumAuthoritativeFile(
  filePath: string,
  authoritativeRoot: string,
  registeredName: string,
  kind: "migration" | "rollback",
  options: MigrationManifestLoadOptions,
): Promise<string> {
  const label = `${kind} file ${registeredName}`;
  await requireRegularPath(filePath, label);

  let handle: FileHandle;
  try {
    handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new MigrationManifestError(
      `${kind} file is missing, unreadable, or not a regular file: ${registeredName}`,
    );
  }

  try {
    const openedStats = await handle.stat();
    if (!openedStats.isFile()) {
      fail(`${label} must be a regular file`);
    }

    await options.afterFileOpenForTesting?.(filePath);
    await assertOpenedPathIsAuthoritative(
      filePath,
      authoritativeRoot,
      openedStats,
      label,
    );
    const bytes = await handle.readFile();
    await assertOpenedPathIsAuthoritative(
      filePath,
      authoritativeRoot,
      openedStats,
      label,
    );
    return createHash("sha256").update(bytes).digest("hex");
  } catch (error) {
    if (error instanceof MigrationManifestError) {
      throw error;
    }
    throw new MigrationManifestError(`${label} changed during validation`);
  } finally {
    await handle.close();
  }
}

async function assertOpenedPathIsAuthoritative(
  filePath: string,
  authoritativeRoot: string,
  openedStats: Stats,
  label: string,
): Promise<void> {
  const currentStats = await requireRegularPath(filePath, label);
  if (!isSameFile(openedStats, currentStats)) {
    fail(`${label} changed during validation`);
  }

  const canonicalPath = await realpath(filePath).catch(() => {
    throw new MigrationManifestError(`${label} cannot be resolved`);
  });
  if (dirname(canonicalPath) !== authoritativeRoot) {
    fail(`${label} resolves outside the manifest directory`);
  }

  const postResolutionStats = await requireRegularPath(filePath, label);
  if (!isSameFile(openedStats, postResolutionStats)) {
    fail(`${label} changed during validation`);
  }
}

async function requireRegularPath(filePath: string, label: string): Promise<Stats> {
  const stats = await lstat(filePath).catch(() => {
    throw new MigrationManifestError(`${label} is missing or unreadable`);
  });
  if (stats.isSymbolicLink() || !stats.isFile()) {
    fail(`${label} must be a regular file and must not be a symbolic link`);
  }
  return stats;
}

function isSameFile(openedStats: Stats, currentStats: Stats): boolean {
  return openedStats.dev === currentStats.dev && openedStats.ino === currentStats.ino;
}

function requireRecord(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail(`${label} must be an object`);
  }
  return input as Record<string, unknown>;
}

function requireExactKeys(
  input: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(input).sort();
  const canonical = [...expected].sort();
  if (actual.length !== canonical.length || actual.some((key, i) => key !== canonical[i])) {
    fail(`${label} contains missing or unknown fields`);
  }
}

function requireSafeBasename(input: unknown, label: string): asserts input is string {
  if (typeof input !== "string" || input !== basename(input) || input.includes("\\")) {
    fail(`${label} must be a safe basename`);
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function fail(message: string): never {
  throw new MigrationManifestError(message);
}
