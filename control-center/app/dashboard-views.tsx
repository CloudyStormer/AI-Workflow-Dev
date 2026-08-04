import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  ArrowRight,
  Bug,
  Check,
  CheckCircle,
  CircleNotch,
  Circle,
  Clock,
  Database,
  FileText,
  Funnel,
  GitBranch,
  Info,
  ListChecks,
  LockKey,
  MagnifyingGlass,
  RocketLaunch,
  Target,
  TrendUp,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  BURN_DOWN,
  CAPABILITY_HEATMAP,
  CUMULATIVE_FLOW,
  DEFECT_AGING,
  DEFECT_STACK,
  DEMO_SNAPSHOT,
  IMPROVEMENTS,
  ISSUES,
  MATURITY,
  MATURITY_TREND,
  PROJECTS,
  RELEASE_GATES,
  RETEST_TREND,
  ROLES,
  ROLE_STATUS_DATA,
  STAGES,
  type DemoProject,
  type StageStatus,
  type ViewId,
} from "./dashboard-data";

export type DrawerPayload = {
  eyebrow: string;
  title: string;
  content: ReactNode;
};

type ViewProps = {
  view: ViewId;
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  openDrawer: (payload: DrawerPayload) => void;
  showNotice: (message: string) => void;
};

const CHART_COLORS = {
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

const STATUS_LABELS: Record<StageStatus, string> = {
  done: "已完成",
  active: "进行中",
  risk: "有风险",
  blocked: "已阻塞",
  approval: "待审批",
  waiting: "未开始",
};

const STATUS_SYMBOLS: Record<StageStatus, ReactNode> = {
  done: <Check aria-hidden="true" weight="bold" />,
  active: <ArrowRight aria-hidden="true" weight="bold" />,
  risk: <WarningCircle aria-hidden="true" weight="fill" />,
  blocked: <LockKey aria-hidden="true" weight="fill" />,
  approval: <Clock aria-hidden="true" weight="fill" />,
  waiting: <Circle aria-hidden="true" weight="bold" />,
};

function SourceBadge({ type = "demo" }: { type?: "demo" | "pending" }) {
  return (
    <span className={`source-badge ${type}`}>
      {type === "demo" ? <Database aria-hidden="true" /> : <Clock aria-hidden="true" />}
      {type === "demo" ? "演示数据" : "待接入"}
    </span>
  );
}

function Panel({
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

function ChartPanel({
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

function DataTable({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  caption: string;
}) {
  return (
    <div className="table-scroll" tabIndex={0} aria-label={`${caption}，可横向滚动`}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${caption}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                cellIndex === 0
                  ? <th key={cellIndex} scope="row">{cell}</th>
                  : <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "success" | "warning" | "danger" | "demo";
  icon: ReactNode;
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <SourceBadge />
    </article>
  );
}

function StageMatrix({
  projects = PROJECTS,
  compact = false,
  openDrawer,
}: {
  projects?: DemoProject[];
  compact?: boolean;
  openDrawer: (payload: DrawerPayload) => void;
}) {
  return (
    <div className={`stage-matrix ${compact ? "compact" : ""}`}>
      <div className="stage-matrix-scroll" tabIndex={0} aria-label="项目与阶段矩阵，可横向滚动">
        <div className="stage-matrix-grid" role="grid" aria-label="项目与阶段 0 至 10 状态矩阵">
          <div className="matrix-corner" role="columnheader">项目</div>
          {STAGES.map((stage, index) => (
            <div className="matrix-stage-head" role="columnheader" key={stage} title={`阶段 ${index}：${stage}`}>
              <strong>{index}</strong>
              {!compact && <span>{stage}</span>}
            </div>
          ))}
          {projects.map((project) => (
            <div className="matrix-row" role="row" key={project.id}>
              <div className="matrix-project" role="rowheader">
                <strong>{project.name}</strong>
                <span>{project.kind}</span>
              </div>
              {project.stages.map((status, stageIndex) => (
                <button
                  type="button"
                  key={`${project.id}-${stageIndex}`}
                  className={`matrix-cell ${status} ${project.stage === stageIndex ? "current" : ""}`}
                  aria-label={`${project.name}，阶段 ${stageIndex} ${STAGES[stageIndex]}，${STATUS_LABELS[status]}${project.stage === stageIndex ? "，当前阶段" : ""}`}
                  title={`${STAGES[stageIndex]} · ${STATUS_LABELS[status]}`}
                  onClick={() => openDrawer({
                    eyebrow: `${project.name} · 阶段 ${stageIndex}`,
                    title: STAGES[stageIndex],
                    content: <StageEvidence project={project} stageIndex={stageIndex} status={status} />,
                  })}
                >
                  {STATUS_SYMBOLS[status]}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="matrix-legend" aria-label="阶段状态图例">
        {(Object.keys(STATUS_LABELS) as StageStatus[]).map((status) => (
          <span key={status} className={status}>{STATUS_SYMBOLS[status]}{STATUS_LABELS[status]}</span>
        ))}
      </div>
    </div>
  );
}

function StageEvidence({ project, stageIndex, status }: { project: DemoProject; stageIndex: number; status: StageStatus }) {
  return (
    <div className="drawer-detail-stack">
      <div className="drawer-callout demo">
        <Database aria-hidden="true" />
        <p><strong>演示数据</strong>本详情不会读取或写入真实项目状态。</p>
      </div>
      <dl className="detail-list">
        <div><dt>项目类型</dt><dd>{project.kind}</dd></div>
        <div><dt>阶段状态</dt><dd>{STATUS_LABELS[status]}</dd></div>
        <div><dt>责任角色</dt><dd>{stageIndex <= 1 ? "项目经理" : stageIndex === 2 ? "产品经理" : stageIndex === 3 ? "UI/UX 设计师" : stageIndex === 4 ? "架构师" : stageIndex === 6 ? "前端 / 后端工程师" : stageIndex === 7 ? "代码审查员" : stageIndex === 8 ? "QA" : stageIndex === 9 ? "DevOps" : "项目经理"}</dd></div>
        <div><dt>证据数量</dt><dd>待接入</dd></div>
        <div><dt>更新时间</dt><dd>{DEMO_SNAPSHOT}</dd></div>
      </dl>
      <div className="drawer-section">
        <h3>证据边界</h3>
        <p>当前界面只展示批准的演示快照；真实产物、审批、阻塞原因和事件流将在后续数据接入单元中读取。</p>
      </div>
    </div>
  );
}

function ReleaseBars({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`release-bars ${compact ? "compact" : ""}`}>
      {RELEASE_GATES.map((gate) => (
        <div className="release-bar" key={gate.name}>
          <div><strong>{gate.name}</strong><span>{gate.status}</span></div>
          <div className="bullet-track" aria-label={`${gate.name} ${gate.score}%，目标 ${gate.required}%`}>
            <i style={{ width: `${gate.score}%` }} />
            <b style={{ left: `${gate.required}%` }} />
          </div>
          {!compact && <small>{gate.detail}</small>}
        </div>
      ))}
    </div>
  );
}

function MaturityBars({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`maturity-bars ${compact ? "compact" : ""}`}>
      {MATURITY.map((item) => (
        <div className="maturity-row" key={item.dimension}>
          <div><span>{item.dimension}</span><strong>{item.score}</strong></div>
          <div className="score-track"><i style={{ width: `${item.score}%` }} /></div>
          {!compact && <small>较上轮 +{item.score - item.previous}</small>}
        </div>
      ))}
    </div>
  );
}

function OverviewView({ openDrawer }: Pick<ViewProps, "openDrawer">) {
  const maturityScore = Math.round(MATURITY.reduce((sum, item) => sum + item.score * item.weight, 0));
  const defectPie = [
    { name: "Blocker", value: 1, fill: CHART_COLORS.danger },
    { name: "Major", value: 3, fill: CHART_COLORS.warning },
    { name: "Minor", value: 1, fill: CHART_COLORS.info },
  ];

  return (
    <div className="view-stack" data-view="overview">
      <section className="decision-strip" aria-label="关键决策信号">
        <StatCard label="当前项目" value="4" note="1 个治理根项目 · 3 个实验样本" icon={<Target />} />
        <StatCard label="当前阶段" value="阶段 6" note="小批量开发" tone="success" icon={<GitBranch />} />
        <StatCard label="Blocker" value="1" note="英语项目处于产品变更冻结" tone="danger" icon={<WarningCircle />} />
        <StatCard label="下一审批" value="前端交付" note="Control Center 本批待审核" tone="demo" icon={<Clock />} />
        <StatCard label="发布就绪度" value="18%" note="必要门禁未通过 · 阻塞" tone="warning" icon={<RocketLaunch />} />
        <StatCard label="数据新鲜度" value="演示快照" note="非实时 · 真实来源待接入" tone="demo" icon={<Database />} />
      </section>

      <div className="overview-grid">
        <Panel title="项目 × 阶段全景" subtitle="阶段 0–10 · 点击单元格查看证据边界" className="overview-matrix">
          <StageMatrix compact openDrawer={openDrawer} />
        </Panel>

        <ChartPanel
          title="质量快照"
          subtitle="开放缺陷 5 项"
          summary="开放缺陷共 5 项，其中 Blocker 1 项、Major 3 项、Minor 1 项。"
          table={<DataTable caption="缺陷严重度明细" headers={["严重度", "数量"]} rows={defectPie.map((item) => [item.name, item.value])} />}
          className="quality-snapshot"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={defectPie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3}>
                {defectPie.map((item) => <Cell key={item.name} fill={item.fill} />)}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={28} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Panel title="发布快照" subtitle="六项必要门禁 · 当前明确阻塞" className="release-snapshot">
          <ReleaseBars compact />
          <button type="button" className="panel-link" onClick={() => openDrawer({
            eyebrow: "迭代与发布",
            title: "发布阻塞说明",
            content: <ReleaseGateDetails />,
          })}>查看门禁证据 <ArrowRight aria-hidden="true" /></button>
        </Panel>

        <ChartPanel
          title="成熟度快照"
          subtitle={`${maturityScore}/100 · 最薄弱：测试与评测、可观测与成本`}
          summary={`工作流成熟度总分 ${maturityScore}，由六个维度等权计算。角色与职责 90，阶段与审批 62，产物可追溯 55，自动化执行 18，测试与评测 12，可观测与成本 15。`}
          table={<DataTable caption="成熟度六维数据" headers={["维度", "当前", "上轮"]} rows={MATURITY.map((item) => [item.dimension, item.score, item.previous])} />}
          className="maturity-snapshot"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={MATURITY} outerRadius="68%">
              <PolarGrid stroke="#dce4de" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#66736e", fontSize: 10 }} />
              <Radar name="当前" dataKey="score" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.34} />
              <Radar name="上轮" dataKey="previous" stroke={CHART_COLORS.demo} fill={CHART_COLORS.demo} fillOpacity={0.08} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Panel title="当前项目阶段流水线" subtitle="AI Workflow Control Center · 当前阶段 6" className="overview-pipeline">
          <div className="pipeline" aria-label="阶段 0 至 10 流水线">
            {STAGES.map((stage, index) => {
              const status: StageStatus = index < 6 ? "done" : index === 6 ? "active" : "waiting";
              return (
                <button key={stage} type="button" className={`pipeline-node ${status}`} onClick={() => openDrawer({
                  eyebrow: `阶段 ${index}`,
                  title: stage,
                  content: <StageEvidence project={PROJECTS[0]} stageIndex={index} status={status} />,
                })}>
                  <span>{STATUS_SYMBOLS[status]}</span>
                  <strong>{index}</strong>
                  <small>{stage}</small>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ProjectsView({ selectedProjectId, onProjectChange, openDrawer }: Omit<ViewProps, "view" | "showNotice">) {
  const selectedProject = PROJECTS.find((project) => project.id === selectedProjectId) ?? PROJECTS[0];
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const filteredProjects = statusFilter === "全部状态"
    ? PROJECTS
    : PROJECTS.filter((project) => project.risk.includes(statusFilter.replace("项目", "")));

  return (
    <div className="view-stack" data-view="projects">
      <section className="filter-row" aria-label="项目筛选">
        <label>项目状态<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>全部状态</option><option>冻结项目</option><option>待审批项目</option><option>待接入项目</option></select></label>
        <label>责任角色<select defaultValue="全部角色"><option>全部角色</option><option>项目经理</option><option>产品经理</option><option>前端工程师</option></select></label>
        <label>数据来源<select defaultValue="演示数据"><option>演示数据</option><option>待接入</option></select></label>
        <button type="button" className="outline-button" onClick={() => setStatusFilter("全部状态")}><Funnel aria-hidden="true" />清除筛选</button>
      </section>

      <section className="project-card-grid" aria-label="项目卡片矩阵">
        {filteredProjects.map((project) => (
          <button
            type="button"
            key={project.id}
            className={`project-card ${selectedProject.id === project.id ? "selected" : ""}`}
            onClick={() => onProjectChange(project.id)}
          >
            <div><span className="project-kind">{project.kind}</span><SourceBadge /></div>
            <h2>{project.name}</h2>
            <dl>
              <div><dt>当前阶段</dt><dd>{project.stage} · {STAGES[project.stage]}</dd></div>
              <div><dt>开放缺陷</dt><dd>{project.openIssues ?? "待接入"}</dd></div>
              <div><dt>下一审批</dt><dd>{project.nextApproval}</dd></div>
            </dl>
            <div className="project-progress"><i style={{ width: `${project.progress}%` }} /><span>{project.progress}%</span></div>
            <span className={`project-risk ${project.stages[project.stage]}`}>{STATUS_SYMBOLS[project.stages[project.stage]]}{project.risk}</span>
          </button>
        ))}
      </section>

      <Panel title="项目阶段热力矩阵" subtitle="阶段 0–10 完整展示 · 状态、审批与当前阶段三重编码">
        <StageMatrix projects={filteredProjects} openDrawer={openDrawer} />
      </Panel>

      <Panel title={`${selectedProject.name} · 阶段详情`} subtitle={`${selectedProject.kind} · 当前阶段 ${selectedProject.stage}`}>
        <div className="project-detail-grid">
          <div className="project-detail-main">
            <div className="pipeline compact" aria-label={`${selectedProject.name} 阶段流水线`}>
              {selectedProject.stages.map((status, index) => (
                <button key={STAGES[index]} type="button" className={`pipeline-node ${status}`} onClick={() => openDrawer({
                  eyebrow: `${selectedProject.name} · 阶段 ${index}`,
                  title: STAGES[index],
                  content: <StageEvidence project={selectedProject} stageIndex={index} status={status} />,
                })}>
                  <span>{STATUS_SYMBOLS[status]}</span><strong>{index}</strong><small>{STAGES[index]}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="evidence-metrics">
            <div><span>任务完成度</span><strong>{selectedProject.progress}%</strong><small>演示计算</small></div>
            <div><span>产物覆盖率</span><strong>待接入</strong><small>未读取 artifacts.yaml</small></div>
            <div><span>审批证据</span><strong>待接入</strong><small>未读取 approvals.yaml</small></div>
            <div><span>下一行动</span><strong>{selectedProject.nextApproval}</strong><small>模拟状态</small></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function RolesView({ openDrawer }: Pick<ViewProps, "openDrawer">) {
  const [selectedRoleId, setSelectedRoleId] = useState("06");
  const selectedRole = ROLES.find((role) => role.id === selectedRoleId) ?? ROLES[5];

  return (
    <div className="view-stack" data-view="roles">
      <div className="roles-top-grid">
        <ChartPanel
          title="角色状态分布"
          subtitle="11 个固定核心角色"
          summary="固定角色共 11 个：工作中 3 个、待命 5 个、待审批 2 个、待接入 1 个。"
          table={<DataTable caption="角色状态分布" headers={["状态", "数量"]} rows={ROLE_STATUS_DATA.map((item) => [item.name, item.value])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={ROLE_STATUS_DATA} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="78%">{ROLE_STATUS_DATA.map((item) => <Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Panel title="入场与审批队列" subtitle="等待超级无敌帅超超总决策" className="approval-queue">
          <div className="queue-list">
            <button type="button" onClick={() => openDrawer({ eyebrow: "角色入场", title: "UI/UX 设计师 · 设计交付审核", content: <QueueDetail role="UI/UX 设计师" wait="2 小时" artifact="UI 视觉基线" /> })}><Clock aria-hidden="true" /><span><strong>UI/UX 设计师</strong><small>UI 视觉基线 · 等待 2 小时</small></span><b>待审批</b></button>
            <button type="button" onClick={() => openDrawer({ eyebrow: "发布门禁", title: "DevOps · 生产发布授权", content: <QueueDetail role="DevOps" wait="待前置门禁" artifact="发布方案" /> })}><LockKey aria-hidden="true" /><span><strong>DevOps</strong><small>发布方案 · 前置门禁未通过</small></span><b>待审批</b></button>
          </div>
        </Panel>
      </div>

      <Panel title="角色协作泳道" subtitle="按固定角色顺序展示入场、执行、交付、审核与等待">
        <div className="role-lanes" role="list" aria-label="角色协作泳道">
          {ROLES.map((role) => (
            <button type="button" role="listitem" key={role.id} className={selectedRoleId === role.id ? "selected" : ""} onClick={() => setSelectedRoleId(role.id)}>
              <span className="role-index">{role.id}</span>
              <span className="role-name"><strong>{role.name}</strong><small>{role.lane}泳道</small></span>
              <span className={`role-state state-${role.status}`}>{role.status === "工作中" ? <TrendUp /> : role.status === "待审批" ? <Clock /> : role.status === "待接入" ? <Database /> : <CheckCircle />}{role.status}</span>
              <span className="role-handoff"><small>下一交接</small>{role.handoff}</span>
              <span className="role-load"><i style={{ width: `${role.workload}%` }} /><b>{role.workload}%</b></span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="roles-bottom-grid">
        <ChartPanel
          title="角色工作负载"
          subtitle="分配任务占用率 · 点击上方角色交叉筛选"
          summary={`当前选中 ${selectedRole.name}，工作负载 ${selectedRole.workload}%，进行中 ${selectedRole.active} 项，阻塞 ${selectedRole.blocked} 项。`}
          table={<DataTable caption="角色工作负载" headers={["角色", "负载", "进行中", "阻塞"]} rows={ROLES.map((role) => [role.name, `${role.workload}%`, role.active, role.blocked])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ROLES} layout="vertical" margin={{ left: 8, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} unit="%" /><YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="workload" name="负载" fill={CHART_COLORS.primary} radius={[0, 5, 5, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <Panel title={`${selectedRole.name} · 当前协作`} subtitle="点击查看完整角色证据">
          <div className="selected-role-card">
            <div className="selected-role-icon"><UserCircle aria-hidden="true" /></div>
            <div><span>状态</span><strong>{selectedRole.status}</strong></div>
            <div><span>当前负载</span><strong>{selectedRole.workload}%</strong></div>
            <div><span>阻塞</span><strong>{selectedRole.blocked}</strong></div>
            <div><span>下一交接</span><strong>{selectedRole.handoff}</strong></div>
            <button type="button" className="primary-button" onClick={() => openDrawer({ eyebrow: `固定角色 ${selectedRole.id}`, title: selectedRole.name, content: <RoleDetail role={selectedRole} /> })}>查看角色详情 <ArrowRight aria-hidden="true" /></button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function QualityView({ openDrawer, showNotice }: Pick<ViewProps, "openDrawer" | "showNotice">) {
  const [severity, setSeverity] = useState("全部");
  const [confirmIssue, setConfirmIssue] = useState<string | null>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const confirmTriggerRef = useRef<HTMLElement | null>(null);
  const visibleIssues = severity === "全部" ? ISSUES : ISSUES.filter((issue) => issue.severity === severity);

  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirmIssue && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => confirmCancelRef.current?.focus({ preventScroll: true }));
    }
  }, [confirmIssue]);

  useEffect(() => {
    if (confirmIssue) return;
    const focusTimer = window.setTimeout(() => confirmTriggerRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(focusTimer);
  }, [confirmIssue]);

  function requestSimulation(issueId: string) {
    confirmTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setConfirmIssue(issueId);
  }

  function closeSimulation() {
    confirmDialogRef.current?.close();
    setConfirmIssue(null);
  }

  function simulateStatusChange() {
    closeSimulation();
    showNotice("模拟操作已记录在当前页面，不会写入真实数据");
  }

  return (
    <div className="view-stack" data-view="quality">
      <Panel title="缺陷状态流水" subtitle="待修复 → 修复中 → 待复测 → 已关闭">
        <div className="defect-flow" aria-label="缺陷状态流水">
          {DEFECT_STACK.map((item, index) => {
            const total = item.Blocker + item.Major + item.Minor;
            return <div key={item.status}><span>{index + 1}</span><strong>{item.status}</strong><b>{total}</b><small>{total === 0 ? "—" : `占开放缺陷 ${Math.round(total / 5 * 100)}%`}</small>{index < DEFECT_STACK.length - 1 && <ArrowRight aria-hidden="true" />}</div>;
          })}
        </div>
      </Panel>

      <div className="quality-chart-grid">
        <ChartPanel
          title="严重度 × 状态"
          subtitle="单位：缺陷数"
          summary="待修复 3 项、修复中 1 项、待复测 1 项、已关闭 0 项；严重度为 Blocker 1、Major 3、Minor 1。"
          table={<DataTable caption="缺陷严重度与状态" headers={["状态", "Blocker", "Major", "Minor"]} rows={DEFECT_STACK.map((item) => [item.status, item.Blocker, item.Major, item.Minor])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><BarChart data={DEFECT_STACK}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Blocker" stackId="defect" fill={CHART_COLORS.danger} /><Bar dataKey="Major" stackId="defect" fill={CHART_COLORS.warning} /><Bar dataKey="Minor" stackId="defect" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="复测通过率趋势"
          subtitle="单位：% · 同时展示通过、失败、未执行"
          summary="演示复测通过率由通过数除以通过与失败之和计算，最新快照为 80%。"
          table={<DataTable caption="复测趋势" headers={["日期", "通过", "失败", "未执行", "通过率"]} rows={RETEST_TREND.map((item) => [item.date, item.passed, item.failed, item.notRun, `${item.rate}%`])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><LineChart data={RETEST_TREND}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis domain={[0, 100]} unit="%" /><Tooltip /><Legend /><Line type="monotone" dataKey="rate" name="通过率" stroke={CHART_COLORS.primary} strokeWidth={3} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="notRun" name="未执行数量" stroke={CHART_COLORS.muted} strokeDasharray="5 4" /></LineChart></ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="缺陷老化分布"
          subtitle="Blocker 超过 7 天需要优先处理"
          summary="缺陷老化分布：0 至 1 天 2 项，2 至 3 天 1 项，4 至 7 天 1 项，7 天以上 1 项且为 Blocker。"
          table={<DataTable caption="缺陷老化分布" headers={["老化区间", "数量"]} rows={DEFECT_AGING.map((item) => [item.bucket, item.count])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><BarChart data={DEFECT_AGING}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="缺陷数" radius={[5, 5, 0, 0]}>{DEFECT_AGING.map((item) => <Cell key={item.bucket} fill={item.bucket === "7 天以上" ? CHART_COLORS.danger : CHART_COLORS.primary} />)}</Bar></BarChart></ResponsiveContainer>
        </ChartPanel>
      </div>

      <Panel title="质量门禁" subtitle="关键状态使用图标、文字与颜色三重表达">
        <div className="gate-grid">
          {[
            ["Blocker 归零", "未通过", "仍有 1 项 Blocker", "danger"],
            ["P0/P1 审查问题", "待接入", "审查数据源尚未连接", "pending"],
            ["回归测试", "未通过", "尚未形成完整回归证据", "danger"],
            ["自动化冒烟", "未通过", "仅有基础渲染验证", "danger"],
            ["测试报告", "待接入", "未读取测试报告", "pending"],
            ["发布建议批准", "待审批", "需要超级无敌帅超超总批准", "warning"],
          ].map(([name, status, detail, tone]) => (
            <button type="button" key={name} className={`gate-card ${tone}`} onClick={() => openDrawer({ eyebrow: "质量门禁", title: name, content: <GateDetail status={status} detail={detail} /> })}>
              {tone === "pending" ? <Database /> : tone === "warning" ? <Clock /> : <WarningCircle />}
              <span><strong>{name}</strong><small>{detail}</small></span><b>{status}</b>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="缺陷明细"
        subtitle={`${visibleIssues.length} 项 · 演示缺陷，不代表真实项目事实`}
        action={<div className="segmented-filter" aria-label="严重度筛选">{["全部", "Blocker", "Major", "Minor"].map((item) => <button type="button" key={item} className={severity === item ? "active" : ""} onClick={() => setSeverity(item)}>{item}</button>)}</div>}
      >
        <div className="desktop-issue-table">
          <DataTable caption="缺陷明细" headers={["ID", "标题", "严重度", "模块", "负责人", "状态", "老化", "复测", "操作"]} rows={visibleIssues.map((issue) => [issue.id, issue.title, <SeverityTag key={issue.id} severity={issue.severity} />, issue.module, issue.owner, issue.status, issue.age, issue.retest, <button key={`${issue.id}-action`} type="button" className="table-action" onClick={() => requestSimulation(issue.id)}>模拟流转</button>])} />
        </div>
        <div className="mobile-issue-list">
          {visibleIssues.map((issue) => <article key={issue.id}><div><SeverityTag severity={issue.severity} /><code>{issue.id}</code></div><h3>{issue.title}</h3><dl><div><dt>状态</dt><dd>{issue.status}</dd></div><div><dt>负责人</dt><dd>{issue.owner}</dd></div><div><dt>复测</dt><dd>{issue.retest}</dd></div></dl><button type="button" onClick={() => requestSimulation(issue.id)}>模拟流转</button></article>)}
        </div>
      </Panel>

      {confirmIssue && (
        <dialog
          ref={confirmDialogRef}
          className="inline-confirm"
          aria-labelledby="simulate-title"
          aria-describedby="simulate-description"
          onCancel={(event) => { event.preventDefault(); closeSimulation(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeSimulation();
            }
          }}
          onClose={() => setConfirmIssue(null)}
        >
          <div><WarningCircle aria-hidden="true" /><h2 id="simulate-title">确认模拟缺陷流转？</h2><p id="simulate-description">影响范围：仅当前浏览器界面。此操作不会写入 API、数据库或真实工作流记录，也不代表审批已通过。</p><div><button ref={confirmCancelRef} type="button" onClick={closeSimulation}>取消</button><button type="button" className="primary-button" onClick={simulateStatusChange}>确认模拟</button></div></div>
        </dialog>
      )}
    </div>
  );
}

function ReleasesView({ openDrawer }: Pick<ViewProps, "openDrawer">) {
  return (
    <div className="view-stack" data-view="releases">
      <div className="release-status-banner"><WarningCircle aria-hidden="true" weight="fill" /><div><strong>发布状态：阻塞</strong><span>存在未关闭 Blocker，且构建、测试、安全、回滚、监控与发布授权门禁均未通过。</span></div><SourceBadge /></div>

      <div className="release-chart-grid">
        <ChartPanel
          title="迭代燃尽图"
          subtitle="MVP v1.0 · 剩余任务数"
          summary="当前迭代初始范围 26 项，后续增加至 28 项；第 7 天实际仍剩 23 项，明显偏离理想燃尽。"
          table={<DataTable caption="迭代燃尽数据" headers={["日期", "理想剩余", "实际剩余", "范围"]} rows={BURN_DOWN.map((item) => [item.day, item.ideal, item.actual, item.scope])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><LineChart data={BURN_DOWN}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line dataKey="ideal" name="理想燃尽" stroke={CHART_COLORS.info} strokeWidth={2} /><Line dataKey="actual" name="实际燃尽" stroke={CHART_COLORS.primary} strokeWidth={3} /><Line dataKey="scope" name="范围" stroke={CHART_COLORS.muted} strokeDasharray="5 4" /></LineChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel
          title="累积流图"
          subtitle="观察工作堆积位置"
          summary="演示数据表明进行中任务逐日上升，已完成仅 1 项，审查与测试阶段尚未形成稳定流动。"
          table={<DataTable caption="累积流数据" headers={["日期", "待开始", "进行中", "审查中", "测试中", "已完成"]} rows={CUMULATIVE_FLOW.map((item) => [item.day, item.todo, item.doing, item.review, item.testing, item.done])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={CUMULATIVE_FLOW}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Area type="monotone" dataKey="todo" name="待开始" stackId="flow" stroke="#a8b3ae" fill="#dce4de" /><Area type="monotone" dataKey="doing" name="进行中" stackId="flow" stroke={CHART_COLORS.info} fill="#8ab7ff" /><Area type="monotone" dataKey="review" name="审查中" stackId="flow" stroke={CHART_COLORS.demo} fill="#b79af4" /><Area type="monotone" dataKey="testing" name="测试中" stackId="flow" stroke={CHART_COLORS.warning} fill="#efbc79" /><Area type="monotone" dataKey="done" name="已完成" stackId="flow" stroke={CHART_COLORS.success} fill="#82cdb1" /></AreaChart></ResponsiveContainer>
        </ChartPanel>
      </div>

      <Panel title="迭代路线图" subtitle="当前、下一与已完成迭代">
        <div className="roadmap-grid">
          <article><span>已完成迭代</span><h3>工作流治理 v0.3</h3><strong>100%</strong><p>完成固定角色池与一跳授权门禁。</p><SourceBadge /></article>
          <article className="current"><span>当前迭代</span><h3>MVP v1.0</h3><strong>1 / 26</strong><p>验证首条端到端交付链路；范围变更 +2。</p><SourceBadge /></article>
          <article><span>下一迭代</span><h3>真实状态接入</h3><strong>待审批</strong><p>需要先定义数据契约，不在当前前端批次内。</p><SourceBadge type="pending" /></article>
        </div>
      </Panel>

      <div className="release-bottom-grid">
        <Panel title="发布就绪度" subtitle="六项 Bullet Chart · 目标线 100%" className="release-readiness">
          <ReleaseBars />
        </Panel>
        <Panel title="发布列车" subtitle="候选版本、环境与门禁状态">
          <div className="release-train">
            <div><span>候选版本</span><strong>无</strong><small>待接入 · 不以 0 冒充</small></div>
            <div><span>目标环境</span><strong>生产环境</strong><small>尚未获发布授权</small></div>
            <div><span>计划时间</span><strong>—</strong><small>待审批后排期</small></div>
            <button type="button" className="outline-button" onClick={() => openDrawer({ eyebrow: "发布列车", title: "发布详情", content: <ReleaseGateDetails /> })}>查看发布详情 <ArrowRight aria-hidden="true" /></button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function GovernanceView({ openDrawer }: Pick<ViewProps, "openDrawer">) {
  const score = Math.round(MATURITY.reduce((sum, item) => sum + item.score * item.weight, 0));

  return (
    <div className="view-stack" data-view="governance">
      <section className="governance-hero">
        <div><span>工作流成熟度</span><strong>{score}<small>/100</small></strong><b>较上轮 +6</b></div>
        <p>六个维度等权平均后四舍五入。当前最薄弱能力是“测试与评测”和“可观测与成本”。</p>
        <button type="button" className="outline-button" onClick={() => openDrawer({ eyebrow: "成熟度公式", title: `${score}/100 的计算依据`, content: <MaturityFormula score={score} /> })}><Info aria-hidden="true" />查看公式与证据</button>
        <SourceBadge />
      </section>

      <div className="governance-top-grid">
        <ChartPanel
          title="六维成熟度雷达"
          subtitle="当前与上轮对比 · 移动端自动切换水平条"
          summary={`成熟度总分 ${score}。六个维度依次为 90、62、55、18、12、15。`}
          table={<DataTable caption="六维成熟度" headers={["维度", "当前", "上轮", "权重"]} rows={MATURITY.map((item) => [item.dimension, item.score, item.previous, "16.67%"]) } />}
          className="governance-radar"
        >
          <div className="desktop-radar"><ResponsiveContainer width="100%" height="100%"><RadarChart data={MATURITY} outerRadius="68%"><PolarGrid stroke="#dce4de" /><PolarAngleAxis dataKey="dimension" tick={{ fill: "#66736e", fontSize: 11 }} /><Radar name="当前" dataKey="score" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.38} /><Radar name="上轮" dataKey="previous" stroke={CHART_COLORS.demo} fill={CHART_COLORS.demo} fillOpacity={0.08} /><Tooltip /><Legend /></RadarChart></ResponsiveContainer></div>
          <div className="mobile-radar-alternative"><MaturityBars /></div>
        </ChartPanel>

        <Panel title="各维度评分" subtitle="分值、变化与重点改进方向">
          <MaturityBars />
          <button type="button" className="panel-link" onClick={() => openDrawer({ eyebrow: "治理改进", title: "薄弱维度建议", content: <ImprovementDetail /> })}>查看改进建议 <ArrowRight aria-hidden="true" /></button>
        </Panel>
      </div>

      <div className="governance-chart-grid">
        <ChartPanel
          title="成熟度迭代趋势"
          subtitle="单位：分"
          summary="成熟度从基线 29 分提升到当前 42 分。"
          table={<DataTable caption="成熟度趋势" headers={["迭代", "分数"]} rows={MATURITY_TREND.map((item) => [item.iteration, item.score])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><LineChart data={MATURITY_TREND}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="iteration" /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="score" name="成熟度" stroke={CHART_COLORS.primary} strokeWidth={3} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="改进项优先级"
          subtitle="X：实施成本 · Y：成熟度收益 · 气泡：风险影响"
          summary="结构化状态源和发布回滚演练具有较高成熟度收益与风险影响，应优先评估。"
          table={<DataTable caption="改进项优先级" headers={["改进项", "成本", "收益", "风险影响"]} rows={IMPROVEMENTS.map((item) => [item.name, item.cost, item.benefit, item.risk])} />}
        >
          <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 18, bottom: 8, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="cost" name="实施成本" domain={[0, 100]} /><YAxis type="number" dataKey="benefit" name="成熟度收益" domain={[0, 100]} /><ZAxis type="number" dataKey="risk" name="风险影响" range={[90, 360]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} /><Scatter name="改进项" data={IMPROVEMENTS} fill={CHART_COLORS.demo} /></ScatterChart></ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="governance-bottom-grid">
        <Panel title="能力 × 成熟度等级" subtitle="L1 可重复 → L5 自适应">
          <div className="capability-heatmap" role="table" aria-label="能力与成熟度等级矩阵">
            <div className="heatmap-head" role="row"><span role="columnheader">能力</span>{[1, 2, 3, 4, 5].map((level) => <b role="columnheader" key={level}>L{level}</b>)}</div>
            {CAPABILITY_HEATMAP.map((row) => <div role="row" key={row.capability}><strong role="rowheader">{row.capability}</strong>{row.levels.map((active, index) => <span role="cell" key={index} className={active ? "active" : "pending"}>{active ? <Check aria-label="已具备" /> : <Circle aria-label="待建设" />}</span>)}</div>)}
          </div>
        </Panel>
        <Panel title="证据覆盖率" subtitle="尚未连接 workflow 文件，以下仅为演示">
          <div className="evidence-coverage">
            {[['阶段证据', 55], ['审批记录', 62], ['任务与产物', 48], ['缺陷复测', 18], ['发布回滚', 12], ['成本记录', 8]].map(([label, value]) => <div key={String(label)}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}
          </div>
        </Panel>
      </div>

      <Panel title="组件与状态规范" subtitle="本批可见状态样例，不连接真实服务">
        <div className="state-gallery">
          <article><span>空状态</span><FileText aria-hidden="true" /><strong>暂无匹配数据</strong><p>调整筛选后重试。</p><button type="button">清除筛选</button></article>
          <article><span>加载状态</span><CircleNotch className="loading-spinner" aria-label="正在加载" /><strong>正在载入演示视图</strong><p>不会请求真实数据源。</p><button type="button" disabled>请稍候</button></article>
          <article className="error"><span>错误状态</span><WarningCircle aria-hidden="true" /><strong>演示加载失败</strong><p>检查网络或稍后重试。</p><button type="button">重试</button></article>
          <article className="stale"><span>过期状态</span><Clock aria-hidden="true" /><strong>演示快照已过期</strong><p>当前数据不应用于业务决策。</p><button type="button">刷新演示</button></article>
          <article className="pending"><span>待接入</span><Database aria-hidden="true" /><strong>真实来源未连接</strong><p>字段显示“—”，不以 0 冒充。</p><button type="button">查看边界</button></article>
          <article className="readonly"><span>只读 / 无权限</span><LockKey aria-hidden="true" /><strong>当前批次只读</strong><p>状态变更需要审批。</p><button type="button" disabled>不可写入</button></article>
        </div>
      </Panel>
    </div>
  );
}

function ReleaseGateDetails() {
  return <div className="drawer-detail-stack"><div className="drawer-callout danger"><WarningCircle aria-hidden="true" /><p><strong>发布阻塞</strong>存在未关闭 Blocker，必要门禁未通过。</p></div><ReleaseBars /><div className="drawer-section"><h3>已知边界</h3><p>候选版本、健康检查、回滚点和审批记录均未接入。当前页面不会生成或执行生产发布。</p></div></div>;
}

function QueueDetail({ role, wait, artifact }: { role: string; wait: string; artifact: string }) {
  return <div className="drawer-detail-stack"><dl className="detail-list"><div><dt>等待角色</dt><dd>{role}</dd></div><div><dt>对应交付物</dt><dd>{artifact}</dd></div><div><dt>等待时长</dt><dd>{wait}</dd></div><div><dt>审批所有者</dt><dd>超级无敌帅超超总</dd></div><div><dt>数据来源</dt><dd>演示数据</dd></div></dl><div className="drawer-callout demo"><Database aria-hidden="true" /><p><strong>非实时队列</strong>本条用于验证界面，不代表当前真实审批待办。</p></div></div>;
}

function RoleDetail({ role }: { role: (typeof ROLES)[number] }) {
  return <div className="drawer-detail-stack"><dl className="detail-list"><div><dt>固定编号</dt><dd>{role.id}</dd></div><div><dt>当前状态</dt><dd>{role.status}</dd></div><div><dt>工作负载</dt><dd>{role.workload}%</dd></div><div><dt>进行中</dt><dd>{role.active} 项</dd></div><div><dt>阻塞</dt><dd>{role.blocked} 项</dd></div><div><dt>下一交接</dt><dd>{role.handoff}</dd></div></dl><div className="drawer-section"><h3>输入与交付物</h3><p>真实任务、事件、阻塞和交付物仍待接入结构化工作流状态源。</p></div></div>;
}

function GateDetail({ status, detail }: { status: string; detail: string }) {
  return <div className="drawer-detail-stack"><div className="drawer-callout warning"><WarningCircle aria-hidden="true" /><p><strong>{status}</strong>{detail}</p></div><dl className="detail-list"><div><dt>证据来源</dt><dd>待接入</dd></div><div><dt>计算口径</dt><dd>门禁必须有可追溯证据后才可通过</dd></div><div><dt>审批要求</dt><dd>状态变更需要对应工作流审核</dd></div></dl></div>;
}

function MaturityFormula({ score }: { score: number }) {
  return <div className="drawer-detail-stack"><div className="formula-box">({MATURITY.map((item) => item.score).join(" + ")}) ÷ 6 = <strong>{score}</strong></div><DataTable caption="成熟度评分依据" headers={["维度", "分数", "权重", "证据"]} rows={MATURITY.map((item) => [item.dimension, item.score, "16.67%", "演示数据 / 待接入真实证据"])} /><div className="drawer-section"><h3>缺失证据</h3><p>自动化运行、正式测试报告、观测指标与成本记录尚未接入，因此本分数只能作为界面演示，不应用于真实治理决策。</p></div></div>;
}

function ImprovementDetail() {
  return <div className="drawer-detail-stack"><div className="drawer-section"><h3>优先建议</h3><p>先建立结构化状态源和审批事件记录，再扩展自动化测试、发布回滚演练与成本观测。此顺序来自演示评分，不构成已批准项目计划。</p></div><DataTable caption="改进项建议" headers={["改进项", "成本", "收益", "风险影响"]} rows={IMPROVEMENTS.map((item) => [item.name, item.cost, item.benefit, item.risk])} /></div>;
}

function SeverityTag({ severity }: { severity: string }) {
  return <span className={`severity-tag severity-${severity.toLowerCase()}`}>{severity === "Blocker" ? <WarningCircle /> : severity === "Major" ? <Bug /> : <Info />}{severity}</span>;
}

export function ViewContent(props: ViewProps) {
  switch (props.view) {
    case "projects":
      return <ProjectsView selectedProjectId={props.selectedProjectId} onProjectChange={props.onProjectChange} openDrawer={props.openDrawer} />;
    case "roles":
      return <RolesView openDrawer={props.openDrawer} />;
    case "quality":
      return <QualityView openDrawer={props.openDrawer} showNotice={props.showNotice} />;
    case "releases":
      return <ReleasesView openDrawer={props.openDrawer} />;
    case "governance":
      return <GovernanceView openDrawer={props.openDrawer} />;
    default:
      return <OverviewView openDrawer={props.openDrawer} />;
  }
}

export function SearchResults({ query, onNavigate }: { query: string; onNavigate: (view: ViewId) => void }) {
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const items = [
      ...PROJECTS.map((project) => ({ label: project.name, type: "项目", view: "projects" as ViewId })),
      ...ROLES.map((role) => ({ label: role.name, type: "角色", view: "roles" as ViewId })),
      ...ISSUES.map((issue) => ({ label: issue.title, type: "缺陷", view: "quality" as ViewId })),
      { label: "发布门禁", type: "发布", view: "releases" as ViewId },
      { label: "成熟度评分", type: "治理", view: "governance" as ViewId },
    ];
    return items.filter((item) => item.label.toLowerCase().includes(normalized)).slice(0, 8);
  }, [query]);

  return <div className="search-results">{results.length ? results.map((item) => <button type="button" key={`${item.type}-${item.label}`} onClick={() => onNavigate(item.view)}><MagnifyingGlass aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.type} · 演示数据</small></span><ArrowRight aria-hidden="true" /></button>) : <div className="empty-result"><FileText aria-hidden="true" /><strong>没有匹配结果</strong><p>请尝试项目名、角色或缺陷关键词。</p></div>}</div>;
}
