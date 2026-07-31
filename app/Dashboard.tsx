"use client";

import { useMemo, useState } from "react";

type View = "overview" | "projects" | "roles" | "quality" | "releases" | "governance";
type IssueStatus = "待修复" | "修复中" | "待复测" | "已关闭";

const navItems: Array<{ id: View; label: string; glyph: string }> = [
  { id: "overview", label: "总览", glyph: "⌂" },
  { id: "projects", label: "项目与阶段", glyph: "◇" },
  { id: "roles", label: "角色协作", glyph: "◎" },
  { id: "quality", label: "质量与缺陷", glyph: "△" },
  { id: "releases", label: "版本与上线", glyph: "↗" },
  { id: "governance", label: "工作流治理", glyph: "⌘" },
];

const stages = [
  { name: "项目启动", owner: "项目经理", state: "done", evidence: "项目计划已落盘" },
  { name: "产品定义", owner: "产品经理", state: "done", evidence: "PRD v1.0 已完成" },
  { name: "体验设计", owner: "UI/UX", state: "risk", evidence: "设计稿存在，正式审批证据缺失" },
  { name: "技术架构", owner: "架构师", state: "done", evidence: "架构文档已完成" },
  { name: "任务拆解", owner: "项目经理", state: "done", evidence: "26 项任务已拆分" },
  { name: "并行开发", owner: "研发组", state: "active", evidence: "T01 已交付，状态表待同步" },
  { name: "代码审查", owner: "审查员", state: "waiting", evidence: "等待 P0 功能完成" },
  { name: "系统测试", owner: "测试工程师", state: "waiting", evidence: "尚未进入提测" },
  { name: "部署上线", owner: "DevOps", state: "waiting", evidence: "尚无候选版本" },
  { name: "项目验收", owner: "项目经理", state: "waiting", evidence: "等待上线版本" },
];

const roles = [
  { order: "01", name: "项目经理", skill: "role-pm", lane: "管理", status: "在线", current: "维护计划、风险与阶段审批" },
  { order: "02", name: "产品经理", skill: "role-product-manager", lane: "产品", status: "待命", current: "产品范围与验收标准" },
  { order: "03", name: "UI/UX 设计师", skill: "role-ui-designer", lane: "设计", status: "待命", current: "设计系统与交互状态" },
  { order: "04", name: "架构师", skill: "role-architect", lane: "技术", status: "待命", current: "架构决策与接口契约" },
  { order: "05", name: "前端工程师", skill: "role-frontend-dev", lane: "研发", status: "工作中", current: "T01 前端骨架已完成" },
  { order: "06", name: "后端工程师", skill: "role-backend-dev", lane: "研发", status: "阻塞", current: "等待 T02 启动" },
  { order: "07", name: "数据工程师", skill: "role-data-engineer", lane: "数据", status: "待命", current: "数据模型与迁移策略" },
  { order: "08", name: "代码审查员", skill: "role-code-reviewer", lane: "质量", status: "待命", current: "等待首个可审查模块" },
  { order: "09", name: "测试工程师", skill: "role-qa", lane: "质量", status: "待命", current: "等待提测版本" },
  { order: "10", name: "DevOps 工程师", skill: "role-devops", lane: "交付", status: "待命", current: "等待发布候选版本" },
];

const initialIssues: Array<{
  id: string;
  severity: "Blocker" | "Major" | "Minor";
  title: string;
  owner: string;
  status: IssueStatus;
  area: string;
}> = [
  {
    id: "WF-001",
    severity: "Blocker",
    title: "构建链路缺少 Node 版本锁定，当前环境无法构建",
    owner: "DevOps",
    status: "待修复",
    area: "工程环境",
  },
  {
    id: "WF-002",
    severity: "Major",
    title: "阶段审批只写在文档中，没有可恢复的状态记录",
    owner: "架构师",
    status: "待修复",
    area: "工作流引擎",
  },
  {
    id: "WF-003",
    severity: "Major",
    title: "架构文档与实际依赖版本不一致",
    owner: "架构师",
    status: "修复中",
    area: "技术基线",
  },
  {
    id: "WF-004",
    severity: "Major",
    title: "开发任务表仍标记 T01 待开始，与 Git 事实冲突",
    owner: "项目经理",
    status: "待复测",
    area: "项目状态",
  },
  {
    id: "WF-005",
    severity: "Minor",
    title: "角色模板、项目副本、全局 Skill 存在三套重复来源",
    owner: "项目经理",
    status: "待修复",
    area: "配置治理",
  },
];

const stateLabels: Record<string, string> = {
  done: "已完成",
  risk: "有风险",
  active: "进行中",
  waiting: "未开始",
};

const nextIssueStatus: Record<IssueStatus, IssueStatus> = {
  待修复: "修复中",
  修复中: "待复测",
  待复测: "已关闭",
  已关闭: "已关闭",
};

export default function Dashboard() {
  const [view, setView] = useState<View>("overview");
  const [selectedStage, setSelectedStage] = useState(5);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [issues, setIssues] = useState(initialIssues);
  const [severity, setSeverity] = useState("全部");
  const [notice, setNotice] = useState("");

  const visibleIssues = useMemo(
    () => issues.filter((issue) => severity === "全部" || issue.severity === severity),
    [issues, severity],
  );

  const activeStage = stages[selectedStage];

  function advanceIssue(id: string) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === id ? { ...issue, status: nextIssueStatus[issue.status] } : issue,
      ),
    );
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AW</div>
          <div>
            <strong>AI Workflow</strong>
            <span>Control Center</span>
          </div>
        </div>

        <div className="lab-badge">
          <span className="pulse" />
          <div>
            <strong>实验室模式</strong>
            <small>方法论优先，样例项目验证</small>
          </div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          <p>工作台</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
            >
              <span>{item.glyph}</span>
              {item.label}
              {item.id === "quality" && <b>{issues.filter((item) => item.status !== "已关闭").length}</b>}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="operator-avatar">齐</div>
          <div>
            <strong>齐总</strong>
            <span>项目所有者</span>
          </div>
          <button aria-label="账户设置">•••</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI 工作流实验与验证平台</p>
            <h1>{navItems.find((item) => item.id === view)?.label}</h1>
          </div>
          <div className="top-actions">
            <div className="sync-state">
              <span />
              上下文已同步
              <small>今天 16:28</small>
            </div>
            <button className="ghost-button" onClick={() => showNotice("工作流报告已加入导出队列")}>
              导出报告
            </button>
            <button className="primary-button" onClick={() => showNotice("新实验入口将在下一版接入")}>
              ＋ 新建实验项目
            </button>
          </div>
        </header>

        <section className="mission-card">
          <div>
            <span className="section-kicker">PROJECT POSITIONING</span>
            <h2>摸清、走通、验证一套真正可复用的 AI 软件工程工作流</h2>
            <p>
              根项目负责方法、角色、状态与质量治理；projects 下的业务项目只承担流程实验、结果验证与真实交付体验。
            </p>
          </div>
          <div className="mission-meter">
            <div className="meter-ring">
              <strong>42</strong>
              <span>/ 100</span>
            </div>
            <div>
              <strong>工作流成熟度</strong>
              <span>已具备 SOP，执行引擎待建设</span>
            </div>
          </div>
        </section>

        <section className="metric-grid" aria-label="项目关键指标">
          <article>
            <span>实验项目</span>
            <strong>01</strong>
            <small className="positive">● 1 个正在验证</small>
          </article>
          <article>
            <span>当前阶段</span>
            <strong>并行开发</strong>
            <small>第 6 / 10 阶段</small>
          </article>
          <article>
            <span>任务完成度</span>
            <strong>1 / 26</strong>
            <div className="mini-progress"><i style={{ width: "4%" }} /></div>
          </article>
          <article>
            <span>开放缺陷</span>
            <strong>{issues.filter((issue) => issue.status !== "已关闭").length}</strong>
            <small className="danger">● 1 个 Blocker</small>
          </article>
          <article>
            <span>上线就绪度</span>
            <strong>18%</strong>
            <small>环境基线未通过</small>
          </article>
        </section>

        <div className="content-grid">
          <section className="panel workflow-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">LIVE PIPELINE</span>
                <h3>AI 英语学习 · 端到端工作流</h3>
              </div>
              <button onClick={() => setView("projects")}>查看完整项目 →</button>
            </div>

            <div className="workflow-track">
              {stages.map((stage, index) => (
                <button
                  key={stage.name}
                  className={`stage-node ${stage.state} ${selectedStage === index ? "selected" : ""}`}
                  onClick={() => setSelectedStage(index)}
                  aria-label={`${stage.name}，${stateLabels[stage.state]}`}
                >
                  <span className="stage-dot">{index + 1}</span>
                  <strong>{stage.name}</strong>
                  <small>{stage.owner}</small>
                </button>
              ))}
            </div>

            <div className="stage-detail">
              <div className={`state-icon ${activeStage.state}`}>
                {activeStage.state === "done" ? "✓" : activeStage.state === "active" ? "→" : activeStage.state === "risk" ? "!" : "·"}
              </div>
              <div>
                <span>{stateLabels[activeStage.state]} · 阶段 {selectedStage + 1}</span>
                <h4>{activeStage.name}</h4>
                <p>{activeStage.evidence}</p>
              </div>
              <div className="stage-owner">
                <span>责任角色</span>
                <strong>{activeStage.owner}</strong>
              </div>
              <button
                className="outline-button"
                onClick={() => showNotice(`${activeStage.name}的证据清单已展开`)}
              >
                查看证据
              </button>
            </div>
          </section>

          <section className="panel health-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">SYSTEM HEALTH</span>
                <h3>工作流健康度</h3>
              </div>
              <span className="trend">较基线 +8</span>
            </div>
            {[
              ["角色与职责", 90, "good"],
              ["阶段与审批", 62, "warn"],
              ["产物可追溯", 55, "warn"],
              ["自动化执行", 18, "bad"],
              ["测试与评测", 12, "bad"],
              ["可观测与成本", 8, "bad"],
            ].map(([label, value, tone]) => (
              <div className="health-row" key={String(label)}>
                <div>
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="health-bar">
                  <i className={String(tone)} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            <div className="health-note">
              <span>核心判断</span>
              <p>目前是专业的 SOP 原型，但还不是可恢复、可观测、可评测的工作流系统。</p>
            </div>
          </section>
        </div>

        <div className="content-grid lower">
          <section className="panel roles-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">TEAM ORCHESTRATION</span>
                <h3>角色协作与当前入场顺序</h3>
              </div>
              <button onClick={() => setView("roles")}>全部角色 →</button>
            </div>
            <div className="role-list">
              {roles.slice(0, 6).map((role) => (
                <button
                  key={role.name}
                  className={selectedRole.name === role.name ? "selected" : ""}
                  onClick={() => setSelectedRole(role)}
                >
                  <span className="role-order">{role.order}</span>
                  <div className="role-copy">
                    <strong>{role.name}</strong>
                    <small>{role.current}</small>
                  </div>
                  <span className={`role-status ${role.status}`}>{role.status}</span>
                </button>
              ))}
            </div>
            <div className="role-detail">
              <div>
                <span>当前选中</span>
                <strong>{selectedRole.name}</strong>
              </div>
              <code>{selectedRole.skill}</code>
              <p>{selectedRole.lane}泳道 · 独立任务对话已建立</p>
              <button onClick={() => showNotice(`${selectedRole.name}任务已定位`)}>定位任务</button>
            </div>
          </section>

          <section className="panel issue-panel">
            <div className="panel-head">
              <div>
                <span className="section-kicker">QUALITY GATE</span>
                <h3>缺陷、修复与复测</h3>
              </div>
              <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="缺陷等级筛选">
                <option>全部</option>
                <option>Blocker</option>
                <option>Major</option>
                <option>Minor</option>
              </select>
            </div>
            <div className="issue-list">
              {visibleIssues.slice(0, 4).map((issue) => (
                <article key={issue.id}>
                  <div className="issue-topline">
                    <span className={`severity ${issue.severity}`}>{issue.severity}</span>
                    <code>{issue.id}</code>
                    <small>{issue.area}</small>
                  </div>
                  <h4>{issue.title}</h4>
                  <div className="issue-bottom">
                    <span>负责人：{issue.owner}</span>
                    <button
                      disabled={issue.status === "已关闭"}
                      onClick={() => advanceIssue(issue.id)}
                    >
                      {issue.status} {issue.status !== "已关闭" && "→"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <button className="full-link" onClick={() => setView("quality")}>进入质量工作台</button>
          </section>
        </div>

        <section className="bottom-board">
          <article>
            <span className="section-kicker">PRODUCT ITERATION</span>
            <h3>产品迭代</h3>
            <strong>MVP v1.0</strong>
            <p>AI 英语学习：验证从 PRD 到交付的首条链路</p>
            <div className="tag-row"><span>26 项任务</span><span>6 个 P0 模块</span></div>
          </article>
          <article>
            <span className="section-kicker">TEST CYCLE</span>
            <h3>测试周期</h3>
            <strong>尚未提测</strong>
            <p>需要先建立测试计划、用例基线和自动化冒烟集。</p>
            <div className="tag-row"><span>测试 0</span><span>复测 1 待排</span></div>
          </article>
          <article>
            <span className="section-kicker">RELEASE TRAIN</span>
            <h3>发布列车</h3>
            <strong>无候选版本</strong>
            <p>构建环境、CI、回滚与运行监控尚未形成闭环。</p>
            <div className="tag-row"><span>就绪度 18%</span><span>Blocker 1</span></div>
          </article>
          <article className="decision-card">
            <span className="section-kicker">NEXT DECISION</span>
            <h3>下一项总包决策</h3>
            <strong>先补执行底座，再扩角色</strong>
            <p>优先建立状态、审批证据、质量门和追踪机制。</p>
            <button onClick={() => showNotice("决策已标记为下一阶段优先项")}>标记为优先项</button>
          </article>
        </section>

        <footer>
          <span>AI Workflow Control Center · 实验数据快照</span>
          <span>根项目负责方法论，样例项目负责验证</span>
        </footer>
      </main>

      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
