# Frontend Career Radar 发布完整性 UI/UX 设计 v1.5

> 项目 ID：`market-analysis-dev`
> 工作项：`CR-UI-002`
> 变更编号：`ui-design-20260816-career-release-completeness-v1-5-006`
> 版本：1.5
> 上游 Prompt：`ui/04-release-completeness-ui-prompt.md` v1.0，SHA256 `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900`
> v1.0–v1.4：原说明、资产、清单与哈希全部保留；v1.4 经第五轮独立视觉审查为 `changes-requested`
> 当前状态：`machine_passed + independent_visual_review_pending`
> 停止门：`ui-design-review`

## 1. 交付结论

v1.5 以 v1.4 resolved 49 张设计包为不可变基线，新建版本化 overlay：

- 修订 35 张：v1.4 的 21 张问题板全部重生成，并新增修订 14 张裸露 `connector` / `conditional` 的历史 resolved 资产；
- 按路径与 SHA 复用 v1.4 中未受本轮问题影响的 14 张；
- `resolved-manifest.json` 解析出唯一 49 张完整包；不复制、不覆盖 v1.0–v1.4；
- 当前真实性仍为运行时来源 0、连接器 0、获批招聘实例 0；
- 本交付没有修改前端、后端、架构、连接器或部署，也没有批准或路由下游。

## 2. 第五轮问题与 v1.5 闭环

| 审查项 | v1.5 实际修改 | 可复核证据 | 视觉入口 |
|---|---|---|---|
| P1-1 200% 标题上越界 | 200% 栏标题与卡片标题整体下移并增加保守上内距；按钮和内容保持完整回流；隐藏仅供 Token 计算的探针 | `authored-layout-contract.json`；720→360；字体 24→48、16→32、14→28；八组 Token 严格 2× | `28-accessibility-zoom-200` |
| P1-2 校验器过度声明 | 删除“实际 SVG 字形边界”表述；机器门只验证 authored line-box、SVG DOM、PNG 签名/尺寸/SHA；真实字体轮廓、PNG 像素与视觉碰撞明确留给独立审核 | `review-manifest.json` 的 `independent_visual_review.note` | 验证器与 review manifest |
| P1-2 四类负夹具 | 独立提供基线、容器越界、互撞、720→360 四个命令，每个实际退出 1 | `--negative-baseline/container/collision/viewport` | CLI 门禁 |
| P1-3 图例/编码不等价 | 15 个模型均新增 `encoding_contract`；重点重画 25-01/02/03/04/06/07/08/09/14/15 的真实 mark、纹理、线型、实空、符号与状态 | `resolved-chart-models.json` + SVG `data-encode-field/value` + 等价表 payload 双向相等 | 图表 01–15 |
| P1-4 公共轨真相边界 | 混合真相条明确“获批历史研究快照 + 获批产品文档”；公共轨分别实画两类来源身份 | 模型含 `time-public-1/2` 且来源身份不同 | `25-14-version-timeline` |
| P1-5 完整简中 | 14 张受影响 resolved 资产改为版本化本地化副本；用户可见 `connector` / `conditional` 为 0；内部键仅允许置于“内部键/开发附注” | resolved 49 张用户可见文本扫描 | 01/02/03/07/10、15/16、6 张移动、27 响应式 |
| P2-1 四状态胶囊 | 四个标签在原居中基线上统一增加 5px 字形补偿；真实按钮矩形仍为 48px | 4/4 `data-authored-baseline-offset="5"` | `24-components-states` |
| P2-2 desktop chips | 页面 04/05/06/08 的 12 个 chip 改用中心基线并统一增加 5px 补偿 | 12/12 authored contract | 页面 04/05/06/08 |
| P2-3 等价表可读性 | 表头 15px、正文 14px；长值最多两行、32px 行节奏；`status` 显示为“同步结果”，`state` 显示为“系统状态” | 15 张表的所有 table-record 字号检查；25-15 双字段断言 | 图表 01–15，重点图表 15 |

## 3. 图表字段到视觉通道

`resolved-chart-models.json` 是 15 张图表唯一结构化数据源。每个模型同时定义：字段、视觉通道、用户可见图例、可视 mark 与等价表。验证器对记录 ID 和完整 payload 做模型↔可视图↔表格双向集合相等。

重点编码如下：

- 25-01：`confidence` → 4px 实线 / 2px 虚线描边；`evidence` → 圆面积；
- 25-02：三卡等权中性边框，不再任意高亮首卡；
- 25-03：P0/P1/P1-AI/观察项实色，P2“本样本暂无实例”为空框虚线；
- 25-04：`counted` 使用实心点；
- 25-06：披露状态使用实心圆 / 三角 / 空心菱形，并同步显示文字；
- 25-07：允许=实色 ✓，有条件允许=斜纹 △，停用=交叉纹 ×；
- 25-08：24h、48h 与状态分别驱动缺失斜纹、不可用交叉纹、未配置/无实例空框；没有成功绿；
- 25-09：来源渠道=蓝色矩形，内容类型=紫色菱形；待确认=实线 ●，候选=虚线 ◇；
- 25-14：公共文档/快照=实心圆，个人演示=空心圆，规则=菱形；
- 25-15：`status` 为“同步结果”，`state` 为“系统状态”；画面明确出现 `!` 与 `↻`。

## 4. 校验能力边界

v1.5 主动采用诚实降级：

- 能机器验证：文件 SHA、PNG 签名和外层尺寸、SVG 结构、authored line-box 包含/互撞、视口与 Token 数值、图表 payload 双向相等、显式编码属性、用户可见状态文本、历史不可变哈希；
- 不能由当前脚本证明：字体轮廓后的真实字形边界、macOS 字体栅格化基线、PNG 内容像素碰撞、独立视觉质量；
- 固定 04 已对 35 张新 overlay 生成 4 张 contact sheet，并对 200%、组件板、四个 desktop 页面、10 张重点编码图作 1:1 目视自查；该自查不是独立视觉审核结论；
- 唯一有效的独立视觉结论仍由 AIWorkFlow 根协调第六轮逐图审查给出。

## 5. 机器验证命令与结果

正向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.5/generate-overlay.mjs
node projects/market-analysis-dev/ui/release-completeness-v1.5/verify-resolved-bundle.mjs
```

结果：`machine_passed`；49 resolved = 35 v1.5 替换 + 14 v1.4 SHA 复用；15/15 模型—可视—表格双向相等；四类内置负夹具均被捕获；独立视觉审查 pending round 6。

独立负向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.5/verify-resolved-bundle.mjs --negative-baseline
node projects/market-analysis-dev/ui/release-completeness-v1.5/verify-resolved-bundle.mjs --negative-container
node projects/market-analysis-dev/ui/release-completeness-v1.5/verify-resolved-bundle.mjs --negative-collision
node projects/market-analysis-dev/ui/release-completeness-v1.5/verify-resolved-bundle.mjs --negative-viewport
```

四条命令实际退出码均为 `1`，分别捕获：字体基线安全区越界、authored line-box 越出容器、authored line-box 互撞、浏览器 200% 不是 720→360。

## 6. 权威路径与哈希

| 产物 | 路径 | SHA256 |
|---|---|---|
| 图表模型 | `ui/release-completeness-v1.5/resolved-chart-models.json` | `4f9e1a9203a618c12b300404e11f7fe9ad80badc4e3280c1d819748ba947a1f7` |
| authored 布局契约 | `ui/release-completeness-v1.5/authored-layout-contract.json` | `ea7dd4212a3b48d15f718adc3d21d1a7c0809b08a6487a3795500e39da4b6b43` |
| 生成器 | `ui/release-completeness-v1.5/generate-overlay.mjs` | `2b3eba704df4802d6804e3b723c23ee49e29f76d1d968a35250b1630e195e8fd` |
| 验证器 | `ui/release-completeness-v1.5/verify-resolved-bundle.mjs` | `daf551ee02ee5ba7299404cf31943fb691fac05b96a977bfd03e0fa12619ed98` |
| overlay 清单 | `ui/release-completeness-v1.5/overlay-manifest.json` | `7a04ab82d960b9b0bb6287726cc8835e3b7bfd6324e2b1b2a1f6d8c9daf98a9f` |
| resolved 49 张清单 | `ui/release-completeness-v1.5/resolved-manifest.json` | `5d7a7e2101f4725b82a91b8e9fbe47601bb4877c5d072007129099d3aa10c551` |
| 机器结果 | `ui/release-completeness-v1.5/review-manifest.json` | `21a5f996f62bbef4226d5435c1b54c6bf0d39ad0d3f38e430201eaace3c3fdfe` |

## 7. 审核门

本交付只能登记为 `machine_passed + independent_visual_review_pending`，停在 `ui-design-review`，等待根协调第六轮独立逐图审查。不得进入用户批准、前端、架构、后端、连接器、部署或任何下游实现。
