import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildApiApp } from "../../src/apps/api/app";
import { loadRuntimeConfig } from "../../src/config/runtime-config";
import { initializeCareerRuntime } from "../../src/runtime/career-runtime";

const body =
  "我在真实个人项目记录中负责使用 React、TypeScript 与 Vite 构建前端系统，使用 Playwright 完成自动化测试，并将首屏性能提升 35%。";
const origins = ["http://127.0.0.1:4177", "http://127.0.0.1:5173"] as const;

describe("Career material HTTP API", () => {
  it("persists, restarts, classifies, analyzes, and returns isolated history", async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), "career-http-contract-"));
    const config = loadRuntimeConfig({
      PORT: "4318",
      DATA_DIR: dataDirectory,
      CORS_ORIGINS: origins.join(","),
      LOCAL_TENANT_ID: "local-career-owner",
      LOCAL_ACCOUNT_ID: "local-career-account",
      MATERIAL_ENCRYPTION_KEY_HEX: "5a".repeat(32),
    });
    let app = await createRuntimeApp(config);
    try {
      expect((await app.inject({ method: "GET", url: "/health/ready" })).statusCode).toBe(200);
      const save = await app.inject({
        method: "POST",
        url: "/api/v1/materials",
        headers: { origin: origins[0], "idempotency-key": "http-save-contract-0001" },
        payload: {
          materialId: "material-http-001",
          body,
          storageScope: "private_user",
          metadata: {
            sourceChannel: "user_input",
            contentType: "project_record",
            title: "真实前端项目记录",
            locale: "zh-CN",
            timezone: "Asia/Shanghai",
          },
          rightsConfirmation: {
            userHasRights: true,
            sensitiveDataAcknowledged: true,
            policyRevision: "career-private-rights-1.0.0",
          },
        },
      });
      expect(save.statusCode).toBe(201);
      expect(save.headers["access-control-allow-origin"]).toBe(origins[0]);
      const saved = save.json().data as { materialId: string; versionId: string; body?: string };
      expect(saved.body).toBeUndefined();

      await app.close();
      app = await createRuntimeApp(config);
      const version = await app.inject({
        method: "GET",
        url: `/api/v1/materials/${saved.materialId}/versions/${saved.versionId}`,
      });
      expect(version.statusCode).toBe(200);
      expect(version.json().data.body).toBe(body);

      const classify = await app.inject({
        method: "POST",
        url: `/api/v1/materials/${saved.materialId}:classify`,
        headers: { origin: origins[1], "idempotency-key": "http-classify-contract-0001" },
        payload: { materialVersionId: saved.versionId },
      });
      expect(classify.statusCode).toBe(200);
      const suggestion = classify.json().data as { sourceChannel: string; contentType: string };

      const confirmation = await app.inject({
        method: "PATCH",
        url: `/api/v1/materials/${saved.materialId}/classification`,
        headers: { origin: origins[0], "if-match": "0" },
        payload: {
          materialVersionId: saved.versionId,
          sourceChannel: suggestion.sourceChannel,
          contentType: suggestion.contentType,
          expectedBaseRevision: 0,
          reason: "用户确认真实材料分类",
        },
      });
      expect(confirmation.statusCode).toBe(200);
      const decision = confirmation.json().data as { decisionId: string };

      const analysis = await app.inject({
        method: "POST",
        url: `/api/v1/materials/${saved.materialId}:analyze`,
        headers: { origin: origins[0], "idempotency-key": "http-analyze-contract-0001" },
        payload: {
          materialVersionId: saved.versionId,
          classificationDecisionId: decision.decisionId,
        },
      });
      expect(analysis.statusCode).toBe(200);
      const analyzed = analysis.json().data as {
        analysisRevisionId: string;
        findings: readonly unknown[];
      };
      expect(analyzed.findings.length).toBeGreaterThanOrEqual(6);

      const histories = await app.inject({ method: "GET", url: "/api/v1/history" });
      expect(histories.json().data).toHaveLength(1);
      expect(histories.json().data[0]).toMatchObject({
        materialId: saved.materialId,
        currentVersionNo: 1,
        currentClassificationRevision: 1,
        currentAnalysisRevision: 1,
      });
      expect(JSON.stringify(histories.json())).not.toContain(body);
      const analysisRead = await app.inject({
        method: "GET",
        url: `/api/v1/materials/${saved.materialId}/analyses/${analyzed.analysisRevisionId}`,
      });
      expect(analysisRead.statusCode).toBe(200);

      const tenantOverride = await app.inject({
        method: "POST",
        url: "/api/v1/materials",
        headers: { origin: origins[0], "idempotency-key": "tenant-override-contract-0001" },
        payload: {
          tenantId: "other-tenant",
          materialId: "material-other-001",
          body: "不应写入的跨租户材料",
          storageScope: "private_user",
          metadata: {},
          rightsConfirmation: {
            userHasRights: true,
            sensitiveDataAcknowledged: true,
            policyRevision: "career-private-rights-1.0.0",
          },
        },
      });
      expect(tenantOverride.statusCode).toBe(422);
      expect(tenantOverride.json().errors[0].code).toBe("VALIDATION_ERROR");
      const wrongOrigin = await app.inject({
        method: "POST",
        url: `/api/v1/materials/${saved.materialId}:classify`,
        headers: { origin: "http://localhost:4177", "idempotency-key": "wrong-origin-0001" },
        payload: { materialVersionId: saved.versionId },
      });
      expect(wrongOrigin.statusCode).toBe(403);
    } finally {
      await app.close();
      await rm(dataDirectory, { recursive: true, force: true });
    }
  });
});

async function createRuntimeApp(config: ReturnType<typeof loadRuntimeConfig>) {
  const runtime = await initializeCareerRuntime(config);
  return buildApiApp({
    runtime,
    tenantId: config.tenantId,
    accountId: config.accountId,
    corsOrigins: config.corsOrigins,
  });
}
