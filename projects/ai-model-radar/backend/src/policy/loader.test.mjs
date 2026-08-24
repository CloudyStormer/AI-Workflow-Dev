import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APPROVED_REGISTRY_SHA256,
  PolicyRegistryError,
  classifyPolicyState,
  loadApprovedRegistry,
} from "./index.mjs";
import { parseCsv } from "./csv.mjs";

const registryUrl = new URL("../../../docs/00-source-registry.csv", import.meta.url);
const pendingFixtureUrl = new URL("./fixtures/air-end-030-row.csv", import.meta.url);

const loadRegistryText = () => readFile(registryUrl, "utf8");

function expectPolicyError(code, action) {
  assert.throws(action, (error) => error instanceof PolicyRegistryError && error.code === code);
}

function assertDeepFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertDeepFrozen(nested);
}

const policyInputFieldMap = Object.freeze([
  ["source_id", "sourceId"],
  ["project_id", "projectId"],
  ["source_name", "sourceName"],
  ["publisher", "publisher"],
  ["category", "category"],
  ["tier", "tier"],
  ["region", "region"],
  ["language", "language"],
  ["canonical_url", "canonicalUrl"],
  ["endpoint_url", "endpointUrl"],
  ["access_method", "accessMethod"],
  ["auth_required", "authRequired"],
  ["login_required", "loginRequired"],
  ["robots_url", "robotsUrl"],
  ["robots_result", "robotsResult"],
  ["terms_url", "termsUrl"],
  ["rights_summary", "rightsSummary"],
  ["allowed_use", "allowedUse"],
  ["prohibited_use", "prohibitedUse"],
  ["decision", "decision"],
  ["decision_reason", "decisionReason"],
  ["observed_frequency", "observedFrequency"],
  ["recommended_polling", "recommendedPolling"],
  ["rate_limit", "rateLimit"],
  ["retention_policy", "retentionPolicy"],
  ["attribution_linkback", "attributionLinkback"],
  ["personal_data", "personalData"],
  ["traceability_fields", "traceabilityFields"],
  ["fallback", "fallback"],
  ["disable_condition", "disableCondition"],
  ["last_verified_at", "lastVerifiedAt"],
  ["verification_result", "verificationResult"],
  ["fact_or_inference", "factOrInference"],
  ["confidence", "confidence"],
  ["notes", "notes"],
]);

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

test("preserves every approved registry field as explicit serializable policy input", async () => {
  const registry = await loadRegistryText();
  const [headers, ...rows] = parseCsv(registry);
  const rawValues = rows.find((row) => row[0] === "AIR-END-001");
  const rawRecord = Object.fromEntries(headers.map((header, index) => [header, rawValues[index]]));
  const endpoint = loadApprovedRegistry(registry).endpoints.find(
    ({ sourceId }) => sourceId === "AIR-END-001",
  );

  assert.deepEqual(
    Object.keys(endpoint.approvedPolicyInput),
    policyInputFieldMap.map(([, outputName]) => outputName),
  );
  for (const [registryName, outputName] of policyInputFieldMap) {
    assert.equal(endpoint.approvedPolicyInput[outputName], rawRecord[registryName]);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(endpoint.approvedPolicyInput)), endpoint.approvedPolicyInput);
  assert.equal("approvalId" in endpoint.approvedPolicyInput, false);
  assert.equal("generatedFromCommit" in endpoint.approvedPolicyInput, false);
  assert.equal("bundleSha256" in endpoint.approvedPolicyInput, false);
});

test("deep-freezes the complete loader result including policy constraints", async () => {
  assertDeepFrozen(loadApprovedRegistry(await loadRegistryText()));
});

test("parses a UTF-8 BOM and CRLF deterministically", () => {
  assert.deepEqual(parseCsv('\ufeff"alpha","beta"\r\n"one","two"\r\n'), [
    ["alpha", "beta"],
    ["one", "two"],
  ]);
});

test("parses a quoted comma without changing field boundaries", () => {
  assert.deepEqual(parseCsv('"alpha","one,two"\n'), [["alpha", "one,two"]]);
});

test("parses a quoted newline as field content", () => {
  assert.deepEqual(parseCsv('"alpha","line one\nline two"\n'), [["alpha", "line one\nline two"]]);
});

test("parses an escaped quote inside a quoted field", () => {
  assert.deepEqual(parseCsv('"alpha","say ""hello"""\n'), [["alpha", 'say "hello"']]);
});

test("rejects an unclosed quoted field", () => {
  expectPolicyError("CSV_UNCLOSED_QUOTE", () => parseCsv('"alpha","unfinished'));
});

test("rejects a quote inside an unquoted field", () => {
  expectPolicyError("CSV_INVALID_QUOTE", () => parseCsv('alpha,bad"quote\n'));
});

test("rejects trailing characters after a quoted field", () => {
  expectPolicyError("CSV_TRAILING_CHARACTERS", () => parseCsv('"alpha"trailing,"beta"\n'));
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

test("rejects registry rows whose width differs from the approved schema", async () => {
  const lines = (await loadRegistryText()).split("\n");
  const rowIndex = lines.findIndex((line) => line.startsWith('"AIR-END-001"'));
  lines[rowIndex] = lines[rowIndex].slice(0, lines[rowIndex].lastIndexOf(","));
  expectPolicyError("REGISTRY_ROW_WIDTH_INVALID", () => loadApprovedRegistry(lines.join("\n")));
});

test("rejects rows belonging to another project", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace(
    '"AIR-END-001","ai-model-radar"',
    '"AIR-END-001","another-project"',
  );
  expectPolicyError("PROJECT_ID_MISMATCH", () => loadApprovedRegistry(mutated));
});

test("rejects an invalid absolute endpoint URL", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace(
    '"https://status.openai.com/api/v2/summary.json","status-json"',
    '"not-an-absolute-url","status-json"',
  );
  expectPolicyError("ENDPOINT_URL_INVALID", () => loadApprovedRegistry(mutated));
});

test("rejects a non-HTTPS endpoint URL", async () => {
  const registry = await loadRegistryText();
  const mutated = registry.replace(
    '"https://status.openai.com/api/v2/summary.json","status-json"',
    '"http://status.openai.com/api/v2/summary.json","status-json"',
  );
  expectPolicyError("ENDPOINT_URL_UNSAFE", () => loadApprovedRegistry(mutated));
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
