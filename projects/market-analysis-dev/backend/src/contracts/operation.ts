export const PROJECT_ID = "market-analysis-dev" as const;
export const API_SCHEMA_VERSION = 1 as const;

export type ReadinessTruth = "not_ready" | "ready";

export interface ImpactScope {
  readonly project_id: typeof PROJECT_ID;
  readonly domain: "process" | "readiness" | "material_analysis";
  readonly component?: string;
}

export interface OperationError {
  readonly code: string;
  readonly message_zh_cn: string;
  readonly retryable: boolean;
}

export interface OperationEnvelope<TData> {
  readonly schema_version: typeof API_SCHEMA_VERSION;
  readonly project_id: typeof PROJECT_ID;
  readonly request_id: string;
  readonly request_mode: "private_control";
  readonly data_mode: null;
  readonly operation_id: null;
  readonly status: "ok" | "not_ready";
  readonly status_revision: 0;
  readonly impact_scope: ImpactScope;
  readonly source: null;
  readonly version: "0.1.0";
  readonly as_of: null;
  readonly observed_at: null;
  readonly last_success_at: null;
  readonly freshness: ReadinessTruth;
  readonly coverage: null;
  readonly data: TData;
  readonly errors: readonly OperationError[];
}
