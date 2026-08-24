export const POLICY_STATES = Object.freeze([
  "allow",
  "conditional",
  "manual_only",
  "disabled",
]);

export const REGISTRY_HEADERS = Object.freeze([
  "source_id",
  "project_id",
  "source_name",
  "publisher",
  "category",
  "tier",
  "region",
  "language",
  "canonical_url",
  "endpoint_url",
  "access_method",
  "auth_required",
  "login_required",
  "robots_url",
  "robots_result",
  "terms_url",
  "rights_summary",
  "allowed_use",
  "prohibited_use",
  "decision",
  "decision_reason",
  "observed_frequency",
  "recommended_polling",
  "rate_limit",
  "retention_policy",
  "attribution_linkback",
  "personal_data",
  "traceability_fields",
  "fallback",
  "disable_condition",
  "last_verified_at",
  "verification_result",
  "fact_or_inference",
  "confidence",
  "notes",
]);

export const APPROVED_REGISTRY_SHA256 =
  "c303e79e1fa9f7a1664ac718a1678bbcb6610b5309a5d5e4006e6d4b1d438f91";

export const APPROVED_ALLOW_ENDPOINT_COUNT = 22;
export const PROJECT_ID = "ai-model-radar";
export const ENDPOINT_CATEGORY = "endpoint-policy";
export const FORBIDDEN_SOURCE_IDS = Object.freeze(["AIR-END-030"]);
