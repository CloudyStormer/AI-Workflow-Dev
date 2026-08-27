import { describe, expect, it } from "vitest";

import { ConfigurationError, readServerConfig } from "../../src/config.js";

const VALID_ENV = {
  AMR_API_HOST: "127.0.0.1",
  AMR_API_PORT: "4317",
  AMR_DATA_DIR: `${process.cwd()}/.local-data-test`,
  AMR_CORS_ORIGINS: "http://127.0.0.1:5173,http://127.0.0.1:4174",
  AMR_SOURCE_TIMEOUT_MS: "12000",
  AMR_SOURCE_RETRIES: "2",
} as const;

describe("readServerConfig", () => {
  it("requires host and port to be provided explicitly", () => {
    expect(() => readServerConfig({})).toThrowError(ConfigurationError);
    expect(() => readServerConfig({ AMR_API_HOST: "127.0.0.1" })).toThrowError(
      "AMR_API_PORT must be set explicitly",
    );
  });

  it("accepts only the approved loopback host", () => {
    expect(() =>
      readServerConfig({ ...VALID_ENV, AMR_API_HOST: "0.0.0.0" }),
    ).toThrowError("non-loopback binding is not approved");
  });

  it.each(["0", "65536", "4317.5", "not-a-port"])(
    "rejects invalid port %s",
    (port) => {
      expect(() =>
        readServerConfig({ ...VALID_ENV, AMR_API_PORT: port }),
      ).toThrowError("AMR_API_PORT must be an integer from 1 to 65535");
    },
  );

  it("returns an immutable validated configuration", () => {
    const config = readServerConfig(VALID_ENV);

    expect(config).toEqual({
      host: "127.0.0.1",
      port: 4317,
      dataDir: `${process.cwd()}/.local-data-test`,
      corsOrigins: ["http://127.0.0.1:5173", "http://127.0.0.1:4174"],
      sourceTimeoutMs: 12_000,
      sourceRetries: 2,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("rejects data outside the backend and non-loopback CORS", () => {
    expect(() => readServerConfig({ ...VALID_ENV, AMR_DATA_DIR: "/tmp/radar" })).toThrowError(
      "must be an absolute child",
    );
    expect(() =>
      readServerConfig({ ...VALID_ENV, AMR_CORS_ORIGINS: "http://127.0.0.1:5173,*" }),
    ).toThrowError("must contain only");
    expect(() =>
      readServerConfig({ ...VALID_ENV, AMR_CORS_ORIGINS: "http://127.0.0.1:4174" }),
    ).toThrowError("must contain only");
  });
});
