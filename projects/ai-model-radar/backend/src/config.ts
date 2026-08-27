const LOOPBACK_HOST = "127.0.0.1" as const;

export interface ServerConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
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
  name: "AMR_API_HOST" | "AMR_API_PORT",
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

  return Object.freeze({ host, port });
}
