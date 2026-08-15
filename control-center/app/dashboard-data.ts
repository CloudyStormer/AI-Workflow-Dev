export type ViewId =
  | "overview"
  | "projects"
  | "roles"
  | "quality"
  | "releases"
  | "governance";

export type StageStatus =
  | "done"
  | "active"
  | "risk"
  | "blocked"
  | "approval"
  | "waiting";

export type DemoProject = {
  id: string;
  name: string;
  kind: "治理根项目" | "实验样本项目";
  stage: number;
  progress: number;
  risk: string;
  openIssues: number | null;
  nextApproval: string;
  source: "demo";
  stages: StageStatus[];
};

export type ProjectScope = "all" | DemoProject["id"];
export type TimeRangeId = "current-iteration" | "7d" | "30d";
export type IterationId = "mvp-v1" | "workflow-v03" | "pending";
export type DataSourceId = "all" | "demo" | "pending";

export type DashboardFilters = {
  project: ProjectScope;
  range: TimeRangeId;
  iteration: IterationId;
  source: DataSourceId;
};

export const DEFAULT_FILTERS: DashboardFilters = {
  project: "all",
  range: "current-iteration",
  iteration: "mvp-v1",
  source: "all",
};

export const TIME_RANGE_OPTIONS: ReadonlyArray<{ value: TimeRangeId; label: string }> = [
  { value: "current-iteration", label: "当前迭代" },
  { value: "7d", label: "最近 7 天" },
  { value: "30d", label: "最近 30 天" },
];

export const ITERATION_OPTIONS: ReadonlyArray<{ value: IterationId; label: string }> = [
  { value: "mvp-v1", label: "MVP v1.0" },
  { value: "workflow-v03", label: "工作流治理 v0.3" },
  { value: "pending", label: "待接入" },
];

export const DATA_SOURCE_OPTIONS: ReadonlyArray<{ value: DataSourceId; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "demo", label: "演示数据" },
  { value: "pending", label: "待接入" },
];

export const NAV_ITEMS: Array<{
  id: ViewId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { id: "overview", label: "总览", shortLabel: "总览", description: "决策驾驶舱" },
  { id: "projects", label: "项目与阶段", shortLabel: "项目", description: "项目矩阵与阶段证据" },
  { id: "roles", label: "角色协作", shortLabel: "角色", description: "固定角色负载与交接" },
  { id: "quality", label: "质量与复测", shortLabel: "质量", description: "缺陷、修复与复测门禁" },
  { id: "releases", label: "迭代与发布", shortLabel: "发布", description: "迭代进度与发布就绪" },
  { id: "governance", label: "成熟度与治理", shortLabel: "治理", description: "成熟度证据与改进优先级" },
];

export const STAGES = [
  "市场调研",
  "项目初始化",
  "产品定义",
  "UI/UX",
  "架构设计",
  "任务与验收拆解",
  "小批量开发",
  "持续代码审查",
  "测试、Bug 与复测",
  "发布与回滚",
  "验收、迭代与复盘",
];

export const STAGE_OWNERS = [
  "市场调研员",
  "项目经理",
  "产品经理",
  "UI/UX 设计师",
  "架构师",
  "项目经理",
  "前端工程师",
  "代码审查员",
  "QA",
  "DevOps",
  "项目经理",
] as const;

export const PROJECTS: DemoProject[] = [
  {
    id: "workflow-control-center",
    name: "AI Workflow Control Center",
    kind: "治理根项目",
    stage: 6,
    progress: 58,
    risk: "前端交付待审",
    openIssues: null,
    nextApproval: "前端交付审核",
    source: "demo",
    stages: ["done", "done", "done", "done", "done", "done", "active", "waiting", "waiting", "waiting", "waiting"],
  },
  {
    id: "ai-english-learning",
    name: "AI English Learning",
    kind: "实验样本项目",
    stage: 6,
    progress: 42,
    risk: "产品变更冻结",
    openIssues: 5,
    nextApproval: "新 PRD 审核",
    source: "demo",
    stages: ["done", "done", "done", "done", "done", "done", "blocked", "waiting", "waiting", "waiting", "waiting"],
  },
  {
    id: "ai-model-radar",
    name: "AI Model Radar",
    kind: "实验样本项目",
    stage: 5,
    progress: 35,
    risk: "等待开发排期",
    openIssues: null,
    nextApproval: "首批任务审核",
    source: "demo",
    stages: ["done", "done", "done", "done", "done", "approval", "waiting", "waiting", "waiting", "waiting", "waiting"],
  },
  {
    id: "market-analysis-dev",
    name: "Market Analysis Dev",
    kind: "实验样本项目",
    stage: 4,
    progress: 29,
    risk: "架构证据待接入",
    openIssues: null,
    nextApproval: "架构审核",
    source: "demo",
    stages: ["done", "done", "done", "done", "risk", "waiting", "waiting", "waiting", "waiting", "waiting", "waiting"],
  },
];

export const ROLES = [
  { id: "01", name: "市场调研员", status: "待命", lane: "研究", workload: 24, active: 0, blocked: 0, handoff: "项目经理" },
  { id: "02", name: "项目经理", status: "工作中", lane: "管理", workload: 72, active: 3, blocked: 0, handoff: "产品经理" },
  { id: "03", name: "产品经理", status: "工作中", lane: "产品", workload: 68, active: 2, blocked: 1, handoff: "UI/UX 设计师" },
  { id: "04", name: "UI/UX 设计师", status: "待审批", lane: "设计", workload: 54, active: 1, blocked: 0, handoff: "架构师 / 前端工程师" },
  { id: "05", name: "架构师", status: "待命", lane: "技术", workload: 38, active: 1, blocked: 0, handoff: "项目经理" },
  { id: "06", name: "前端工程师", status: "工作中", lane: "研发", workload: 86, active: 1, blocked: 1, handoff: "代码审查员" },
  { id: "07", name: "后端工程师", status: "待命", lane: "研发", workload: 31, active: 0, blocked: 0, handoff: "代码审查员" },
  { id: "08", name: "数据工程师", status: "待接入", lane: "数据", workload: 12, active: 0, blocked: 0, handoff: "代码审查员" },
  { id: "09", name: "代码审查员", status: "待命", lane: "质量", workload: 43, active: 0, blocked: 0, handoff: "QA" },
  { id: "10", name: "QA", status: "待命", lane: "质量", workload: 36, active: 0, blocked: 0, handoff: "DevOps" },
  { id: "11", name: "DevOps", status: "待审批", lane: "交付", workload: 28, active: 0, blocked: 0, handoff: "项目经理" },
] as const;

export const ROLE_STATUS_DATA = [
  { name: "工作中", value: 3, fill: "#13795b" },
  { name: "待命", value: 5, fill: "#8aa39a" },
  { name: "待审批", value: 2, fill: "#d6821f" },
  { name: "待接入", value: 1, fill: "#7a8580" },
];

export const ISSUES = [
  { id: "DEMO-P0-001", title: "演示缺陷：构建环境基线未满足", severity: "Blocker", module: "工程环境", owner: "DevOps", status: "待修复", age: "7 天以上", retest: "未执行" },
  { id: "DEMO-P1-002", title: "演示缺陷：审批状态缺少结构化证据", severity: "Major", module: "工作流状态", owner: "架构师", status: "待修复", age: "4–7 天", retest: "未执行" },
  { id: "DEMO-P1-003", title: "演示缺陷：任务状态与产物记录不一致", severity: "Major", module: "项目治理", owner: "项目经理", status: "修复中", age: "2–3 天", retest: "未执行" },
  { id: "DEMO-P1-004", title: "演示缺陷：响应式回归证据不完整", severity: "Major", module: "前端", owner: "前端工程师", status: "待复测", age: "0–1 天", retest: "待复测" },
  { id: "DEMO-P2-005", title: "演示缺陷：空状态说明不够清晰", severity: "Minor", module: "界面文案", owner: "UI/UX 设计师", status: "待修复", age: "0–1 天", retest: "未执行" },
] as const;

export const DEFECT_STACK = [
  { status: "待修复", Blocker: 1, Major: 1, Minor: 1 },
  { status: "修复中", Blocker: 0, Major: 1, Minor: 0 },
  { status: "待复测", Blocker: 0, Major: 1, Minor: 0 },
  { status: "已关闭", Blocker: 0, Major: 0, Minor: 0 },
];

export const RETEST_TREND = [
  { date: "07-29", passed: 0, failed: 0, notRun: 5, rate: 0 },
  { date: "07-30", passed: 1, failed: 1, notRun: 3, rate: 50 },
  { date: "07-31", passed: 2, failed: 1, notRun: 2, rate: 67 },
  { date: "08-01", passed: 3, failed: 1, notRun: 1, rate: 75 },
  { date: "08-02", passed: 3, failed: 2, notRun: 0, rate: 60 },
  { date: "08-03", passed: 4, failed: 1, notRun: 0, rate: 80 },
  { date: "08-04", passed: 4, failed: 1, notRun: 0, rate: 80 },
];

export const DEFECT_AGING = [
  { bucket: "0–1 天", count: 2 },
  { bucket: "2–3 天", count: 1 },
  { bucket: "4–7 天", count: 1 },
  { bucket: "7 天以上", count: 1 },
];

export const BURN_DOWN = [
  { day: "第 1 天", ideal: 26, actual: 26, scope: 26 },
  { day: "第 2 天", ideal: 22, actual: 25, scope: 26 },
  { day: "第 3 天", ideal: 18, actual: 25, scope: 27 },
  { day: "第 4 天", ideal: 13, actual: 24, scope: 27 },
  { day: "第 5 天", ideal: 9, actual: 24, scope: 28 },
  { day: "第 6 天", ideal: 4, actual: 23, scope: 28 },
  { day: "第 7 天", ideal: 0, actual: 23, scope: 28 },
];

export const CUMULATIVE_FLOW = [
  { day: "第 1 天", todo: 19, doing: 4, review: 2, testing: 1, done: 0 },
  { day: "第 2 天", todo: 18, doing: 5, review: 2, testing: 1, done: 0 },
  { day: "第 3 天", todo: 18, doing: 5, review: 2, testing: 1, done: 1 },
  { day: "第 4 天", todo: 17, doing: 6, review: 2, testing: 1, done: 1 },
  { day: "第 5 天", todo: 17, doing: 6, review: 3, testing: 1, done: 1 },
  { day: "第 6 天", todo: 16, doing: 7, review: 3, testing: 1, done: 1 },
  { day: "第 7 天", todo: 15, doing: 8, review: 3, testing: 1, done: 1 },
];

export const RELEASE_GATES = [
  { name: "构建", score: 45, required: 100, status: "未通过", detail: "Node 基线与构建证据待补齐" },
  { name: "自动化测试", score: 20, required: 100, status: "未通过", detail: "仅有基础渲染测试" },
  { name: "安全检查", score: 0, required: 100, status: "待接入", detail: "没有可验证的安全扫描结果" },
  { name: "备份与回滚", score: 15, required: 100, status: "未通过", detail: "回滚方案尚未验证" },
  { name: "监控与日志", score: 28, required: 100, status: "未通过", detail: "只存在本地日志约定" },
  { name: "发布授权", score: 0, required: 100, status: "待审批", detail: "尚未获得生产发布授权" },
] as const;

export const MATURITY = [
  { dimension: "角色与职责", score: 90, previous: 84, weight: 1 / 6 },
  { dimension: "阶段与审批", score: 62, previous: 58, weight: 1 / 6 },
  { dimension: "产物可追溯", score: 55, previous: 47, weight: 1 / 6 },
  { dimension: "自动化执行", score: 18, previous: 12, weight: 1 / 6 },
  { dimension: "测试与评测", score: 12, previous: 8, weight: 1 / 6 },
  { dimension: "可观测与成本", score: 15, previous: 10, weight: 1 / 6 },
];

export const MATURITY_TREND = [
  { iteration: "基线", score: 29 },
  { iteration: "v0.1", score: 32 },
  { iteration: "v0.2", score: 35 },
  { iteration: "v0.3", score: 38 },
  { iteration: "当前", score: 42 },
];

export const CAPABILITY_HEATMAP = [
  { capability: "角色职责", levels: [1, 1, 1, 1, 1] },
  { capability: "阶段审批", levels: [1, 1, 1, 0, 0] },
  { capability: "产物追溯", levels: [1, 1, 1, 0, 0] },
  { capability: "自动化", levels: [1, 0, 0, 0, 0] },
  { capability: "测试评测", levels: [1, 0, 0, 0, 0] },
  { capability: "可观测成本", levels: [1, 0, 0, 0, 0] },
];

export const IMPROVEMENTS = [
  { name: "结构化状态源", cost: 45, benefit: 88, risk: 90 },
  { name: "审批事件自动记录", cost: 35, benefit: 78, risk: 76 },
  { name: "冒烟测试矩阵", cost: 52, benefit: 72, risk: 82 },
  { name: "成本与日志采集", cost: 68, benefit: 61, risk: 58 },
  { name: "发布回滚演练", cost: 74, benefit: 84, risk: 94 },
];

export const DEMO_SNAPSHOT = "演示快照 · 2026-08-04 16:41";
