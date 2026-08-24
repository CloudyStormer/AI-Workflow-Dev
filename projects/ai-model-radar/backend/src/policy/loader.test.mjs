import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APPROVED_REGISTRY_SHA256,
  PolicyRegistryError,
  classifyPolicyState,
  loadApprovedRegistry,
} from "./index.mjs";

const registryUrl = new URL("../../../docs/00-source-registry.csv", import.meta.url);
const pendingFixtureUrl = new URL("./fixtures/air-end-030-row.csv", import.meta.url);

const loadRegistryText = () => readFile(registryUrl, "utf8");

function expectPolicyError(code, action) {
  assert.throws(action, (error) => error instanceof PolicyRegistryError && error.code === code);
}

test("classifies all four states without granting execution or runtime", () => {
  const expected = {
    allow: ["policy-eligible", true],
    conditional: ["conditions-required", false],
    manual_only: ["manual-only", false],
    disabled: ["disabled", false],
  };

  for (const [state, [disposition, mayEnterAutomaticSequence]] of Object.entries(expected)) {
    const result = classifyPolicyState(state);
    assert.equal(result.disposition, disposition);
    assert.equal(result.mayEnterAutomaticSequence, mayEnterAutomaticSequence);
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.runtimeEnabled, false);
  }
  expectPolicyError("POLICY_STATE_INVALID", () => classifyPolicyState("unknown"));
});

test("loads only the approved content-addressed registry and mechanically recomputes N=22", async () => {
  const result = loadApprovedRegistry(await loadRegistryText());

  assert.equal(result.registrySha256, APPROVED_REGISTRY_SHA256);
  assert.deepEqual(result.contentAddress, {
    algorithm: "sha256",
    digest: APPROVED_REGISTRY_SHA256,
  });
  assert.deepEqual(result.counts, {
    allow: 22,
    conditional: 4,
    manual_only: 0,
    disabled: 3,
    endpointTotal: 29,
  });
  assert.equal(result.runtimeEnabled, false);
  assert.equal(result.endpoints.some(({ sourceId }) => sourceId === "AIR-END-030"), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.endpoints[0]), true);
});

test("rejects duplicate source IDs before content-address validation", async () => {
  const registry = await loadRegistryText();
  const duplicate = registry.split(/\r?\n/).find((line) => line.startsWith('"AIR-END-001"'));
  expectPolicyError("DUPLICATE_SOURCE_ID", () => loadApprovedRegistry(`${registry.trimEnd()}\n${duplicate}\n`));
});

test("rejects composite endpoint bundles fail-closed", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace('"status-json","no","no"', '"status-json+html","no","no"');
  expectPolicyError("COMPOSITE_ENDPOINT_REJECTED", () => loadApprovedRegistry(mutated));
});

test("rejects endpoint templates fail-closed", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace(
    '"https://status.openai.com/api/v2/summary.json","status-json"',
    '"https://{public-status-host}/api/v2/summary.json","status-json"',
  );
  expectPolicyError("ENDPOINT_TEMPLATE_REJECTED", () => loadApprovedRegistry(mutated));
});

test("rejects unknown registry fields fail-closed", async () => {
  const registry = await loadRegistryText();
  const [header, ...rows] = registry.split(/\r?\n/);
  expectPolicyError("REGISTRY_SCHEMA_INVALID", () =>
    loadApprovedRegistry(`${header},"unknown_field"\n${rows.join("\n")}`),
  );
});

test("rejects structurally valid bytes that do not match the approved content address", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace('"OpenAI News RSS"', '"OpenAI News RSS changed"');
  expectPolicyError("REGISTRY_SHA256_MISMATCH", () => loadApprovedRegistry(mutated));
});

test("rejects the AIR-END-030 negative fixture", async () => {
  const [registry, pendingRow] = await Promise.all([
    loadRegistryText(),
    readFile(pendingFixtureUrl, "utf8"),
  ]);
  expectPolicyError("FORBIDDEN_SOURCE_ID", () =>
    loadApprovedRegistry(`${registry.trimEnd()}\n${pendingRow.trim()}\n`),
  );
});
