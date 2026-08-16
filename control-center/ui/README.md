# UI/UX 资产目录

本目录统一存放 AI Workflow Control Center 的 UI/UX 提示词、设计说明、原型、生成界面和视觉审核产物。

## 当前索引

- `02-release-completeness-ui-prompt.md`：CC-UI-001 发布完整性 UI/UX Prompt v1.0，SHA256 `caafe53a51a77283c363483bf34b9dba843f5a1add8d7fd17c9d74a1d336570e`，已由 `approval-20260816-control-release-completeness-ui-prompt-v1` 批准。
- `03-release-completeness-ui-design-v1.0.md`：CC-UI-002 发布完整性 UI 设计说明 v1.0；独立视觉与治理终审 P0/P1/P2 均为 0，并已按超级无敌帅超超总当天默认批准规则关闭 `ui-design-review`。该批准只完成设计门，不代表真实监管后端、业务实现或生产发布完成。
- `release-completeness-v1.0/`：版本化视觉包，含 1 张 AI 方向图、36 个 SVG、36 个等尺寸 PNG、12 路由交互规范原型、manifest、生成器、验证器和生成说明。
- 当前设计覆盖：设计系统 1 页、桌面 P0 目的页 12 页、1024 关键页 4 页、390/320 成对关键页 8 组／16 张、19 类权威结构图表、200% 完整回流证据 1 页。
- 当前状态为 `approved · machine passed · independent P0/P1/P2=0 · fixed00 browser 11/11 passed · console 0/0`。329d、81f 及更早候选均保留为退修历史；最终 a329 候选已完成全量业务文字 ≥12px 与 11px 负夹具、发布门禁六态图例两列三行几何与旧单行负夹具、产物页同真相目标产物／历史隔离、图16图例一致性、移动成熟度六维＋规则／样本／缺失项和 12 页移动底栏当前态映射。共享图例 renderer 实际影响目标总览、19 图图谱与 D09 发布页三组资产，独立审查已复核三组且视觉 P0/P1/P2=0；浏览器行为证据明确记录实际执行候选与精确 SHA 继承关系，不冒充重新执行。
- `01-control-center-ui-design-prompt.md`：真实监管后端状态 UI Prompt v1.1，SHA256 `bf1614e5f8fe9d6e2d7a9457bcf8ce0c6aadecfff9ef770c067560ed37368b52`，已批准并保留为历史输入，不被新文件覆盖。
- 被本版继承的 Prompt v1.0.1 已批准，历史 SHA256：`6b7335068417f2402c7672b9d233a4b739142116af4671b442b9ddf578c7650e`。
- 超级无敌帅超超总已于 2026-08-04 将 9 张生成界面放入本目录；本批是 v1.0.1 范围下获批的历史视觉基线，不覆盖 v1.1 的健康／就绪、真实根仓、静态回退、来源、新鲜度、错误与降级语义。
- 9 张历史视觉基线同样不覆盖 v1.0 发布完整性 Prompt 的真实只读聚合、入口关闭、零写、完整简中和统一完成门。
- 现有在线 v3 Demo 仍是演示数据版本，不等于本批新 UI 已经实现或部署。

## 用户批准视觉基线

| 文件 | 尺寸 | SHA256 |
|---|---:|---|
| `grok-29fd09f5-3ea7-4f6d-a674-dcd84d8817fa.jpg` | 1728×1152 | `f56856dc5adf4439b56fda1c2c679b7813ca674aa9e6f2ed587602a34d7fb3a5` |
| `grok-2ee1ea02-5590-4aa1-a1e9-ddf49d846bb5.jpg` | 1728×1152 | `5b9c3ecbe8cbf40e650f282367031d699f3154ed547c1f2a3f7da17126d1e73d` |
| `grok-47a2acfb-3a3e-4801-a8da-ee607db474c0.jpg` | 1728×1152 | `eb14329c4452ecba87e92a7e28a0c3cc41496ab9f39bdb52de1d06e1a73daeb9` |
| `grok-56ef1a49-10ac-412b-81c2-02fbc50b100d.jpg` | 1728×1152 | `6e9bfcc7b6baeae05957a513b4489aaf34d3ff1cf8628e2429857588dba9fef3` |
| `grok-57c76d46-07b4-41be-b456-c6da299c2bd2.jpg` | 1728×1152 | `964313509944d7b2fd1bd120236023cee2253a566c08375349b5ec6c856408ae` |
| `grok-a40f0801-bc2c-4e38-aea2-72db6a1b0139.jpg` | 1008×1792 | `a2813bc8862d7d1e5959ef832b7df07409e43eabacb81aacfe393bc888b9ec2a` |
| `grok-af2d6a2c-41e6-4c6a-9e16-9662229c3516.jpg` | 1728×1152 | `fbb8ff91682edd0936e0d7f9ef5d3d1a384d795be58db4cd8b4e4d8710aac260` |
| `grok-e4607bd9-e6d5-479e-9cb5-e53f08b57625.jpg` | 1792×1008 | `480c526066c46b9a384888680f1fa0f6cc6b3aa722dc4be46d2a805f6c95302a` |
| `grok-eea5ba37-569b-42c0-b733-992c153b7b80.jpg` | 1728×1152 | `6a1f6c86947a7b4273fa773d9a258d9b3eb00b2f749081dee68146c0a5b1d91e` |

当前增量的实现冲突按“已批准发布完整性附录与真实可用产品增量 → `02-release-completeness-ui-prompt.md` → 已批准 PRD v1.0 → 已批准旧 Prompt v1.1 → 全局简体中文版规则 → 历史图片视觉参考”的顺序裁决。图片中的示例数据不得冒充实时事实，必须继续标注为演示数据或待接入；真实监管服务尚未实现。

本轮固定 `04 UI/UX设计师` 在同一 CC-UI-002 内已完成“修源→全量重生→增强机器门→36 张原尺寸自查”，fixed00 对图例修复候选完成 11/11 真实浏览器验证且 console 为 0 errors / 0 warnings，独立终审最终 P0/P1/P2=0。未修改现有业务代码、数据库、读取器、连接器、服务或部署，也未改变其他代码审查／QA 主线；设计通过仍不得被表述为真实监管后端、数据接入、实现或生产发布已经完成。
