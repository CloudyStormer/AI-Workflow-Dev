import { resolve } from "node:path";

import type { RuntimeConfig } from "../config/runtime-config";
import { MaterialAnalysisStore } from "../infrastructure/sqlite/materials/material-analysis-store";
import { applyAllMigrationStreams } from "../infrastructure/sqlite/migrations/runtime";
import {
  importVerifiedBatch,
  type PublicSnapshotRecord,
} from "../infrastructure/sqlite/public/verified-batch-importer";

const VERIFIED_INPUT_SHA256 =
  "0bbc8c56794e5e14dea5780616b40729464ffdb6fa6f20ab6df25f604b9d5c6f";

export interface CareerRuntime {
  readonly store: MaterialAnalysisStore;
  readonly publicSnapshot: PublicSnapshotRecord;
  close(): void;
}

export async function initializeCareerRuntime(config: RuntimeConfig): Promise<CareerRuntime> {
  const migrationResults = await applyAllMigrationStreams(
    resolve(process.cwd(), "migrations"),
    config.dataDirectory,
  );
  const privateDatabase = migrationResults.find((result) => result.mode === "private")?.databasePath;
  const publicDatabase = migrationResults.find((result) => result.mode === "public")?.databasePath;
  if (privateDatabase === undefined || publicDatabase === undefined) {
    throw new Error("STORAGE_NOT_READY: required database migration result is missing");
  }
  const publicSnapshot = await importVerifiedBatch({
    databasePath: publicDatabase,
    inputPath: resolve(process.cwd(), "../output/daily/2026-08-25.json"),
    expectedSha256: VERIFIED_INPUT_SHA256,
    importerRevision: "career-verified-batch-importer-1.0.0",
    idempotencyKey: "career-approved-static-import-2026-08-25",
  });
  const key = Buffer.from(config.encryptionKeyHex, "hex");
  try {
    const store = new MaterialAnalysisStore(privateDatabase, key);
    return Object.freeze({
      store,
      publicSnapshot,
      close(): void {
        store.close();
      },
    });
  } finally {
    key.fill(0);
  }
}
