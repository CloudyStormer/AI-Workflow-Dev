import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BURN_DOWN,
  CUMULATIVE_FLOW,
} from "../dashboard-data";
import {
  CHART_COLORS,
  ChartPanel,
  DataTable,
  Panel,
  ReleaseBars,
  ReleaseGateDetails,
  SourceBadge,
  type ViewProps,
} from "../dashboard-view-shared";

/** 展示演示迭代快照与发布门禁，不执行真实发布。 */
export default function ReleasesView({ openDrawer }: ViewProps) {
  return (
    <div className="view-stack" data-view="releases">
      <div className="release-status-banner">
        <WarningCircle aria-hidden="true" weight="fill" />
        <div>
          <strong>发布状态：阻塞</strong>
          <span>存在未关闭 Blocker，且构建、测试、安全、回滚、监控与发布授权门禁均未通过。</span>
        </div>
        <SourceBadge />
      </div>

      <div className="release-chart-grid">
        <ChartPanel
          title="迭代燃尽图"
          subtitle="MVP v1.0 · 剩余任务数"
          summary="当前迭代初始范围 26 项，后续增加至 28 项；第 7 天实际仍剩 23 项，明显偏离理想燃尽。"
          table={(
            <DataTable
              caption="迭代燃尽数据"
              headers={["日期", "理想剩余", "实际剩余", "范围"]}
              rows={BURN_DOWN.map((item) => [item.day, item.ideal, item.actual, item.scope])}
            />
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={BURN_DOWN}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line dataKey="ideal" name="理想燃尽" stroke={CHART_COLORS.info} strokeWidth={2} />
              <Line dataKey="actual" name="实际燃尽" stroke={CHART_COLORS.primary} strokeWidth={3} />
              <Line dataKey="scope" name="范围" stroke={CHART_COLORS.muted} strokeDasharray="5 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="累积流图"
          subtitle="观察工作堆积位置"
          summary="演示数据表明进行中任务逐日上升，已完成仅 1 项，审查与测试阶段尚未形成稳定流动。"
          table={(
            <DataTable
              caption="累积流数据"
              headers={["日期", "待开始", "进行中", "审查中", "测试中", "已完成"]}
              rows={CUMULATIVE_FLOW.map((item) => [
                item.day,
                item.todo,
                item.doing,
                item.review,
                item.testing,
                item.done,
              ])}
            />
          )}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CUMULATIVE_FLOW}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="todo" name="待开始" stackId="flow" stroke="#a8b3ae" fill="#dce4de" />
              <Area type="monotone" dataKey="doing" name="进行中" stackId="flow" stroke={CHART_COLORS.info} fill="#8ab7ff" />
              <Area type="monotone" dataKey="review" name="审查中" stackId="flow" stroke={CHART_COLORS.demo} fill="#b79af4" />
              <Area type="monotone" dataKey="testing" name="测试中" stackId="flow" stroke={CHART_COLORS.warning} fill="#efbc79" />
              <Area type="monotone" dataKey="done" name="已完成" stackId="flow" stroke={CHART_COLORS.success} fill="#82cdb1" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <Panel title="迭代路线图" subtitle="当前、下一与已完成迭代">
        <div className="roadmap-grid">
          <article>
            <span>已完成迭代</span>
            <h3>工作流治理 v0.3</h3>
            <strong>100%</strong>
            <p>完成固定角色池与一跳授权门禁。</p>
            <SourceBadge />
          </article>
          <article className="current">
            <span>当前迭代</span>
            <h3>MVP v1.0</h3>
            <strong>1 / 26</strong>
            <p>验证首条端到端交付链路；范围变更 +2。</p>
            <SourceBadge />
          </article>
          <article>
            <span>下一迭代</span>
            <h3>真实状态接入</h3>
            <strong>待审批</strong>
            <p>需要先定义数据契约，不在当前前端批次内。</p>
            <SourceBadge type="pending" />
          </article>
        </div>
      </Panel>

      <div className="release-bottom-grid">
        <Panel title="发布就绪度" subtitle="六项 Bullet Chart · 目标线 100%" className="release-readiness">
          <ReleaseBars />
        </Panel>
        <Panel title="发布列车" subtitle="候选版本、环境与门禁状态">
          <div className="release-train">
            <div>
              <span>候选版本</span>
              <strong>无</strong>
              <small>待接入 · 不以 0 冒充</small>
            </div>
            <div>
              <span>目标环境</span>
              <strong>生产环境</strong>
              <small>尚未获发布授权</small>
            </div>
            <div>
              <span>计划时间</span>
              <strong>—</strong>
              <small>待审批后排期</small>
            </div>
            <button
              type="button"
              className="outline-button"
              onClick={() => openDrawer({
                eyebrow: "发布列车",
                title: "发布详情",
                content: <ReleaseGateDetails />,
              })}
            >
              查看发布详情 <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
