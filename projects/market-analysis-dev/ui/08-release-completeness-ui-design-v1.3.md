# Frontend Career Radar 发布完整性 UI/UX 设计 v1.3

> 项目 ID：`market-analysis-dev`
> 工作项：`CR-UI-002`
> 变更编号：`ui-design-20260815-career-release-completeness-v1-3-004`
> 版本：1.3
> 日期：2026-08-15（Asia/Shanghai）
> 上游 Prompt：`ui/04-release-completeness-ui-prompt.md` v1.0，SHA256 `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900`
> v1.0 / v1.1 / v1.2：均保留原文件与哈希；v1.2 经第三轮独立审查为 `changes-requested`
> 当前机器门：`machine_passed`
> 独立视觉审查：`pending`，由 AIWorkFlow 根协调执行第四轮只读审查
> 停止门：`ui-design-review`

## 1. 修订结论

v1.3 采用不可变基线 + 版本化 overlay：

- v1.2 的 49 张资产保持原路径、原内容和原 SHA；
- v1.3 新增 39 张修订 SVG/PNG，集中关闭第三轮审查的 8 个 P1、3 个 P2；
- 10 张第三轮未发现新增问题的 v1.2 资产不复制，以文件路径和 SHA 复用；
- `resolved-manifest.json` 将 39 张替换资产与 10 张复用资产解析成唯一、可一键验证的 49 张完整设计包；
- 机器验证与独立视觉审查继续严格分离。本角色只登记 `machine_passed / independent_visual_review_pending`，不登记人工或独立审查通过。

本交付是设计说明和视觉原型，不是业务前端、真实连接器、账号服务或运行时数据。当前事实仍是：来源 0、connector 0、招聘实例 0。

## 2. 第三轮审查关闭矩阵

| Finding | v1.3 实际修订 | 机器证据 | 视觉证据 |
|---|---|---|---|
| P1-1 12/15 等价表不等价 | 新建 `chart-models.json`；15 张图的可视 mark 与表格行均由同一 record 生成 | 对每张图按 record ID、完整 JSON payload、状态执行视觉集↔表格集↔模型集双向相等 | `25-01` 至 `25-15` |
| P1-2 图表真相冲突 | 来源时间带仅绘制未配置/缺失/不可用；差距矩阵全部为未知空心菱形；三轨分别标公共、个人、规则身份；每张图就近完整真相条 | 禁止 25-08/25-12 成功绿；校验 25-14 三轨身份；15/15 真相条 | `25-08`、`25-12`、`25-14` |
| P1-3 移动辅助文案与 CTA 重叠 | 14 张移动稿重新排版；辅助文案 y=724、行高18，CTA y=772、高52 | 逐 SVG 读取真实 `text` 和 `rect`，验证 `helper.bottom < CTA.top` | 七页 × 390/320 |
| P1-4 组件按钮触控区域不足 | 取消/确认真实按钮矩形均为 48px；焦点环独立；按钮保持在弹窗边界内 | 读取实际按钮 rect 高度与弹窗四边界，不读取焦点环尺寸代替 | `24-components-states` |
| P1-5 200% 证据失真 | 按浏览器语义建模：基础 CSS 视口720，有效 CSS 视口360，物理宽720；标题24→48、正文16→32、辅助14→28、控件44→88、padding16→32、radius8→16、border1→2、gap16→32 | 从 SVG 实际字体、矩形、坐标、圆角和描边计算 2×；不采信自报布尔值作为数值证据 | `28-accessibility-zoom-200` |
| P1-6 page10 状态误用 | 当前无账号/服务时只显示 `not_ready / unavailable`；`failed` 仅作为“真实请求已执行并失败”后的允许状态 | 校验当前状态属性、`data-current-failed=false` 和真实请求门槛 | 页面10 |
| P1-7 verifier 过度声明 | 验证器只写机器事实；图表和 200% 均读取真实共享模型/实际几何值 | review manifest 只有 `machine_passed` 与 `independent_visual_review.pending` | 验证器和 review manifest |
| P1-8 顶层审核入口错误 | 当前 `next_approval` 只指向 v1.3 设计与 resolved bundle，独立视觉审查待定；v1.0 五图仅保留历史 | YAML/JSONL 与当前 artifact 对齐 | workflow 顶层状态 |
| P2-1 1024 右栏越界 | 长说明拆为四个独立文字节点，操作纵向堆叠 | 按每行实际 x、字号、字符数与右边界验证 | `27-responsive-1024` |
| P2-2 11 状态板语义 | 两个同级主标题改为“live状态示例”“目标态未接通” | 精确文案检查 | `16-truth-02-eleven-states` |
| P2-3 六步重复 | 每个步骤卡只保留一次编号和一次标题；删除额外的 `1→6` 串 | 六个唯一 `data-flow-step`，禁止重复串 | `11-flow-01-workbench-six-step` |
| 桌面补查 02/04/06/08 | 四页统一补齐整行真相条，分别使用公共、私有、混合身份 | 每页必须存在 `data-complete-truth-strip=true` 及完整身份文案 | 页面02/04/06/08 |

## 3. resolved bundle

### 3.1 39 张 v1.3 替换资产

- 桌面页：02、04、06、08、10；
- 流程：信息源六步工作台；
- 真相态：11 状态板；
- 移动：方向、技术栈、趋势、工作台输入、工作台关系、差距未知、数据权利各提供 390 和 320，共 14 张；
- 组件：组件与状态规范；
- 图表：15 张全部重建；
- 响应式：1024 和浏览器 200%。

### 3.2 按 SHA 复用的 10 张 v1.2 资产

1. `01-desktop-page-01-directions-1440.svg`
2. `03-desktop-page-03-market-trends-1440.svg`
3. `05-desktop-page-05-workbench-1440.svg`
4. `07-desktop-page-07-gap-roadmap-1440.svg`
5. `09-desktop-page-09-data-rights-1440.svg`
6. `12-flow-02-evidence-confirmation.svg`
7. `13-flow-03-gap-roadmap-recompute.svg`
8. `14-flow-04-sync-export-delete.svg`
9. `15-truth-01-source-policy-runtime.svg`
10. `26-foundation-contrast-tokens.svg`

复用只通过 `resolved-manifest.json` 指向 v1.2 原文件，并记录 SVG/PNG SHA；不复制、不覆盖、不静默修改。

## 4. 共享图表数据模型

`chart-models.json` 是 15 张图表唯一结构化输入。每个模型包含：

- 图表 ID、标题、语义类型、页面上下文、筛选、轴/单位、图例、表头；
- 完整 `records`；每条 record 有稳定 ID、数值/文本、状态与真相身份；
- 生成器把每条 record 同时写入一个 `data-visual-record` 和一个 `data-table-record`，两者携带相同完整 payload；
- 验证器按 ID 集合和 payload 做双向相等，不以关键词存在代替等价性。

关系矩阵固定为六类：新增证据、相互印证、重复、冲突、证据不足、不适用。当前候选六个选项中恰好一个 `selected=true`，其余为 false。

## 5. 真相边界

### 5.1 公共研究面

统一就近显示：`研究清单已批准 · 当前来源 0 · connector 0 · 招聘实例 0`。获批研究清单不是运行时连接器，也不是当前市场份额。

### 5.2 私有个人面

统一就近显示：`演示数据 · 用户提供 · 非真实用户档案 · 未经授权不外发`。简历自述、演示项目或系统推断均不得冒充已核验能力。

### 5.3 混合时间线

三轨身份分别为：

- 公共快照：获批历史研究快照或获批产品文档；
- 个人记录：演示数据 · 用户提供；
- 规则版本：规则版本 · 系统配置。

不得把三轨统一标成用户数据。

## 6. 移动、触控与响应式

- 390 和 320 均为独立根视口与独立重排，不允许把 390 整体缩放到 320；
- 正文 ≥16px、辅助文字 ≥14px、触控矩形 ≥44px；
- 14 张移动稿的底部辅助文案与 CTA 均由实际边界框验证不重叠；
- 公开页完整显示来源0 / connector0 / 招聘实例0，私有页显示演示数据 · 用户提供；
- 1024 右栏的四行说明是四个独立文字节点，每行均在内部 1024×768 逻辑画布内；
- URL、中英文混排、长版本号与状态键可换行，页面不依赖横向滚动完成主要任务。

## 7. 浏览器 200% 与无障碍

200% 画板使用同一 base token 计算实际物理值：

| Token | 100% | 200% |
|---|---:|---:|
| CSS 视口 | 720px | 有效 360px，物理渲染 720px |
| 标题 | 24px | 48px |
| 正文 | 16px | 32px |
| 辅助文字 | 14px | 28px |
| 控件高度 | 44px | 88px |
| 卡片 padding | 16px | 32px |
| 圆角 | 8px | 16px |
| 描边 | 1px | 2px |
| 间距 | 16px | 32px |

放大后使用单列回流，不横向滚动，不遮挡文字或组件。键盘焦点、错误关联、状态播报、减少动效和非颜色单一编码继承 v1.2，并由组件板继续提供视觉证据。

## 8. 状态语义

- `not_ready / 未就绪`：必要来源、配置或服务尚未准备；
- `unavailable / 不可用`：当前能力不存在或不可调用，入口禁用并说明替代路径；
- `failed / 请求失败`：只能在真实请求实际执行并返回失败后使用；
- `partial / 部分可用`：真实分片请求部分成功时使用，只重试失败分片；
- `live / 可用`：只在真实来源、时间戳、运行时连接和新鲜度全部成立时使用。本资产只展示允许状态示例，不表示当前 live。

## 9. 机器验证范围与限制

已运行：

```bash
node projects/market-analysis-dev/ui/release-completeness-v1.3/generate-overlay.mjs
node projects/market-analysis-dev/ui/release-completeness-v1.3/verify-resolved-bundle.mjs
```

机器验证覆盖：

- 49/49 resolved SVG/PNG 存在、SHA 与像素尺寸匹配；
- 39 个 v1.3 replacement + 10 个不可变 v1.2 reuse；
- 15/15 图表的可视记录、表格记录、共享模型记录双向相等；
- 六类互斥关系恰有一项选择；
- 来源时间带无成功绿，未知差距无已选绿，三轨身份分离；
- 14/14 移动辅助文案与 CTA 实际边界不重叠，触控矩形达标；
- 组件取消/确认真实矩形均达标且留在弹窗内；
- 200% 的八类 token 实际数值均严格 2×；
- page10、11 状态板、六步流程、1024 文本与四个桌面真相条符合本轮要求；
- v1.0 / v1.1 / v1.2 设计说明、v1.2 manifest 与已批准 Prompt SHA 不变。

机器验证不证明：第四轮独立视觉审查通过、浏览器可用性测试、正式 WCAG 审计、业务前端实现、真实账号/服务/连接器或生产部署。

## 10. 权威入口与停止门

- 本设计说明：`ui/08-release-completeness-ui-design-v1.3.md`
- 共享图表模型：`ui/release-completeness-v1.3/chart-models.json`
- 生成器：`ui/release-completeness-v1.3/generate-overlay.mjs`
- 验证器：`ui/release-completeness-v1.3/verify-resolved-bundle.mjs`
- v1.3 修订 SVG：`ui/release-completeness-v1.3/assets/`
- v1.3 修订 PNG：`ui/release-completeness-v1.3/png/`
- overlay 清单：`ui/release-completeness-v1.3/overlay-manifest.json`
- resolved 49 张清单：`ui/release-completeness-v1.3/resolved-manifest.json`
- 机器结果与独立审查状态：`ui/release-completeness-v1.3/review-manifest.json`

本设计只停在 `ui-design-review`，等待 AIWorkFlow 根协调执行第四轮独立视觉审查。不得启动前端、架构、后端、连接器、部署或任何下游角色。
