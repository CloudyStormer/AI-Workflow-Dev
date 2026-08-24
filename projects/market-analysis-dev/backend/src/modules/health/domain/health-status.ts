import type { ReadinessTruth } from "../../../contracts/operation";

export interface ReadinessComponent {
  readonly id: "api_schema" | "sqlite" | "source_runtime" | "worker";
  readonly status: "ready" | ReadinessTruth;
  readonly detail_zh_cn: string;
}

export interface ProcessHealth {
  readonly process: "alive";
  readonly network_requests_permitted: 0;
}

export interface ReadinessStatus {
  readonly ready: false;
  readonly truth: ReadinessTruth;
  readonly components: readonly ReadinessComponent[];
  readonly network_requests_permitted: 0;
}

export const NOT_READY_COMPONENTS: readonly ReadinessComponent[] = [
  {
    id: "api_schema",
    status: "ready",
    detail_zh_cn: "Fastify 本机后端基座已初始化。",
  },
  {
    id: "sqlite",
    status: "not_ready",
    detail_zh_cn: "SQLite/WAL、迁移和数据库文件尚未在 CR-BE-101 实施。",
  },
  {
    id: "source_runtime",
    status: "not_ready",
    detail_zh_cn: "没有获批的来源运行时登记；本单元不发起网络请求。",
  },
  {
    id: "worker",
    status: "not_ready",
    detail_zh_cn: "Worker 尚未实施。",
  },
] as const;
