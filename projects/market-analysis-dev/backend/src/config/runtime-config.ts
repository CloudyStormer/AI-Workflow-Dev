import { isAbsolute, normalize, parse } from "node:path";

export const LOOPBACK_HOST = "127.0.0.1" as const;
export const APPROVED_CORS_ORIGINS = Object.freeze([
  "http://127.0.0.1:4177",
  "http://127.0.0.1:5173",
] as const);

export interface RuntimeConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly dataDirectory: string;
  readonly corsOrigins: readonly string[];
  readonly tenantId: string;
  readonly accountId: string;
  readonly encryptionKeyHex: string;
}

export class RuntimeConfigError extends Error {
  override readonly name = "RuntimeConfigError";
}

export function resolveLoopbackPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === "") {
    throw new RuntimeConfigError("缺少 PORT；请显式提供 0 到 65535 之间的本地端口。");
  }

  if (!/^\d+$/.test(rawPort)) {
    throw new RuntimeConfigError("PORT 必须是 0 到 65535 之间的整数。");
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new RuntimeConfigError("PORT 必须是 0 到 65535 之间的整数。");
  }

  return port;
}

export function resolveDataDirectory(rawDirectory: string | undefined): string {
  if (rawDirectory === undefined || rawDirectory === "") {
    throw new RuntimeConfigError("缺少 DATA_DIR；请显式提供本地数据目录的绝对路径。");
  }

  if (rawDirectory.trim() !== rawDirectory || rawDirectory.includes("\0")) {
    throw new RuntimeConfigError("DATA_DIR 不能包含首尾空白或空字符。");
  }

  if (!isAbsolute(rawDirectory)) {
    throw new RuntimeConfigError("DATA_DIR 必须是绝对路径。");
  }

  const dataDirectory = normalize(rawDirectory);
  if (dataDirectory === parse(dataDirectory).root) {
    throw new RuntimeConfigError("DATA_DIR 不能指向文件系统根目录。");
  }

  return dataDirectory;
}

export function loadRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const configuredOrigins = requireValue(environment.CORS_ORIGINS, "CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  const uniqueOrigins = new Set(configuredOrigins);
  if (
    uniqueOrigins.size !== APPROVED_CORS_ORIGINS.length ||
    !APPROVED_CORS_ORIGINS.every((origin) => uniqueOrigins.has(origin))
  ) {
    throw new RuntimeConfigError(
      `CORS_ORIGINS 必须且只能包含 ${APPROVED_CORS_ORIGINS.join(",")}`,
    );
  }
  const tenantId = requireIdentifier(environment.LOCAL_TENANT_ID, "LOCAL_TENANT_ID");
  const accountId = requireIdentifier(environment.LOCAL_ACCOUNT_ID, "LOCAL_ACCOUNT_ID");
  const encryptionKeyHex = requireValue(
    environment.MATERIAL_ENCRYPTION_KEY_HEX,
    "MATERIAL_ENCRYPTION_KEY_HEX",
  );
  if (!/^[0-9a-f]{64}$/u.test(encryptionKeyHex)) {
    throw new RuntimeConfigError("MATERIAL_ENCRYPTION_KEY_HEX 必须是 32 字节的小写十六进制密钥。");
  }
  return Object.freeze({
    host: LOOPBACK_HOST,
    port: resolveLoopbackPort(environment.PORT),
    dataDirectory: resolveDataDirectory(environment.DATA_DIR),
    corsOrigins: APPROVED_CORS_ORIGINS,
    tenantId,
    accountId,
    encryptionKeyHex,
  });
}

function requireValue(value: string | undefined, name: string): string {
  if (value === undefined || value === "" || value.trim() !== value) {
    throw new RuntimeConfigError(`缺少或无效的 ${name}；必须显式提供。`);
  }
  return value;
}

function requireIdentifier(value: string | undefined, name: string): string {
  const identifier = requireValue(value, name);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/u.test(identifier)) {
    throw new RuntimeConfigError(`${name} 格式无效。`);
  }
  return identifier;
}
