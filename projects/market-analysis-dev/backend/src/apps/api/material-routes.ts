import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import type { PublicSnapshotRecord } from "../../infrastructure/sqlite/public/verified-batch-importer";
import type { MaterialMetadata } from "../../contracts/material-analysis";
import { MaterialAnalysisService } from "../../modules/material-analysis/material-analysis-service";
import { HttpContractError } from "./http-error";

const identifier = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u);
const metadataSchema = z
  .object({
    sourceChannel: z.string().max(100).optional(),
    contentType: z.string().max(100).optional(),
    title: z.string().max(500).optional(),
    userProvidedUrl: z.string().max(2_000).optional(),
    locale: z.string().max(32).optional(),
    timezone: z.string().max(64).optional(),
  })
  .catchall(z.string().max(2_000).optional());
const saveSchema = z
  .object({
    materialId: identifier,
    body: z.string(),
    storageScope: z.enum(["private_user", "ephemeral_user"]),
    metadata: metadataSchema,
    rightsConfirmation: z
      .object({
        userHasRights: z.literal(true),
        sensitiveDataAcknowledged: z.boolean(),
        policyRevision: identifier,
      })
      .strict(),
    idempotencyKey: z.string().optional(),
  })
  .strict();
const classifySchema = z
  .object({
    materialId: identifier.optional(),
    materialVersionId: identifier,
    idempotencyKey: z.string().optional(),
  })
  .strict();
const confirmationSchema = z
  .object({
    materialId: identifier.optional(),
    materialVersionId: identifier,
    sourceChannel: z.string().min(1).max(100),
    contentType: z.string().min(1).max(100),
    expectedBaseRevision: z.number().int().min(0),
    reason: z.string().min(1).max(500),
  })
  .strict();
const analysisSchema = z
  .object({
    materialId: identifier.optional(),
    materialVersionId: identifier,
    classificationDecisionId: identifier,
    idempotencyKey: z.string().optional(),
    publicSnapshot: z
      .object({ snapshotId: identifier, manifestSha256: z.string().regex(/^[0-9a-f]{64}$/u) })
      .strict()
      .optional(),
  })
  .strict();

export async function registerMaterialRoutes(
  app: FastifyInstance,
  service: MaterialAnalysisService,
  publicSnapshot: PublicSnapshotRecord,
  allowedOrigins: readonly string[],
): Promise<void> {
  app.post(
    "/api/v1/materials",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      requireMutationOrigin(request, allowedOrigins);
      const body = saveSchema.parse(request.body);
      const result = service.save(
        {
          materialId: body.materialId,
          body: body.body,
          storageScope: body.storageScope,
          metadata: compactMetadata(body.metadata),
          rightsConfirmation: body.rightsConfirmation,
        },
        requireIdempotencyKey(request),
      );
      const { body: _privateBody, ...safeResult } = result;
      return reply.code(result.versionNo === 1 ? 201 : 200).send(success(request.id, safeResult));
    },
  );

  app.get<{ Params: { materialId: string; versionId: string } }>(
    "/api/v1/materials/:materialId/versions/:versionId",
    async (request) => {
      identifier.parse(request.params.materialId);
      const versionId = identifier.parse(request.params.versionId);
      const version = service.version(versionId);
      if (version.materialId !== request.params.materialId) {
        throw new HttpContractError("MATERIAL_VERSION_NOT_FOUND", "未找到指定材料版本。", 404);
      }
      return success(request.id, version);
    },
  );

  app.get<{ Params: { materialId: string } }>(
    "/api/v1/materials/:materialId/versions",
    async (request) => success(request.id, service.history(identifier.parse(request.params.materialId))),
  );
  app.get<{ Querystring: { materialId?: string } }>("/api/v1/history", async (request) => {
    const materialId = request.query.materialId;
    return success(
      request.id,
      materialId === undefined ? service.histories() : [service.history(identifier.parse(materialId))],
    );
  });

  app.post<{ Params: { materialAction: string } }>(
    "/api/v1/materials/:materialAction",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request) => {
      requireMutationOrigin(request, allowedOrigins);
      const action = parseMaterialAction(request.params.materialAction);
      if (action.action === "classify") {
        const body = classifySchema.parse(request.body);
        requireMatchingMaterialId(action.materialId, body.materialId);
        return success(
          request.id,
          service.classify(
            { materialId: action.materialId, materialVersionId: body.materialVersionId },
            requireIdempotencyKey(request),
          ),
        );
      }
      const body = analysisSchema.parse(request.body);
      requireMatchingMaterialId(action.materialId, body.materialId);
      return success(
        request.id,
        service.analyze(
          {
            materialId: action.materialId,
            materialVersionId: body.materialVersionId,
            classificationDecisionId: body.classificationDecisionId,
            ...(body.publicSnapshot === undefined ? {} : { publicSnapshot: body.publicSnapshot }),
          },
          requireIdempotencyKey(request),
        ),
      );
    },
  );

  app.patch<{ Params: { materialId: string } }>(
    "/api/v1/materials/:materialId/classification",
    async (request) => {
      requireMutationOrigin(request, allowedOrigins);
      const materialId = identifier.parse(request.params.materialId);
      const body = confirmationSchema.parse(request.body);
      requireMatchingMaterialId(materialId, body.materialId);
      const expectedRevision = requireIfMatch(request);
      if (expectedRevision !== body.expectedBaseRevision) {
        throw new HttpContractError("REVISION_CONFLICT", "If-Match 与基础修订号不一致。", 409);
      }
      return success(request.id, service.confirm({ ...body, materialId }));
    },
  );

  app.get<{ Params: { materialId: string; analysisRevisionId: string } }>(
    "/api/v1/materials/:materialId/analyses/:analysisRevisionId",
    async (request) =>
      success(
        request.id,
        service.analysis(
          identifier.parse(request.params.materialId),
          identifier.parse(request.params.analysisRevisionId),
        ),
      ),
  );

  app.get("/api/v1/research/snapshots/current", async (request) =>
    success(request.id, publicSnapshot),
  );
}

function success<T>(requestId: string, data: T) {
  return {
    schema_version: 1,
    project_id: "market-analysis-dev",
    request_id: requestId,
    status: "ok",
    data,
    errors: [],
    timestamp: Date.now(),
  } as const;
}

function requireMutationOrigin(request: FastifyRequest, allowedOrigins: readonly string[]): void {
  const origin = request.headers.origin;
  if (typeof origin !== "string" || !allowedOrigins.includes(origin)) {
    throw new HttpContractError("ORIGIN_NOT_ALLOWED", "请求来源不在本地精确白名单中。", 403);
  }
}

function requireIdempotencyKey(request: FastifyRequest): string {
  const key = request.headers["idempotency-key"];
  if (
    typeof key !== "string" ||
    key.length < 8 ||
    key.length > 200 ||
    Array.from(key).some((character) => (character.codePointAt(0) ?? 0) < 0x20)
  ) {
    throw new HttpContractError("IDEMPOTENCY_KEY_REQUIRED", "必须提供 8–200 字符的幂等键。", 400);
  }
  return key;
}

function requireIfMatch(request: FastifyRequest): number {
  const value = request.headers["if-match"];
  if (typeof value !== "string" || !/^\d+$/u.test(value)) {
    throw new HttpContractError("IF_MATCH_REQUIRED", "分类确认必须提供当前修订号。", 428);
  }
  return Number(value);
}

function requireMatchingMaterialId(pathId: string, bodyId: string | undefined): void {
  if (bodyId !== undefined && bodyId !== pathId) {
    throw new HttpContractError("MATERIAL_NOT_FOUND", "路径与请求体材料标识不一致。", 404);
  }
}

function parseMaterialAction(value: string): {
  readonly materialId: string;
  readonly action: "classify" | "analyze";
} {
  const separator = value.lastIndexOf(":");
  if (separator <= 0) {
    throw new HttpContractError("ROUTE_NOT_FOUND", "未知材料操作。", 404);
  }
  const materialId = identifier.parse(value.slice(0, separator));
  const action = value.slice(separator + 1);
  if (action !== "classify" && action !== "analyze") {
    throw new HttpContractError("ROUTE_NOT_FOUND", "未知材料操作。", 404);
  }
  return { materialId, action };
}

function compactMetadata(metadata: Readonly<Record<string, string | undefined>>): MaterialMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ) as MaterialMetadata;
}
