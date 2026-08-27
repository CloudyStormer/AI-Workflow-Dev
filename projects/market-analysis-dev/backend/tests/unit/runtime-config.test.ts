import { describe, expect, it } from "vitest";

import {
  loadRuntimeConfig,
  resolveDataDirectory,
  resolveLoopbackPort,
  RuntimeConfigError,
} from "../../src/config/runtime-config";

describe("runtime configuration", () => {
  const VALID_ENV = {
    PORT: "4318",
    DATA_DIR: "/tmp/career-radar-data",
    CORS_ORIGINS: "http://127.0.0.1:4177,http://127.0.0.1:5173",
    LOCAL_TENANT_ID: "local-career-owner",
    LOCAL_ACCOUNT_ID: "local-career-account",
    MATERIAL_ENCRYPTION_KEY_HEX: "5a".repeat(32),
  } as const;

  it("requires explicit local port and data directory values", () => {
    expect(() => loadRuntimeConfig({})).toThrow(RuntimeConfigError);
    expect(() => loadRuntimeConfig({ ...VALID_ENV, PORT: undefined })).toThrow(
      "缺少 PORT",
    );
    expect(() => loadRuntimeConfig({ ...VALID_ENV, DATA_DIR: undefined })).toThrow("缺少 DATA_DIR");
  });

  it("accepts an explicit ephemeral or fixed local port", () => {
    expect(resolveLoopbackPort("0")).toBe(0);
    expect(resolveLoopbackPort("4178")).toBe(4178);
    expect(resolveLoopbackPort("65535")).toBe(65535);
  });

  it.each(["-1", "1.5", " 4178", "4178 ", "65536", "not-a-port"])(
    "rejects invalid PORT=%s",
    (rawPort) => {
      expect(() => resolveLoopbackPort(rawPort)).toThrow(RuntimeConfigError);
    },
  );

  it("requires an unambiguous absolute data directory outside the filesystem root", () => {
    expect(resolveDataDirectory("/tmp/career-radar/../career-radar-data")).toBe(
      "/tmp/career-radar-data",
    );
    expect(() => resolveDataDirectory("var/career-radar")).toThrow("绝对路径");
    expect(() => resolveDataDirectory("/tmp/career-radar ")).toThrow("首尾空白");
    expect(() => resolveDataDirectory("/tmp/career\0radar")).toThrow("空字符");
    expect(() => resolveDataDirectory("/")).toThrow("文件系统根目录");
  });

  it("builds an immutable loopback-only runtime contract without touching the filesystem", () => {
    const config = loadRuntimeConfig(VALID_ENV);

    expect(config).toEqual({
      host: "127.0.0.1",
      port: 4318,
      dataDirectory: "/tmp/career-radar-data",
      corsOrigins: ["http://127.0.0.1:4177", "http://127.0.0.1:5173"],
      tenantId: "local-career-owner",
      accountId: "local-career-account",
      encryptionKeyHex: "5a".repeat(32),
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("fails closed on CORS expansion, incomplete identity, or invalid key material", () => {
    expect(() => loadRuntimeConfig({ ...VALID_ENV, CORS_ORIGINS: "*" })).toThrow(
      "必须且只能包含",
    );
    expect(() => loadRuntimeConfig({ ...VALID_ENV, LOCAL_ACCOUNT_ID: "" })).toThrow(
      "LOCAL_ACCOUNT_ID",
    );
    expect(() => loadRuntimeConfig({ ...VALID_ENV, MATERIAL_ENCRYPTION_KEY_HEX: "00" })).toThrow(
      "32 字节",
    );
  });
});
