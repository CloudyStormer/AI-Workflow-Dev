# Control Center 前端设计 QA

- change_id: `chg-20260804-control-center-ui-frontend-001`
- approval: `approval-20260804-control-center-frontend-entry`
- implementation: `app/Dashboard.tsx`、`app/dashboard-data.ts`、`app/dashboard-views.tsx`、`app/globals.css`
- preview: `http://127.0.0.1:4175/?view=overview`
- data boundary: 页面仅使用“演示数据 / 待接入 / 模拟状态”，未连接 API、数据库、账号或生产服务

## 权威视觉对照

已在同一对照输入中逐页比较用户母版与浏览器截图：

| 视图 | 用户母版 | 实现证据 |
| --- | --- | --- |
| 总览 | `ui/grok-2ee1ea02-5590-4aa1-a1e9-ddf49d846bb5.jpg` | `design-qa/implementation-desktop-overview-viewport.png` |
| 项目与阶段 | `ui/grok-eea5ba37-569b-42c0-b733-992c153b7b80.jpg` | `design-qa/implementation-desktop-projects-viewport.png` |
| 角色协作 | `ui/grok-af2d6a2c-41e6-4c6a-9e16-9662229c3516.jpg` | `design-qa/implementation-desktop-roles-viewport.png` |
| 质量与复测 | `ui/grok-56ef1a49-10ac-412b-81c2-02fbc50b100d.jpg` | `design-qa/implementation-desktop-quality-viewport.png` |
| 迭代与发布 | `ui/grok-29fd09f5-3ea7-4f6d-a674-dcd84d8817fa.jpg` | `design-qa/implementation-desktop-releases-viewport.png` |
| 成熟度与治理 | `ui/grok-47a2acfb-3a3e-4801-a8da-ee607db474c0.jpg` | `design-qa/implementation-desktop-governance-viewport.png` |
| 手机总览 | `ui/grok-a40f0801-bc2c-4e38-aea2-72db6a1b0139.jpg` | 响应式规则与移动组件结构检查，见下方证据说明 |

另保留六视图全页截图 `design-qa/implementation-desktop-*.png`，用于检查首屏以下模块的完整性。

## 视觉结论

- 通过：沿用米白页面、深墨绿导航、白色卡片、青绿主色、紫色演示标识与风险色阶；没有照抄母版中的乱码、虚构数字或假实时状态。
- 通过：六个视图均有独立信息架构与浏览器可见内容，不是只替换标题；图表、矩阵、表格、队列、门禁和治理证据均可读。
- 通过：卡片圆角、边框、阴影、间距、密度与图标语言保持一致；图标统一使用 Phosphor，图表统一使用 Recharts。
- 已修复：程序化聚焦页面标题时出现的蓝色轮廓会污染交付截图，现仅保留交互控件的可见焦点环。

## 交互与可访问性

- 通过：六项桌面主导航、项目筛选、时间/迭代/来源筛选、全局搜索、演示报告导出、阶段矩阵详情、图表数据表切换、角色详情、质量门禁、缺陷严重度筛选与模拟流转。
- 通过：模拟流转使用原生 `dialog`；首次聚焦“取消”，支持 Esc，关闭后焦点返回触发按钮，确认后给出非真实写入提示。
- 通过：六视图可见控件自动巡检结果均为 `unnamed = 0`；页面级横向溢出均为 `scrollWidth = innerWidth = 1280`。
- 通过：图表提供屏幕阅读器摘要及可展开数据表；状态不只靠颜色，关键状态同时包含图标和中文文字。
- 通过：支持 `prefers-reduced-motion`、高对比模式、键盘焦点、原生表单标签和移动端 44px 以上关键触控目标。
- 通过：浏览器控制台错误与警告为 0。

## 响应式与中文版完整性

- 桌面：真实应用内浏览器逐页检查 1280×720 首屏和全页内容；六页均无页面级横向溢出。
- 平板：`1200px` 与 `900px` 断点把侧栏、工具栏、图表网格和详情区降级为紧凑布局或单列。
- 手机：`767px` 与 `420px` 断点隐藏桌面侧栏，启用“总览 / 项目 / 质量 / 更多”四项底部导航、单列图表、移动缺陷卡、底部抽屉、安全区和自然横向滚动的阶段矩阵。
- 证据限制（P2）：当前应用内浏览器的官方 viewport override 调用未改变其固定 1280×720 自动化表面，因此没有生成 390px 运行时截图；本批以用户 1008×1792 手机母版、断点代码检查、移动组件语义检查和构建测试补足证据，不把这一工具限制表述为已完成的真机验证。
- 中文版完整性：导航、标题、筛选、按钮、表单、校验、提示、空/加载/错误/过期/无权限状态、图表名称/图例、弹窗、无障碍标签和移动端导航均为简体中文；项目专名、角色缩写、Bug/API 等必要专有词保留原文并有中文上下文。

## 工程验证

- Node.js：`24.14.0`（满足项目 `>=22.13.0`）
- `npm run lint`：通过
- `npm run build`：通过；仅有 Recharts 相关单块超过 500 kB 的非阻塞构建提示
- `npm test`：3/3 通过，覆盖 SSR、中文信息架构、11 阶段、11 角色、缺陷分布、42 分成熟度口径、响应式契约与 Sites/Vinext hosting contract

## 已知边界

- 所有项目、角色、缺陷、发布与成熟度数字均是前端演示快照，不能用于真实项目决策。
- 真实状态源、审批事件、API、数据库、账号、生产部署、发布与回滚均不在本批范围。
- Recharts 使客户端主块触发大于 500 kB 的构建提示；不影响当前本地交付，后续可在不改变产品语义的前提下做按视图代码分割。

final result: passed
