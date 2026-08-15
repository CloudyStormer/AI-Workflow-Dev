import {
  ArrowRight,
  Check,
  Circle,
  CircleNotch,
  Clock,
  Database,
  FileText,
  Info,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  CAPABILITY_HEATMAP,
  IMPROVEMENTS,
  MATURITY,
  MATURITY_TREND,
} from "../dashboard-data";
import {
  CHART_COLORS,
  ChartPanel,
  DataTable,
  ImprovementDetail,
  MaturityBars,
  MaturityFormula,
  Panel,
  SourceBadge,
  type ViewProps,
} from "../dashboard-view-shared";

/** 展示治理成熟度演示快照，并明确区分样例状态与真实操作。 */
export default function GovernanceView({ openDrawer }: ViewProps) {
  const score = Math.round(MATURITY.reduce((sum, item) => sum + item.score * item.weight, 0));

  return (
    <div className="view-stack" data-view="governance">
      <section className="governance-hero">
        <div>
          <span>工作流成熟度</span>
          <strong>{score}<small>/100</small></strong>
          <b>较上轮 +6</b>
        </div>
        <p>六个维度等权平均后四舍五入。当前最薄弱能力是“测试与评测”和“可观测与成本”。</p>
        <button
          type="button"
          className="outline-button"
          onClick={() => openDrawer({
            eyebrow: "成熟度公式",
            title: `${score}/100 的计算依据`,
            content: <MaturityFormula score={score} />,
          })}
        >
          <Info aria-hidden="true" />查看公式与证据
        </button>
        <SourceBadge />
      </section>

      <div className="governance-top-grid">
        <ChartPanel
          title="六维成熟度雷达"
          subtitle="当前与上轮对比 · 移动端自动切换水平条"
          summary={`成熟度总分 ${score}。六个维度依次为 90、62、55、18、12、15。`}
          table={(
            <DataTable
              caption="六维成熟度"
              headers={["维度", "当前", "上轮", "权重"]}
              rows={MATURITY.map((item) => [item.dimension, item.score, item.previous, "16.67%"]) }
            />
          )}
          className="governance-radar"
        >
          <div className="desktop-radar">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={MATURITY} outerRadius="68%">
                <PolarGrid stroke="#dce4de" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "#66736e", fontSize: 11 }} />
                <Radar name="当前" dataKey="score" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.38} />
                <Radar name="上轮" dataKey="previous" stroke={CHART_COLORS.demo} fill={CHART_COLORS.demo} fillOpacity={0.08} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mobile-radar-alternative"><MaturityBars /></div>
        </ChartPanel>

        <Panel title="各维度评分" subtitle="分值、变化与重点改进方向">
          <MaturityBars />
          <button
            type="button"
            className="panel-link"
            onClick={() => openDrawer({
              eyebrow: "治理改进",
              title: "薄弱维度建议",
              content: <ImprovementDetail />,
            })}
          >
            查看改进建议 <ArrowRight aria-hidden="true" />
          </button>
        </Panel>
      </div>

      <div className="governance-chart-grid">
        <ChartPanel
          title="成熟度迭代趋势"
          subtitle="单位：分"
          summary="成熟度从基线 29 分提升到当前 42 分。"
          table={(
            <DataTable
              caption="成熟度趋势"
              headers={["迭代", "分数"]}
              rows={MATURITY_TREND.map((item) => [item.iteration, item.score])}
            />
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MATURITY_TREND}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="iteration" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" name="成熟度" stroke={CHART_COLORS.primary} strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="改进项优先级"
          subtitle="X：实施成本 · Y：成熟度收益 · 气泡：风险影响"
          summary="结构化状态源和发布回滚演练具有较高成熟度收益与风险影响，应优先评估。"
          table={(
            <DataTable
              caption="改进项优先级"
              headers={["改进项", "成本", "收益", "风险影响"]}
              rows={IMPROVEMENTS.map((item) => [item.name, item.cost, item.benefit, item.risk])}
            />
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 18, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="cost" name="实施成本" domain={[0, 100]} />
              <YAxis type="number" dataKey="benefit" name="成熟度收益" domain={[0, 100]} />
              <ZAxis type="number" dataKey="risk" name="风险影响" range={[90, 360]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter name="改进项" data={IMPROVEMENTS} fill={CHART_COLORS.demo} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="governance-bottom-grid">
        <Panel title="能力 × 成熟度等级" subtitle="L1 可重复 → L5 自适应">
          <div className="capability-heatmap" role="table" aria-label="能力与成熟度等级矩阵">
            <div className="heatmap-head" role="row">
              <span role="columnheader">能力</span>
              {[1, 2, 3, 4, 5].map((level) => <b role="columnheader" key={level}>L{level}</b>)}
            </div>
            {CAPABILITY_HEATMAP.map((row, rowIndex) => (
              <div role="row" key={`${row.capability}-${rowIndex}`}>
                <strong role="rowheader">{row.capability}</strong>
                {row.levels.map((active, index) => (
                  <span role="cell" key={index} className={active ? "active" : "pending"}>
                    {active ? <Check aria-label="已具备" /> : <Circle aria-label="待建设" />}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="证据覆盖率" subtitle="尚未连接 workflow 文件，以下仅为演示">
          <div className="evidence-coverage">
            {[
              ["阶段证据", 55],
              ["审批记录", 62],
              ["任务与产物", 48],
              ["缺陷复测", 18],
              ["发布回滚", 12],
              ["成本记录", 8],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <div><i style={{ width: `${value}%` }} /></div>
                <strong>{value}%</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="组件与状态规范" subtitle="本批可见状态样例，不连接真实服务">
        <div className="state-gallery">
          <article>
            <span>空状态</span>
            <FileText aria-hidden="true" />
            <strong>暂无匹配数据</strong>
            <p>调整筛选后重试。</p>
            <span className="state-preview-action">清除筛选（样例）</span>
          </article>
          <article>
            <span>加载状态</span>
            <CircleNotch className="loading-spinner" aria-label="正在加载" />
            <strong>正在载入演示视图</strong>
            <p>不会请求真实数据源。</p>
            <span className="state-preview-action">请稍候（样例）</span>
          </article>
          <article className="error">
            <span>错误状态</span>
            <WarningCircle aria-hidden="true" />
            <strong>演示加载失败</strong>
            <p>检查网络或稍后重试。</p>
            <span className="state-preview-action">重试（样例）</span>
          </article>
          <article className="stale">
            <span>过期状态</span>
            <Clock aria-hidden="true" />
            <strong>演示快照已过期</strong>
            <p>当前数据不应用于业务决策。</p>
            <span className="state-preview-action">刷新演示（样例）</span>
          </article>
          <article className="pending">
            <span>待接入</span>
            <Database aria-hidden="true" />
            <strong>真实来源未连接</strong>
            <p>字段显示“—”，不以 0 冒充。</p>
            <span className="state-preview-action">查看边界（样例）</span>
          </article>
          <article className="readonly">
            <span>只读 / 无权限</span>
            <LockKey aria-hidden="true" />
            <strong>当前批次只读</strong>
            <p>状态变更需要审批。</p>
            <span className="state-preview-action">不可写入（样例）</span>
          </article>
        </div>
      </Panel>
    </div>
  );
}
