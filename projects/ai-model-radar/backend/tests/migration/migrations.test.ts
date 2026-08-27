import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RadarRepository } from "../../src/infrastructure/repository.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("SQLite migrations", () => {
  it("applies checksummed migrations idempotently with required pragmas", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "amr-migrations-"));
    temporaryDirectories.push(directory);
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

      expect(first.live.applied).toEqual(["0001_radar_live.sql"]);
      expect(first.governance.applied).toEqual(["0001_radar_governance.sql"]);
      expect(replay.live.applied).toEqual([]);
      expect(replay.governance.applied).toEqual([]);
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
});
