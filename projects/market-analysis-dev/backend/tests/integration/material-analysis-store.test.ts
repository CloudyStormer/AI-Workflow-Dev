import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { MaterialAnalysisContractError } from "../../src/contracts/material-analysis";
import { MaterialAnalysisStore } from "../../src/infrastructure/sqlite/materials/material-analysis-store";
import { applyMigrationStream } from "../../src/infrastructure/sqlite/migrations/runtime";

const MIGRATIONS_ROOT = resolve(process.cwd(), "migrations");
const temporaryDirectories: string[] = [];
const encryptionKey = Buffer.alloc(32, 0x5a);
const body =
  "我在电商项目中负责使用 React、TypeScript 和 Vite 构建前端系统，使用 Playwright 自动化测试，优化首屏性能提升 35%，并完成组件库上线。";

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("Career private material and deterministic analysis smoke", () => {
  it("persists encrypted material, survives restart, and returns versioned structured analysis", async () => {
    const { dataRoot, databasePath } = await migratedPrivateDatabase();
    let store = new MaterialAnalysisStore(databasePath, encryptionKey);
    const saved = store.saveMaterialVersion({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: "material-smoke-001",
      body,
      storageScope: "private_user",
      metadata: {
        sourceChannel: "user_input",
        contentType: "project_record",
        title: "前端项目经历",
        locale: "zh-CN",
        timezone: "Asia/Shanghai",
      },
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: true,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "save-smoke-0001",
    });
    expect(saved).toMatchObject({
      materialId: "material-smoke-001",
      versionNo: 1,
      body,
      unicodeCount: Array.from(body).length,
    });

    const replayedSave = store.saveMaterialVersion({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: "material-smoke-001",
      body,
      storageScope: "private_user",
      metadata: {
        sourceChannel: "user_input",
        contentType: "project_record",
        title: "前端项目经历",
        locale: "zh-CN",
        timezone: "Asia/Shanghai",
      },
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: true,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "save-smoke-0001",
    });
    expect(replayedSave.versionId).toBe(saved.versionId);

    const suggestion = store.classifyMaterial({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      idempotencyKey: "classify-smoke-0001",
    });
    expect(suggestion).toMatchObject({
      contentType: "project_record",
      status: "awaiting_confirmation",
    });
    const decision = store.confirmClassification({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      sourceChannel: suggestion.sourceChannel,
      contentType: suggestion.contentType,
      expectedBaseRevision: 0,
      reason: "smoke fixture confirms both axes",
    });
    const analysis = store.analyzeMaterial({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      classificationDecisionId: decision.decisionId,
      idempotencyKey: "analyze-smoke-0001",
    });
    expect(analysis.summary.headline).not.toContain(body);
    expect(analysis.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "framework", label: "React", factLayer: "user-stated" }),
        expect.objectContaining({ kind: "skill", label: "TypeScript", factLayer: "user-stated" }),
        expect.objectContaining({ kind: "tool", label: "Vite", factLayer: "user-stated" }),
        expect.objectContaining({ kind: "tool", label: "Playwright", factLayer: "user-stated" }),
        expect.objectContaining({ kind: "skill", factLayer: "system-inference" }),
        expect.objectContaining({ kind: "outcome", factLayer: "user-stated" }),
      ]),
    );
    const reactFinding = analysis.findings.find((finding) => finding.label === "React");
    expect(reactFinding?.evidence).toMatchObject({
      snippet: "React",
      relation: "supports",
    });
    expect(
      Array.from(body).slice(
        reactFinding?.evidence?.startCodepoint,
        reactFinding?.evidence?.endCodepoint,
      ).join(""),
    ).toBe("React");

    const replayedAnalysis = store.analyzeMaterial({
      tenantId: "tenant-local",
      accountId: "account-local",
      materialId: saved.materialId,
      materialVersionId: saved.versionId,
      classificationDecisionId: decision.decisionId,
      idempotencyKey: "analyze-smoke-0001",
    });
    expect(replayedAnalysis.analysisRevisionId).toBe(analysis.analysisRevisionId);
    store.close();

    const databaseBytes = await readFile(databasePath);
    expect(databaseBytes.includes(Buffer.from(body, "utf8"))).toBe(false);
    store = new MaterialAnalysisStore(databasePath, encryptionKey);
    const afterRestart = store.getMaterialVersion(
      "tenant-local",
      "account-local",
      saved.versionId,
    );
    expect(afterRestart.body).toBe(body);
    const history = store.getHistory("tenant-local", "account-local", saved.materialId);
    expect(history).toMatchObject({
      currentVersionNo: 1,
      currentClassificationRevision: 1,
      currentAnalysisRevision: 1,
    });
    expect(history.versions).toHaveLength(1);
    expect(history.classifications).toHaveLength(1);
    expect(history.analyses).toHaveLength(1);
    expect(history.analyses[0]?.resultSha256).toBe(analysis.resultSha256);
    expect(JSON.stringify(history)).not.toContain(body);
    const listed = store.listHistories("tenant-local", "account-local");
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(history);
    expect(Object.isFrozen(listed)).toBe(true);
    expect(store.listHistories("tenant-local", "another-account")).toEqual([]);

    expect(() =>
      store.getMaterialVersion("other-tenant", "account-local", saved.versionId),
    ).toThrow(MaterialAnalysisContractError);
    store.close();

    const counts = countPrivateRecords(databasePath);
    expect(counts).toMatchObject({
      materials: 1,
      materialVersions: 1,
      classificationDecisions: 1,
      analysisRevisions: 1,
    });
    expect(counts.findings).toBeGreaterThanOrEqual(6);
    expect(counts.evidence).toBeGreaterThanOrEqual(5);
    expect(dataRoot).not.toContain("projects/market-analysis-dev");
  });

  it("keeps new versions and analysis revisions append-only", async () => {
    const { databasePath } = await migratedPrivateDatabase();
    const store = new MaterialAnalysisStore(databasePath, encryptionKey);
    const first = store.saveMaterialVersion({
      tenantId: "tenant-history",
      accountId: "account-history",
      materialId: "material-history-001",
      body: "我负责使用 Vue 和 TypeScript 开发管理平台。",
      storageScope: "private_user",
      metadata: {},
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: false,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "save-history-0001",
    });
    const second = store.saveMaterialVersion({
      tenantId: "tenant-history",
      accountId: "account-history",
      materialId: "material-history-001",
      body: "我主导使用 Vue、TypeScript 和 Vitest 开发管理平台，并完成性能优化。",
      storageScope: "private_user",
      metadata: {},
      rightsConfirmation: {
        userHasRights: true,
        sensitiveDataAcknowledged: false,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "save-history-0002",
    });
    expect(second.versionNo).toBe(2);
    expect(second.versionId).not.toBe(first.versionId);
    const suggestion = store.classifyMaterial({
      tenantId: "tenant-history",
      accountId: "account-history",
      materialId: second.materialId,
      materialVersionId: second.versionId,
      idempotencyKey: "classify-history-0002",
    });
    const decision = store.confirmClassification({
      tenantId: "tenant-history",
      accountId: "account-history",
      materialId: second.materialId,
      materialVersionId: second.versionId,
      sourceChannel: suggestion.sourceChannel,
      contentType: suggestion.contentType,
      expectedBaseRevision: 0,
      reason: "confirmed for history test",
    });
    const analysis = store.analyzeMaterial({
      tenantId: "tenant-history",
      accountId: "account-history",
      materialId: second.materialId,
      materialVersionId: second.versionId,
      classificationDecisionId: decision.decisionId,
      idempotencyKey: "analyze-history-0002",
    });
    expect(analysis.materialVersionId).toBe(second.versionId);
    expect(store.getHistory("tenant-history", "account-history", second.materialId).versions).toHaveLength(2);
    store.close();

    const database = new DatabaseSync(databasePath);
    try {
      expect(() =>
        database
          .prepare("UPDATE material_versions SET version_no = 99 WHERE version_id = ?")
          .run(first.versionId),
      ).toThrow("immutable");
      expect(() =>
        database
          .prepare("UPDATE analysis_revisions SET revision_no = 99 WHERE analysis_revision_id = ?")
          .run(analysis.analysisRevisionId),
      ).toThrow("immutable");
    } finally {
      database.close();
    }
  });

  it("fails closed on invalid content and idempotency drift", async () => {
    const { databasePath } = await migratedPrivateDatabase();
    const store = new MaterialAnalysisStore(databasePath, encryptionKey);
    const base = {
      tenantId: "tenant-negative",
      accountId: "account-negative",
      materialId: "material-negative-001",
      storageScope: "private_user" as const,
      metadata: {},
      rightsConfirmation: {
        userHasRights: true as const,
        sensitiveDataAcknowledged: false,
        policyRevision: "career-private-rights-1.0.0",
      },
      idempotencyKey: "negative-save-0001",
    };
    expect(() => store.saveMaterialVersion({ ...base, body: "   " })).toThrow("empty");
    expect(() => store.saveMaterialVersion({ ...base, body: "https://example.com" })).toThrow("will not be fetched");
    expect(() => store.saveMaterialVersion({ ...base, body: "\ud800" })).toThrow("surrogate");
    store.saveMaterialVersion({ ...base, body: "第一版真实正文" });
    expect(() => store.saveMaterialVersion({ ...base, body: "漂移后的正文" })).toThrow(
      "different payload",
    );
    store.close();
  });
});

async function migratedPrivateDatabase() {
  const dataRoot = await mkdtemp(join(tmpdir(), "career-private-smoke-"));
  temporaryDirectories.push(dataRoot);
  const result = await applyMigrationStream({
    manifestPath: join(MIGRATIONS_ROOT, "private", "manifest.json"),
    dataRoot,
    mode: "private",
  });
  return { dataRoot, databasePath: result.databasePath };
}

function countPrivateRecords(databasePath: string) {
  const database = new DatabaseSync(databasePath);
  try {
    return {
      materials: count(database, "materials"),
      materialVersions: count(database, "material_versions"),
      classificationDecisions: count(database, "classification_decision_revisions"),
      analysisRevisions: count(database, "analysis_revisions"),
      findings: count(database, "analysis_findings"),
      evidence: count(database, "analysis_evidence"),
    };
  } finally {
    database.close();
  }
}

function count(database: DatabaseSync, table: string): number {
  const allowed = new Set([
    "materials",
    "material_versions",
    "classification_decision_revisions",
    "analysis_revisions",
    "analysis_findings",
    "analysis_evidence",
  ]);
  if (!allowed.has(table)) {
    throw new Error("test table is not allowlisted");
  }
  const row = database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
    readonly count: number;
  };
  return row.count;
}
