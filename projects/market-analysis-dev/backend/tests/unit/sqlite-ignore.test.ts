import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(process.cwd(), "../../..");
const SQLITE_SIDECAR_PATHS = [
  "projects/market-analysis-dev/backend/tests/fixtures/probe.db-wal",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.db-shm",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.db-journal",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite-wal",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite-shm",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite-journal",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite3-wal",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite3-shm",
  "projects/market-analysis-dev/backend/tests/fixtures/probe.sqlite3-journal",
] as const;

describe("SQLite sidecar ignore matrix", () => {
  it.each(SQLITE_SIDECAR_PATHS)("ignores %s", (path) => {
    expect(() => {
      execFileSync("git", ["check-ignore", "--quiet", "--", path], {
        cwd: REPOSITORY_ROOT,
        stdio: "ignore",
      });
    }).not.toThrow();
  });
});
