# UI/UX 资产目录

本目录统一存放 AI Model Radar 的 UI/UX 提示词、设计说明、原型、生成界面和视觉审核产物。

超级无敌帅超超总已于 2026-08-04 放入 9 张生成界面并批准其作为当时范围的视觉输入。PRD v1.2 已将项目目标升级为真实每日 AI 开发情报，因此这些图片现作为历史视觉参考：可继承浅灰画布、白色卡片、靛蓝/青绿、圆角与信息层级，但不证明真实数据、来源、服务或实现已经存在，也不覆盖新版 Prompt 的真实性与新功能要求。

| 产物 | 版本 | 状态 | SHA256 | 说明 |
|---|---|---|---|---|
| [`08-daily-web-ui-design.md`](08-daily-web-ui-design.md) | `1.0` | `ready-for-review` | `5505f08f181ffea782e681d388fa8e73b45d6b888ca5b2695b3349b9e827cc3f` | AMR-UI-DAILY-WEB-002 实现级设计：信息架构、P0 页面线框、组件、八种真相态、八类图表契约、1440/1024/390/320/200% 与无障碍；未生成外部图片、未改业务代码 |
| [`07-daily-web-ui-prompt-increment.md`](07-daily-web-ui-prompt-increment.md) | `1.0` | `approved` | `04b05f43bae2e6ae6f3fd0a33a0bce284f85c41508dc8ce7b374690ced83c679` | AMR-UI-DAILY-WEB-001 已批准的真实日更批次网页化 UI Prompt 增量；覆盖 `/today` 去 Demo、真实批次生命周期、不可变快照与 revision、历史追加、失败保旧、幂等刷新、八种真相态、简中、多端和无障碍；当前真实网页仍未接入该批次 |
| [`06-ai-developer-news-ui-prompt-increment.md`](06-ai-developer-news-ui-prompt-increment.md) | `1.0` | `ready-for-review` | `f43050320c6091aee3ceffc077d5c568e6558f2cac9136c543e285ed992d39d1` | AMR-UI-NEWS-001 AI 开发圈新闻 UI Prompt 增量；覆盖国内外真实新闻、08:30 每日摘要、小时级增量、今日/事件/趋势/开源/来源质量/详情证据、六个真相态、1440/1024/390/320、200% 与无障碍；当前真实运行仍为来源/连接器/live 快照 0 |
| [`05-release-completeness-ui-design.md`](05-release-completeness-ui-design.md) | `1.0` | `ready-for-review` | `a731232994db118117043aa50503273c91e5c438bc20f948d9e5137e43ba9324` | MR-UI-002 发布完整性设计说明；权威登记 5 组视觉稿、设计系统、页面交互、9 类图表、64 状态、响应式和无障碍边界 |
| [`release-completeness-v1/`](release-completeness-v1/) | `1.0` | `ready-for-review` | 见设计说明与下表 | MR-UI-002 的 5 组高保真视觉稿；全部示例为“目标状态方案 / 界面演示数据”，不证明当前 live、连接器或实现存在 |
| [`04-release-completeness-ui-prompt.md`](04-release-completeness-ui-prompt.md) | `1.0` | `approved` | `a8a4b3b66cdaf31f5d43910d36aeb630f751ced1dfb9959a583603abbee12be7` | MR-UI-001 发布完整性 UI/UX 权威提示词；超级无敌帅超超总于 2026-08-15 通过，并一跳授权 MR-UI-002 |
| [`03-ui-prompt.md`](03-ui-prompt.md) | `1.2` | `approved` | `967090f3ac97e0a0bb00070eb39a5af9b6efcd629ac1517e78bffa4f8f7605bd` | 已于 2026-08-10 通过；Live Daily Intelligence 权威 UI 生成提示词，含可直接复制给专业 UI 大模型的主提示词、关键页面、图表映射、56 状态、响应式和无障碍 |

被本版继承并取代的 Prompt v1.0 SHA256 为 `d001cea2e85c36317ca1e38c657a32527b3705a3f276f8d938b8b0ac6e450318`；其批准记录保留在工作流中以便追溯。

## 历史视觉参考（9 张）

| 文件 | 尺寸 | SHA256 |
|---|---:|---|
| `grok-0c6e431e-2037-4253-8513-bdd1c61cce3b.jpg` | 1728×1152 | `ea77a6159b3bffde295188ada4708a7780a95095fcbf738e4bddee37d668cc68` |
| `grok-198347b2-0b09-4beb-ba3b-e88422ccf6a5.jpg` | 1728×1152 | `a132cc4fbd519bec55ce4643a6a70b3beceaa7d2ed7f2e818d2fdc8cd4475f48` |
| `grok-269cceb8-093c-4bed-97da-f048940de919.jpg` | 1728×1152 | `da1137e4bfa2c1082f6dc113d7067c57014f9c59a20e597f0486099e105e2774` |
| `grok-33262e10-0c81-4c7e-b9ad-d136cc9df725.jpg` | 1728×1152 | `1aa37e246f7d869b9783d57861106ec097b6cb7912dc075cbdce75829fcc7a74` |
| `grok-3615d358-9480-4d0f-b333-97e4253df5e7.jpg` | 1728×1152 | `21fa797aa83ba45be778448093d318cc582a947f773b9c807c089f22b4416a42` |
| `grok-629e7659-a6df-4fd1-8f7a-e818dccae4a9.jpg` | 1728×1152 | `34a76fd9140fead62fd268d2b14436206919f2f8a88ac50329769e683dea6f2b` |
| `grok-8eb3b403-bece-4c73-a317-718f348e1b7c.jpg` | 1008×1792 | `5daa8057bc280d25a30049c3059d549b7be9a8de2502cc2f7bd5b5f1bb29714b` |
| `grok-a2bd079b-e847-4538-bbc5-8413578968d5.jpg` | 1728×1152 | `6902a24633049f19dffea86302594121bd484e68b978332c88ee2a4fc0aa98ac` |
| `grok-e5e1bf4a-54e8-4dd6-b754-cac5039e5e82.jpg` | 1008×1792 | `74ff775fd13f37c95ab4480b25fabbce8fdd8cacee578fefe5a70afc5b89f3f5` |

PRD v1.2 与 Prompt v1.2 的真实性边界优先于图片示例：图片中出现的“真实连接”“活动源”“系统运行中”或混用日期只能作为历史视觉占位，设计、架构和实现不得据此声称真实服务已接入。

Prompt v1.2、发布完整性 Prompt/设计及其历史审批链继续保留，不被新文件覆盖。2026-08-21 已批准的产品增量将主定位改为“真实国内外 AI 开发圈新闻”，对应 `06-ai-developer-news-ui-prompt-increment.md` v1.0；2026-08-26 的 `07-daily-web-ui-prompt-increment.md` v1.0 已批准，并由固定 04 形成 `08-daily-web-ui-design.md` v1.0 实现级设计，当前停在 `ui-design-review`。本次设计不依赖外部图片，既有发布完整性视觉仅作历史风格参考；真实批次仍未接入网页与业务库，`artifact-radar-frontend-001` 与 `MR-PM-101` 继续冻结，不授权架构、开发、真实来源接入、服务或部署。
