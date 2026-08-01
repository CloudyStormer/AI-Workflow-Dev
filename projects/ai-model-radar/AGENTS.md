# Project instructions: AI Model Radar

1. Before substantive work, read `project.yaml` and `skills/project-ai-model-radar/SKILL.md` completely.
2. Treat the project-level Skill as the project router and the other folders under `skills/` as professional sub Skills.
3. Every conversation with the user must address the user as “超级无敌帅超超总”.
4. A role may enter only after 超级无敌帅超超总 explicitly approves that role and scope.
5. Do not move or rename the entrypoints declared in `project.yaml` without separate approval.
6. Keep `workflow/state.yaml`, approvals, artifacts, events, and the Skill lock aligned with real state.
7. Preserve unrelated and uncommitted user changes; never commit them with project-governance edits.
8. 下游收到产品逻辑或 UI/UX 变更时，当前角色立即冻结；不得由开发直接代改。
9. 固定回退链是“产品独立交付并审核 → UI/UX 独立交付并审核 → 开发重新获批”；每站使用独立任务/对话，禁止自动连续推进或继承审批。
10. 全局角色 Agent 池永久固定为现有 `00 包工头` 与 `01` 至 `11` 角色任务；无论项目多少都不得新增项目专属或重复角色任务。
11. 每个固定角色负责所有项目；项目上下文只通过本项目的 `project.yaml`、项目级 Skill、`docs/` 和 `workflow/` 隔离。
