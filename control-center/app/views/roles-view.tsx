"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Database,
  LockKey,
  TrendUp,
  UserCircle,
} from "@phosphor-icons/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ROLES, ROLE_STATUS_DATA } from "../dashboard-data";
import {
  CHART_COLORS,
  ChartPanel,
  DataTable,
  Panel,
  QueueDetail,
  type ViewProps,
} from "../dashboard-view-shared";

function RoleDetail({ role }: { role: (typeof ROLES)[number] }) {
  return (
    <div className="drawer-detail-stack">
      <dl className="detail-list">
        <div><dt>固定编号</dt><dd>{role.id}</dd></div>
        <div><dt>当前状态</dt><dd>{role.status}</dd></div>
        <div><dt>工作负载</dt><dd>{role.workload}%</dd></div>
        <div><dt>进行中</dt><dd>{role.active} 项</dd></div>
        <div><dt>阻塞</dt><dd>{role.blocked} 项</dd></div>
        <div><dt>下一交接</dt><dd>{role.handoff}</dd></div>
      </dl>
      <div className="drawer-section">
        <h3>输入与交付物</h3>
        <p>真实任务、事件、阻塞和交付物仍待接入结构化工作流状态源。</p>
      </div>
    </div>
  );
}

export default function RolesView({ openDrawer }: ViewProps) {
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
            <PieChart>
              <Pie data={ROLE_STATUS_DATA} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="78%">
                {ROLE_STATUS_DATA.map((item) => <Cell key={item.name} fill={item.fill} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Panel title="入场与审批队列" subtitle="等待超级无敌帅超超总决策" className="approval-queue">
          <div className="queue-list">
            <button
              type="button"
              onClick={() => openDrawer({
                eyebrow: "角色入场",
                title: "UI/UX 设计师 · 设计交付审核",
                content: <QueueDetail role="UI/UX 设计师" wait="2 小时" artifact="UI 视觉基线" />,
              })}
            >
              <Clock aria-hidden="true" />
              <span><strong>UI/UX 设计师</strong><small>UI 视觉基线 · 等待 2 小时</small></span>
              <b>待审批</b>
            </button>
            <button
              type="button"
              onClick={() => openDrawer({
                eyebrow: "发布门禁",
                title: "DevOps · 生产发布授权",
                content: <QueueDetail role="DevOps" wait="待前置门禁" artifact="发布方案" />,
              })}
            >
              <LockKey aria-hidden="true" />
              <span><strong>DevOps</strong><small>发布方案 · 前置门禁未通过</small></span>
              <b>待审批</b>
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="角色协作泳道" subtitle="按固定角色顺序展示入场、执行、交付、审核与等待">
        <ul className="role-lanes" aria-label="角色协作泳道">
          {ROLES.map((role) => {
            const selected = selectedRoleId === role.id;
            return (
              <li key={role.id}>
                <button
                  type="button"
                  className={selected ? "selected" : ""}
                  aria-pressed={selected}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <span className="role-index">{role.id}</span>
                  <span className="role-name"><strong>{role.name}</strong><small>{role.lane}泳道</small></span>
                  <span className={`role-state state-${role.status}`}>
                    {role.status === "工作中"
                      ? <TrendUp aria-hidden="true" />
                      : role.status === "待审批"
                        ? <Clock aria-hidden="true" />
                        : role.status === "待接入"
                          ? <Database aria-hidden="true" />
                          : <CheckCircle aria-hidden="true" />}
                    {role.status}
                  </span>
                  <span className="role-handoff"><small>下一交接</small>{role.handoff}</span>
                  <span className="role-load"><i style={{ width: `${role.workload}%` }} /><b>{role.workload}%</b></span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="roles-bottom-grid">
        <ChartPanel
          title="角色工作负载"
          subtitle="分配任务占用率 · 点击上方角色交叉筛选"
          summary={`当前选中 ${selectedRole.name}，工作负载 ${selectedRole.workload}%，进行中 ${selectedRole.active} 项，阻塞 ${selectedRole.blocked} 项。`}
          table={<DataTable caption="角色工作负载" headers={["角色", "负载", "进行中", "阻塞"]} rows={ROLES.map((role) => [role.name, `${role.workload}%`, role.active, role.blocked])} />}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...ROLES]} layout="vertical" margin={{ left: 8, right: 18 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="workload" name="负载" fill={CHART_COLORS.primary} radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <Panel title={`${selectedRole.name} · 当前协作`} subtitle="点击查看完整角色证据">
          <div className="selected-role-card">
            <div className="selected-role-icon"><UserCircle aria-hidden="true" /></div>
            <div><span>状态</span><strong>{selectedRole.status}</strong></div>
            <div><span>当前负载</span><strong>{selectedRole.workload}%</strong></div>
            <div><span>阻塞</span><strong>{selectedRole.blocked}</strong></div>
            <div><span>下一交接</span><strong>{selectedRole.handoff}</strong></div>
            <button
              type="button"
              className="primary-button"
              onClick={() => openDrawer({
                eyebrow: `固定角色 ${selectedRole.id}`,
                title: selectedRole.name,
                content: <RoleDetail role={selectedRole} />,
              })}
            >
              查看角色详情 <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
