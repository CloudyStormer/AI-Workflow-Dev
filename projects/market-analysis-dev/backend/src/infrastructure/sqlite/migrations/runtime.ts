import { chmodSync } from "node:fs";
import { chmod, lstat, mkdir, realpath } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  MIGRATION_DATABASE_MODES,
  MigrationManifestError,
  loadMigrationManifest,
  readMigrationSql,
  type MigrationDatabaseMode,
  type MigrationEntry,
  type MigrationManifest,
} from "./manifest";

const DEFAULT_BUSY_TIMEOUT_MS = 5_000;
const HISTORY_TABLE = "__career_migration_history";
const FORBIDDEN_SQL = /\b(?:ATTACH|DETACH|VACUUM|PRAGMA|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)\b/iu;

export class MigrationRuntimeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MigrationRuntimeError";
  }
}

export interface MigrationRuntimeOptions {
  readonly manifestPath: string;
  readonly dataRoot: string;
  readonly mode: MigrationDatabaseMode;
  readonly busyTimeoutMs?: number;
}

export interface MigrationRuntimeResult {
  readonly mode: MigrationDatabaseMode;
  readonly databasePath: string;
  readonly streamId: string;
  readonly schemaVersion: number;
  readonly appliedMigrationIds: readonly string[];
  readonly journalMode: "wal";
  readonly foreignKeys: true;
  readonly busyTimeoutMs: number;
}

interface AppliedMigrationRow {
  readonly version: number;
  readonly id: string;
  readonly up_sha256: string;
}

export async function applyMigrationStream(
  options: MigrationRuntimeOptions,
): Promise<MigrationRuntimeResult> {
  const busyTimeoutMs = validateBusyTimeout(options.busyTimeoutMs);
  const manifest = await loadMigrationManifest(options.manifestPath, options.mode);
  const databasePath = await prepareDatabasePath(
    options.dataRoot,
    options.mode,
    manifest.database.filename,
  );
  const database = openConfiguredDatabase(databasePath, busyTimeoutMs);

  try {
    initializeHistory(database);
    const applied = readAppliedMigrations(database);
    verifyAppliedMigrations(applied, manifest);
    const appliedMigrationIds: string[] = [];

    for (const migration of manifest.migrations.slice(applied.length)) {
      const sql = await readMigrationSql(options.manifestPath, migration, "up");
      requireRuntimeSafeSql(sql, migration, "up");
      applyOne(database, migration, sql);
      appliedMigrationIds.push(migration.id);
    }

    assertSingleDatabase(database);
    return resultFor(
      options.mode,
      databasePath,
      manifest,
      appliedMigrationIds,
      busyTimeoutMs,
    );
  } finally {
    database.close();
  }
}

export async function applyAllMigrationStreams(
  migrationsRoot: string,
  dataRoot: string,
  busyTimeoutMs = DEFAULT_BUSY_TIMEOUT_MS,
): Promise<readonly MigrationRuntimeResult[]> {
  const results: MigrationRuntimeResult[] = [];
  for (const mode of MIGRATION_DATABASE_MODES) {
    results.push(
      await applyMigrationStream({
        manifestPath: resolve(migrationsRoot, mode, "manifest.json"),
        dataRoot,
        mode,
        busyTimeoutMs,
      }),
    );
  }
  return Object.freeze(results.map((result) => Object.freeze(result)));
}

export async function rollbackLastMigration(
  options: MigrationRuntimeOptions,
): Promise<MigrationRuntimeResult> {
  const busyTimeoutMs = validateBusyTimeout(options.busyTimeoutMs);
  const manifest = await loadMigrationManifest(options.manifestPath, options.mode);
  const databasePath = await prepareDatabasePath(
    options.dataRoot,
    options.mode,
    manifest.database.filename,
  );
  const database = openConfiguredDatabase(databasePath, busyTimeoutMs);

  try {
    initializeHistory(database);
    const applied = readAppliedMigrations(database);
    verifyAppliedMigrations(applied, manifest);
    const latest = applied.at(-1);
    if (latest === undefined) {
      throw new MigrationRuntimeError("no applied migration is available to roll back");
    }
    const migration = manifest.migrations[latest.version - 1];
    if (migration === undefined) {
      throw new MigrationRuntimeError("applied migration is absent from the manifest");
    }
    if (migration.rollback.strategy === "restore-only") {
      throw new MigrationRuntimeError(
        `migration ${migration.id} is restore-only and cannot run down SQL`,
      );
    }

    const sql = await readMigrationSql(options.manifestPath, migration, "down");
    requireRuntimeSafeSql(sql, migration, "down");
    rollbackOne(database, migration, sql);
    assertSingleDatabase(database);
    return resultFor(
      options.mode,
      databasePath,
      manifest,
      [],
      busyTimeoutMs,
      migration.version - 1,
    );
  } finally {
    database.close();
  }
}

async function prepareDatabasePath(
  dataRootInput: string,
  mode: MigrationDatabaseMode,
  filename: string,
): Promise<string> {
  const dataRoot = resolve(dataRootInput);
  await mkdir(dataRoot, { mode: 0o700, recursive: true });
  const authoritativeRoot = await requireRealDirectory(dataRoot, "data root");
  await chmod(dataRoot, 0o700);

  const modeDirectory = resolve(dataRoot, mode);
  if (dirname(modeDirectory) !== dataRoot || !modeDirectory.startsWith(`${dataRoot}${sep}`)) {
    throw new MigrationRuntimeError("database mode directory escapes data root");
  }
  await mkdir(modeDirectory, { mode: 0o700, recursive: true });
  const authoritativeModeDirectory = await requireRealDirectory(
    modeDirectory,
    `${mode} data directory`,
  );
  if (dirname(authoritativeModeDirectory) !== authoritativeRoot) {
    throw new MigrationRuntimeError(`${mode} data directory escapes data root`);
  }
  await chmod(modeDirectory, 0o700);

  const databasePath = resolve(modeDirectory, filename);
  if (dirname(databasePath) !== modeDirectory) {
    throw new MigrationRuntimeError("database filename escapes its mode directory");
  }
  const existing = await lstat(databasePath).catch(() => undefined);
  if (existing !== undefined && (existing.isSymbolicLink() || !existing.isFile())) {
    throw new MigrationRuntimeError("database path must be a regular non-symlink file");
  }
  if (existing !== undefined) {
    const canonicalDatabasePath = await realpath(databasePath);
    if (dirname(canonicalDatabasePath) !== authoritativeModeDirectory) {
      throw new MigrationRuntimeError("database path escapes its mode directory");
    }
  }
  return databasePath;
}

async function requireRealDirectory(path: string, label: string): Promise<string> {
  const stats = await lstat(path).catch(() => {
    throw new MigrationRuntimeError(`${label} is missing or unreadable`);
  });
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new MigrationRuntimeError(`${label} must be a real directory`);
  }
  return realpath(path);
}

function openConfiguredDatabase(
  databasePath: string,
  busyTimeoutMs: number,
): DatabaseSync {
  const database = new DatabaseSync(databasePath);
  try {
    database.exec(`PRAGMA busy_timeout = ${busyTimeoutMs}`);
    database.exec("PRAGMA foreign_keys = ON");
    const journalMode = valueFromPragma(database, "PRAGMA journal_mode = WAL");
    const foreignKeys = valueFromPragma(database, "PRAGMA foreign_keys");
    const configuredBusyTimeout = valueFromPragma(database, "PRAGMA busy_timeout");
    if (journalMode !== "wal" || foreignKeys !== 1 || configuredBusyTimeout !== busyTimeoutMs) {
      throw new MigrationRuntimeError("SQLite safety pragmas could not be enabled");
    }
    chmodSync(databasePath, 0o600);
    return database;
  } catch (error) {
    database.close();
    throw normalizeRuntimeError(error);
  }
}

function valueFromPragma(database: DatabaseSync, sql: string): unknown {
  const row = database.prepare(sql).get() as Record<string, unknown> | undefined;
  return row === undefined ? undefined : Object.values(row)[0];
}

function initializeHistory(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
      version INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      up_sha256 TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT
  `);
}

function readAppliedMigrations(database: DatabaseSync): readonly AppliedMigrationRow[] {
  return database
    .prepare(`SELECT version, id, up_sha256 FROM ${HISTORY_TABLE} ORDER BY version`)
    .all() as unknown as readonly AppliedMigrationRow[];
}

function verifyAppliedMigrations(
  applied: readonly AppliedMigrationRow[],
  manifest: MigrationManifest,
): void {
  if (applied.length > manifest.migrations.length) {
    throw new MigrationRuntimeError("database schema is ahead of the migration manifest");
  }
  for (const [index, row] of applied.entries()) {
    const migration = manifest.migrations[index];
    if (
      migration === undefined ||
      row.version !== migration.version ||
      row.id !== migration.id ||
      row.up_sha256 !== migration.up_sha256
    ) {
      throw new MigrationRuntimeError("applied migration history does not match manifest");
    }
  }
}

function applyOne(database: DatabaseSync, migration: MigrationEntry, sql: string): void {
  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec(sql);
    database
      .prepare(
        `INSERT INTO ${HISTORY_TABLE} (version, id, up_sha256, applied_at) VALUES (?, ?, ?, ?)`,
      )
      .run(migration.version, migration.id, migration.up_sha256, new Date().toISOString());
    database.exec("COMMIT");
  } catch (error) {
    rollbackTransaction(database);
    throw normalizeRuntimeError(error, `failed to apply migration ${migration.id}`);
  }
}

function rollbackOne(database: DatabaseSync, migration: MigrationEntry, sql: string): void {
  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec(sql);
    database
      .prepare(`DELETE FROM ${HISTORY_TABLE} WHERE version = ? AND id = ?`)
      .run(migration.version, migration.id);
    database.exec("COMMIT");
  } catch (error) {
    rollbackTransaction(database);
    throw normalizeRuntimeError(error, `failed to roll back migration ${migration.id}`);
  }
}

function rollbackTransaction(database: DatabaseSync): void {
  try {
    database.exec("ROLLBACK");
  } catch {
    // The original failure remains authoritative if the transaction never began.
  }
}

function requireRuntimeSafeSql(
  sql: string,
  migration: MigrationEntry,
  direction: "up" | "down",
): void {
  const executableTokens = sql
    .replace(/--[^\r\n]*/gu, " ")
    .replace(/\/\*[\s\S]*?\*\//gu, " ")
    .replace(/'(?:''|[^'])*'/gu, "''")
    .replace(/"(?:""|[^"])*"/gu, '""');
  const forbidden = FORBIDDEN_SQL.exec(executableTokens)?.[0];
  if (forbidden !== undefined) {
    throw new MigrationRuntimeError(
      `${direction} migration ${migration.id} contains forbidden SQL token ${forbidden.toUpperCase()}`,
    );
  }
}

function assertSingleDatabase(database: DatabaseSync): void {
  const rows = database.prepare("PRAGMA database_list").all() as unknown as ReadonlyArray<{
    readonly name: string;
  }>;
  if (rows.some((row) => row.name !== "main" && row.name !== "temp")) {
    throw new MigrationRuntimeError("migration attempted to attach another database");
  }
}

function resultFor(
  mode: MigrationDatabaseMode,
  databasePath: string,
  manifest: MigrationManifest,
  appliedMigrationIds: readonly string[],
  busyTimeoutMs: number,
  schemaVersion = manifest.state.declared_schema_head,
): MigrationRuntimeResult {
  return Object.freeze({
    mode,
    databasePath,
    streamId: manifest.database.stream_id,
    schemaVersion,
    appliedMigrationIds: Object.freeze([...appliedMigrationIds]),
    journalMode: "wal" as const,
    foreignKeys: true as const,
    busyTimeoutMs,
  });
}

function validateBusyTimeout(value: number | undefined): number {
  const timeout = value ?? DEFAULT_BUSY_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000) {
    throw new MigrationRuntimeError("busy timeout must be an integer from 1 to 60000 ms");
  }
  return timeout;
}

function normalizeRuntimeError(error: unknown, prefix?: string): MigrationRuntimeError {
  if (error instanceof MigrationRuntimeError) {
    return error;
  }
  if (error instanceof MigrationManifestError) {
    return new MigrationRuntimeError(error.message);
  }
  const detail = error instanceof Error ? error.message : "unknown SQLite error";
  return new MigrationRuntimeError(prefix === undefined ? detail : `${prefix}: ${detail}`);
}
