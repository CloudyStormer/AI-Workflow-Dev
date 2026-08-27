export const OPERATION_SCHEMA_VERSION = "1.0";

export type ControlOperationState = "healthy" | "not_ready";

export interface RadarError {
  readonly schema_version: typeof OPERATION_SCHEMA_VERSION;
  readonly code: string;
  readonly message_zh_cn: string;
  readonly impact_scope: {
    readonly project_id: "ai-model-radar";
    readonly capability?: "query" | "runtime";
  };
  readonly retryable: boolean;
  readonly occurred_at: string;
  readonly request_id: string;
  readonly source: null;
  readonly version: Record<string, never>;
  readonly as_of: null;
  readonly observed_at: string;
  readonly last_success_at: null;
  readonly freshness: null;
  readonly coverage: null;
  readonly safe_details: Readonly<Record<string, unknown>>;
}

export interface OperationEnvelope<T> {
  readonly schema_version: typeof OPERATION_SCHEMA_VERSION;
  readonly request_id: string;
  readonly request_mode: "control";
  readonly data_mode: null;
  readonly coverage_applicability: "not_applicable";
  readonly coverage_policy: null;
  readonly operation_id: string;
  readonly refresh_run_id: null;
  readonly fetch_run_id: null;
  readonly operation_state: ControlOperationState;
  readonly status_revision: null;
  readonly observed_at: string;
  readonly data: T;
  readonly errors: readonly RadarError[];
}

export function createControlEnvelope<T>(input: {
  readonly requestId: string;
  readonly operationId: string;
  readonly operationState: ControlOperationState;
  readonly observedAt: string;
  readonly data: T;
  readonly errors?: readonly RadarError[];
}): OperationEnvelope<T> {
  return {
    schema_version: OPERATION_SCHEMA_VERSION,
    request_id: input.requestId,
    request_mode: "control",
    data_mode: null,
    coverage_applicability: "not_applicable",
    coverage_policy: null,
    operation_id: input.operationId,
    refresh_run_id: null,
    fetch_run_id: null,
    operation_state: input.operationState,
    status_revision: null,
    observed_at: input.observedAt,
    data: input.data,
    errors: input.errors ?? [],
  };
}
