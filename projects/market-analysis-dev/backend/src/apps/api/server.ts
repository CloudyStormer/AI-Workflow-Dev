import { buildApiApp } from "./app";

export const LOOPBACK_HOST = "127.0.0.1";

export function resolveLoopbackPort(rawPort: string | undefined): number {
  if (rawPort === undefined || rawPort === "") {
    return 0;
  }

  if (!/^\d+$/.test(rawPort)) {
    throw new Error("PORT 必须是 0 到 65535 之间的整数。");
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT 必须是 0 到 65535 之间的整数。");
  }

  return port;
}

export async function startLoopbackServer(
  rawPort: string | undefined = process.env.PORT,
): Promise<string> {
  const app = await buildApiApp();
  return app.listen({ host: LOOPBACK_HOST, port: resolveLoopbackPort(rawPort) });
}
