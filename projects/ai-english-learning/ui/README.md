# UI/UX 权威资产目录

本目录中的图片由超级无敌帅超超总亲自提供，是 AI English Learning 当前实现必须遵循的权威视觉母版，不是历史参考，也不需要 UI/UX 角色或其他模型重新生成。

## 权威边界

- 视觉语言：以本目录图片为准，包括暖米色背景、青绿色强调区、品牌紫主操作、白色内容面板、圆角、阴影、空间层级和移动端/桌面端整体构图。
- 产品逻辑：以已批准的 `docs/01-prd.md` v1.4 为准。
- 行内字母槽与“查看答案”交互：以已批准的 `docs/03-ui-prompt.md` v1.2 为准；图片没有单独展示的默认、输入、提示、编辑、退格、粘贴、未完成、错误修正、正确、查看答案、软键盘和无障碍状态均按该 Prompt 实现。
- 唯一答案入口必须位于句子缺词处，不得恢复句子下方独立答案输入框。
- 图片中的示例文本、拼写、头像、数字和统计内容只用于表达构图，不是产品数据或文案事实；实现时使用真实产品内容。
- 不要求补画缺失的行内字母槽状态，也不得以图片未展示该状态为由偏离 PRD 或 Prompt。

## 已批准 Prompt

- 权威路径：`docs/03-ui-prompt.md`
- 版本：v1.2
- SHA256：`c30be1da6e120a524976420c8c6b8d5dfaf62f0af444a4284708c96fa2094af1`
- 状态：approved

该 Prompt 在原路径完成审批闭环，本轮不移动。后续新增 UI 资产继续统一进入 `ui/`。

## 当前已批准增量 Prompt

- 权威路径：`ui/04-spaced-recall-ui-prompt-v1.3.md`
- 版本：v1.3
- SHA256：`72791c27d60851710868ea5f5c30deb4215dea61c0628b287252a9843ad08017`
- 状态：approved
- 已批准上游：`docs/01-prd.md` v1.3，SHA256 `0b065ec4ffb4881d6893ec23a1d9c4ec57627fe173f43ada73cdf5c3f4b02385`
- 范围：薄弱词登记、当天受控复现、跨日记忆曲线、提醒、独立拼写、掌握退出、计分与状态反馈、异常恢复。
- 边界：继承 `docs/03-ui-prompt.md` v1.2 和本目录 13 项用户视觉母版；超级无敌帅超超总已明确免除独立设计稿、原型或图片生成，并授权固定 `06 前端工程师`在 PRD 与 Prompt 约束内自主完成前端细节。

## 已批准发布完整性 Prompt

- 权威路径：`ui/05-release-completeness-ui-prompt.md`
- 版本：v1.0
- SHA256：`2adba179503582f9c1bc9524a64ec1f04fd624fc653403e23ff69713bfa6a5ad`
- 状态：approved
- 审批：`approval-20260816-english-release-completeness-ui-prompt-v1`
- 工作项：`EL-UI-001`
- 变更 ID：`ui-prompt-20260816-english-release-completeness-001`
- 入场审批：`approval-20260816-english-release-completeness-ui-prompt-entry`
- 已批准上游：`docs/01-prd.md` v1.4，SHA256 `8badf942aefc7ebd2c62526511aa69f0da334cefeb5688fd7281d0924e557e46`
- 范围：在既有行内字母槽、查看答案和间隔复习 Prompt 之上，补齐账号与访客、A1–C2 测级、真实词库与今日任务、真实 AI/语音、统计、跨设备同步、数据说明、双导出、删除账号、服务真实性状态、响应式和无障碍。
- 真实性边界：当前真实服务未全部接通；任何目标态与示例数字必须就近标注 `目标态演示` 或 `演示数据`，不得伪装已经上线。
- 审批效果：仅批准当前 Prompt，并按根重排计划唯一一跳授权固定 04 执行 `EL-UI-002`；不构成未来产物预审批，也不自动授权架构、开发或部署。

## 当前待审发布完整性设计

- 设计说明：`ui/06-release-completeness-ui-design-v1.0.md`
- 设计说明 SHA256：`7c1f2318ec636b5f18ee4af543a042c5b873c511bfb3f95274c3d50c36ff899d`
- 视觉包：`ui/release-completeness-v1.0/`
- 视觉 manifest：`ui/release-completeness-v1.0/manifest.json`，SHA256 `a1dcd8753a64f7b443f34dec95eb0ff1f467619bb3d1ffc0a0f166ae9260d880`
- 生成记录：`ui/release-completeness-v1.0/generation-prompts.md`，SHA256 `cd4d8debd4ffff157ffc14babbb9d950612b1904ef4b07c6b8d05cad70e49da8`
- 版本：v1.0
- 工作项：`EL-UI-002`
- 变更 ID：`ui-design-20260816-english-release-completeness-001`
- 入场审批：`approval-20260816-english-release-completeness-ui-design-entry`
- 状态：ready-for-review
- 视觉资产：4 张，分别为 1440×1024、1024×768、390×844、320×568。
- 覆盖：入口真实性、今日双主入口、行内槽、保存未确认、跨端冲突、AI/STT/TTS 降级、统计证据、双导出、删除未就绪、完整简中、响应式与无障碍。
- 真相边界：这是目标态设计和状态样例；当前真实服务尚未全部接通，图片或设计说明都不是运行时完成证据。
- 停止门：`ui-design-review`。未经审核不得路由架构、前端、后端、服务或部署。

## 用户提供视觉母版登记

| 精确路径 | 页面 / 用途 | 尺寸 | SHA256 |
|---|---|---:|---|
| `ui/Gemini_Generated_Image_fbckyffbckyffbck.png` | 移动端与桌面端整套视觉总览、跨端构图基准 | 1536×2730 | `694259c810ab017ac9f59abdf0bdb618e7291e2ab145ad8d970d29d73f030c59` |
| `ui/grok-516bcb59-f561-4bad-ab24-c193fc273f1b.jpg` | 移动端首页：背单词 / 练口语双入口 | 976×2016 | `cd1fc057ff730e91c835089c405e632441e0d08ac48f85a98c55bf4f53aa2efc` |
| `ui/grok-87dc603b-d470-4823-8480-831f528ed8bb.jpg` | 移动端单词学习页：进度、单词卡与主操作 | 960×2048 | `c1edb8e43cc01e139fb646055908ed27e5e929fdb07dab952f76bd1bbd5ca540` |
| `ui/grok-43e26fb0-5391-4019-a6d7-6b0be8ff77fb.jpg` | 移动端口语聊天页：会话气泡与输入区 | 960×2048 | `cdd4d826c298374461d867512e7cd250093c847e5611dbab6844bf49e8440de7` |
| `ui/grok-6db4f2f7-7e3c-46f6-a1ba-8c8ce7d1620f.jpg` | 移动端个人中心 / 设置页 | 976×2016 | `b0efdddc1d4ed500ec4ba577bb012d60b6d1040417a0d68aa8975b607ab2deb5` |
| `ui/grok-627ebad4-4d53-457f-8a1c-75ed30f290cf.jpg` | 桌面端首页 / 学习驾驶舱 | 1424×1392 | `a1f7c938d9fbf0825b7a33d101173a64fba7f810a5409683c86e73eee0dab313` |
| `ui/grok-bf161d3c-2cd6-4157-b122-c9caf36a1c2a.jpg` | 桌面端单词学习详情页 | 1424×1392 | `038f49a1f64cc2eeff18c733676fa0edc39afa1e3f99eebb36ebd8a83e734dcc` |
| `ui/grok-8b28d84e-22dc-4afc-a824-26718782a5ca.jpg` | 桌面端口语聊天页 | 1552×1264 | `2c46abc2222cf9051ee1ef1ebb9f3f5589c4a46e348619c4084fb95ae5eb70cd` |
| `ui/grok-96fc26d8-2f0d-4114-8b4d-297e8690c1e7.jpg` | 桌面端设置 / 学习统计页 | 1552×1264 | `7be5eefb79aa4062044b400e69036268c06bc4f57dc041954ad88d61ce06e9b3` |
| `ui/grok-15e94385-0b3f-4b4d-9ab6-ff2b2468f8da.png` | 紫色圆形与青绿色菱形装饰资产 | 180×180 | `d5e8fe15d08b69aa81b9c9573d53d50ccef00d8675c4731a76fa2bd598c21ad9` |
| `ui/grok-49c5cc49-777e-437a-ae86-7f13515d5cc0.png` | 青绿色多边形与紫色三角装饰资产 | 186×150 | `e55708a23beb7839d1faf42754a5a0b30a1dd75c4e5f768b35f6d02bf4e38e7b` |
| `ui/grok-7651d951-60be-42e4-a963-34408ae33c94.png` | 用户头像 / 个人信息裁切参考 | 120×120 | `90ab7330decb2fa994ca1f504d6f5d5c56ff86a2bd89cb8bf9da68d4f1c6a1d2` |
| `ui/grok-87c3416e-73d3-42e9-81ab-c0eafc48f065.png` | 核心色板参考 | 500×80 | `f295e14406d0ebdcbd9481306169947c4f5b33143f37fe44cb651bef182fbdee` |

## 实现约束摘要

- 视觉保持现代极简、干净、聚焦，沿用暖米色、青绿、品牌紫和白色内容面板。
- 移动端保持单列和大触控目标；桌面端保持清晰侧栏、内容卡片和留白层级。
- 填空模式只改变单词页目标区域，不扩散改造首页、聊天或个人中心业务逻辑。
- 用户提供视觉母版与 PRD / Prompt 同时生效：母版管视觉，PRD / Prompt 管未展示的行内字母槽产品与交互。
- 本目录存在图片或 Prompt 已获批准，不等于前端可以越过固定角色路由；前端仍须由 `00 包工头` 路由到固定 `06 前端工程师` 后恢复。
