# Frontend Career Radar 发布完整性 UI/UX 设计 v1.7

> 项目 ID：`market-analysis-dev`
> 工作项：`CR-UI-002`
> 变更编号：`ui-design-20260816-career-release-completeness-v1-7-008`
> 版本：1.7
> 上游 Prompt：`ui/04-release-completeness-ui-prompt.md` v1.0，SHA256 `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900`
> v1.0–v1.6：原说明、资产、清单与哈希全部保留；v1.6 经第七轮独立视觉审查为 `changes-requested`
> 当前状态：`machine_passed + independent_visual_review_pending`
> 停止门：`ui-design-review`

## 交付结论

v1.7 以 v1.6 resolved 49 张设计包为不可变基线，新建版本化 overlay：

- 生成 29 张修订资产，按路径与 SHA 复用 20 张未受影响的 v1.6 resolved 资产；
- 28 张资产中的 33 个文件名式 `<title>` 已改为完整简体中文无障碍名称；
- 49 张共 1,851 个用户可见 `title/text/desc` 节点全部进入英文、文件名式文案与内部键规则扫描；
- resolved 03、07、12、13、26 的重复 `title/desc` ID 已消除，49 张文档内所有 ID 唯一、全部 `aria-labelledby` 目标可唯一解析；
- 25-13 路线图以结构化 `depends_on` 模型生成 6 条真实虚线依赖边，每条记录都画出矢量锁符号和简中状态文字；
- 当前真实性仍为运行时来源 0、连接器 0、获批招聘实例 0；
- 本交付没有修改前端、后端、架构、连接器或部署，没有自批，也没有授权下游。

## 第七轮问题闭环

| 审查项 | v1.7 实际修改 | 机器可复核证据 |
|---|---|---|
| 28/49 资产存在 33 个裸文件名标题 | 逐资产配置完整简中无障碍名称，删除历史重复元数据并重建唯一标题/描述；foundation 将英文公式说明改为“WCAG 相对亮度”，8 组颜色对改为“色值：前景…｜背景…” | 全 49 张、1,851 个 `title/text/desc` 节点扫描；文件名式标题 0，未标注内部键 0，非白名单裸英文 0 |
| resolved 03/07/12/13/26 重复 `id=title/desc` | 五张资产均只保留一组版本化无障碍标题与描述 ID；其余资产同步验证 | 49/49 文档内重复 ID 0；所有 `aria-labelledby` 目标解析计数唯一 |
| 25-13 按数组相邻项串线，缺锁与状态文字 | 模型改为“用户确认→公共要求/个人证据→三项输入齐全→成长路线”的五节点拓扑；三项门禁还显式依赖用户确认；所有模型依赖逐条生成虚线边，节点逐条生成矢量锁和状态文字 | 模型、主图、等价表记录双向集合相等；模型边集合与 SVG 边集合 6/6 双向相等；锁与状态 5/5；个人证据仅依赖用户确认，成长路线仅依赖三项输入齐全 |

## 已锁定回归项

v1.7 继续验证并保持：49/49 SVG/PNG 哈希与尺寸、15 张图表数据等价、25-11/25-15 主图状态、25-10 证据不足唯一选择、14 张独立移动稿、20 个按钮 PNG 字形中心、28 号 200% authored 属性、8/8 方向、8×5 能力矩阵、25-14 三轨真相、等价表正文不小于 14px、page10/chips/pills，以及不自批、不路由下游。

## 文案扫描与无障碍验证边界

当前扫描覆盖所有 SVG 的用户可见 `<title>`、`<text>`、`<desc>`：

- 文件名式文案直接失败；
- 内部状态键只有置于“内部键：”或“开发附注：”后才允许；
- 技术专名、键盘键名、文件格式、数学变量、时区和显式版本号进入明确白名单并在报告中计数，不以“无英文”作虚假结论；
- 每份 SVG 单独检查 ID 唯一性，每个 `aria-labelledby` 引用必须恰好解析到一个目标；
- 本机器门不证明通用字体字形、浏览器 CSS 运行时布局或独立视觉质量。

## 25-13 路线依赖图

当前主图包含五个节点和六条依赖边：

- 用户确认是公共要求与个人证据的共同前置；
- 三项输入齐全同时依赖用户确认、公共要求与个人证据；
- 成长路线只依赖三项输入齐全；
- 当前用户未确认、个人证据不足、三项输入未齐全，因此所有节点均显示矢量锁与简中阻断状态，成长路线保持未生成。

等价表与主图由同一结构化记录生成；验证器按记录 ID、完整 payload、依赖节点、依赖边和状态字段逐项比对，不按数组相邻关系推断。

## 机器验证命令与结果

正向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.7/generate-overlay.mjs
node projects/market-analysis-dev/ui/release-completeness-v1.7/verify-resolved-bundle.mjs
```

结果：`machine_passed`；49 resolved = 29 张 v1.7 替换 + 20 张 v1.6 SHA 复用；1,851 个可见节点通过扩展文案规则；重复 ID 0，未解析 ARIA 目标 0；25-13 为 6 条模型依赖边完全相等、5/5 锁与状态；20/20 按钮 PNG 字形中心通过；独立视觉审查 pending round 8。

负向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.7/verify-resolved-bundle.mjs --negative-baseline
node projects/market-analysis-dev/ui/release-completeness-v1.7/verify-resolved-bundle.mjs --negative-container
node projects/market-analysis-dev/ui/release-completeness-v1.7/verify-resolved-bundle.mjs --negative-collision
node projects/market-analysis-dev/ui/release-completeness-v1.7/verify-resolved-bundle.mjs --negative-viewport
```

四条命令预期且实际退出码均为 1，分别捕获 authored 基线安全区、line-box 容器越界、line-box 互撞和 authored 720→360 属性关系错误。它们不是浏览器运行时通过证明。

## 权威路径与哈希

| 产物 | 路径 | SHA256 |
|---|---|---|
| 图表模型 | `ui/release-completeness-v1.7/resolved-chart-models.json` | `80ed373fc08f7b84233f2621e2016696b063f7604c976957f7d071c6a084e661` |
| authored 布局契约 | `ui/release-completeness-v1.7/authored-layout-contract.json` | `9d01b81b3728682cea3f237b27dca4d4c74b5b4a4af7dd9dbbe1b5aafa3d8138` |
| 按钮栅格契约 | `ui/release-completeness-v1.7/button-raster-contract.json` | `a31f4cc6cb060712c53f0d937200b8d677fd61a86e62d26bb56e7b75ab4e2087` |
| 按钮栅格报告 | `ui/release-completeness-v1.7/button-raster-report.json` | `5c70e022d2e1112d04bd591b7f26933b0908365df9e64e4a8ef90fe7edb68290` |
| 生成器 | `ui/release-completeness-v1.7/generate-overlay.mjs` | `caf58d3167f7c1554de55ed7687ce26fa9ff44f622ad96ebc1908207d77f84a4` |
| 主验证器 | `ui/release-completeness-v1.7/verify-resolved-bundle.mjs` | `90f7b5ce0d927d80db8c638d1f0ca8ba0a2d692cca33e50be289a4ee159e2b1a` |
| PNG 栅格验证器 | `ui/release-completeness-v1.7/verify-button-raster.swift` | `f0719a79ad6f74e0f7dcbc3c605040d077f48d66555978623bb3d3db2713a65c` |
| overlay 清单 | `ui/release-completeness-v1.7/overlay-manifest.json` | `ab816ec23f4b805dae065f285978898de860ae505d6e117eb1b0c33df7beadb4` |
| resolved 49 张清单 | `ui/release-completeness-v1.7/resolved-manifest.json` | `e075431cbe55764ad4959a55702272bbfea52d3318847284146d7a8dbe863474` |
| 机器结果 | `ui/release-completeness-v1.7/review-manifest.json` | `1752413f09362e3b41e07798da3cbcb87d79f00e70e2cc57cb0acc5425281a13` |

## 审核门

本交付只能登记为 `machine_passed + independent_visual_review_pending`，停在 `ui-design-review`，等待根协调第八轮全量独立审查。固定 04 对两张关键 PNG 的作者自查不构成独立审核；不得进入用户批准、前端、架构、后端、连接器、部署或任何下游实现。
