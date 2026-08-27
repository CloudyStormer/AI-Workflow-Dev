import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { MaterialAnalysisStore } from "../src/infrastructure/sqlite/materials/material-analysis-store";
import { applyMigrationStream } from "../src/infrastructure/sqlite/migrations/runtime";
import { importVerifiedBatch } from "../src/infrastructure/sqlite/public/verified-batch-importer";

const MIGRATIONS_ROOT = resolve(process.cwd(), "migrations");
const VERIFIED_INPUT = resolve(process.cwd(), "../output/daily/2026-08-25.json");
const VERIFIED_INPUT_SHA256 =
  "0bbc8c56794e5e14dea5780616b40729464ffdb6fa6f20ab6df25f604b9d5c6f";
const body =
  "我在电商项目中负责使用 React、TypeScript 和 Vite 构建前端系统，使用 Playwright 自动化测试，优化首屏性能提升 35%，并完成组件库上线。";

async function main(): Promise<void> {
  const dataRoot = await mkdtemp(join(tmpdir(), "career-data-smoke-"));
  try {
    const migrationResults = await Promise.all(
      (["governance", "public", "private", "seed", "ledger"] as const).map(
        async (mode) =>
          applyMigrationStream({
            manifestPath: join(MIGRATIONS_ROOT, mode, "manifest.json"),
            dataRoot,
            mode,
          }),
      ),
    );
    const databaseByMode = new Map(
      migrationResults.map((result) => [result.mode, result.databasePath]),
    );
    const privatePath = requireDatabasePath(databaseByMode, "private");
    const publicPath = requireDatabasePath(databaseByMode, "public");

    const snapshot = await importVerifiedBatch({
      databasePath: publicPath,
      inputPath: VERIFIED_INPUT,
      expectedSha256: VERIFIED_INPUT_SHA256,
      importerRevision: "career-verified-batch-importer-1.0.0",
      idempotencyKey: "public-import-smoke-2026-08-25",
    });

    const smokeKey = Buffer.alloc(32, 0x5a);
    let store = new MaterialAnalysisStore(privatePath, smokeKey);
    const saved = store.saveMaterialVersion({
      tenantId: "tenant-smoke",
      accountId: "account-smoke",
      materialId: "material-smoke",
      body,
      storageScope: "private_user",
      metadata: {
        sourceChannel: "user_input",
        contentType: "project_record",
        title: "受控数据 smoke",
        locale: "zh-CN",
        timezone: "Asia/Shanghai",
      },
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: true,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "save-material-smoke-0001",
    });
    const suggestion = store.classifyMaterial({
      tenantId: "tenant-smoke",
      accountId: "account-smoke",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      idempotencyKey: "classify-material-smoke-0001",
    });
    const decision = store.confirmClassification({
      tenantId: "tenant-smoke",
      accountId: "account-smoke",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      sourceChannel: suggestion.sourceChannel,
      contentType: suggestion.contentType,
      expectedBaseRevision: 0,
      reason: "controlled smoke confirmation",
    });
    const analysis = store.analyzeMaterial({
      tenantId: "tenant-smoke",
      accountId: "account-smoke",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      classificationDecisionId: decision.decisionId,
      publicSnapshot: {
        snapshotId: snapshot.snapshotId,
        manifestSha256: snapshot.manifestSha256,
      },
      idempotencyKey: "analyze-material-smoke-0001",
    });
    store.close();

    store = new MaterialAnalysisStore(privatePath, Buffer.alloc(32, 0x5a));
    const restarted = store.getMaterialVersion(
      "tenant-smoke",
      "account-smoke",
      saved.versionId,
    );
    const history = store.getHistory(
      "tenant-smoke",
      "account-smoke",
      saved.materialId,
    );
    const histories = store.listHistories("tenant-smoke", "account-smoke");
    store.close();

    const privateCounts = readCounts(privatePath, [
      "materials",
      "material_versions",
      "material_rights_receipts",
      "classification_suggestions",
      "classification_decision_revisions",
      "analysis_revisions",
      "analysis_findings",
      "analysis_evidence",
      "sync_changes",
    ]);
    const publicCounts = readCounts(publicPath, [
      "import_batches",
      "public_events",
      "public_event_revisions",
      "public_evidence",
      "public_snapshots",
      "public_snapshot_items",
      "public_snapshot_pointers",
    ]);
    const report = {
      schemaHeads: Object.fromEntries(
        migrationResults.map((result) => [result.mode, result.schemaVersion]),
      ),
      privateCounts,
      publicCounts,
      restart: {
        exactBodyRestored: restarted.body === body,
        versionCount: history.versions.length,
        classificationRevisionCount: history.classifications.length,
        analysisRevisionCount: history.analyses.length,
        accountHistoryCount: histories.length,
      },
      analysis: {
        status: analysis.status,
        findingCount: analysis.findings.length,
        evidenceCount: analysis.findings.filter((finding) => finding.evidence !== null)
          .length,
        structuredResultDiffersFromRawBody: analysis.summary.headline !== body,
        ruleBundleVersion: analysis.ruleBundleVersion,
      },
      publicSnapshot: {
        recordCount: snapshot.recordCount,
        technologyCount: snapshot.technologyCount,
        recruitmentCount: snapshot.recruitmentCount,
        mainlandChinaRecruitmentCount: snapshot.mainlandChinaRecruitmentCount,
        runtimeEnabled: snapshot.runtimeEnabled,
        liveConnectors: snapshot.liveConnectors,
      },
      sideEffects: {
        networkRequests: 0,
        deleteOperations: 0,
        committedDatabaseFiles: 0,
      },
    };
    if (
      restarted.body !== body ||
      history.versions.length !== 1 ||
      history.analyses.length !== 1 ||
      histories.length !== 1 ||
      snapshot.recordCount !== 8 ||
      analysis.summary.headline === body
    ) {
      throw new Error("Career data smoke invariants failed");
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await rm(dataRoot, { force: true, recursive: true });
  }
}

function requireDatabasePath(
  databaseByMode: ReadonlyMap<string, string>,
  mode: string,
): string {
  const databasePath = databaseByMode.get(mode);
  if (databasePath === undefined) {
    throw new Error(`migration result missing for ${mode}`);
  }
  return databasePath;
}

function readCounts(
  databasePath: string,
  tables: readonly string[],
): Readonly<Record<string, number>> {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    return Object.freeze(
      Object.fromEntries(
        tables.map((table) => {
          if (!/^[a-z_]+$/u.test(table)) {
            throw new Error("smoke table name is not allowlisted");
          }
          const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
            readonly count: number;
          };
          return [table, row.count];
        }),
      ),
    );
  } finally {
    database.close();
  }
}

void main();
