# CC-UI-002 生成说明与复现前提

## 1. 用途与边界

本文件记录 `artifact-control-release-completeness-ui-visuals-001` 的视觉方向输入、结构化资产生成方式与复现前提。它不是业务实现说明，也不表示真实工作流读取器、连接器、服务或生产发布已经完成。

- 权威 Prompt：`../02-release-completeness-ui-prompt.md` v1.0。
- 结构化设计源码：`generate-assets.mjs`。
- 机器门：`verify-assets.mjs`。
- 输出目录：当前目录；历史 9 张视觉基线不在本生成器管理范围内。
- 真相边界：当前真实运行时来源未接通；目标态数据只作版式和状态演示；所有业务与 Git 写动作均为 0。

## 2. AI 视觉方向图输入

`00-ai-visual-direction-current-not-ready.png` 只用于确定“克制、干净、高信息密度、真实性优先”的视觉方向。结构、文字、数据和状态以确定性 SVG 原型为准。

```text
为“AI 工作流控制中心”生成一张 1536×1024 的简体中文桌面数据治理大屏视觉方向图。

视觉要求：极简、干净、专业、克制；深靛蓝侧栏，浅灰页面背景，白色卡片，蓝色作为信息色；大面积留白，细边框，避免装饰性渐变和炫技效果。信息密度高但层级清晰，以图表、矩阵、状态卡和紧凑表格替代大段文字。

内容要求：页面必须显著表达“只读监管”“数据未就绪”“当前没有可用真实观测”“不补造 KPI”；展示项目、角色、审批、产物、事件、问题、发布、来源与新鲜度的入口，但不要显示虚构成功数字。状态同时使用中文文字、图标、边框和颜色，不能只靠颜色。提供搜索、筛选、只读刷新、导出当前查询等只读控件，禁止批准、发布、修复、删除或 Git 写入口。

真实性要求：真实工作流读取器和后端尚未接通；不得把历史演示、静态回退或研究清单伪装成实时数据。若出现目标态示例，必须就近写“目标态演示数据·非当前事实”。

输出只作为视觉方向，不承担精确业务字段、交互或实现验收。
```

## 3. 确定性生成与验证

生成器从同一结构化模型同时输出 SVG、等尺寸 PNG、`prototype.html` 与 `manifest.json`。十九类图表的可视标记和等价表共享字段、值与状态数据；机器门还验证关键矩阵维度、文件尺寸、SHA256、可访问名称和真相状态。

```bash
NODE_PATH=<可解析 sharp 的工作区 node_modules> \
node control-center/ui/release-completeness-v1.0/generate-assets.mjs

NODE_PATH=<可解析 sharp 的工作区 node_modules> \
node control-center/ui/release-completeness-v1.0/verify-assets.mjs
```

本工作树没有为 Control Center 新增或修改 `package.json`。生成器先尝试普通项目依赖解析，再尝试“当前 Node 可执行文件同目录的 `node_modules`”；也允许调用方显式提供 `NODE_PATH`。源码与 manifest 均不保存本机绝对依赖路径。`sharp/libvips` 只是本地设计生成工具的间接依赖，不归本交付声明或修改；缺少与锁文件兼容的工具环境时，不能声称可独立复现 PNG。SVG、PNG、原型、生成器与 manifest 中登记的 SHA256 是本交付的可追溯依据。

视觉内容聚合 SHA 的规范化算法由机器门执行：将 36 SVG、36 PNG、AI 方向图、原型、生成器、两个验证文件、生成说明、设计说明和权威 Prompt 的项目相对路径转为 UTF-8 NFC，逐行拼为 `relative_path<TAB>lowercase_sha256`，按相对路径 Unicode 码点排序，末尾保留一个 LF，再对完整字节序列计算 SHA256。`manifest.json` 为避免自引用、`browser-evidence.json` 因根级复验会变化、workflow 因审查事件会变化，三者明确排除。该聚合只证明同一视觉内容快照稳定，不代表浏览器或独立视觉审查通过。

浏览器用例文件接受“已经由 Playwright CLI 打开的 127.0.0.1 静态测试页”，不绑定 `file://`，也不启动业务服务。当前图例修复候选已由 fixed00 在 `http://127.0.0.1:48175/prototype.html` 原样运行当前 checker，结果 `exit 0 · status passed · 11/11 · console 0 errors / 0 warnings`；`browser-evidence.json` 绑定当前 prototype、generator 与 checker 的精确 SHA。329d 与 a37 的浏览器结果只保留为历史。复现示例：

```bash
export CC_PROTOTYPE_URL=http://127.0.0.1:<临时端口>/prototype.html
export PLAYWRIGHT_CLI_SESSION=aiworkflow-control-center-qa
<playwright-cli> open "$CC_PROTOTYPE_URL"
<playwright-cli> run-code \
  --filename control-center/ui/release-completeness-v1.0/verify-prototype-browser.mjs
```

临时静态服务器只暴露本版本化 UI 目录，用后立即停止；它不是 Control Center 服务、读取器或部署。`browser-evidence.json` 只有在用例文件针对当前 prototype SHA 全部实跑通过后才可写 `passed`。

## 4. 验证能力边界

机器门验证文件完整性和已编写的 SVG/HTML 静态结构，但不替代浏览器、屏幕阅读器播报、生产字体渲染或真实服务联调。`prototype.html` 是可达交互规范原型。当前源码已统一按 `data-index` 激活页面，并提供真实可见的“总览／项目／质量／更多”底栏与 12 页更多菜单。当前图例修复候选的 fixed00 浏览器 11/11 证据已经回填并绑定精确 prototype、generator 与 checker SHA，console 为 0 errors / 0 warnings；329d 与 a37 证据仍只保留为历史。浏览器结论不替代独立视觉审查；屏幕阅读器和真实服务验收继续由独立审查及后续实现阶段完成。
