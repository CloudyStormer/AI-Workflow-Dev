import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APPROVED_POLICY_BUNDLE_IDENTITY,
  canonicalizeJson,
  createSourcePolicyBundle,
  loadSourcePolicyBundleJson,
  recomputePolicyBundleSha256,
  serializeSourcePolicyBundle,
} from "./bundle.mjs";
import { PolicyRegistryError } from "./errors.mjs";
import { loadApprovedRegistry } from "./loader.mjs";

const registryUrl = new URL("../../../docs/00-source-registry.csv", import.meta.url);
const approvedBundleUrl = new URL("./bundle.approved.json", import.meta.url);
const generatedAt = "2026-08-24T17:03:14+08:00";

const loadRegistryText = () => readFile(registryUrl, "utf8");
const loadApprovedInput = async () => loadApprovedRegistry(await loadRegistryText());

function expectPolicyError(code, action) {
  assert.throws(action, (error) => error instanceof PolicyRegistryError && error.code === code);
}

async function expectPolicyErrorAsync(code, action) {
  await assert.rejects(action, (error) => error instanceof PolicyRegistryError && error.code === code);
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertDeepFrozen(nested);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

test("canonicalizes JSON with byte-sorted object keys and stable array order", () => {
  assert.equal(
    canonicalizeJson({ z: 1, a: { z: -0, a: true }, list: [3, 2, 1] }),
    '{"a":{"a":true,"z":0},"list":[3,2,1],"z":1}',
  );
});

test("creates the deterministic approved content-addressed policy bundle", async () => {
  const bundle = createSourcePolicyBundle(await loadApprovedInput(), { generatedAt });

  assert.deepEqual(
    Object.fromEntries(
      Object.keys(APPROVED_POLICY_BUNDLE_IDENTITY).map((key) => [key, bundle[key]]),
    ),
    APPROVED_POLICY_BUNDLE_IDENTITY,
  );
  assert.equal(bundle.approvalScope, "research-only");
  assert.equal(bundle.executionAuthorized, false);
  assert.equal(bundle.runtimeEnabled, false);
  assert.equal(bundle.endpoints.length, 29);
  assert.deepEqual(
    bundle.endpoints.map(({ sourceId }) => sourceId),
    [...bundle.endpoints.map(({ sourceId }) => sourceId)].sort(),
  );
  assert.equal(bundle.endpoints.some(({ sourceId }) => sourceId === "AIR-END-030"), false);
  assertDeepFrozen(bundle);
});

test("preserves every approved endpoint policy field without loss", async () => {
  const registry = await loadApprovedInput();
  const bundle = createSourcePolicyBundle(registry, { generatedAt });
  const originalById = new Map(registry.endpoints.map((endpoint) => [endpoint.sourceId, endpoint]));

  for (const endpoint of bundle.endpoints) {
    assert.deepEqual(endpoint, originalById.get(endpoint.sourceId));
    assert.equal(Object.keys(endpoint.approvedPolicyInput).length, 35);
  }
});

test("recomputes the same SHA and canonical bytes for identical approved inputs", async () => {
  const registry = await loadApprovedInput();
  const first = createSourcePolicyBundle(registry, { generatedAt });
  const second = createSourcePolicyBundle(registry, { generatedAt });

  assert.deepEqual(first, second);
  assert.equal(first.bundleSha256, recomputePolicyBundleSha256(first));
  assert.equal(serializeSourcePolicyBundle(first), serializeSourcePolicyBundle(second));

  const loaded = loadSourcePolicyBundleJson(serializeSourcePolicyBundle(first));
  assert.deepEqual(loaded, first);
  assertDeepFrozen(loaded);
});

test("materializes the approved bundle independently from the mutable CSV worktree", async () => {
  const expected = createSourcePolicyBundle(await loadApprovedInput(), { generatedAt });
  const serialized = (await readFile(approvedBundleUrl, "utf8")).trimEnd();
  const materialized = loadSourcePolicyBundleJson(serialized);

  assert.equal(serialized, serializeSourcePolicyBundle(expected));
  assert.deepEqual(materialized, expected);
  assert.equal(
    materialized.bundleSha256,
    "2c3005efa6b3397f1d085d5ed583bafcb99fc2c2d0849ac8455bded5f2ada2f8",
  );
  assertDeepFrozen(materialized);
});

test("rejects an empty endpoint set fail-closed", async () => {
  const registry = await loadApprovedInput();
  const empty = deepFreeze({ ...registry, endpoints: [], counts: { ...registry.counts } });

  expectPolicyError("POLICY_BUNDLE_ENDPOINTS_EMPTY", () =>
    createSourcePolicyBundle(empty, { generatedAt }),
  );
});

test("rejects an endpoint whose exact URL is empty", async () => {
  const registry = await loadApprovedInput();
  const endpoints = registry.endpoints.map((endpoint, index) =>
    index === 0 ? { ...endpoint, endpointUrl: "" } : endpoint,
  );
  const drifted = deepFreeze({ ...registry, endpoints });

  expectPolicyError("POLICY_BUNDLE_ENDPOINT_INVALID", () =>
    createSourcePolicyBundle(drifted, { generatedAt }),
  );
});

test("rejects endpoint policy content drift even when outer registry identity is copied", async () => {
  const registry = await loadApprovedInput();
  const endpoints = registry.endpoints.map((endpoint, index) =>
    index === 0
      ? {
          ...endpoint,
          approvedPolicyInput: {
            ...endpoint.approvedPolicyInput,
            rightsSummary: "drifted-rights-summary",
          },
        }
      : endpoint,
  );
  const drifted = deepFreeze({ ...registry, endpoints });

  expectPolicyError("POLICY_BUNDLE_IDENTITY_DRIFT", () =>
    createSourcePolicyBundle(drifted, { generatedAt }),
  );
});

test("rejects approval or source-commit identity drift", async () => {
  const bundle = createSourcePolicyBundle(await loadApprovedInput(), { generatedAt });
  const drifted = JSON.parse(JSON.stringify(bundle));
  drifted.approvalId = "approval-drift";

  expectPolicyError("POLICY_BUNDLE_IDENTITY_DRIFT", () =>
    loadSourcePolicyBundleJson(JSON.stringify(drifted)),
  );
  expectPolicyError("POLICY_BUNDLE_IDENTITY_DRIFT", () =>
    createSourcePolicyBundle(bundle, {
      generatedAt,
      generatedFromCommit: "mutable-latest",
    }),
  );
});

test("rejects mutable CSV or mutable registry objects as direct runtime switches", async () => {
  const registryText = await loadRegistryText();
  const mutableRegistry = JSON.parse(JSON.stringify(await loadApprovedInput()));

  expectPolicyError("MUTABLE_REGISTRY_INPUT_REJECTED", () =>
    createSourcePolicyBundle(registryText, { generatedAt }),
  );
  expectPolicyError("MUTABLE_REGISTRY_INPUT_REJECTED", () =>
    createSourcePolicyBundle(mutableRegistry, { generatedAt }),
  );
});

test("rejects a mismatched bundle SHA after serialization", async () => {
  const bundle = createSourcePolicyBundle(await loadApprovedInput(), { generatedAt });
  const drifted = JSON.parse(JSON.stringify(bundle));
  drifted.bundleSha256 = "0".repeat(64);

  expectPolicyError("POLICY_BUNDLE_SHA256_MISMATCH", () =>
    loadSourcePolicyBundleJson(JSON.stringify(drifted)),
  );
});

test("rejects invalid JSON instead of treating CSV as a serialized bundle", async () => {
  await expectPolicyErrorAsync("POLICY_BUNDLE_JSON_INVALID", async () => {
    loadSourcePolicyBundleJson(await loadRegistryText());
  });
});
