import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bug,
  Check,
  Circle,
  Clock,
  Database,
  Info,
  ListChecks,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  DEMO_SNAPSHOT,
  IMPROVEMENTS,
  MATURITY,
  PROJECTS,
  RELEASE_GATES,
  STAGE_OWNERS,
  STAGES,
  type DashboardFilters,
  type DemoProject,
  type StageStatus,
} from "./dashboard-data";

export type DrawerPayload = {
  eyebrow: string;
  title: string;
  content: ReactNode;
};

export type ViewProps = {
  filters: DashboardFilters;
  openDrawer: (payload: DrawerPayload) => void;
};

export const CHART_COLORS = {
  primary: "#13795b",
  accent: "#b7e86b",
  info: "#3478f6",
  success: "#208b62",
  warning: "#d6821f",
  danger: "#c4473d",
  demo: "#7c3aed",
  muted: "#a8b3ae",
  ink: "#16231f",
};

export const STATUS_LABELS: Record<StageStatus, string> = {
  done: "已完成",
  active: "进行中",
  risk: "有风险",
  blocked: "已阻塞",
  approval: "待审批",
  waiting: "未开始",
};

export const STATUS_SYMBOLS: Record<StageStatus, ReactNode> = {
  done: <Check aria-hidden="true" weight="bold" />,
  active: <ArrowRight aria-hidden="true" weight="bold" />,
  risk: <WarningCircle aria-hidden="true" weight="fill" />,
  blocked: <LockKey aria-hidden="true" weight="fill" />,
  approval: <Clock aria-hidden="true" weight="fill" />,
  waiting: <Circle aria-hidden="true" weight="bold" />,
};

export function SourceBadge({ type = "demo" }: { type?: "demo" | "pending" }) {
  return (
    <span className={`source-badge ${type}`}>
      {type === "demo" ? <Database aria-hidden="true" /> : <Clock aria-hidden="true" />}
      {type === "demo" ? "演示数据" : "待接入"}
    </span>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = "",
  source = "demo",
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  source?: "demo" | "pending";
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="panel-actions">
          <SourceBadge type={source} />
          {action}
        </div>
      </div>
      {children}
      <div className="panel-meta">
        <span>{source === "demo" ? DEMO_SNAPSHOT : "尚未连接真实数据源"}</span>
        <span>来源：{source === "demo" ? "前端演示快照" : "待接入工作流状态源"}</span>
      </div>
    </section>
  );
}

export function ChartPanel({
  title,
  subtitle,
  summary,
  table,
  children,
  className = "",
  source = "demo",
}: {
  title: string;
  subtitle?: string;
  summary: string;
  table: ReactNode;
  children: ReactNode;
  className?: string;
  source?: "demo" | "pending";
}) {
  const [showTable, setShowTable] = useState(false);
  const summaryId = `chart-summary-${title.replace(/\s+/g, "-")}`;

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      className={`chart-panel ${className}`}
      source={source}
      action={
        <button className="text-button" type="button" onClick={() => setShowTable((value) => !value)}>
          <ListChecks aria-hidden="true" />
          {showTable ? "收起数据表" : "查看数据表"}
        </button>
      }
    >
      <p className="sr-only" id={summaryId}>{summary}</p>
      <div className="chart-canvas" aria-hidden="true">{children}</div>
      {showTable && <div className="chart-data-table" aria-describedby={summaryId}>{table}</div>}
    </Panel>
  );
}

export function DataTable({ headers, rows, caption }: { headers: string[]; rows: Array<Array<ReactNode>>; caption: string }) {
  return (
    <div className="table-scroll" tabIndex={0} aria-label={`${caption}，可横向滚动`}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${caption}-${rowIndex}`}>
              {row.map((cell, cellIndex) => cellIndex === 0
                ? <th key={cellIndex} scope="row">{cell}</th>
                : <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatCard({ label, value, note, tone = "default", icon }: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "success" | "warning" | "danger" | "demo";
  icon: ReactNode;
}) {
  return <article className={`stat-card ${tone}`}><div className="stat-icon" aria-hidden="true">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small><SourceBadge /></article>;
}

export function StageMatrix({ projects = PROJECTS, compact = false, openDrawer }: {
  projects?: DemoProject[];
  compact?: boolean;
  openDrawer: (payload: DrawerPayload) => void;
}) {
  return (
    <div className={`stage-matrix ${compact ? "compact" : ""}`}>
      <div className="stage-matrix-scroll" tabIndex={0} aria-label="项目与阶段矩阵，可横向滚动">
        <table className="stage-matrix-grid">
          <caption className="sr-only">项目与阶段 0 至 10 状态矩阵</caption>
          <thead>
            <tr>
              <th className="matrix-corner" scope="col">项目</th>
              {STAGES.map((stage, index) => <th className="matrix-stage-head" scope="col" key={stage} title={`阶段 ${index}：${stage}`}><span className="matrix-stage-head-content"><strong>{index}</strong>{!compact && <span>{stage}</span>}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr className="matrix-row" key={project.id}>
                <th className="matrix-project" scope="row"><span className="matrix-project-content"><strong>{project.name}</strong><span>{project.kind}</span></span></th>
                {project.stages.map((status, stageIndex) => (
                  <td className="matrix-cell-slot" key={`${project.id}-${stageIndex}`}>
                    <button
                      type="button"
                      className={`matrix-cell ${status} ${project.stage === stageIndex ? "current" : ""}`}
                      aria-label={`${project.name}，阶段 ${stageIndex} ${STAGES[stageIndex]}，${STATUS_LABELS[status]}${project.stage === stageIndex ? "，当前阶段" : ""}`}
                      title={`${STAGES[stageIndex]} · ${STATUS_LABELS[status]}`}
                      onClick={() => openDrawer({ eyebrow: `${project.name} · 阶段 ${stageIndex}`, title: STAGES[stageIndex], content: <StageEvidence project={project} stageIndex={stageIndex} status={status} /> })}
                    >{STATUS_SYMBOLS[status]}</button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="matrix-legend" aria-label="阶段状态图例">
        {(Object.keys(STATUS_LABELS) as StageStatus[]).map((status) => <span key={status} className={status}>{STATUS_SYMBOLS[status]}{STATUS_LABELS[status]}</span>)}
      </div>
    </div>
  );
}

export function StageEvidence({ project, stageIndex, status }: { project: DemoProject; stageIndex: number; status: StageStatus }) {
  return (
    <div className="drawer-detail-stack">
      <div className="drawer-callout demo"><Database aria-hidden="true" /><p><strong>演示数据</strong>本详情不会读取或写入真实项目状态。</p></div>
      <dl className="detail-list">
        <div><dt>项目类型</dt><dd>{project.kind}</dd></div>
        <div><dt>阶段状态</dt><dd>{STATUS_LABELS[status]}</dd></div>
        <div><dt>责任角色</dt><dd>{STAGE_OWNERS[stageIndex]}</dd></div>
        <div><dt>证据数量</dt><dd>待接入</dd></div>
        <div><dt>更新时间</dt><dd>{DEMO_SNAPSHOT}</dd></div>
      </dl>
      <div className="drawer-section"><h3>证据边界</h3><p>当前界面只展示批准的演示快照；真实产物、审批、阻塞原因和事件流将在后续数据接入单元中读取。</p></div>
    </div>
  );
}

export function ReleaseBars({ compact = false }: { compact?: boolean }) {
  return <div className={`release-bars ${compact ? "compact" : ""}`}>{RELEASE_GATES.map((gate) => <div className="release-bar" key={gate.name}><div><strong>{gate.name}</strong><span>{gate.status}</span></div><div className="bullet-track" aria-label={`${gate.name} ${gate.score}%，目标 ${gate.required}%`}><i style={{ width: `${gate.score}%` }} /><b style={{ left: `${gate.required}%` }} /></div>{!compact && <small>{gate.detail}</small>}</div>)}</div>;
}

export function MaturityBars({ compact = false }: { compact?: boolean }) {
  return <div className={`maturity-bars ${compact ? "compact" : ""}`}>{MATURITY.map((item) => <div className="maturity-row" key={item.dimension}><div><span>{item.dimension}</span><strong>{item.score}</strong></div><div className="score-track"><i style={{ width: `${item.score}%` }} /></div>{!compact && <small>较上轮 +{item.score - item.previous}</small>}</div>)}</div>;
}

export function FilterUnavailableState({ title, detail }: { title: string; detail: string }) {
  return <section className="filter-unavailable" role="status" data-filter-unavailable><Database aria-hidden="true" /><div><span>筛选覆盖不可用</span><h2>{title}</h2><p>{detail}</p><small>请调整全局筛选；此状态不是“真实数量为 0”。</small></div></section>;
}

export function ReleaseGateDetails() {
  return <div className="drawer-detail-stack"><div className="drawer-callout danger"><WarningCircle aria-hidden="true" /><p><strong>发布阻塞</strong>存在未关闭 Blocker，必要门禁未通过。</p></div><ReleaseBars /><div className="drawer-section"><h3>已知边界</h3><p>候选版本、健康检查、回滚点和审批记录均未接入。当前页面不会生成或执行生产发布。</p></div></div>;
}

export function QueueDetail({ role, wait, artifact }: { role: string; wait: string; artifact: string }) {
  return <div className="drawer-detail-stack"><dl className="detail-list"><div><dt>等待角色</dt><dd>{role}</dd></div><div><dt>对应交付物</dt><dd>{artifact}</dd></div><div><dt>等待时长</dt><dd>{wait}</dd></div><div><dt>审批所有者</dt><dd>超级无敌帅超超总</dd></div><div><dt>数据来源</dt><dd>演示数据</dd></div></dl><div className="drawer-callout demo"><Database aria-hidden="true" /><p><strong>非实时队列</strong>本条用于验证界面，不代表当前真实审批待办。</p></div></div>;
}

export function GateDetail({ status, detail }: { status: string; detail: string }) {
  return <div className="drawer-detail-stack"><div className="drawer-callout warning"><WarningCircle aria-hidden="true" /><p><strong>{status}</strong>{detail}</p></div><dl className="detail-list"><div><dt>证据来源</dt><dd>待接入</dd></div><div><dt>计算口径</dt><dd>门禁必须有可追溯证据后才可通过</dd></div><div><dt>审批要求</dt><dd>状态变更需要对应工作流审核</dd></div></dl></div>;
}

export function MaturityFormula({ score }: { score: number }) {
  return <div className="drawer-detail-stack"><div className="formula-box">({MATURITY.map((item) => item.score).join(" + ")}) ÷ 6 = <strong>{score}</strong></div><DataTable caption="成熟度评分依据" headers={["维度", "分数", "权重", "证据"]} rows={MATURITY.map((item) => [item.dimension, item.score, "16.67%", "演示数据 / 待接入真实证据"])} /><div className="drawer-section"><h3>缺失证据</h3><p>自动化运行、正式测试报告、观测指标与成本记录尚未接入，因此本分数只能作为界面演示，不应用于真实治理决策。</p></div></div>;
}

export function ImprovementDetail() {
  return <div className="drawer-detail-stack"><div className="drawer-section"><h3>优先建议</h3><p>先建立结构化状态源和审批事件记录，再扩展自动化测试、发布回滚演练与成本观测。此顺序来自演示评分，不构成已批准项目计划。</p></div><DataTable caption="改进项建议" headers={["改进项", "成本", "收益", "风险影响"]} rows={IMPROVEMENTS.map((item) => [item.name, item.cost, item.benefit, item.risk])} /></div>;
}

export function SeverityTag({ severity }: { severity: string }) {
  return <span className={`severity-tag severity-${severity.toLowerCase()}`}>{severity === "Blocker" ? <WarningCircle aria-hidden="true" /> : severity === "Major" ? <Bug aria-hidden="true" /> : <Info aria-hidden="true" />}{severity}</span>;
}
