"use client";

import { useState } from "react";
import {
  ArrowRight,
  Clock,
  Database,
  LockKey,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEFECT_AGING,
  DEFECT_STACK,
  ISSUES,
  RETEST_TREND,
} from "../dashboard-data";
import {
  CHART_COLORS,
  ChartPanel,
  DataTable,
  GateDetail,
  Panel,
  SeverityTag,
  type ViewProps,
} from "../dashboard-view-shared";

const SEVERITY_FILTERS = ["全部", "Blocker", "Major", "Minor"] as const;

export default function QualityView({ openDrawer }: ViewProps) {
  const [severity, setSeverity] = useState<(typeof SEVERITY_FILTERS)[number]>("全部");
  const visibleIssues = severity === "全部"
    ? ISSUES
    : ISSUES.filter((issue) => issue.severity === severity);

  return (
    <div className="view-stack" data-view="quality">
      <Panel title="缺陷状态流水" subtitle="待修复 → 修复中 → 待复测 → 已关闭">
        <div className="defect-flow" aria-label="缺陷状态流水">
          {DEFECT_STACK.map((item, index) => {
            const total = item.Blocker + item.Major + item.Minor;
            return (
              <div key={item.status}>
                <span>{index + 1}</span>
                <strong>{item.status}</strong>
                <b>{total}</b>
                <small>{total === 0 ? "—" : `占开放缺陷 ${Math.round(total / 5 * 100)}%`}</small>
                {index < DEFECT_STACK.length - 1 && <ArrowRight aria-hidden="true" />}
              </div>
            );
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEFECT_STACK}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Blocker" stackId="defect" fill={CHART_COLORS.danger} />
              <Bar dataKey="Major" stackId="defect" fill={CHART_COLORS.warning} />
              <Bar dataKey="Minor" stackId="defect" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="复测通过率趋势"
          subtitle="单位：% · 同时展示通过、失败、未执行"
          summary="演示复测通过率由通过数除以通过与失败之和计算，最新快照为 80%。"
          table={<DataTable caption="复测趋势" headers={["日期", "通过", "失败", "未执行", "通过率"]} rows={RETEST_TREND.map((item) => [item.date, item.passed, item.failed, item.notRun, `${item.rate}%`])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={RETEST_TREND}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="rate" name="通过率" stroke={CHART_COLORS.primary} strokeWidth={3} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="notRun" name="未执行数量" stroke={CHART_COLORS.muted} strokeDasharray="5 4" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          title="缺陷老化分布"
          subtitle="Blocker 超过 7 天需要优先处理"
          summary="缺陷老化分布：0 至 1 天 2 项，2 至 3 天 1 项，4 至 7 天 1 项，7 天以上 1 项且为 Blocker。"
          table={<DataTable caption="缺陷老化分布" headers={["老化区间", "数量"]} rows={DEFECT_AGING.map((item) => [item.bucket, item.count])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEFECT_AGING}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="缺陷数" radius={[5, 5, 0, 0]}>
                {DEFECT_AGING.map((item) => <Cell key={item.bucket} fill={item.bucket === "7 天以上" ? CHART_COLORS.danger : CHART_COLORS.primary} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
            <button
              type="button"
              key={name}
              className={`gate-card ${tone}`}
              onClick={() => openDrawer({
                eyebrow: "质量门禁",
                title: name,
                content: <GateDetail status={status} detail={detail} />,
              })}
            >
              {tone === "pending"
                ? <Database aria-hidden="true" />
                : tone === "warning"
                  ? <Clock aria-hidden="true" />
                  : <WarningCircle aria-hidden="true" />}
              <span><strong>{name}</strong><small>{detail}</small></span>
              <b>{status}</b>
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title="缺陷明细"
        subtitle={`${visibleIssues.length} 项 · 演示缺陷，不代表真实项目事实`}
        action={(
          <div className="segmented-filter" aria-label="严重度筛选">
            {SEVERITY_FILTERS.map((item) => (
              <button
                type="button"
                key={item}
                className={severity === item ? "active" : ""}
                aria-pressed={severity === item}
                onClick={() => setSeverity(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      >
        <div className="drawer-callout demo" role="note">
          <LockKey aria-hidden="true" />
          <p><strong>只读监管界面</strong>本版本不支持缺陷状态流转；下方操作仅用于明确能力边界。</p>
        </div>
        <div className="desktop-issue-table">
          <DataTable
            caption="缺陷明细"
            headers={["ID", "标题", "严重度", "模块", "负责人", "状态", "老化", "复测", "操作"]}
            rows={visibleIssues.map((issue) => [
              issue.id,
              issue.title,
              <SeverityTag key={issue.id} severity={issue.severity} />,
              issue.module,
              issue.owner,
              issue.status,
              issue.age,
              issue.retest,
              <button key={`${issue.id}-action`} type="button" className="table-action" disabled>本版本不支持状态流转</button>,
            ])}
          />
        </div>
        <div className="mobile-issue-list">
          {visibleIssues.map((issue) => (
            <article key={issue.id}>
              <div><SeverityTag severity={issue.severity} /><code>{issue.id}</code></div>
              <h3>{issue.title}</h3>
              <dl>
                <div><dt>状态</dt><dd>{issue.status}</dd></div>
                <div><dt>负责人</dt><dd>{issue.owner}</dd></div>
                <div><dt>复测</dt><dd>{issue.retest}</dd></div>
              </dl>
              <button type="button" disabled>本版本不支持状态流转</button>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
