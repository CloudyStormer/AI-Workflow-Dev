import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

export interface MigrationResult {
  readonly applied: readonly string[];
  readonly verified: readonly string[];
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasMigrationTable(database: DatabaseSync): boolean {
  const row = database
    .prepare("SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
    .get() as { present?: number } | undefined;
  return row?.present === 1;
}

function listMigrationFiles(migrationDirectory: string): readonly string[] {
  return readdirSync(migrationDirectory)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}

export function verifyMigrations(
  database: DatabaseSync,
  migrationDirectory: string,
): boolean {
  try {
    const migrationFiles = listMigrationFiles(migrationDirectory);
    if (migrationFiles.length === 0 || !hasMigrationTable(database)) {
      return false;
    }
    const rows = database
      .prepare("SELECT migration_id, sha256 FROM schema_migrations ORDER BY migration_id")
      .all() as Array<{ readonly migration_id: string; readonly sha256: string }>;
    if (rows.length !== migrationFiles.length) {
      return false;
    }
    return migrationFiles.every((migrationId, index) => {
      const row = rows[index];
      if (row?.migration_id !== migrationId) {
        return false;
      }
      const sql = readFileSync(path.join(migrationDirectory, migrationId), "utf8");
      return row.sha256 === sha256(sql);
    });
  } catch {
    return false;
  }
}

export function applyMigrations(
  database: DatabaseSync,
  migrationDirectory: string,
): MigrationResult {
  const migrationFiles = listMigrationFiles(migrationDirectory);
  if (migrationFiles.length === 0) {
    throw new Error(`no migrations found in ${path.basename(migrationDirectory)}`);
  }

  const applied: string[] = [];
  const verified: string[] = [];
  for (const migrationId of migrationFiles) {
    const sql = readFileSync(path.join(migrationDirectory, migrationId), "utf8");
    const digest = sha256(sql);
    const existing = hasMigrationTable(database)
      ? (database
          .prepare("SELECT sha256 FROM schema_migrations WHERE migration_id = ?")
          .get(migrationId) as { sha256: string } | undefined)
      : undefined;
    if (existing !== undefined) {
      if (existing.sha256 !== digest) {
        throw new Error(`migration checksum mismatch: ${migrationId}`);
      }
      verified.push(migrationId);
      continue;
    }

    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(sql);
      database
        .prepare("INSERT INTO schema_migrations (migration_id, sha256, applied_at) VALUES (?, ?, ?)")
        .run(migrationId, digest, new Date().toISOString());
      database.exec("COMMIT");
      applied.push(migrationId);
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
  return { applied, verified };
}
