import {
  DATA_SOURCE_OPTIONS,
  DEFAULT_FILTERS,
  ISSUES,
  ITERATION_OPTIONS,
  PROJECTS,
  ROLES,
  TIME_RANGE_OPTIONS,
  type DashboardFilters,
  type DataSourceId,
  type IterationId,
  type ProjectScope,
  type TimeRangeId,
  type ViewId,
} from "./dashboard-data";

const PROJECT_VALUES = new Set<ProjectScope>(["all", ...PROJECTS.map((project) => project.id)]);
const RANGE_VALUES = new Set<TimeRangeId>(TIME_RANGE_OPTIONS.map((option) => option.value));
const ITERATION_VALUES = new Set<IterationId>(ITERATION_OPTIONS.map((option) => option.value));
const SOURCE_VALUES = new Set<DataSourceId>(DATA_SOURCE_OPTIONS.map((option) => option.value));

export const DEMO_ANALYTICS_PROJECT_ID = "ai-english-learning";

export function parseDashboardFilters(params: URLSearchParams): DashboardFilters {
  const project = params.get("project") as ProjectScope | null;
  const range = params.get("range") as TimeRangeId | null;
  const iteration = params.get("iteration") as IterationId | null;
  const source = params.get("source") as DataSourceId | null;

  return {
    project: project && PROJECT_VALUES.has(project) ? project : DEFAULT_FILTERS.project,
    range: range && RANGE_VALUES.has(range) ? range : DEFAULT_FILTERS.range,
    iteration: iteration && ITERATION_VALUES.has(iteration) ? iteration : DEFAULT_FILTERS.iteration,
    source: source && SOURCE_VALUES.has(source) ? source : DEFAULT_FILTERS.source,
  };
}

export function writeDashboardFilters(params: URLSearchParams, filters: DashboardFilters) {
  params.set("project", filters.project);
  params.set("range", filters.range);
  params.set("iteration", filters.iteration);
  params.set("source", filters.source);
}

export function getScopedProjects(filters: DashboardFilters) {
  const sourceProjects = filters.source === "pending"
    ? []
    : PROJECTS.filter((project) => filters.source === "all" || project.source === filters.source);
  return filters.project === "all"
    ? sourceProjects
    : sourceProjects.filter((project) => project.id === filters.project);
}

export type FilterAvailability = {
  available: boolean;
  title?: string;
  detail?: string;
};

export function getViewFilterAvailability(view: ViewId, filters: DashboardFilters): FilterAvailability {
  if (filters.source === "pending") {
    return {
      available: false,
      title: "待接入来源没有可展示记录",
      detail: "当前前端只有明确标注的演示快照；已停止显示未经过该来源筛选的旧数值。",
    };
  }

  if (filters.range !== "current-iteration") {
    return {
      available: false,
      title: "该时间范围的覆盖不可用",
      detail: "当前静态快照没有为所有模块登记可比较的绝对时间；已停止把未过滤指标冒充筛选结果。",
    };
  }

  if (filters.iteration !== "mvp-v1") {
    return {
      available: false,
      title: "该迭代没有完整演示明细",
      detail: "当前可重复核验的交互快照只覆盖 MVP v1.0；其他迭代保留在路线图说明中，不参与当前指标。",
    };
  }

  if (filters.project !== "all") {
    if (view === "roles" || view === "governance") {
      return {
        available: false,
        title: "该视图没有项目级拆分证据",
        detail: "角色协作与成熟度数据目前只登记为全局演示快照；已停止用全局数值冒充单项目结果。",
      };
    }

    if ((view === "quality" || view === "releases") && filters.project !== DEMO_ANALYTICS_PROJECT_ID) {
      return {
        available: false,
        title: "当前项目没有该类演示明细",
        detail: "质量与发布演示快照只登记在 AI English Learning 样本范围；这里不以空集合冒充真实零值。",
      };
    }
  }

  return { available: true };
}

export function describeFilters(filters: DashboardFilters) {
  const project = filters.project === "all"
    ? "全部项目"
    : PROJECTS.find((item) => item.id === filters.project)?.name ?? "全部项目";
  const range = TIME_RANGE_OPTIONS.find((option) => option.value === filters.range)?.label ?? "当前迭代";
  const iteration = ITERATION_OPTIONS.find((option) => option.value === filters.iteration)?.label ?? "MVP v1.0";
  const source = DATA_SOURCE_OPTIONS.find((option) => option.value === filters.source)?.label ?? "全部来源";
  return `${project} · ${range} · ${iteration} · ${source}`;
}

export type DashboardSearchItem = {
  id: string;
  label: string;
  type: "项目" | "角色" | "缺陷" | "发布" | "治理";
  view: ViewId;
  projectId?: Exclude<ProjectScope, "all">;
};

export function getDashboardSearchItems(filters: DashboardFilters): DashboardSearchItem[] {
  const globalCoverage = getViewFilterAvailability("overview", filters);
  if (!globalCoverage.available) return [];

  const projects = getScopedProjects(filters);
  const hasGlobalScope = filters.project === "all";
  const includesQualitySample = projects.some((project) => project.id === DEMO_ANALYTICS_PROJECT_ID);

  return [
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      type: "项目" as const,
      view: "projects" as const,
      projectId: project.id,
    })),
    ...(hasGlobalScope
      ? ROLES.map((role) => ({
          id: `role-${role.id}`,
          label: role.name,
          type: "角色" as const,
          view: "roles" as const,
        }))
      : []),
    ...(includesQualitySample
      ? ISSUES.map((issue) => ({
          id: `issue-${issue.id}`,
          label: issue.title,
          type: "缺陷" as const,
          view: "quality" as const,
        }))
      : []),
    ...(hasGlobalScope || includesQualitySample
      ? [{ id: "release-gates", label: "发布门禁", type: "发布" as const, view: "releases" as const }]
      : []),
    ...(hasGlobalScope
      ? [{ id: "maturity-score", label: "成熟度评分", type: "治理" as const, view: "governance" as const }]
      : []),
  ];
}

export type DashboardExportScope =
  | { available: true; projects: ReturnType<typeof getScopedProjects> }
  | { available: false; title: string; detail: string };

export function getDashboardExportScope(view: ViewId, filters: DashboardFilters): DashboardExportScope {
  const coverage = getViewFilterAvailability(view, filters);
  if (!coverage.available) {
    return {
      available: false,
      title: coverage.title ?? "当前筛选覆盖不可用",
      detail: coverage.detail ?? "当前演示快照无法生成与页面一致的报告。",
    };
  }

  return { available: true, projects: getScopedProjects(filters) };
}
