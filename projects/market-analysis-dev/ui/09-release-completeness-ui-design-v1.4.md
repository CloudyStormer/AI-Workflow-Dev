# Frontend Career Radar 发布完整性 UI/UX 设计 v1.4

> 项目 ID：`market-analysis-dev`
> 工作项：`CR-UI-002`
> 变更编号：`ui-design-20260815-career-release-completeness-v1-4-005`
> 版本：1.4
> 上游 Prompt：`ui/04-release-completeness-ui-prompt.md` v1.0，SHA256 `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900`
> v1.0 / v1.1 / v1.2 / v1.3：原文件、资产和哈希全部保留；v1.3 经第四轮独立视觉审查为 `changes-requested`
> 当前状态：`machine_passed + independent_visual_review_pending`
> 停止门：`ui-design-review`

## 1. 交付结论

v1.4 以 v1.3 resolved 49 张设计包为不可变基线，新建版本化 overlay：

- 修订 21 张：桌面页面 04、05、06、08，图表 25-01 至 25-15，组件板 24，浏览器 200% 画板 28；
- 按路径与 SHA 复用 v1.3 resolved bundle 中未受本轮问题影响的 28 张；
- `resolved-manifest.json` 解析出唯一 49 张完整包，不复制或覆盖 v1.0–v1.3；
- 当前事实继续是运行时来源 0、连接器 0、获批招聘实例 0；
- 本交付没有修改业务前端、后端、架构、连接器或部署，也没有授权下游。

## 2. 第四轮问题与 v1.4 差异对照

| 审查项 | v1.4 实际修订 | 机器证据 | 视觉入口 |
|---|---|---|---|
| page04/06/08 真相条重叠 | 三页均从空画布重建；真相条、筛选容器、卡片形成独立垂直区段，不叠加旧状态条 | 读取两个真实 `rect` 的 x/y/width/height 并计算零相交 | 页面 04、06、08 |
| 25-01 方向不完整 | “方向：全部”下实画 8/8 方向；新增横纵轴线、0–5 刻度与横轴/纵轴端标签 | 模型 8 条、图内 8 个点、两轴、双端刻度均逐项断言 | `25-01-direction-scatter` |
| 25-03 能力域聚合 | 实画 8 个能力域，每域包含 P0、P1、P1（AI增量）、P2、观察项五格，共 40 个矩阵单元；P2 明确“本样本暂无实例” | 8 个唯一域 × 5 字段 = 40 个真实单元；禁止“全部8域”聚合行 | `25-03-capability-map` |
| 15 图表字段/状态非简中 | 15 张图表的标题、筛选、轴、图例、图中状态与等价表字段全部使用简体中文；内部记录键只保留在不可见 payload | 扫描全部用户可见 `text`，禁止裸露下划线内部状态键和英文字段键 | `25-01` 至 `25-15` |
| desktop page05 两套步骤 | 顶部三卡改为“边界说明”，唯一流程区只保留一套 1–6 步骤 | 六个 `data-page05-step` 各唯一出现一次 | 页面 05 |
| 200% 内容/Token 失真 | 同一内容集合在 100% 与 200% 两栏完整保留；720 CSS 视口 → 360 CSS 视口；单列回流；标题、正文、辅助文字、控件、内边距、圆角、描边、间距严格 2× | 从真实字体、按钮、卡片和间距探针计算八组数值；按内容键双向比较零丢失；所有文字包围盒在容器内 | `28-accessibility-zoom-200` |
| 验证器依赖自报 | 删除对 `data-overlap` 的依赖；解析 SVG 真实文字、容器、画布和 PNG 1:1 渲染尺寸；失败抛错并非零退出 | 正向验证退出 0；越界负向夹具被真实边界计算捕获并退出 1 | `verify-resolved-bundle.mjs` |
| 四个状态胶囊偏上 | 胶囊文字使用中心基线，按实际文字估算包围盒中心与胶囊中心对齐 | 4/4 中心差 ≤ 0.6px | `24-components-states` |

## 3. 防回归保留项

- resolved bundle 仍为 49/49 SVG + PNG，尺寸与 SHA 一一登记；
- 14 张 390/320 独立移动稿按 v1.3 SHA 复用，不整体缩放；
- 25-08 仍无成功绿或最近成功时间；
- 25-12 仍为未知、未选择，不生成路线；
- 25-14 的公共快照、个人记录、规则版本三轨来源身份继续分离；
- 六类研究关系继续互斥且恰好选择一项；
- page10 继续使用“未就绪/不可用”，真实请求未发生时不使用“失败”；
- 1024 说明换行与 48px 按钮继续按 v1.3 SHA 复用；
- 14 张移动稿、page10、1024、六类关系等未受影响资产不重绘，避免引入无关回归。

## 4. 15 张图表与完整等价表

`resolved-chart-models.json` 是 15 张图表的唯一结构化数据源。生成器为每条记录同时输出：

1. 一个带稳定记录 ID 与完整 payload 的可视 mark；
2. 一个带同一 ID 与同一 payload 的等价表格行；
3. 用户可见的简体中文字段名和状态值。

验证器对模型集合、可视集合、表格集合执行 ID 与完整 JSON payload 的双向相等，不以关键词存在代替结构等价。15 张图表保持散点坐标、方向对比卡、8×5 矩阵、点图、缺失趋势、远程约束、政策×运行时、来源时间带、双轴分类、六类关系、证据阶梯、差距矩阵、依赖图、三轨版本时间线、多设备时间线等不同语义结构。

## 5. 真相与数据边界

- 公共研究页：`研究清单已批准 · 当前来源 0 · 连接器 0 · 招聘实例 0`；
- 私有个人页：`演示数据 · 用户提供 · 非真实用户档案 · 未经授权不外发`；
- 混合页：公共快照、个人记录、规则版本分别标注来源身份；
- 获批研究清单不等于运行时连接器；样本计数不等于市场份额；用户自述不等于已核验能力；
- 视觉资产只表达允许状态和目标结构，不证明账号、同步、导出、删除、实时来源或生产服务已经实现。

## 6. 200% 与实际几何验证

| Token | 100% 实际值 | 200% 实际值 |
|---|---:|---:|
| CSS 视口 | 720px | 等效 360px，物理缩放 2× |
| 标题 | 24px | 48px |
| 正文 | 16px | 32px |
| 辅助文字 | 14px | 28px |
| 控件高度 | 44px | 88px |
| 卡片内边距 | 16px | 32px |
| 圆角 | 8px | 16px |
| 描边 | 1px | 2px |
| 间距 | 16px | 32px |

验证器直接读取上述 SVG 元素真实属性和坐标，并用字体类别估算实际文字包围盒：中文字符按 1em、拉丁大写/数字按 0.66em、拉丁小写按 0.56em、空格按 0.33em。所有标记文字必须位于引用容器和画布内，同一容器的文字包围盒不得相交。PNG 使用 SVG 1:1 渲染，清单校验其签名、外层像素与 SHA。

## 7. 机器验证命令与结果

正向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.4/generate-overlay.mjs
node projects/market-analysis-dev/ui/release-completeness-v1.4/verify-resolved-bundle.mjs
```

结果：`machine_passed`；resolved 49，v1.4 替换 21，按 SHA 复用 28；15/15 模型—可视—表格双向相等；21/21 新资产完成实际几何计算。

负向门：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.4/verify-resolved-bundle.mjs --negative-fixture
```

预期并实际退出码：`1`。越界文字由真实画布/容器边界计算捕获，证明验证失败会非零退出。

## 8. 权威路径与审核门

- 设计说明：`ui/09-release-completeness-ui-design-v1.4.md`
- 共享图表模型：`ui/release-completeness-v1.4/resolved-chart-models.json`
- 生成器：`ui/release-completeness-v1.4/generate-overlay.mjs`
- 验证器：`ui/release-completeness-v1.4/verify-resolved-bundle.mjs`
- v1.4 SVG：`ui/release-completeness-v1.4/assets/`
- v1.4 PNG：`ui/release-completeness-v1.4/png/`
- overlay 清单：`ui/release-completeness-v1.4/overlay-manifest.json`
- resolved 49 张清单：`ui/release-completeness-v1.4/resolved-manifest.json`
- 机器结果：`ui/release-completeness-v1.4/review-manifest.json`

本交付停在 `ui-design-review`。当前只能登记 `machine_passed + independent_visual_review_pending`，等待 AIWorkFlow 根协调执行第五轮独立逐图审查；不得进入用户批准、前端、架构、后端、连接器或部署。
