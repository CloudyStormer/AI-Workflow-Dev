# Project instructions: Frontend Career Radar（前端职业成长雷达）

1. Before substantive work, read `project.yaml` and `skills/project-market-analysis-dev/SKILL.md` completely.
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
14. 每次面向用户的回复第一行必须先写 `【Frontend Career Radar（前端职业成长雷达） 项目】`，下一行再完整称呼“超级无敌帅超超总”；多项目分别成块，跨项目事项单列 `【AIWorkFlow 总体协调】`。
15. 产品信息架构的固定前两层是“职业方向总览 → 技术栈全景”；技术栈必须位于第二层，不能被招聘、学习计划或成长记录模块后置。
16. 招聘证据必须记录来源、采集或发布日期、地区、岗位层级、样本量及版权、robots、API 和登录限制；没有来源与时间戳的数据不得冒充当前市场事实。
17. 个人成长记录必须区分用户自述事实、可核验证据、系统评估与模型推断；推断不得写成已完成或已掌握的事实。
18. UI/UX 阶段优先交付面向数据大屏和数据看板的完整设计提示词；产品功能可完整规划，但任何 UI 产物仍须经过产品独立交付与审核门。
