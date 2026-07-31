---
name: project-workflow-control-center
description: 'AI Workflow Control Center 的项目级总控 Skill。用于进入、运行、发布或调整工作流监管大屏，判断 Sites 根入口、演示与真实数据边界、UI设计门、工作流状态和专业角色路由；涉及图表、导航、数据接入、构建、测试或部署时使用。'
---

# Project Skill: AI Workflow Control Center

## 用户称呼与审批

- 每次对话必须称呼用户为“超级无敌帅超超总”。
- 每个专业角色首次入场或重新进入新阶段前，必须得到超级无敌帅超超总明确批准。
- UI/UX 设计提示词未通过前，不得生成下一版设计稿或修改界面实现。

## 精准定位

control-center 是 AIWorkFlow 的治理与监管工具，不是 `projects/` 下的业务样本。它放在根目录是有意的：负责可视化项目、角色、阶段、审批、Bug/复测、迭代、发布和工作流成熟度。

## 结构 Profile

- 类型：`governance`
- Profile：`sites-fullstack`
- 统一治理外壳：`project.yaml`、`workflow/`、`skills/`、`docs/`、`scripts/`、`tests/`、`output/`
- Sites 实现入口：`app/`、`db/`、`worker/`、`public/`、`.openai/`
- 设计任务书：`ui/01-control-center-ui-design-prompt.md`

不得为了和 split-web 项目外观一致，把根目录 `app/` 移入 `frontend/`；这会破坏 Sites 构建与发布约定。

## 当前事实边界

- 第一版已私有发布：`https://ai-workflow-control-center.honest-flute-5906.chatgpt.site`
- 第一版是视觉原型，项目、阶段、角色、缺陷与成熟度主要是演示数据。
- `db/schema.ts` 仍为空，缺陷状态只在浏览器内存；控制中心还不是实时管理系统。
- 6 个导航尚未形成独立真实视图。
- 下一版图表化提示词已经交付，状态是等待超级无敌帅超超总审核。
- 页面必须清楚区分“真实数据、待接入、演示数据”，不得显示伪实时“已同步”。

## 开始工作前

1. 读取 `project.yaml`、`workflow/`、`README.md` 和当前 UI 提示词。
2. 检查超级无敌帅超超总是否批准 UI 提示词和对应角色入场。
3. 读取所需专业子 Skill。
4. 检查 Git 与 Sites 当前源提交、保存版本和部署状态。
5. 数据接入前先定义结构化状态契约，不能继续扩大硬编码假数据。

## 真实入口

要求 Node.js 22.13.0 或更高版本。

- 开发：`npm run dev`
- Lint：`npm run lint`
- 构建：`npm run build`
- 测试：`npm test`
- 托管：复用 `.openai/hosting.json` 中现有 Sites `project_id`，不得重复创建站点。

## 权威信息

- 项目结构与命令：`project.yaml`
- 产品边界：`README.md`
- UI 设计任务：`ui/`
- 工作流状态：`workflow/`
- 项目与专业规则：`skills/`
- 运行事实：构建/测试结果、Sites 版本与部署状态

## 固定角色 Agent 池（强制）

- 本项目不拥有一套项目专属角色 Agent；始终复用全局现有的 `00 包工头` 与 `01` 至 `11` 固定角色任务。
- 每个固定角色负责所有项目。本项目通过 `project.yaml`、本项目 Skill、`docs/` 与 `workflow/` 隔离上下文。
- 产品、UI/UX、前端、数据和发布工作分别交给既有编号角色任务；不得因控制中心、页面或迭代另建重复角色任务。
- “独立角色任务/对话”只表示不同角色使用各自的固定任务，不表示为本项目新建任务。

## 下游变更回退门（强制）

- 本项目进入架构、开发、审查、测试或发布后，只要超级无敌帅超超总提出产品逻辑或 UI/UX 变更，当前角色立即冻结相关工作，登记完成点、未提交改动、阻塞和安全恢复点；前端不得直接代改控制台产品或界面逻辑。
- 固定顺序是：产品经理独立任务交付并等待明确审核 → 审核通过后 UI/UX 独立任务交付并等待明确审核 → 再次通过后对应开发角色重新获批并解冻。
- 每站使用对应角色的独立任务/对话，把任务、产物、审批、冻结和恢复写入 `workflow/`；禁止自动跑完整链路，禁止继承上一站批准。

## 完成门

任何界面或数据改动都要运行 Lint、构建与测试；发布时保存精确源版本并核验生产状态。向超级无敌帅超超总报告真实 URL、版本、限制并停在审核门。
