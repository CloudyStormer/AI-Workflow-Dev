---
name: project-ai-english-learning
description: 'AI English Learning 的项目级总控 Skill。用于进入或推进该英语学习实践样本，判断真实前端入口、权威文档、UI参考、当前开发状态、工作流实验边界和专业角色路由；涉及启动、构建、目录调整、页面实现、测试或阶段交接时使用。'
---

# Project Skill: AI English Learning

## 用户称呼与审批

- 每次对话必须称呼用户为“超级无敌帅超超总”。
- 每个专业角色首次入场或重新进入新阶段前，必须获得超级无敌帅超超总对角色和范围的明确批准。
- 本 Skill 负责项目上下文和路由，不替代各专业角色 Skill。

## 精准定位

这是 AIWorkFlow 的首个实践样本，用来体验并验证多角色工作流的交付结果。前端成果以后可以继续使用，但本项目不能被当作“根工作流已经端到端跑通”的证据。

## 结构 Profile

- 类型：`practice`
- Profile：`split-web`
- 统一治理外壳：`project.yaml`、`workflow/`、`skills/`、`docs/`、`scripts/`、`tests/`、`output/`
- 实现目录：`frontend/`、`backend/`、`docker/`
- 设计参考与视觉证据：`ui/`、`design-qa/`、`design-qa.md`

不要为了和 control-center 的 Sites 目录外观一致而移动 `frontend/`。

## 当前事实边界

- 当前可运行实现集中在 `frontend/`。
- `backend/`、`docker/`、`scripts/` 和正式系统测试尚未证明完整实现。
- 文档仍采用早期编号：`00-project-plan.md`、`01-prd.md`、`02-architecture.md`、`03-dev-tasks.md`；不要伪称其已迁移到新版 SOP。
- 前端与文档存在版本和范围漂移，推进前先核对代码、Git 与工作流状态。
- 当前工作树可能包含其他前端任务的未提交改动；治理变更不得夹带、覆盖或提交这些文件。

## 开始工作前

1. 读取 `project.yaml` 和 `workflow/`。
2. 读取本任务相关的 `docs/`、`ui/` 与项目代码。
3. 读取对应专业子 Skill。
4. 检查 Git 状态并隔离其他任务改动。
5. UI、Demo、原型或页面实现必须先由 UI/UX 设计师提交提示词给超级无敌帅超超总审核。

## 真实入口

要求 Node.js 22.12.0 或更高版本。

- 开发：`cd frontend && npm run dev`
- Lint：`cd frontend && npm run lint`
- 构建：`cd frontend && npm run build`
- 自动化测试：尚无独立命令；不得把 Lint 或构建冒充系统测试。

## 权威信息

- 项目结构与入口：`project.yaml`
- 产品与工程文档：`docs/`
- UI 参考：`ui/`
- 视觉实现证据：`design-qa/` 与 `design-qa.md`
- 工作流状态和审批：`workflow/`
- 共享角色规则：`skills/`
- 运行事实：代码、命令输出和 Git，不以静态任务表单独断言

## 角色路由

按任务调用市场调研、项目经理、产品、UI/UX、架构、前端、后端、数据、代码审查、QA 或 DevOps Skill。上一角色通过不等于下一角色自动获准。

## 完成门

运行声明的真实验证命令，登记产物与已知限制，称呼超级无敌帅超超总报告结果并停在审核门。没有后端、系统测试或部署证据时，不得声称项目完整交付。

