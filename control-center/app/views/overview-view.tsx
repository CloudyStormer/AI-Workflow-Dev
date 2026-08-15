"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowRight,
  Clock,
  Database,
  GitBranch,
  RocketLaunch,
  Target,
  WarningCircle,
} from "@phosphor-icons/react";
import { MATURITY, STAGES } from "../dashboard-data";
import { getScopedProjects } from "../dashboard-filtering";
import {
  CHART_COLORS,
  ChartPanel,
  DataTable,
  Panel,
  ReleaseBars,
  ReleaseGateDetails,
  StageEvidence,
  StageMatrix,
  StatCard,
  STATUS_SYMBOLS,
  type ViewProps,
} from "../dashboard-view-shared";

export default function OverviewView({ filters, openDrawer }: ViewProps) {
  const scopedProjects = getScopedProjects(filters);
  const mainProject = scopedProjects.find((project) => project.id === "workflow-control-center") ?? scopedProjects[0];
  const governanceCount = scopedProjects.filter((project) => project.kind === "治理根项目").length;
  const sampleCount = scopedProjects.length - governanceCount;
  const blockedCount = scopedProjects.filter((project) => project.stages[project.stage] === "blocked").length;
  const maturityScore = Math.round(MATURITY.reduce((sum, item) => sum + item.score * item.weight, 0));
  const hasGlobalEvidence = filters.project === "all";
  const includesQualitySample = scopedProjects.some((project) => project.id === "ai-english-learning");
  const hasReleaseEvidence = hasGlobalEvidence || includesQualitySample;
  const defectPie = includesQualitySample
    ? [
        { name: "Blocker", value: 1, fill: CHART_COLORS.danger },
        { name: "Major", value: 3, fill: CHART_COLORS.warning },
        { name: "Minor", value: 1, fill: CHART_COLORS.info },
      ]
    : [];
  const projectCountNote = `${governanceCount} 个治理根项目 · ${sampleCount} 个实验样本`;

  return (
    <div className="view-stack" data-view="overview">
      <section className="decision-strip" aria-label="关键决策信号">
        <StatCard label="当前项目" value={String(scopedProjects.length)} note={projectCountNote} icon={<Target />} />
        <StatCard
          label="当前阶段"
          value={mainProject ? `阶段 ${mainProject.stage}` : "待接入"}
          note={mainProject ? STAGES[mainProject.stage] : "当前筛选没有项目记录"}
          tone="success"
          icon={<GitBranch />}
        />
        <StatCard
          label="Blocker"
          value={String(blockedCount)}
          note={blockedCount > 0 ? "当前筛选存在阻塞项目" : "当前筛选未显示阻塞项目"}
          tone={blockedCount > 0 ? "danger" : "success"}
          icon={<WarningCircle />}
        />
        <StatCard
          label="下一审批"
          value={mainProject?.nextApproval ?? "待接入"}
          note={mainProject ? `${mainProject.name} 当前演示状态` : "当前筛选没有项目记录"}
          tone="demo"
          icon={<Clock />}
        />
        <StatCard
          label="发布就绪度"
          value={hasReleaseEvidence ? "18%" : "待接入"}
          note={hasReleaseEvidence ? "必要门禁未通过 · 阻塞" : "没有项目级发布门禁证据"}
          tone="warning"
          icon={<RocketLaunch />}
        />
        <StatCard label="数据新鲜度" value="演示快照" note="非实时 · 真实来源待接入" tone="demo" icon={<Database />} />
      </section>

      <div className="overview-grid">
        <Panel title="项目 × 阶段全景" subtitle="阶段 0–10 · 点击单元格查看证据边界" className="overview-matrix">
          <StageMatrix projects={scopedProjects} compact openDrawer={openDrawer} />
        </Panel>

        <ChartPanel
          title="质量快照"
          subtitle={includesQualitySample ? "已登记开放缺陷 5 项" : "项目级质量明细待接入"}
          summary={includesQualitySample
            ? "当前筛选包含 AI English Learning 演示样本：开放缺陷共 5 项，其中 Blocker 1 项、Major 3 项、Minor 1 项。"
            : "当前筛选没有已登记的项目级质量演示明细，不能将空集合解释为零缺陷。"}
          table={includesQualitySample
            ? <DataTable caption="缺陷严重度明细" headers={["严重度", "数量"]} rows={defectPie.map((item) => [item.name, item.value])} />
            : <DataTable caption="项目级质量证据状态" headers={["指标", "状态"]} rows={[["缺陷严重度明细", "待接入"]]} />}
          className="quality-snapshot"
          source={includesQualitySample ? "demo" : "pending"}
        >
          {includesQualitySample ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={defectPie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3}>
                  {defectPie.map((item) => <Cell key={item.name} fill={item.fill} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={28} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-result"><Database aria-hidden="true" /><strong>项目级质量证据待接入</strong><p>当前筛选不会以 0 冒充未知值。</p></div>
          )}
        </ChartPanel>

        <Panel
          title="发布快照"
          subtitle={hasReleaseEvidence ? "六项必要门禁 · 当前明确阻塞" : "项目级发布门禁待接入"}
          className="release-snapshot"
          source={hasReleaseEvidence ? "demo" : "pending"}
        >
          {hasReleaseEvidence ? <ReleaseBars compact /> : <div className="empty-result"><Database aria-hidden="true" /><strong>没有项目级发布证据</strong><p>当前筛选不会复用其他项目的门禁数值。</p></div>}
          <button type="button" className="panel-link" onClick={() => openDrawer({
            eyebrow: "迭代与发布",
            title: hasReleaseEvidence ? "发布阻塞说明" : "项目级发布证据边界",
            content: hasReleaseEvidence
              ? <ReleaseGateDetails />
              : <div className="drawer-detail-stack"><div className="drawer-callout demo"><Database aria-hidden="true" /><p><strong>待接入</strong>当前项目尚未登记可核验的发布门禁证据。</p></div></div>,
          })}>查看门禁证据 <ArrowRight aria-hidden="true" /></button>
        </Panel>

        <ChartPanel
          title="成熟度快照"
          subtitle={hasGlobalEvidence ? `${maturityScore}/100 · 最薄弱：测试与评测、可观测与成本` : "项目级成熟度证据待接入"}
          summary={hasGlobalEvidence
            ? `工作流成熟度总分 ${maturityScore}，由六个维度按已登记权重计算。角色与职责 90，阶段与审批 62，产物可追溯 55，自动化执行 18，测试与评测 12，可观测与成本 15。`
            : "当前成熟度演示快照没有项目级拆分，不能把全局分数冒充当前项目分数。"}
          table={hasGlobalEvidence
            ? <DataTable caption="成熟度六维数据" headers={["维度", "当前", "上轮"]} rows={MATURITY.map((item) => [item.dimension, item.score, item.previous])} />
            : <DataTable caption="项目级成熟度证据状态" headers={["指标", "状态"]} rows={[["成熟度六维评分", "待接入"]]} />}
          className="maturity-snapshot"
          source={hasGlobalEvidence ? "demo" : "pending"}
        >
          {hasGlobalEvidence ? (
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
          ) : (
            <div className="empty-result"><Database aria-hidden="true" /><strong>项目级成熟度待接入</strong><p>全局演示分数未用于当前项目。</p></div>
          )}
        </ChartPanel>

        <Panel
          title="当前项目阶段流水线"
          subtitle={mainProject ? `${mainProject.name} · 当前阶段 ${mainProject.stage}` : "当前筛选没有项目记录"}
          className="overview-pipeline"
          source={mainProject ? "demo" : "pending"}
        >
          {mainProject ? (
            <div className="pipeline" aria-label={`${mainProject.name} 阶段 0 至 10 流水线`}>
              {mainProject.stages.map((status, index) => (
                <button key={STAGES[index]} type="button" className={`pipeline-node ${status}`} onClick={() => openDrawer({
                  eyebrow: `${mainProject.name} · 阶段 ${index}`,
                  title: STAGES[index],
                  content: <StageEvidence project={mainProject} stageIndex={index} status={status} />,
                })}>
                  <span>{STATUS_SYMBOLS[status]}</span>
                  <strong>{index}</strong>
                  <small>{STAGES[index]}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-result"><Database aria-hidden="true" /><strong>没有匹配项目</strong><p>请调整全局筛选后重试。</p></div>
          )}
        </Panel>
      </div>
    </div>
  );
}
