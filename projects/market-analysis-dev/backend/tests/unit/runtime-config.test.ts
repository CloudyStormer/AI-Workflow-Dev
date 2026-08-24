import { describe, expect, it } from "vitest";

import {
  loadRuntimeConfig,
  resolveDataDirectory,
  resolveLoopbackPort,
  RuntimeConfigError,
} from "../../src/config/runtime-config";

describe("runtime configuration", () => {
  it("requires explicit local port and data directory values", () => {
    expect(() => loadRuntimeConfig({})).toThrow(RuntimeConfigError);
    expect(() => loadRuntimeConfig({ DATA_DIR: "/tmp/career-radar" })).toThrow(
      "缺少 PORT",
    );
    expect(() => loadRuntimeConfig({ PORT: "4178" })).toThrow("缺少 DATA_DIR");
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
    const config = loadRuntimeConfig({
      PORT: "4178",
      DATA_DIR: "/tmp/career-radar-data",
    });

    expect(config).toEqual({
      host: "127.0.0.1",
      port: 4178,
      dataDirectory: "/tmp/career-radar-data",
    });
    expect(Object.isFrozen(config)).toBe(true);
  });
});
