# Control Center 前端修复设计与交互 QA

- change_id: `fix-20260815-control-center-code-review-findings-001`
- authorization: `approval-20260815-control-center-frontend-code-fix-entry`
- input: `artifact-control-center-code-review-001` / `docs/06-code-review.md`
- safe base: `b5a972cfaa7309eead245f6a888410e1eeb5041b`
- output: `artifact-control-center-frontend-code-fix-001`
- data boundary: 页面继续只使用明确标注的演示快照与待接入状态；未连接 API、数据库、账号、真实审批或生产服务

## 视觉基线

`ui/` 中 9 张用户视觉资产及 `ui/01-control-center-ui-design-prompt.md` v1.1 仍是权威视觉与状态基线。本次修复保留米白页面、深墨绿导航、青绿主色、紫色演示标识、风险色阶、卡片密度与图表语言，没有生成或替换 UI 资产。

`design-qa/implementation-desktop-*.png` 是原前端交付的六视图桌面视觉对照，仅用于确认本次重构没有脱离既有视觉；它们不作为本次筛选、只读操作或移动端行为的验证依据。当前修复的可重复行为证据由真实 Chrome/CDP 门禁提供。

## 审查问题闭环

- `CR-P1-001`：四类全局筛选采用单一机器值状态，允许列表解析并完整写回 URL。项目、来源、时间与迭代覆盖不足时停止显示未过滤数据，明确说明“不可用”而非伪造零值。
- `CR-P1-002`：项目页状态、阶段责任角色与数据来源均为受控交集筛选；卡片、矩阵和详情只从同一可见集合派生，清除操作恢复全部局部筛选。
- `CR-P1-003`：质量页保持只读；未来缺陷状态迁移显示为原生禁用的“本版本不支持状态流转”，不再出现虚假成功 Toast。
- `CR-P1-004`：角色泳道改为 `ul > li > button`，保留原生按钮语义与 `aria-pressed`。
- `CR-P1-005`：阶段矩阵改为原生 `table/thead/tbody/th/td`，单元格详情按钮支持 Enter、Escape 与焦点返回。
- `CR-P1-006`：新增真实 Chrome/CDP 门禁，覆盖全局与项目筛选、URL 恢复、搜索与定位、筛选一致导出、只读状态、键盘焦点、无障碍树、控制台和四档视口。
- `CR-P2-001`：项目卡使用 `article + h2 + dl`，选择行为由独立、命名清楚的 `aria-pressed` 按钮承担。
- `CR-P2-002`：治理状态样例改成非交互预览，不再保留看似可用却无行为的按钮。
- `CR-P2-003`：六个一级视图按需加载；Dashboard 壳不再同步引入 Recharts 全量视图。

## 筛选、搜索与导出真实性

- 全局 `project/range/iteration/source` 四项会完整恢复、规范化并写回 URL；非法值回退默认值。
- 六视图均验证 `source=pending`、`range=7d`、`iteration=workflow-v03` 的覆盖不可用状态，不继续显示旧指标。
- English 单项目在总览和项目页只显示一个项目；角色与治理缺少项目拆分时停止复用全局快照；Model 项目不会冒用 English 的质量或发布明细。
- English 总览与发布页使用同一演示发布样本归属；其他缺少发布证据的单项目显示待接入。
- 搜索只在当前可证明的数据范围内返回结果。点击项目结果会同时切换项目页、项目筛选和 URL，避免“结果是 English、页面仍是 Model”的矛盾。
- 演示报告只包含当前有效筛选内的项目；待接入来源或其他覆盖不可用状态会明确阻止导出，不创建下载，也不夹带隐藏演示数据。

## 可访问性与响应式

- Chrome Accessibility Tree 已核对四个全局筛选的 `combobox` 名称、导出 `button` 名称、阶段矩阵 `table/columnheader/rowheader`、项目与角色选择的 `pressed` 状态，以及质量页只读动作的 `disabled` 状态。
- 键盘验证覆盖角色选择、矩阵详情 Enter 打开、Escape 关闭及焦点返回。
- 真实运行时覆盖 `1440×1000`、`1024×768`、`390×844`、`320×720`，六视图共 24 组；每组 `documentElement` 与 `body` 均无页面级横向溢出。
- 导航、标题、筛选、空态、错误、覆盖不可用、只读边界、按钮、表单、图表名称、无障碍名称及移动端界面均为简体中文；必要项目专名保留英文并有中文上下文。
- 支持键盘焦点、`prefers-reduced-motion`、高对比模式、原生表单标签和移动端安全区。

## 工程验证

- Node.js：`24.19.0`，满足项目 `>=22.13.0`。
- `npm run lint`：通过，零警告。
- `npm run typecheck`：通过。
- `npm run build`：通过；不再出现客户端块超过 500 kB 的告警。
- `npm run test:static`：3/3 通过。
- `npm run test:domain`：3/3 通过，覆盖搜索、导出和 English 发布样本的派生范围。
- `npm run test:performance`：2/2 通过；最大客户端块 `271,360 B`，Dashboard 壳 `90,117 B`，六个视图均为独立动态入口。
- `npm run test:browser`：1/1 通过；真实 Chrome 覆盖 24 个视图/视口组合、搜索、导出、筛选、键盘与无障碍树，控制台 `0 error / 0 warning`。
- Chrome 门禁支持 `CHROME_PATH`，并探测 macOS、Windows 与 Linux 常见 Chrome/Chromium 路径；随机端口和临时 Profile 在 `finally` 中精确清理。

## 已知边界

- 所有项目、角色、缺陷、发布与成熟度内容仍是前端演示快照，不能用于真实项目决策。
- 真实状态源、后端聚合、审批事件、账号、生产发布、回滚和部署不在本修复单元内。
- `CR-S-001` 的依赖审计源和生产响应头核验属于获批部署阶段，本批没有切换注册源或修改托管配置。
- 关键交互加载时间和初始总 JavaScript 尚未形成独立性能预算；本批已建立单块上限、Dashboard 壳上限和视图动态入口门禁。

final result: ready-for-frontend-fix-delivery-review
