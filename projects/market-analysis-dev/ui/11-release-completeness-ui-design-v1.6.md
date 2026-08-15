# Frontend Career Radar 发布完整性 UI/UX 设计 v1.6

> 项目 ID：`market-analysis-dev`
> 工作项：`CR-UI-002`
> 变更编号：`ui-design-20260816-career-release-completeness-v1-6-007`
> 版本：1.6
> 上游 Prompt：`ui/04-release-completeness-ui-prompt.md` v1.0，SHA256 `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900`
> v1.0–v1.5：原说明、资产、清单与哈希全部保留；v1.5 经第六轮独立视觉审查为 `changes-requested`
> 当前状态：`machine_passed + independent_visual_review_pending`
> 停止门：`ui-design-review`

## 1. 交付结论

v1.6 以 v1.5 resolved 49 张设计包为不可变基线，新建版本化 overlay：

- 生成 41 张 v1.6 修订资产，按路径与 SHA 复用 8 张未受影响的 v1.5 resolved 资产；
- `resolved-manifest.json` 仍唯一解析为 49 张，不覆盖 v1.0–v1.5 历史；
- 25-11 与 25-15 的 `state` 已进入每一条主图 mark 的可见状态文字，不再只存在于隐藏 payload 或表格；
- 14 张移动稿、组件板、1024 响应式板与 200% 板共 20 个按钮，均对已渲染 PNG 的文字前景像素做了垂直中心计算；最大偏移为 1.5px；
- 当前真实性仍为运行时来源 0、连接器 0、获批招聘实例 0；
- 本交付没有修改前端、后端、架构、连接器或部署，没有自批，也没有授权下游。

## 2. 第六轮问题与 v1.6 闭环

| 审查项 | v1.6 实际修改 | 可复核证据 | 视觉入口 |
|---|---|---|---|
| P1-1 25-11 / 25-15 主图缺状态文字 | 25-11 的 5 条阶梯记录逐条显示“状态：…”；25-15 的 4 条同步记录逐条显示“系统状态：…”。每个主图 mark 同时含记录 ID、`data-main-mark-field="state"`、state 值与简中标签 | 验证器逐记录读取 visual group 的正文，不以 payload 或等价表替代主图断言 | `25-11-evidence-stair`、`25-15-sync-timeline` |
| P1-2 关系归类错误 | “缺少版本证据”唯一选中“证据不足”；“冲突”保持未选，不再把缺证据冒充相互矛盾主张 | 模型、主图、等价表三方 payload 相等；另有唯一选中关系断言 | `25-10-relation-matrix` |
| P1-3 完整简中与扫描不足 | 页面03 `as_of`→“截至时间”；页面07 `no-evidence`→“证据不足”；真相板 `disabled`→“停用”；foundation 英文 token 串转为简中；扫描扩展到 30 余个内部状态键，只有“内部键：”或“开发附注：”可保留 | 49 张所有 `text/title/desc` 节点扫描，未标注内部键为 0 | 页面03、页面07、真相板01、foundation |
| P1-4 200% 声明过度 | 删除当前结果中的浏览器严格通过和八组全量通过声明；机器门只登记 authored SVG 上实际读取的 7 组属性关系 | `review-manifest.json` 精确列出已核与未核范围 | `28-accessibility-zoom-200`、验证器 |
| P2-1 page10 重复翻译 | “未就绪（未就绪）”“不可用（不可用）”改为单一简中状态 | 定向字符串断言 | 页面10 |
| P2-2 按钮真实栅格偏上 | 14 张移动稿、24/27/28 的 20 个按钮统一改为中心基线；32px 的 200% 按钮使用单独字体补偿；新增 CoreGraphics PNG 像素验证 | `button-raster-contract.json` + `verify-button-raster.swift` + `button-raster-report.json`；20/20 在 ±1.5px 内 | 14 张移动稿、24、27、28 |

## 3. 图表验证边界

- 15 张图表继续由同一结构化模型生成可视图与完整等价表，验证器对记录 ID 和完整 payload 做模型↔可视图↔表格双向集合相等；
- 这只证明 **15/15 数据等价**，不据此作全量视觉编码结论；
- 视觉编码机器结论限定为逐项命名断言；本轮新增的强断言只覆盖 25-10、25-11 与 25-15；
- 25-11 主图状态映射为 5/5，25-15 主图状态映射为 4/4；
- 独立视觉质量、信息层级和全图编码仍由根协调第七轮逐图审查。

## 4. 200% 与栅格验证的诚实边界

当前机器门可证明：

- authored SVG 属性中的 CSS 视口 720→360 与 `physical_scale=2`；
- 标题字号 24→48、正文字号 16→32、辅助字号 14→28；
- 按钮高度 44→88、卡片圆角 8→16、卡片描边 1→2；
- 20 个指定按钮在 sips 已渲染 PNG 中的标签前景像素包围盒中心，与按钮矩形中心的绝对偏移不超过 1.5px。

当前机器门不证明：

- 真实浏览器 CSS 引擎中的 200% 回流；
- padding、gap 的运行时布局；
- 通用 SVG 字体轮廓或所有文本碰撞；
- 独立视觉审核已经通过。

## 5. 机器验证命令与结果

正向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.6/generate-overlay.mjs
node projects/market-analysis-dev/ui/release-completeness-v1.6/verify-resolved-bundle.mjs
```

结果：`machine_passed`；49 resolved = 41 张 v1.6 替换 + 8 张 v1.5 SHA 复用；15/15 数据等价；25-11 为 5/5 主图状态映射，25-15 为 4/4；20/20 按钮真实 PNG 字形中心通过；独立视觉审查 pending round 7。

负向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.6/verify-resolved-bundle.mjs --negative-baseline
node projects/market-analysis-dev/ui/release-completeness-v1.6/verify-resolved-bundle.mjs --negative-container
node projects/market-analysis-dev/ui/release-completeness-v1.6/verify-resolved-bundle.mjs --negative-collision
node projects/market-analysis-dev/ui/release-completeness-v1.6/verify-resolved-bundle.mjs --negative-viewport
```

四条命令预期且实际退出码均为 1，分别捕获 authored 基线安全区、line-box 容器越界、line-box 互撞和 authored 720→360 属性关系错误。它们不是浏览器运行时通过证明。

## 6. 权威路径与哈希

| 产物 | 路径 | SHA256 |
|---|---|---|
| 图表模型 | `ui/release-completeness-v1.6/resolved-chart-models.json` | `6a66d9bab44052c4c7996839760e19a0b748f7b3fab5ed5a973f8f681da10a66` |
| authored 布局契约 | `ui/release-completeness-v1.6/authored-layout-contract.json` | `1f236f12b8d3e0f0d8c77ae987d5b2f304fab04d5f5a5cc73e59b9a09dc8fb97` |
| 按钮栅格契约 | `ui/release-completeness-v1.6/button-raster-contract.json` | `6f666e74fd0c861bd26791e534891434ff392d8cafc23e519ab3549cd4457d60` |
| 按钮栅格报告 | `ui/release-completeness-v1.6/button-raster-report.json` | `1cca996004a5a171e143e7c9fb66137e3990a041a9d333ce552ad98c569fd611` |
| 生成器 | `ui/release-completeness-v1.6/generate-overlay.mjs` | `09d34b7fa41ae3539ee9e8f7e063e628842b3793b14059fb9868cdd54549f934` |
| 主验证器 | `ui/release-completeness-v1.6/verify-resolved-bundle.mjs` | `e8b5f7308fc2558e7cc923d979d2fa22580129b300dc2fb7d7e2d7c9a4e27fbe` |
| PNG 栅格验证器 | `ui/release-completeness-v1.6/verify-button-raster.swift` | `f0719a79ad6f74e0f7dcbc3c605040d077f48d66555978623bb3d3db2713a65c` |
| overlay 清单 | `ui/release-completeness-v1.6/overlay-manifest.json` | `29af273b6a76f88ffd73bd24790421adea8ffabe94d20bee7e0740fe82082e12` |
| resolved 49 张清单 | `ui/release-completeness-v1.6/resolved-manifest.json` | `85965fa1580f3ec6e07213b71e87f530bf6e299826f8efb57dae68021a61551b` |
| 机器结果 | `ui/release-completeness-v1.6/review-manifest.json` | `ef6641e605078129374c32d60f1b65190e03d825aed043689b82e298fc952613` |

## 7. 审核门

本交付只能登记为 `machine_passed + independent_visual_review_pending`，停在 `ui-design-review`，等待根协调第七轮全量独立审查。不得进入用户批准、前端、架构、后端、连接器、部署或任何下游实现。
