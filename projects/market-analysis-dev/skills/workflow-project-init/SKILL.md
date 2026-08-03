---
name: workflow-project-init
description: '统一初始化、收编或整理 AIWorkFlow 下的软件项目，生成一致的治理外壳、project.yaml、工作流状态契约、项目级 Skill、共享子 Skill 快照和验证基线，同时保留不同技术栈原有入口。用户要求创建新项目、生成项目模板、统一项目目录、给每个项目增加 Skill、解释项目结构差异或在不破坏启动的前提下整理现有项目时使用。'
---

# Skill: 工作流项目初始化 (workflow-project-init)

## 用户称呼规范

- 每次与用户对话时，必须称呼用户为“超级无敌帅超超总”。
- 将此规则用于结构方案、变更预览、风险、验证和最终交付。

## 项目模块化汇报格式（强制）

- 每次面向用户的回复，第一行先写项目模块标题，下一行再使用完整称呼“超级无敌帅超超总”。单项目使用 `【{项目显示名称} 项目】`。
- 多项目分别成块并重复对应标题；跨项目初始化、根仓边界或统一治理事项单列 `【AIWorkFlow 总体协调】`。
- 初始化模板必须把该格式写入项目 `AGENTS.md` 和项目级 Skill，保证未来项目自动继承。

## 核心目标

统一项目的治理外壳，不强迫不同技术栈使用相同实现目录。

## 唯一 Git 仓库边界（强制）

- `AIWorkFlow` 是唯一 Git 根项目，唯一标准 GitHub 仓库是 `git@github.com:CloudyStormer/AI-Workflow-Dev.git`。
- `projects/` 下全部现在和未来的子项目以及 `control-center/` 只能作为根仓普通目录；禁止在子项目执行 `git init`、保留嵌套 `.git`、配置独立 remote、创建 submodule 或单独推送。
- 初始化或收编前后必须运行根级 `scripts/check-git-boundary.sh`。若仓库顶层不是 `AIWorkFlow`、存在嵌套 `.git`、额外 remote 或 gitlink，立即停止，不能自行把异常解释成多仓架构。
- 项目级 Skill、共享 Skill 快照和 Profile 只定义治理与实现差异，不改变唯一 Git 边界。

## 固定角色 Agent 池（强制）

- 初始化多少项目都不得创建新的角色 Agent、侧边栏任务或项目专属角色对话；全局只使用既有 `00 包工头` 与 `01` 至 `11` 固定角色任务。
- 每个固定角色负责所有项目；项目隔离依靠 `project.yaml`、项目级 Skill、`docs/` 和 `workflow/`，不依靠复制角色任务。
- 项目中的 `skills/` 是规则快照和能力路由，不代表该项目拥有一套新的角色 Agent。
- 模板、项目级 Skill 和 `AGENTS.md` 必须把“独立角色任务”解释为复用现有固定角色任务，禁止按项目新建。
- 本 Skill 只初始化项目治理文件，永远不创建侧边栏任务；项目初始化方案和计划由现有 `02 项目经理` 在获批范围内负责，`00 包工头` 只做全局路由与机械协调。

所有项目必须具有：

```text
project-root/
├── AGENTS.md
├── README.md
├── project.yaml
├── docs/
├── workflow/
│   ├── state.yaml
│   ├── approvals.yaml
│   ├── artifacts.yaml
│   ├── events.jsonl
│   └── skill-lock.yaml
├── skills/
│   ├── project-{project-id}/SKILL.md
│   └── shared role/workflow Skills
├── scripts/
├── tests/
└── output/
```

实现目录由 Profile 决定：

- `split-web`：通常使用 `frontend/`、`backend/`、`docker/`。
- `sites-fullstack`：保留根目录 `app/`、`db/`、`worker/`、`public/` 和 Sites 配置。
- `service`：服务、任务或 API 项目。
- `custom`：在 `project.yaml` 中显式声明真实模块与入口。

“相同模板”指治理、状态、Skill 和入口声明相同，不指把 Sites 项目强行搬进 `frontend/`。

## 强制规则

1. 先运行根级 Git 边界检查，再检查现有目录、Git 状态、启动/构建/测试命令和外部托管约束。
2. 先向超级无敌帅超超总提交初始化或收编方案；只有超级无敌帅超超总明确批准后才能写入。
3. 不移动、删除或重命名已有入口，除非超级无敌帅超超总单独批准迁移。
4. 默认只创建缺失文件；已有 README、状态、Skill 或代码不得覆盖。
5. 共享角色 Skill 以根目录 `skill/` 为规范源。同步覆盖必须显式使用 `--sync-shared-skills`，并先确认差异。
6. 每个项目必须有且只有一个项目级 Skill，负责项目定位、结构、启动命令、权威文档、角色路由和禁区；角色 Skill 是它调用的子 Skill。
7. 修改前后运行同一组启动/构建/测试检查，证明整理没有破坏项目。
8. 有其他任务的未提交改动时，只新增治理文件；不得暂存、提交或覆盖不属于本任务的文件。
9. 整理完成后更新 `workflow/skill-lock.yaml`，运行结构验证和 Skill 验证，再请求超级无敌帅超超总审核。

## 下游变更回退门（强制）

- 每个新建或收编项目的 `AGENTS.md` 与项目级 Skill 都必须声明：下游收到产品逻辑或 UI/UX 变更时，当前角色立即冻结并回退上游，不得由开发直接代改。
- 固定顺序是产品经理独立任务交付并等待明确审核；产品产物“通过”后自动授权 UI/UX 完成下一交付；UI 提示词“通过”自动授权同一 UI/UX 角色出设计；设计“通过”后对应开发角色重新获批并解冻，或在影响架构时先路由架构师。
- 每站使用已有固定角色的独立任务/对话，产物、审批、冻结与恢复写入 `workflow/`；一次“通过”最多自动前进一步，下一站交付后再次停门，禁止自动跑完整链路。
- 初始化验证必须检查该门禁存在于项目级 Skill、`AGENTS.md` 和共享工作流/角色 Skill 快照中。

## 通过即授权唯一下一站（强制）

- 新项目模板必须声明：超级无敌帅超超总对当前明确交付回复“通过”时，同时批准当前交付并授权唯一明确、输入完整且非高风险的下一站立即入场，无需再等“继续”。
- 自动授权只覆盖下一站一个交付单元；下一站交付后必须重新停在审核门。下一站不唯一时先拆分或请示，不得同时启动多个角色。
- 生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送等高风险动作只允许自动进入方案准备，实质执行仍须单独明确授权。
- 该语义必须写入生成的 `AGENTS.md`、项目级 Skill、共享 Skill 快照、验证器和工作流状态契约。

## 标准流程

### 1. 盘点

记录：

- 项目用途：实践样本、实际产品或治理工具。
- 当前 Profile、模块和真实入口。
- Git 仓库、远端、分支及未提交改动。
- 确认 `git rev-parse --show-toplevel` 为 `AIWorkFlow`，并确认项目目录内没有 `.git` 或 gitlink。
- 启动、构建、测试、Lint 命令。
- 已有文档、workflow、skills、tests、scripts 和 output。

### 2. 选择 Profile

以运行方式为准，不以目录外观为准。若改变 Profile 会影响构建或部署，停止并请求超级无敌帅超超总决定。

### 3. 预览变更

先说明将创建、保留和明确不移动的路径。对现有项目使用“adopt/收编”模式，不做重构。

### 4. 初始化或收编

使用：

```bash
python scripts/init_project.py PROJECT_DIR \
  --id PROJECT_ID \
  --name "PROJECT NAME" \
  --kind practice|product|governance \
  --profile split-web|sites-fullstack|service|custom \
  --dev-cwd PATH --dev-command "COMMAND" \
  --build-cwd PATH --build-command "COMMAND" \
  --test-cwd PATH --test-command "COMMAND" \
  --lint-cwd PATH --lint-command "COMMAND" \
  --shared-skills-source PATH \
  --include-shared-skills
```

需要把规范源更新到项目快照时，再显式添加 `--sync-shared-skills`。

### 5. 定制项目级 Skill

生成后补齐：

- 项目唯一定位与非目标。
- 权威文档和数据源。
- 模块边界。
- 精确启动、构建、测试和发布命令。
- 项目特有的风险、禁止事项与角色路由。
- 任何 UI 工作的“提示词先审、设计再审、最后实现”门。

### 6. 验证

运行：

```bash
scripts/check-git-boundary.sh
python scripts/validate_project.py PROJECT_DIR
```

再运行项目原有的 Lint、构建、测试或最小启动探测。结构验证通过不等于产品运行通过。

### 7. 交付

向超级无敌帅超超总报告：

- 三类路径：统一外壳、Profile 特有实现、保留的历史兼容内容。
- 项目级 Skill 路径。
- 前后启动命令与结果。
- 未解决的结构债务、活动任务冲突和 Git/远端状态。
- 当前交付的审核选项、唯一下一站及一跳停止点；超级无敌帅超超总回复“通过”后立即路由该下一站，无需再等“继续”。

## 项目级 Skill 与子 Skill

项目级 Skill 是项目总说明和路由器，不替代专业角色：

- 市场调研 → `role-market-researcher`
- 项目治理 → `role-pm`
- 产品 → `role-product-manager`
- UI/UX → `role-ui-designer`
- 架构 → `role-architect`
- 前端/后端/数据 → 对应开发 Skill
- 审查/测试/发布 → 对应质量和 DevOps Skill

项目级 Skill 不复制业务事实；事实留在 `docs/`、`workflow/` 和代码中，并通过路径引用。

## 停止条件

出现以下任一情况立即停止写入并请求超级无敌帅超超总决定：

- 无法确认真实启动入口。
- 需要移动或删除现有代码才能“统一”。
- 现有任务正在修改同一路径。
- 项目 Git 状态无法区分本任务与他人改动。
- Git 顶层不是 `AIWorkFlow`，或发现子项目 `.git`、独立 remote、submodule/gitlink。
- 结构整理后原启动、构建或测试命令失败，且无法证明失败与本次无关。
