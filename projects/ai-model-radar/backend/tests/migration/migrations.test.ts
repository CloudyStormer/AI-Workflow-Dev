import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RadarRepository } from "../../src/infrastructure/repository.js";

const migrationsRoot = path.resolve(process.cwd(), "migrations");
const fixturesRoot = path.resolve(process.cwd(), "tests/fixtures/bilingual-revisions");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("SQLite migrations", () => {
  it("applies checksummed migrations idempotently with required pragmas", () => {
    const directory = temporaryDirectory("amr-migrations-");
    const oldSchema = new RadarRepository(directory);
    oldSchema.close();
    const livePath = path.join(directory, "radar-live.sqlite");
    const governancePath = path.join(directory, "radar-governance.sqlite");
    const liveBackup = path.join(directory, "radar-live.pre-migration.sqlite");
    const governanceBackup = path.join(directory, "radar-governance.pre-migration.sqlite");
    copyFileSync(livePath, liveBackup);
    copyFileSync(governancePath, governanceBackup);

    const repository = new RadarRepository(directory);
    try {
      const first = repository.migrate();
      const replay = repository.migrate();

      expect(first.live.applied).toEqual([
        "0001_radar_live.sql",
        "0002_bilingual_revision_foundation.sql",
      ]);
      expect(first.governance.applied).toEqual(["0001_radar_governance.sql"]);
      expect(replay.live.applied).toEqual([]);
      expect(replay.governance.applied).toEqual([]);
      expect(repository.isMigrated()).toBe(true);
      expect(repository.live.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
      expect(repository.live.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
      expect(repository.live.prepare("PRAGMA busy_timeout").get()).toEqual({ timeout: 5000 });
    } finally {
      repository.close();
    }

    copyFileSync(liveBackup, livePath);
    copyFileSync(governanceBackup, governancePath);
    const restored = new RadarRepository(directory);
    try {
      expect(restored.isMigrated()).toBe(false);
    } finally {
      restored.close();
    }
  });

  it("keeps original and zh-CN counterpart revisions separately addressable and immutable", () => {
    const repository = new RadarRepository(temporaryDirectory("amr-bilingual-schema-"));
    try {
      repository.migrate();
      repository.live.exec(readFileSync(path.join(fixturesRoot, "valid.sql"), "utf8"));

      expect(columnNames(repository, "event_original_revisions")).toContain("original_title");
      expect(columnNames(repository, "event_original_revisions")).not.toContain("title_zh");
      expect(columnNames(repository, "chinese_counterpart_revisions")).toContain("title_zh");
      expect(columnNames(repository, "chinese_counterpart_revisions")).not.toContain(
        "original_title",
      );
      expect(
        repository.live
          .prepare(
            `SELECT original.original_title, chinese.locale, chinese.chinese_revision,
                    chinese.title_zh, chinese.fact_summary_zh, chinese.system_assessment_zh
             FROM event_original_revisions AS original
             JOIN chinese_counterpart_revisions AS chinese
               ON chinese.event_id = original.event_id
              AND chinese.original_revision = original.original_revision
             WHERE original.event_id = ? AND original.original_revision = ?`,
          )
          .get("event_bilingual_fixture", 1),
      ).toEqual({
        original_title: "Model R1 released",
        locale: "zh-CN",
        chinese_revision: 1,
        title_zh: "Model R1 已发布",
        fact_summary_zh: "这是受控 fixture 的事实摘要。",
        system_assessment_zh: "这是与译文事实分离的系统评估。",
      });

      expect(() =>
        repository.live.exec(readFileSync(path.join(fixturesRoot, "invalid-locale.sql"), "utf8")),
      ).toThrow(/CHECK constraint failed/);
      expect(() =>
        repository.live
          .prepare(
            `INSERT INTO event_original_revisions (
               event_id, original_revision, source_language, original_title,
               permitted_excerpt, fact_payload_json, payload_sha256, quality_state, observed_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            "missing-event",
            1,
            "en",
            "Orphan",
            null,
            "{}",
            "d".repeat(64),
            "available",
            "2026-08-28T00:00:00.000Z",
          ),
      ).toThrow(/FOREIGN KEY constraint failed/);
      expect(() =>
        repository.live.exec(`
          INSERT INTO chinese_counterpart_revisions (
            event_id, original_revision, locale, chinese_revision, formation_kind,
            status, title_zh, fact_summary_zh, key_changes_json,
            system_assessment_zh, input_sha256, output_sha256, formed_at, reviewed_at
          )
          SELECT event_id, original_revision, locale, 2, formation_kind,
                 status, title_zh, fact_summary_zh, key_changes_json,
                 system_assessment_zh, input_sha256, output_sha256,
                 '2026-08-28T00:03:00.000Z', reviewed_at
          FROM chinese_counterpart_revisions
          WHERE event_id = 'event_bilingual_fixture' AND chinese_revision = 1;
        `),
      ).toThrow(/UNIQUE constraint failed/);
      expect(() =>
        repository.live
          .prepare("UPDATE event_original_revisions SET original_title = ? WHERE event_id = ?")
          .run("Changed", "event_bilingual_fixture"),
      ).toThrow(/event original revisions are immutable/);
      expect(() =>
        repository.live
          .prepare("DELETE FROM chinese_counterpart_revisions WHERE event_id = ?")
          .run("event_bilingual_fixture"),
      ).toThrow(/chinese counterpart revisions are immutable/);

      const migrationSql = readFileSync(
        path.join(migrationsRoot, "live/0002_bilingual_revision_foundation.sql"),
        "utf8",
      );
      expect(
        repository.live
          .prepare("SELECT sha256 FROM schema_migrations WHERE migration_id = ?")
          .get("0002_bilingual_revision_foundation.sql"),
      ).toEqual({ sha256: createHash("sha256").update(migrationSql).digest("hex") });
    } finally {
      repository.close();
    }
  });

  it("rejects checksum drift without rewriting an applied migration", () => {
    const repository = new RadarRepository(temporaryDirectory("amr-checksum-drift-"));
    const driftedRoot = temporaryDirectory("amr-drifted-migrations-");
    copyMigrationDirectory(path.join(migrationsRoot, "live"), path.join(driftedRoot, "live"));
    copyMigrationDirectory(
      path.join(migrationsRoot, "governance"),
      path.join(driftedRoot, "governance"),
    );

    try {
      repository.migrate();
      const driftedMigration = path.join(
        driftedRoot,
        "live/0002_bilingual_revision_foundation.sql",
      );
      writeFileSync(
        driftedMigration,
        `${readFileSync(driftedMigration, "utf8")}\n-- forbidden content drift\n`,
        "utf8",
      );

      expect(repository.isMigrated(driftedRoot)).toBe(false);
      expect(() => repository.migrate(driftedRoot)).toThrow(
        /migration checksum mismatch: 0002_bilingual_revision_foundation\.sql/,
      );
      expect(repository.isMigrated()).toBe(true);
    } finally {
      repository.close();
    }
  });

  it("rolls back a failed migration and keeps query readiness false for that migration set", () => {
    const repository = new RadarRepository(temporaryDirectory("amr-migration-failure-"));
    const failingRoot = temporaryDirectory("amr-failing-migrations-");
    copyMigrationDirectory(path.join(migrationsRoot, "live"), path.join(failingRoot, "live"));
    copyMigrationDirectory(
      path.join(migrationsRoot, "governance"),
      path.join(failingRoot, "governance"),
    );
    writeFileSync(
      path.join(failingRoot, "live/0003_intentional_failure.sql"),
      "CREATE TABLE must_rollback (id TEXT PRIMARY KEY) STRICT;\nTHIS IS NOT SQL;\n",
      "utf8",
    );

    try {
      repository.migrate();
      expect(repository.isMigrated()).toBe(true);
      expect(() => repository.migrate(failingRoot)).toThrow();
      expect(repository.isMigrated(failingRoot)).toBe(false);
      expect(repository.isMigrated()).toBe(true);
      expect(
        repository.live
          .prepare("SELECT migration_id FROM schema_migrations ORDER BY migration_id")
          .all(),
      ).toEqual([
        { migration_id: "0001_radar_live.sql" },
        { migration_id: "0002_bilingual_revision_foundation.sql" },
      ]);
      expect(
        repository.live
          .prepare(
            "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'must_rollback'",
          )
          .get(),
      ).toEqual({ count: 0 });
    } finally {
      repository.close();
    }
  });
});

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function columnNames(repository: RadarRepository, table: string): readonly string[] {
  return (
    repository.live.prepare(`PRAGMA table_info(${table})`).all() as Array<{ readonly name: string }>
  ).map((column) => column.name);
}

function copyMigrationDirectory(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const name of readdirSync(source).filter((entry) => entry.endsWith(".sql"))) {
    copyFileSync(path.join(source, name), path.join(target, name));
  }
}
