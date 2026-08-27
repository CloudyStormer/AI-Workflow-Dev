import path from "node:path";

const LOOPBACK_HOST = "127.0.0.1" as const;
const APPROVED_CORS_ORIGINS = Object.freeze([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4174",
] as const);

export interface ServerConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly dataDir: string;
  readonly corsOrigins: readonly string[];
  readonly sourceTimeoutMs: number;
  readonly sourceRetries: number;
}

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function requireValue(
  environment: NodeJS.ProcessEnv,
  name:
    | "AMR_API_HOST"
    | "AMR_API_PORT"
    | "AMR_DATA_DIR"
    | "AMR_CORS_ORIGINS"
    | "AMR_SOURCE_TIMEOUT_MS"
    | "AMR_SOURCE_RETRIES",
): string {
  const value = environment[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new ConfigurationError(`${name} must be set explicitly`);
  }

  return value;
}

export function readServerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  const host = requireValue(environment, "AMR_API_HOST");
  if (host !== LOOPBACK_HOST) {
    throw new ConfigurationError(
      `AMR_API_HOST must be ${LOOPBACK_HOST}; non-loopback binding is not approved`,
    );
  }

  const rawPort = requireValue(environment, "AMR_API_PORT");
  if (!/^\d{1,5}$/.test(rawPort)) {
    throw new ConfigurationError("AMR_API_PORT must be an integer from 1 to 65535");
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError("AMR_API_PORT must be an integer from 1 to 65535");
  }

  const dataDir = path.resolve(requireValue(environment, "AMR_DATA_DIR"));
  const backendRoot = path.resolve(process.cwd());
  if (dataDir === backendRoot || !dataDir.startsWith(`${backendRoot}${path.sep}`)) {
    throw new ConfigurationError("AMR_DATA_DIR must be an absolute child of the backend directory");
  }

  const configuredOrigins = requireValue(environment, "AMR_CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");
  const uniqueOrigins = new Set(configuredOrigins);
  if (
    uniqueOrigins.size !== APPROVED_CORS_ORIGINS.length ||
    !APPROVED_CORS_ORIGINS.every((origin) => uniqueOrigins.has(origin))
  ) {
    throw new ConfigurationError(
      `AMR_CORS_ORIGINS must contain only ${APPROVED_CORS_ORIGINS.join(",")}`,
    );
  }

  const sourceTimeoutMs = parseBoundedInteger(
    requireValue(environment, "AMR_SOURCE_TIMEOUT_MS"),
    "AMR_SOURCE_TIMEOUT_MS",
    1_000,
    60_000,
  );
  const sourceRetries = parseBoundedInteger(
    requireValue(environment, "AMR_SOURCE_RETRIES"),
    "AMR_SOURCE_RETRIES",
    0,
    3,
  );

  return Object.freeze({
    host,
    port,
    dataDir,
    corsOrigins: APPROVED_CORS_ORIGINS,
    sourceTimeoutMs,
    sourceRetries,
  });
}

function parseBoundedInteger(
  value: string,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^\d+$/.test(value)) {
    throw new ConfigurationError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ConfigurationError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return parsed;
}
