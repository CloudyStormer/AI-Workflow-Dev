import type { ReadinessTruth } from "../../../contracts/operation";

export interface ReadinessComponent {
  readonly id: "api_schema" | "sqlite" | "source_runtime" | "worker";
  readonly status: ReadinessTruth | "not_applicable";
  readonly detail_zh_cn: string;
}

export interface ProcessHealth {
  readonly process: "alive";
  readonly network_requests_permitted: 0;
}

export interface ReadinessStatus {
  readonly ready: boolean;
  readonly truth: ReadinessTruth;
  readonly components: readonly ReadinessComponent[];
  readonly network_requests_permitted: 0;
}

export const NOT_READY_COMPONENTS: readonly ReadinessComponent[] = [
  {
    id: "api_schema",
    status: "not_ready",
    detail_zh_cn: "JSON Schema/OpenAPI 尚未注册，不能宣称 API Schema 已就绪。",
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

export const READY_COMPONENTS: readonly ReadinessComponent[] = NOT_READY_COMPONENTS.map(
  (component) => ({
    ...component,
    status: component.id === "source_runtime" ? "not_applicable" : "ready",
    detail_zh_cn:
      component.id === "api_schema"
        ? "私有材料 HTTP 契约与 Zod 校验已注册。"
        : component.id === "sqlite"
          ? "本地 SQLite 迁移、WAL、外键、加密密钥与已批准静态快照已验证。"
          : component.id === "source_runtime"
            ? "私有材料能力不执行网络采集；network_requests_permitted=0。"
            : "本地确定性分类与分析执行器已就绪。",
  }),
);
