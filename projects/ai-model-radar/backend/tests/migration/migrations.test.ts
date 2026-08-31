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
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  normalizeSourceLanguage,
  registerLanguageTagFunctions,
} from "../../src/infrastructure/language-tags.js";
import {
  applyMigrations,
  verifyMigrations,
} from "../../src/infrastructure/migrations.js";
import { RadarRepository } from "../../src/infrastructure/repository.js";

const migrationsRoot = path.resolve(process.cwd(), "migrations");
const fixturesRoot = path.resolve(process.cwd(), "tests/fixtures/bilingual-revisions");
const temporaryDirectories: string[] = [];
const memoryDatabases: DatabaseSync[] = [];

afterEach(() => {
  for (const database of memoryDatabases.splice(0)) {
    database.close();
  }
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
        "0003_bilingual_revision_integrity.sql",
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
      ).toThrow(/event original payload sha256 must match parent revision/);
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

  it("enforces parent payload lineage and canonical BCP 47 source languages in memory", () => {
    const database = migratedLiveDatabase();
    insertParentRevision(database, "event_lineage_mismatch", "a".repeat(64));
    expect(() =>
      insertOriginalRevision(database, {
        eventId: "event_lineage_mismatch",
        sourceLanguage: "en",
        payloadSha256: "b".repeat(64),
      }),
    ).toThrow(/event original payload sha256 must match parent revision/);

    insertParentRevision(database, "event_canonical_language", "c".repeat(64));
    expect(() =>
      insertOriginalRevision(database, {
        eventId: "event_canonical_language",
        sourceLanguage: "EN-us",
        payloadSha256: "c".repeat(64),
      }),
    ).toThrow(/source language must be canonical BCP 47/);
    insertOriginalRevision(database, {
      eventId: "event_canonical_language",
      sourceLanguage: normalizeSourceLanguage(" EN-us "),
      payloadSha256: "c".repeat(64),
    });
    expect(
      database
        .prepare("SELECT source_language FROM event_original_revisions WHERE event_id = ?")
        .get("event_canonical_language"),
    ).toEqual({ source_language: "en-US" });

    expect(normalizeSourceLanguage("zh-cn")).toBe("zh-CN");
    expect(normalizeSourceLanguage("und")).toBe("und");
    for (const invalid of ["--", "12", "-en", "en-"]) {
      expect(() => normalizeSourceLanguage(invalid)).toThrow(RangeError);
    }
  });

  it("enforces an explicit mutually exclusive Chinese counterpart truth matrix in memory", () => {
    const database = migratedLiveDatabase();
    insertParentRevision(database, "event_matrix_en", "1".repeat(64));
    insertOriginalRevision(database, {
      eventId: "event_matrix_en",
      sourceLanguage: "en",
      payloadSha256: "1".repeat(64),
    });
    insertParentRevision(database, "event_matrix_zh", "2".repeat(64));
    insertOriginalRevision(database, {
      eventId: "event_matrix_zh",
      sourceLanguage: "zh-CN",
      payloadSha256: "2".repeat(64),
    });

    const allowed: readonly ChineseRevisionInput[] = [
      {
        eventId: "event_matrix_zh",
        revision: 1,
        formationKind: "none",
        status: "source_is_zh",
        title: null,
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 1,
        formationKind: "human",
        status: "ready",
        title: "完整标题",
        summary: "完整摘要",
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 2,
        formationKind: "machine",
        status: "partial",
        title: "部分标题",
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 3,
        formationKind: "rule",
        status: "stale",
        title: null,
        summary: "历史摘要",
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 4,
        formationKind: "human",
        status: "needs_review",
        title: "待复核标题",
        summary: null,
        assessment: "需人工核验术语",
      },
    ];
    for (const input of allowed) {
      insertChineseRevision(database, input);
    }

    const rejected: readonly ChineseRevisionInput[] = [
      {
        eventId: "event_matrix_en",
        revision: 10,
        formationKind: "none",
        status: "stale",
        title: "矛盾内容",
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 11,
        formationKind: "machine",
        status: "partial",
        title: "   ",
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 12,
        formationKind: "rule",
        status: "stale",
        title: null,
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_en",
        revision: 13,
        formationKind: "human",
        status: "needs_review",
        title: "待复核标题",
        summary: null,
        assessment: "  ",
      },
      {
        eventId: "event_matrix_en",
        revision: 14,
        formationKind: "none",
        status: "source_is_zh",
        title: null,
        summary: null,
        assessment: null,
      },
      {
        eventId: "event_matrix_zh",
        revision: 15,
        formationKind: "rule",
        status: "ready",
        title: "伪造对照",
        summary: "原文已经是中文",
        assessment: null,
      },
      {
        eventId: "event_matrix_zh",
        revision: 16,
        formationKind: "none",
        status: "source_is_zh",
        title: "不应复制正文",
        summary: null,
        assessment: null,
      },
    ];
    for (const input of rejected) {
      expect(() => insertChineseRevision(database, input)).toThrow();
    }
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM chinese_counterpart_revisions").get(),
    ).toEqual({ count: allowed.length });
  });

  it("fails readiness closed for schema, protection, foreign-key, or data drift", () => {
    const probes: readonly ((database: DatabaseSync) => void)[] = [
      (database) => database.exec("DROP TABLE chinese_counterpart_revisions"),
      (database) => database.exec("DROP INDEX idx_chinese_counterpart_revision_lookup"),
      (database) => database.exec("DROP TRIGGER event_original_revisions_no_update"),
      (database) => database.exec("PRAGMA foreign_keys=OFF"),
      (database) => {
        database.exec("PRAGMA foreign_keys=OFF");
        database
          .prepare(
            `INSERT INTO observations (
               observation_id, event_id, source_id, canonical_url,
               source_record_sha256, published_at, collected_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            "orphan_observation",
            "missing_event",
            "source_fixture",
            "https://example.com/orphan",
            "f".repeat(64),
            "2026-08-28T00:00:00.000Z",
            "2026-08-28T00:00:00.000Z",
          );
        database.exec("PRAGMA foreign_keys=ON");
      },
    ];

    for (const mutate of probes) {
      const database = migratedLiveDatabase();
      expect(verifyMigrations(database, path.join(migrationsRoot, "live"))).toBe(true);
      mutate(database);
      expect(verifyMigrations(database, path.join(migrationsRoot, "live"))).toBe(false);
    }
  });

  it("rolls back the integrity migration when legacy rows violate its contract", () => {
    const legacyRoot = temporaryDirectory("amr-legacy-migrations-");
    const legacyLive = path.join(legacyRoot, "live");
    mkdirSync(legacyLive, { recursive: true });
    for (const name of ["0001_radar_live.sql", "0002_bilingual_revision_foundation.sql"]) {
      copyFileSync(path.join(migrationsRoot, "live", name), path.join(legacyLive, name));
    }
    const database = memoryDatabase();
    applyMigrations(database, legacyLive);
    insertParentRevision(database, "event_legacy_invalid", "3".repeat(64));
    insertOriginalRevision(database, {
      eventId: "event_legacy_invalid",
      sourceLanguage: "en",
      payloadSha256: "3".repeat(64),
    });
    insertChineseRevision(database, {
      eventId: "event_legacy_invalid",
      revision: 1,
      formationKind: "none",
      status: "stale",
      title: "旧版约束曾错误接受的内容",
      summary: null,
      assessment: null,
    });

    expect(() => applyMigrations(database, path.join(migrationsRoot, "live"))).toThrow(
      /CHECK constraint failed/,
    );
    expect(
      database.prepare("SELECT migration_id FROM schema_migrations ORDER BY migration_id").all(),
    ).toEqual([
      { migration_id: "0001_radar_live.sql" },
      { migration_id: "0002_bilingual_revision_foundation.sql" },
    ]);
    expect(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM sqlite_schema WHERE name = 'migration_0003_integrity_guard'",
        )
        .get(),
    ).toEqual({ count: 0 });
    expect(verifyMigrations(database, path.join(migrationsRoot, "live"))).toBe(false);
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
      path.join(failingRoot, "live/0004_intentional_failure.sql"),
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
        { migration_id: "0003_bilingual_revision_integrity.sql" },
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

interface OriginalRevisionInput {
  readonly eventId: string;
  readonly sourceLanguage: string;
  readonly payloadSha256: string;
}

interface ChineseRevisionInput {
  readonly eventId: string;
  readonly revision: number;
  readonly formationKind: "human" | "machine" | "rule" | "none";
  readonly status: "source_is_zh" | "ready" | "partial" | "stale" | "needs_review";
  readonly title: string | null;
  readonly summary: string | null;
  readonly assessment: string | null;
}

function memoryDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  memoryDatabases.push(database);
  registerLanguageTagFunctions(database);
  database.exec("PRAGMA foreign_keys=ON");
  return database;
}

function migratedLiveDatabase(): DatabaseSync {
  const database = memoryDatabase();
  applyMigrations(database, path.join(migrationsRoot, "live"));
  return database;
}

function insertParentRevision(database: DatabaseSync, eventId: string, payloadSha256: string): void {
  database
    .prepare(
      `INSERT INTO events (
         event_id, canonical_url, source_id, publisher, region, title, summary,
         category, event_kind, version_label, published_at, first_seen_at,
         last_seen_at, current_revision, current_payload_sha256, confidence
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      eventId,
      `https://example.com/${eventId}`,
      "source_fixture",
      "Fixture Publisher",
      "global",
      "Fixture title",
      "Fixture summary",
      "model",
      "model-release",
      "r1",
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      1,
      payloadSha256,
      "high",
    );
  database
    .prepare(
      `INSERT INTO event_revisions (
         event_id, revision, previous_revision, payload_json,
         payload_sha256, observed_at, revision_reason
       ) VALUES (?, 1, NULL, ?, ?, ?, ?)`,
    )
    .run(
      eventId,
      '{"title":"Fixture title"}',
      payloadSha256,
      "2026-08-28T00:00:00.000Z",
      "fixture",
    );
}

function insertOriginalRevision(database: DatabaseSync, input: OriginalRevisionInput): void {
  database
    .prepare(
      `INSERT INTO event_original_revisions (
         event_id, original_revision, source_language, original_title,
         permitted_excerpt, fact_payload_json, payload_sha256, quality_state, observed_at
       ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.eventId,
      input.sourceLanguage,
      "Fixture original title",
      "Fixture excerpt",
      '{"version":"r1"}',
      input.payloadSha256,
      "available",
      "2026-08-28T00:00:00.000Z",
    );
}

function insertChineseRevision(database: DatabaseSync, input: ChineseRevisionInput): void {
  const hashCharacter = input.revision.toString(16).at(-1) ?? "0";
  database
    .prepare(
      `INSERT INTO chinese_counterpart_revisions (
         event_id, original_revision, locale, chinese_revision, formation_kind,
         status, title_zh, fact_summary_zh, key_changes_json,
         system_assessment_zh, input_sha256, output_sha256, formed_at, reviewed_at
       ) VALUES (?, 1, 'zh-CN', ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, NULL)`,
    )
    .run(
      input.eventId,
      input.revision,
      input.formationKind,
      input.status,
      input.title,
      input.summary,
      input.assessment,
      hashCharacter.repeat(64),
      ((Number.parseInt(hashCharacter, 16) + 1) % 16).toString(16).repeat(64),
      `2026-08-28T00:${input.revision.toString().padStart(2, "0")}:00.000Z`,
    );
}

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
