import { isAbsolute, normalize, parse } from "node:path";

export const LOOPBACK_HOST = "127.0.0.1" as const;

export interface RuntimeConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly dataDirectory: string;
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
  return Object.freeze({
    host: LOOPBACK_HOST,
    port: resolveLoopbackPort(environment.PORT),
    dataDirectory: resolveDataDirectory(environment.DATA_DIR),
  });
}
