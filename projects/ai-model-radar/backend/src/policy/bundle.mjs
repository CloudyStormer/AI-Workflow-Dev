import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

import {
  APPROVED_REGISTRY_SHA256,
  FORBIDDEN_SOURCE_IDS,
  POLICY_STATES,
  PROJECT_ID,
} from "./constants.mjs";
import { PolicyRegistryError } from "./errors.mjs";

export const APPROVED_POLICY_BUNDLE_IDENTITY = deepFreeze({
  schemaVersion: 1,
  projectId: PROJECT_ID,
  registrySha256: APPROVED_REGISTRY_SHA256,
  approvalId: "approval-20260814-radar-source-allowlist-v1",
  generatedFromCommit: "69ee48262f447a58c5d6677ef6537ab21213bc85",
});

const BUNDLE_PAYLOAD_KEYS = Object.freeze([
  "schemaVersion",
  "projectId",
  "registrySha256",
  "approvalId",
  "generatedFromCommit",
  "generatedAt",
  "approvalScope",
  "executionAuthorized",
  "runtimeEnabled",
  "endpoints",
]);
const BUNDLE_KEYS = Object.freeze([...BUNDLE_PAYLOAD_KEYS, "bundleSha256"]);
const GENERATION_KEYS = Object.freeze(["generatedAt"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const APPROVED_POLICY_INPUT_SHA256 =
  "36d6c4b6f02d824c254ea3c6e6c48b76edbc0a7ef38f0328c15f0cd266b0dc99";

function fail(code, message, details = {}) {
  throw new PolicyRegistryError(code, message, details);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

function assertExactKeys(value, expected, code, label) {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  if (
    actual.length !== canonical.length ||
    actual.some((key, index) => key !== canonical[index])
  ) {
    fail(code, `${label} fields do not match the approved schema.`, {
      actual,
      expected: canonical,
    });
  }
}

function assertGeneratedAt(generatedAt) {
  if (
    typeof generatedAt !== "string" ||
    !RFC3339_PATTERN.test(generatedAt) ||
    !Number.isFinite(Date.parse(generatedAt))
  ) {
    fail(
      "POLICY_BUNDLE_GENERATED_AT_INVALID",
      "Policy bundle generatedAt must be an explicit RFC 3339 timestamp.",
    );
  }
}

function compareBytes(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function isDeepFrozen(value) {
  if (!value || typeof value !== "object" || !Object.isFrozen(value)) return false;
  return Object.values(value).every(
    (nested) => !nested || typeof nested !== "object" || isDeepFrozen(nested),
  );
}

function cloneCanonical(value) {
  return JSON.parse(canonicalizeJson(value));
}

function validateApprovedRegistryInput(approvedRegistry) {
  if (!approvedRegistry || typeof approvedRegistry !== "object" || Array.isArray(approvedRegistry)) {
    fail(
      "MUTABLE_REGISTRY_INPUT_REJECTED",
      "A mutable CSV string or arbitrary value cannot be used as a policy bundle input.",
    );
  }
  if (!isDeepFrozen(approvedRegistry)) {
    fail(
      "MUTABLE_REGISTRY_INPUT_REJECTED",
      "Policy bundle input must be the deeply frozen approved registry loader result.",
    );
  }
  if (
    approvedRegistry.projectId !== APPROVED_POLICY_BUNDLE_IDENTITY.projectId ||
    approvedRegistry.registrySha256 !== APPROVED_POLICY_BUNDLE_IDENTITY.registrySha256 ||
    approvedRegistry.contentAddress?.algorithm !== "sha256" ||
    approvedRegistry.contentAddress?.digest !== APPROVED_POLICY_BUNDLE_IDENTITY.registrySha256 ||
    approvedRegistry.approvalScope !== "research-only" ||
    approvedRegistry.runtimeEnabled !== false
  ) {
    fail(
      "POLICY_BUNDLE_IDENTITY_DRIFT",
      "Registry loader identity or truth boundary differs from the approved bundle identity.",
    );
  }
  validateEndpoints(approvedRegistry.endpoints, approvedRegistry.counts);
  const policyInputSha256 = sha256(
    canonicalizeJson({
      counts: approvedRegistry.counts,
      endpoints: approvedRegistry.endpoints,
    }),
  );
  if (policyInputSha256 !== APPROVED_POLICY_INPUT_SHA256) {
    fail(
      "POLICY_BUNDLE_IDENTITY_DRIFT",
      "Approved endpoint policy content differs from the frozen loader revision.",
      { expected: APPROVED_POLICY_INPUT_SHA256, actual: policyInputSha256 },
    );
  }
}

function validateEndpoints(endpoints, expectedCounts = undefined) {
  if (!Array.isArray(endpoints) || endpoints.length === 0) {
    fail(
      "POLICY_BUNDLE_ENDPOINTS_EMPTY",
      "Policy bundle must contain at least one approved atomic endpoint.",
    );
  }

  const seen = new Set();
  const forbidden = new Set(FORBIDDEN_SOURCE_IDS);
  const counts = Object.fromEntries(POLICY_STATES.map((state) => [state, 0]));
  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== "object" || Array.isArray(endpoint)) {
      fail("POLICY_BUNDLE_ENDPOINT_INVALID", "Every bundled endpoint must be an object.");
    }
    if (!endpoint.sourceId || seen.has(endpoint.sourceId) || forbidden.has(endpoint.sourceId)) {
      fail(
        "POLICY_BUNDLE_ENDPOINT_ID_INVALID",
        "Bundled endpoint IDs must be non-empty, unique, and approved.",
        { sourceId: endpoint.sourceId },
      );
    }
    seen.add(endpoint.sourceId);
    if (
      endpoint.projectId !== PROJECT_ID ||
      !POLICY_STATES.includes(endpoint.policyState) ||
      typeof endpoint.endpointUrl !== "string" ||
      endpoint.endpointUrl.length === 0 ||
      endpoint.approvedPolicyInput?.sourceId !== endpoint.sourceId ||
      endpoint.approvedPolicyInput?.projectId !== PROJECT_ID ||
      endpoint.policyDisposition?.executionAuthorized !== false ||
      endpoint.policyDisposition?.runtimeEnabled !== false
    ) {
      fail(
        "POLICY_BUNDLE_ENDPOINT_INVALID",
        "Bundled endpoint policy differs from the approved fail-closed shape.",
        { sourceId: endpoint.sourceId },
      );
    }
    counts[endpoint.policyState] += 1;
  }

  if (
    expectedCounts &&
    (expectedCounts.endpointTotal !== endpoints.length ||
      POLICY_STATES.some((state) => expectedCounts[state] !== counts[state]))
  ) {
    fail(
      "POLICY_BUNDLE_ENDPOINT_COUNT_DRIFT",
      "Bundled endpoint counts differ from the approved registry result.",
      { expected: expectedCounts, actual: { ...counts, endpointTotal: endpoints.length } },
    );
  }
}

function validateBundleIdentity(bundle) {
  for (const [key, value] of Object.entries(APPROVED_POLICY_BUNDLE_IDENTITY)) {
    if (bundle[key] !== value) {
      fail(
        "POLICY_BUNDLE_IDENTITY_DRIFT",
        "Policy bundle identity differs from the approved revision.",
        { field: key, expected: value, actual: bundle[key] },
      );
    }
  }
  if (
    bundle.approvalScope !== "research-only" ||
    bundle.executionAuthorized !== false ||
    bundle.runtimeEnabled !== false
  ) {
    fail(
      "POLICY_BUNDLE_RUNTIME_BOUNDARY_DRIFT",
      "Policy bundle cannot grant execution or runtime authority.",
    );
  }
  assertGeneratedAt(bundle.generatedAt);
  validateEndpoints(bundle.endpoints);
}

function payloadFromBundle(bundle) {
  return Object.fromEntries(BUNDLE_PAYLOAD_KEYS.map((key) => [key, bundle[key]]));
}

export function canonicalizeJson(value) {
  const ancestors = new Set();

  function encode(input) {
    if (input === null) return "null";
    if (typeof input === "string" || typeof input === "boolean") {
      return JSON.stringify(input);
    }
    if (typeof input === "number") {
      if (!Number.isFinite(input)) {
        fail("CANONICAL_JSON_UNSUPPORTED", "Canonical JSON rejects non-finite numbers.");
      }
      return Object.is(input, -0) ? "0" : JSON.stringify(input);
    }
    if (!input || typeof input !== "object") {
      fail("CANONICAL_JSON_UNSUPPORTED", "Canonical JSON rejects unsupported values.");
    }
    if (ancestors.has(input)) {
      fail("CANONICAL_JSON_CYCLE", "Canonical JSON rejects cyclic values.");
    }

    ancestors.add(input);
    try {
      if (Array.isArray(input)) return `[${input.map(encode).join(",")}]`;
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        fail("CANONICAL_JSON_UNSUPPORTED", "Canonical JSON accepts plain objects only.");
      }
      return `{${Object.keys(input)
        .sort(compareBytes)
        .map((key) => `${JSON.stringify(key)}:${encode(input[key])}`)
        .join(",")}}`;
    } finally {
      ancestors.delete(input);
    }
  }

  return encode(value);
}

export function createSourcePolicyBundle(approvedRegistry, generation) {
  if (!generation || typeof generation !== "object" || Array.isArray(generation)) {
    fail(
      "POLICY_BUNDLE_GENERATION_INVALID",
      "Policy bundle generation metadata must be explicit.",
    );
  }
  assertExactKeys(
    generation,
    GENERATION_KEYS,
    "POLICY_BUNDLE_IDENTITY_DRIFT",
    "Policy bundle generation metadata",
  );
  assertGeneratedAt(generation.generatedAt);
  validateApprovedRegistryInput(approvedRegistry);

  const endpoints = approvedRegistry.endpoints
    .map((endpoint) => cloneCanonical(endpoint))
    .sort((left, right) => compareBytes(left.sourceId, right.sourceId));
  const payload = {
    ...APPROVED_POLICY_BUNDLE_IDENTITY,
    generatedAt: generation.generatedAt,
    approvalScope: "research-only",
    executionAuthorized: false,
    runtimeEnabled: false,
    endpoints,
  };
  const bundleSha256 = sha256(canonicalizeJson(payload));
  return deepFreeze({ ...payload, bundleSha256 });
}

export function recomputePolicyBundleSha256(bundle) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    fail("POLICY_BUNDLE_INVALID", "Policy bundle must be an object.");
  }
  assertExactKeys(bundle, BUNDLE_KEYS, "POLICY_BUNDLE_SCHEMA_INVALID", "Policy bundle");
  validateBundleIdentity(bundle);
  return sha256(canonicalizeJson(payloadFromBundle(bundle)));
}

export function verifySourcePolicyBundle(bundle) {
  const actual = recomputePolicyBundleSha256(bundle);
  if (!SHA256_PATTERN.test(bundle.bundleSha256) || bundle.bundleSha256 !== actual) {
    fail(
      "POLICY_BUNDLE_SHA256_MISMATCH",
      "Policy bundle SHA-256 does not match its canonical payload.",
      { expected: bundle.bundleSha256, actual },
    );
  }
  return deepFreeze(cloneCanonical(bundle));
}

export function serializeSourcePolicyBundle(bundle) {
  return canonicalizeJson(verifySourcePolicyBundle(bundle));
}

export function loadSourcePolicyBundleJson(jsonText) {
  if (typeof jsonText !== "string") {
    fail("POLICY_BUNDLE_JSON_INVALID", "Serialized policy bundle must be a JSON string.");
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    fail("POLICY_BUNDLE_JSON_INVALID", "Serialized policy bundle must contain valid JSON.");
  }
  return verifySourcePolicyBundle(parsed);
}
