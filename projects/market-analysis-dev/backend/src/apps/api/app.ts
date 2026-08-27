import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { MaterialAnalysisContractError } from "../../contracts/material-analysis";
import { HealthService } from "../../modules/health/application/health-service";
import { registerHealthRoutes } from "../../modules/health/delivery/http-routes";
import { MaterialAnalysisService } from "../../modules/material-analysis/material-analysis-service";
import type { CareerRuntime } from "../../runtime/career-runtime";
import { HttpContractError } from "./http-error";
import { registerMaterialRoutes } from "./material-routes";

export interface BuildApiAppOptions {
  readonly runtime?: CareerRuntime;
  readonly tenantId?: string;
  readonly accountId?: string;
  readonly corsOrigins?: readonly string[];
  readonly logger?: boolean;
}

export async function buildApiApp(options: BuildApiAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, requestIdHeader: "x-request-id" });
  const healthService = new HealthService(options.runtime !== undefined);

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("cache-control", "private, no-store");
    return payload;
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  if (options.corsOrigins !== undefined) {
    await app.register(cors, {
      origin: [...options.corsOrigins],
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["content-type", "idempotency-key", "if-match", "x-request-id"],
      exposedHeaders: ["x-request-id"],
      credentials: false,
    });
  }

  app.setErrorHandler(async (error, request, reply) => {
    const mapped = mapError(error);
    request.log.warn({ code: mapped.code, requestId: request.id }, "request rejected");
    return reply.code(mapped.statusCode).send({
      schema_version: 1,
      project_id: "market-analysis-dev",
      request_id: request.id,
      status: "failed",
      data: null,
      errors: [
        {
          code: mapped.code,
          message_zh_cn: mapped.message,
          retryable: mapped.retryable,
        },
      ],
      timestamp: Date.now(),
    });
  });
  app.setNotFoundHandler(async (request, reply) =>
    reply.code(404).send({
      schema_version: 1,
      project_id: "market-analysis-dev",
      request_id: request.id,
      status: "failed",
      data: null,
      errors: [{ code: "ROUTE_NOT_FOUND", message_zh_cn: "未找到请求的本地 API。", retryable: false }],
      timestamp: Date.now(),
    }),
  );

  await registerHealthRoutes(app, healthService);
  if (
    options.runtime !== undefined &&
    options.tenantId !== undefined &&
    options.accountId !== undefined &&
    options.corsOrigins !== undefined
  ) {
    await registerMaterialRoutes(
      app,
      new MaterialAnalysisService(options.runtime.store, options.tenantId, options.accountId),
      options.runtime.publicSnapshot,
      options.corsOrigins,
    );
    app.addHook("onClose", async () => {
      options.runtime?.close();
    });
  }
  return app;
}

function mapError(error: unknown): {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly retryable: boolean;
} {
  if (error instanceof HttpContractError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      retryable: error.retryable,
    };
  }
  if (error instanceof ZodError) {
    return { code: "VALIDATION_ERROR", message: "请求字段不符合接口契约。", statusCode: 422, retryable: false };
  }
  const normalized = error instanceof Error ? error : new Error("unknown request failure");
  const code =
    error instanceof MaterialAnalysisContractError
      ? error.code
      : "code" in normalized && typeof normalized.code === "string"
        ? normalized.code
        : "INTERNAL_ERROR";
  const statusByCode: Readonly<Record<string, number>> = {
    EMPTY_INPUT: 422,
    INPUT_TOO_LARGE: 413,
    INVALID_UNICODE: 422,
    URL_ONLY_INPUT: 422,
    RIGHTS_CONFIRMATION_REQUIRED: 422,
    IDEMPOTENCY_KEY_REUSED: 409,
    MATERIAL_NOT_FOUND: 404,
    MATERIAL_VERSION_NOT_FOUND: 404,
    REVISION_CONFLICT: 409,
    CLASSIFICATION_REQUIRED: 409,
    HISTORICAL_REFERENCE_MISMATCH: 409,
    STORAGE_NOT_READY: 503,
  };
  const statusCode = statusByCode[code] ?? ("statusCode" in normalized && typeof normalized.statusCode === "number" ? normalized.statusCode : 500);
  return {
    code,
    message: messageFor(code),
    statusCode,
    retryable: statusCode >= 500,
  };
}

function messageFor(code: string): string {
  const messages: Readonly<Record<string, string>> = {
    EMPTY_INPUT: "材料正文不能为空。",
    INPUT_TOO_LARGE: "材料正文超过 100000 个 Unicode 字符。",
    INVALID_UNICODE: "材料正文包含无效 Unicode。",
    URL_ONLY_INPUT: "只提供网址不会触发抓取；请粘贴有权处理的正文。",
    RIGHTS_CONFIRMATION_REQUIRED: "保存前必须明确确认内容处理权利。",
    IDEMPOTENCY_KEY_REUSED: "幂等键已用于不同请求内容。",
    MATERIAL_NOT_FOUND: "未找到当前本地账户的材料。",
    MATERIAL_VERSION_NOT_FOUND: "未找到当前本地账户的材料版本。",
    REVISION_CONFLICT: "分类修订已变化，请刷新后重试。",
    CLASSIFICATION_REQUIRED: "分析需要该材料版本的明确分类确认。",
    HISTORICAL_REFERENCE_MISMATCH: "历史版本或快照引用不匹配。",
    STORAGE_NOT_READY: "本地私有存储尚未就绪。",
    INTERNAL_ERROR: "本地服务处理失败，未返回敏感细节。",
  };
  return messages[code] ?? "请求未完成。";
}
