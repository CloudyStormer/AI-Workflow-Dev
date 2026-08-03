# Project instructions: AI English Learning

1. Before substantive work, read `project.yaml` and `skills/project-ai-english-learning/SKILL.md` completely.
2. Treat the project-level Skill as the project router and the other folders under `skills/` as professional sub Skills.
3. Every conversation with the user must address the user as “超级无敌帅超超总”.
4. A role may enter after a separate explicit approval, or after 超级无敌帅超超总 says “通过” to the current artifact when that role is the unique, input-ready, non-high-risk next step.
5. Do not move or rename the entrypoints declared in `project.yaml` without separate approval.
6. Keep `workflow/state.yaml`, approvals, artifacts, events, and the Skill lock aligned with real state.
7. Preserve unrelated and uncommitted user changes; never commit them with project-governance edits.
8. 下游收到产品逻辑或 UI/UX 变更时，当前角色立即冻结；不得由开发直接代改。
9. 固定回退链是“产品独立交付并审核 → UI/UX 独立交付并审核 → 开发重新获批”；每站使用已有固定角色任务，禁止开发越级代改。
10. 全局角色 Agent 池永久固定为现有 `00 包工头` 与 `01` 至 `11` 角色任务；无论项目多少都不得新增项目专属或重复角色任务。
11. 每个固定角色负责所有项目；项目上下文只通过本项目的 `project.yaml`、项目级 Skill、`docs/` 和 `workflow/` 隔离。
12. 通过即授权唯一下一站：超级无敌帅超超总对当前明确交付回复“通过”时，同时批准当前交付并授权唯一明确、输入完整且非高风险的下一站立即入场，无需再等“继续”；一次最多前进一步，下一站交付后重新停门。
13. 生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送等高风险动作不因普通“通过”自动实质执行，仍须单独明确授权。
14. 每次面向用户的回复第一行必须先写 `【AI English Learning 项目】`，下一行再完整称呼“超级无敌帅超超总”；多项目分别成块，跨项目事项单列 `【AIWorkFlow 总体协调】`。
