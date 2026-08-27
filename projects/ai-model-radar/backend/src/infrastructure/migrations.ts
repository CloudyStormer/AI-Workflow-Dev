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

export function applyMigrations(
  database: DatabaseSync,
  migrationDirectory: string,
): MigrationResult {
  const migrationFiles = readdirSync(migrationDirectory)
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
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
