import {
  API_SCHEMA_VERSION,
  PROJECT_ID,
  type OperationEnvelope,
} from "../../../contracts/operation";
import {
  NOT_READY_COMPONENTS,
  type ProcessHealth,
  type ReadinessStatus,
} from "../domain/health-status";

export class HealthService {
  public getProcessHealth(requestId: string): OperationEnvelope<ProcessHealth> {
    return {
      schema_version: API_SCHEMA_VERSION,
      project_id: PROJECT_ID,
      request_id: requestId,
      request_mode: "private_control",
      data_mode: null,
      operation_id: null,
      status: "ok",
      status_revision: 0,
      impact_scope: {
        project_id: PROJECT_ID,
        domain: "process",
      },
      source: null,
      version: "0.1.0",
      as_of: null,
      observed_at: null,
      last_success_at: null,
      freshness: "not_ready",
      coverage: null,
      data: {
        process: "alive",
        network_requests_permitted: 0,
      },
      errors: [],
    };
  }

  public getReadiness(requestId: string): OperationEnvelope<ReadinessStatus> {
    return {
      schema_version: API_SCHEMA_VERSION,
      project_id: PROJECT_ID,
      request_id: requestId,
      request_mode: "private_control",
      data_mode: null,
      operation_id: null,
      status: "not_ready",
      status_revision: 0,
      impact_scope: {
        project_id: PROJECT_ID,
        domain: "readiness",
      },
      source: null,
      version: "0.1.0",
      as_of: null,
      observed_at: null,
      last_success_at: null,
      freshness: "not_ready",
      coverage: null,
      data: {
        ready: false,
        truth: "not_ready",
        components: NOT_READY_COMPONENTS,
        network_requests_permitted: 0,
      },
      errors: [
        {
          code: "DEPENDENCY_NOT_READY",
          message_zh_cn:
            "后端基座已初始化，但 API Schema、SQLite、迁移、来源运行时和 Worker 尚未就绪。",
          retryable: false,
        },
      ],
    };
  }
}
