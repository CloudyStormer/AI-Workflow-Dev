# AIWorkFlow 项目模板规范

## 目标

所有项目共用可审计、可路由、可验证的治理外壳；技术栈和实际运行入口由 Profile 决定。模板不会为追求目录外观而移动现有代码。

## 必须一致的治理外壳

所有项目都位于 `AIWorkFlow` 唯一根仓库中。`projects/` 子项目和 `control-center/` 只能是普通目录，不得执行 `git init`、保留嵌套 `.git`、配置独立 remote、创建 submodule 或单独推送。唯一标准 GitHub 仓库为 `git@github.com:CloudyStormer/AI-Workflow-Dev.git`。

```text
project-root/
├── AGENTS.md
├── README.md
├── project.yaml
├── docs/
├── ui/                         # UI/UX 提示词、设计与生成界面
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

`project.yaml` 是项目身份、Profile、真实启动命令和模块路径的机器可读事实源。`workflow/` 记录当前状态、超级无敌帅超超总审批、产物、事件和 Skill 哈希。项目级 Skill 负责项目边界与路由，专业角色 Skill 负责具体工作。

`ui/` 是所有项目都必须具备的 UI 资产目录，不随 Profile 变化。新的 UI/UX 提示词、设计说明、原型、生成界面与视觉审核产物统一写入该目录，并在 `workflow/artifacts.yaml` 登记。已经进入审核门的历史产物在审批闭环前保留原路径，只在 `ui/README.md` 建索引，避免路径与哈希失效。

项目模板只复制 Skill 规则快照，不复制角色 Agent。侧边栏全局角色任务永久固定为 `00 包工头` 与 `01` 至 `11`；每个固定角色负责所有项目。新增、收编或迭代项目时，禁止创建项目专属、需求专属或重复角色任务；“独立角色任务”一律指复用现有编号角色任务。

每个项目的 `AGENTS.md`、项目级 Skill 和共享角色 Skill 快照必须包含“下游变更回退门（强制）”：进入下游后收到产品逻辑或 UI/UX 变更，当前角色冻结，严格按“产品独立交付并审核 → UI/UX 独立交付并审核 → 开发重新获批”推进。每站使用已有固定角色的独立任务/对话并登记产物、审批、冻结和恢复事件；不得由开发代改。超级无敌帅超超总对当前交付明确回复“通过”时，自动授权唯一明确、输入完整且非高风险的下一站，无需再等“继续”；一次最多前进一步，下一站交付后重新停门。

## 可以不同的实现 Profile

| Profile | 典型实现目录 | 用途 |
|---|---|---|
| `split-web` | `frontend/`、`backend/`、`docker/` | 前后端分离应用 |
| `sites-fullstack` | 根级 `app/`、`db/`、`worker/`、`public/`、`.openai/` | OpenAI Sites 全栈应用 |
| `service` | `backend/` | API、任务或后台服务 |
| `custom` | 在 `project.yaml` 显式声明 | 不适合前三类的工程 |

## 当前四个项目

| 项目 | 类型 | Profile | 真实入口状态 |
|---|---|---|---|
| `projects/ai-english-learning` | 工作流实践样本 | `split-web` | 在 `frontend/` 运行 npm 命令；保留现有前端结构 |
| `projects/ai-model-radar` | 可继续使用的产品样本 | `split-web` | 当前停在市场调研审核门，尚未批准技术入口 |
| `control-center` | 跨项目治理工具 | `sites-fullstack` | 在项目根目录运行 npm 命令；保留 Sites 目录和托管配置 |
| `projects/market-analysis-dev` | 前端职业成长产品 | `split-web` | 当前完成项目计划，尚未批准技术入口 |

四者的代码目录不同是 Profile 的真实差异，不再是缺少规则的随意差异；`ui/` 则是跨 Profile 的统一目录。

## 初始化与收编

规范实现位于 `skill/workflow-project-init/`。示例：

```bash
python skill/workflow-project-init/scripts/init_project.py projects/example \
  --id example \
  --name "Example" \
  --kind practice \
  --profile split-web \
  --shared-skills-source skill \
  --include-shared-skills
```

已有项目默认只创建缺失治理文件。需要同步根级共享 Skill 时，确认差异后显式加 `--sync-shared-skills`。初始化后必须定制项目级 Skill，并运行：

```bash
python skill/workflow-project-init/scripts/validate_project.py projects/example
```

结构验证之后，还要运行 `project.yaml` 声明的 lint、build 和 test；只有二者都通过，才能说明收编没有破坏工程。

## 边界

- 初始化前后运行根级 `scripts/check-git-boundary.sh`；仓库根、远端或 gitlink 不符合唯一根仓约束时立即停止。
- 不移动或重命名现有入口来追求统一外观。
- 不把尚未定义的命令伪装成可启动；`ai-model-radar` 当前空命令是明确状态。
- 不覆盖其他任务的未提交改动。
- 不把项目级 Skill 当作前端、后端、QA 等专业 Skill 的替代品。
- 不把项目内的 Skill 快照理解成一套新的角色 Agent；任何项目都只路由到现有固定编号角色任务。
- 没有唯一上游路由的新角色入场、UI 设计、阶段交付和生产发布仍按总控审批门执行；当前交付“通过”可自动授权唯一低风险下一站一个交付单元。
- 下游产品逻辑或 UI/UX 变更必须先冻结并回退产品；产品、UI/UX、开发三站分别独立交付和审批，但无需在“通过”后再补一句“继续”。
- 生产发布、删除或不可逆覆盖、付费采购、账号权限、隐私数据和对外发送等高风险动作不因普通“通过”自动执行，仍须单独明确授权。
