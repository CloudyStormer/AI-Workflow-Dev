import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  APPROVED_ALLOW_ENDPOINT_COUNT,
  APPROVED_REGISTRY_SHA256,
  ENDPOINT_CATEGORY,
  FORBIDDEN_SOURCE_IDS,
  POLICY_STATES,
  PROJECT_ID,
  REGISTRY_HEADERS,
} from "./constants.mjs";
import { parseCsv } from "./csv.mjs";
import { PolicyRegistryError } from "./errors.mjs";

const ENDPOINT_ID_PATTERN = /^AIR-END-\d{3}$/;
const TEMPLATE_PATTERN = /[{}<>*]/;

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

function fail(code, message, details = {}) {
  throw new PolicyRegistryError(code, message, details);
}

function validateHeaders(headers) {
  const unknown = headers.filter((header) => !REGISTRY_HEADERS.includes(header));
  const missing = REGISTRY_HEADERS.filter((header) => !headers.includes(header));
  const duplicated = headers.filter((header, index) => headers.indexOf(header) !== index);

  if (
    unknown.length > 0 ||
    missing.length > 0 ||
    duplicated.length > 0 ||
    headers.length !== REGISTRY_HEADERS.length ||
    headers.some((header, index) => header !== REGISTRY_HEADERS[index])
  ) {
    fail("REGISTRY_SCHEMA_INVALID", "Registry columns must exactly match the approved schema.", {
      unknown,
      missing,
      duplicated,
    });
  }
}

function toRecord(headers, values, rowNumber) {
  if (values.length !== headers.length) {
    fail("REGISTRY_ROW_WIDTH_INVALID", "Registry row width does not match the approved schema.", {
      rowNumber,
      expected: headers.length,
      actual: values.length,
    });
  }
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
}

function validateEndpoint(record, rowNumber) {
  if (!ENDPOINT_ID_PATTERN.test(record.source_id)) {
    fail("ENDPOINT_ID_INVALID", "Endpoint policy must use an atomic AIR-END-NNN identifier.", {
      rowNumber,
      sourceId: record.source_id,
    });
  }
  if (record.access_method.includes("+")) {
    fail("COMPOSITE_ENDPOINT_REJECTED", "Composite access-method bundles are not executable endpoints.", {
      rowNumber,
      sourceId: record.source_id,
      accessMethod: record.access_method,
    });
  }
  if (!POLICY_STATES.includes(record.decision)) {
    fail("POLICY_STATE_INVALID", "Endpoint policy decision must be one of the four approved states.", {
      rowNumber,
      sourceId: record.source_id,
      decision: record.decision,
    });
  }
  if (!record.endpoint_url || TEMPLATE_PATTERN.test(record.endpoint_url)) {
    fail("ENDPOINT_TEMPLATE_REJECTED", "Endpoint URL must be a fully instantiated exact URL.", {
      rowNumber,
      sourceId: record.source_id,
      endpointUrl: record.endpoint_url,
    });
  }

  let endpoint;
  try {
    endpoint = new URL(record.endpoint_url);
  } catch {
    fail("ENDPOINT_URL_INVALID", "Endpoint URL is not a valid absolute URL.", {
      rowNumber,
      sourceId: record.source_id,
    });
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash
  ) {
    fail("ENDPOINT_URL_UNSAFE", "Endpoint URL must be HTTPS and contain no credentials or fragment.", {
      rowNumber,
      sourceId: record.source_id,
      endpointUrl: record.endpoint_url,
    });
  }

  const queryKeys = [...new Set([...endpoint.searchParams.keys()])].sort();
  return deepFreeze({
    sourceId: record.source_id,
    projectId: record.project_id,
    sourceName: record.source_name,
    publisher: record.publisher,
    policyState: record.decision,
    accessMethod: record.access_method,
    endpointUrl: record.endpoint_url,
    exactEndpoint: {
      scheme: endpoint.protocol.slice(0, -1),
      host: endpoint.hostname.toLowerCase(),
      effectivePort: endpoint.port ? Number(endpoint.port) : 443,
      path: endpoint.pathname,
      queryKeys,
    },
    authRequired: record.auth_required,
    loginRequired: record.login_required,
    rightsSummary: record.rights_summary,
    allowedUse: record.allowed_use,
    prohibitedUse: record.prohibited_use,
    disableCondition: record.disable_condition,
    lastVerifiedAt: record.last_verified_at,
    policyDisposition: classifyPolicyState(record.decision),
  });
}

export function classifyPolicyState(policyState) {
  const shared = {
    policyState,
    researchPolicyRecorded: true,
    executionAuthorized: false,
    runtimeEnabled: false,
  };

  switch (policyState) {
    case "allow":
      return deepFreeze({ ...shared, disposition: "policy-eligible", mayEnterAutomaticSequence: true });
    case "conditional":
      return deepFreeze({ ...shared, disposition: "conditions-required", mayEnterAutomaticSequence: false });
    case "manual_only":
      return deepFreeze({ ...shared, disposition: "manual-only", mayEnterAutomaticSequence: false });
    case "disabled":
      return deepFreeze({ ...shared, disposition: "disabled", mayEnterAutomaticSequence: false });
    default:
      fail("POLICY_STATE_INVALID", "Unknown policy state is rejected fail-closed.", { policyState });
  }
}

export function loadApprovedRegistry(csvText) {
  const forbiddenSourceIds = new Set(FORBIDDEN_SOURCE_IDS);
  const rows = parseCsv(csvText);

  if (rows.length < 2) fail("REGISTRY_EMPTY", "Registry must contain a header and data rows.");
  const [headers, ...dataRows] = rows;
  validateHeaders(headers);

  const seenIds = new Set();
  const endpoints = [];

  dataRows.forEach((values, index) => {
    const rowNumber = index + 2;
    const record = toRecord(headers, values, rowNumber);
    if (!record.source_id) fail("SOURCE_ID_EMPTY", "Every registry row must have a source_id.", { rowNumber });
    if (seenIds.has(record.source_id)) {
      fail("DUPLICATE_SOURCE_ID", "Registry source_id values must be unique.", {
        rowNumber,
        sourceId: record.source_id,
      });
    }
    seenIds.add(record.source_id);

    if (forbiddenSourceIds.has(record.source_id)) {
      fail("FORBIDDEN_SOURCE_ID", "Pending source is not part of the approved registry revision.", {
        rowNumber,
        sourceId: record.source_id,
      });
    }
    if (record.project_id !== PROJECT_ID) {
      fail("PROJECT_ID_MISMATCH", "Registry row belongs to a different project.", {
        rowNumber,
        sourceId: record.source_id,
        projectId: record.project_id,
      });
    }
    if (record.category === ENDPOINT_CATEGORY) endpoints.push(validateEndpoint(record, rowNumber));
  });

  const counts = Object.fromEntries(POLICY_STATES.map((state) => [state, 0]));
  for (const endpoint of endpoints) counts[endpoint.policyState] += 1;
  if (counts.allow !== APPROVED_ALLOW_ENDPOINT_COUNT) {
    fail("APPROVED_ALLOW_COUNT_MISMATCH", "Approved allow endpoint count did not mechanically recompute.", {
      expected: APPROVED_ALLOW_ENDPOINT_COUNT,
      actual: counts.allow,
    });
  }

  const registrySha256 = sha256(csvText);
  if (registrySha256 !== APPROVED_REGISTRY_SHA256) {
    fail("REGISTRY_SHA256_MISMATCH", "Registry bytes do not match the approved content address.", {
      expected: APPROVED_REGISTRY_SHA256,
      actual: registrySha256,
    });
  }

  return deepFreeze({
    schemaVersion: 1,
    projectId: PROJECT_ID,
    approvalScope: "research-only",
    contentAddress: { algorithm: "sha256", digest: registrySha256 },
    registrySha256,
    runtimeEnabled: false,
    counts: { ...counts, endpointTotal: endpoints.length },
    endpoints,
  });
}

export async function loadApprovedRegistryFile(path) {
  const csvText = await readFile(path, "utf8");
  return loadApprovedRegistry(csvText);
}
