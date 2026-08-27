import { describe, expect, it } from "vitest";

import { ConfigurationError, readServerConfig } from "../../src/config.js";

describe("readServerConfig", () => {
  it("requires host and port to be provided explicitly", () => {
    expect(() => readServerConfig({})).toThrowError(ConfigurationError);
    expect(() => readServerConfig({ AMR_API_HOST: "127.0.0.1" })).toThrowError(
      "AMR_API_PORT must be set explicitly",
    );
  });

  it("accepts only the approved loopback host", () => {
    expect(() =>
      readServerConfig({ AMR_API_HOST: "0.0.0.0", AMR_API_PORT: "4317" }),
    ).toThrowError("non-loopback binding is not approved");
  });

  it.each(["0", "65536", "4317.5", "not-a-port"])(
    "rejects invalid port %s",
    (port) => {
      expect(() =>
        readServerConfig({ AMR_API_HOST: "127.0.0.1", AMR_API_PORT: port }),
      ).toThrowError("AMR_API_PORT must be an integer from 1 to 65535");
    },
  );

  it("returns an immutable validated configuration", () => {
    const config = readServerConfig({
      AMR_API_HOST: "127.0.0.1",
      AMR_API_PORT: "4317",
    });

    expect(config).toEqual({ host: "127.0.0.1", port: 4317 });
    expect(Object.isFrozen(config)).toBe(true);
  });
});
