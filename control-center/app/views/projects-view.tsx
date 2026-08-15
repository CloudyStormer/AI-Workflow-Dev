"use client";

import { useMemo, useState } from "react";
import { Database, Funnel } from "@phosphor-icons/react";
import {
  DATA_SOURCE_OPTIONS,
  STAGE_OWNERS,
  STAGES,
  type DataSourceId,
  type StageStatus,
} from "../dashboard-data";
import { getScopedProjects } from "../dashboard-filtering";
import {
  Panel,
  SourceBadge,
  StageEvidence,
  StageMatrix,
  STATUS_LABELS,
  STATUS_SYMBOLS,
  type ViewProps,
} from "../dashboard-view-shared";

type StatusFilter = "all" | StageStatus;
type OwnerFilter = "all" | (typeof STAGE_OWNERS)[number];

const OWNER_OPTIONS = Array.from(new Set(STAGE_OWNERS));

export default function ProjectsView({ filters, openDrawer }: ViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<DataSourceId>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    return getScopedProjects(filters).filter((project) => {
      const currentStatus = project.stages[project.stage];
      const currentOwner = STAGE_OWNERS[project.stage];
      const statusMatches = statusFilter === "all" || currentStatus === statusFilter;
      const ownerMatches = ownerFilter === "all" || currentOwner === ownerFilter;
      const sourceMatches = sourceFilter === "all" || project.source === sourceFilter;
      return statusMatches && ownerMatches && sourceMatches;
    });
  }, [filters, ownerFilter, sourceFilter, statusFilter]);

  const selectedProject = filteredProjects.find((project) => project.id === selectedProjectId)
    ?? filteredProjects[0]
    ?? null;

  function clearFilters() {
    setStatusFilter("all");
    setOwnerFilter("all");
    setSourceFilter("all");
  }

  return (
    <div className="view-stack" data-view="projects">
      <section className="filter-row" aria-label="项目筛选">
        <label>
          项目状态
          <select data-project-filter="status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">全部状态</option>
            {(Object.keys(STATUS_LABELS) as StageStatus[]).map((status) => (
              <option value={status} key={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>
        <label>
          阶段责任角色
          <select data-project-filter="owner" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value as OwnerFilter)}>
            <option value="all">全部角色</option>
            {OWNER_OPTIONS.map((owner) => <option value={owner} key={owner}>{owner}</option>)}
          </select>
        </label>
        <label>
          数据来源
          <select data-project-filter="source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as DataSourceId)}>
            {DATA_SOURCE_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" className="outline-button" data-clear-project-filters onClick={clearFilters}>
          <Funnel aria-hidden="true" />清除全部筛选
        </button>
      </section>

      {filteredProjects.length > 0 ? (
        <>
          <section className="project-card-grid" aria-label="项目卡片矩阵">
            {filteredProjects.map((project) => {
              const currentStatus = project.stages[project.stage];
              const currentOwner = STAGE_OWNERS[project.stage];
              const isSelected = selectedProject?.id === project.id;
              const titleId = `project-${project.id}-title`;

              return (
                <article className={`project-card ${isSelected ? "selected" : ""}`} data-project-card={project.id} key={project.id} aria-labelledby={titleId}>
                  <div><span className="project-kind">{project.kind}</span><SourceBadge /></div>
                  <h2 id={titleId}>{project.name}</h2>
                  <dl>
                    <div><dt>当前阶段</dt><dd>{project.stage} · {STAGES[project.stage]}</dd></div>
                    <div><dt>阶段责任角色</dt><dd>{currentOwner}</dd></div>
                    <div><dt>开放缺陷</dt><dd>{project.openIssues ?? "待接入"}</dd></div>
                    <div><dt>下一审批</dt><dd>{project.nextApproval}</dd></div>
                  </dl>
                  <div className="project-progress"><i style={{ width: `${project.progress}%` }} /><span>{project.progress}%</span></div>
                  <span className={`project-risk ${currentStatus}`}>{STATUS_SYMBOLS[currentStatus]}{STATUS_LABELS[currentStatus]} · {project.risk}</span>
                  <button
                    type="button"
                    className="outline-button project-card-select"
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? "已选择" : "选择"}${project.name}并查看阶段详情`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {isSelected ? "当前查看" : "查看项目"}
                  </button>
                </article>
              );
            })}
          </section>

          <Panel title="项目阶段热力矩阵" subtitle="阶段 0–10 完整展示 · 状态、审批与当前阶段三重编码">
            <StageMatrix projects={filteredProjects} openDrawer={openDrawer} />
          </Panel>

          {selectedProject && (
            <Panel title={`${selectedProject.name} · 阶段详情`} subtitle={`${selectedProject.kind} · 当前阶段 ${selectedProject.stage}`} className="project-detail-panel">
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
          )}
        </>
      ) : (
        <section className="empty-result" data-project-empty role="status" aria-live="polite">
          <Database aria-hidden="true" />
          <strong>没有符合全部筛选条件的项目</strong>
          <p>当前结果不是“真实项目数为 0”；请调整状态、阶段责任角色或数据来源后重试。</p>
          <button type="button" className="outline-button" onClick={clearFilters}>清除全部筛选</button>
        </section>
      )}
    </div>
  );
}
