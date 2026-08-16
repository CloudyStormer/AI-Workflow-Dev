# 四项目真实可用产品增量与全部置灰入口关闭矩阵

> 文档版本：v1.0
> 产物 ID：`artifact-four-project-real-usable-product-delta-001`
> 变更 ID：`product-20260816-four-project-real-usable-ungray-001`
> 负责角色：唯一固定 `03 产品经理`（`role-product-manager`）
> 安全基线：`d3277734804745fa092803c84419861443f0cdc1`
> 编制日期：2026-08-16（Asia/Shanghai）
> 当前状态：`ready-for-review`
> 停止门：`cross-project-real-product-delta-review`
> 生产发布：冻结
> 自动路由：禁止

## 1. 产品裁决

四个项目当前均不得称为“完整产品”“真实可用”或“可发布”。本轮不重写已批准 PRD，也不重做四项目重排计划；本文件只补齐当前运行界面与已批准目标之间的逐入口差距，以及每个置灰、演示、硬编码、空态和失败状态的关闭证据。

`docs/04-four-project-release-completeness-replanning-plan.md` v1.0 已正确规定四项目的执行顺序、角色边界、真实数据、前后端、审查、QA 与发布冻结，可继续作为实施骨架。它不足以单独解除任何入口置灰，原因是尚未把当前代码中的每个实际入口／动作绑定到“真实依赖就绪、契约与联调通过、UI 真相态完整”三重关闭门。本文件补足该缺口，二者共同构成后续实施输入。

本轮统一裁决如下：

1. 前端入口可点击，不等于真实服务已实现；只有读取或写入真实业务结果且完成联调，入口才可从未就绪状态转为可用。
2. 灰态不是视觉缺陷。因权限、离线、提交中、危险操作、输入无效或产品只读边界而禁用的动作，必须继续正确禁用。
3. 演示、种子、硬编码、Mock 和旧静态快照可保留在明确隔离的演示／测试命名空间，贡献正式完成率为 0，且不得成为正式路径的静默回退。
4. 生产部署继续冻结。本地页面 HTTP 200、本地服务进程存活、UI 设计通过或按钮解灰，均不是功能完成证据。
5. 所有已进入下游的 UI、架构、前后端、审查与 QA 产物保留历史，不因本文件自动获批、解冻、重做或路由。

## 2. 审计标记与入口状态模型

### 2.1 四类产品处置标记

| 标记 | 含义 | 本轮动作 |
|---|---|---|
| `existing-approved` | 已获批 PRD／发布附录已经完整定义 | 不重写产品逻辑，只绑定当前入口与完成证据 |
| `new-delta` | 当前已批准产品仍有歧义或遗漏 | 以本文件作出新增产品裁决 |
| `correctly-disabled-state` | 因输入、权限、并发、离线、安全或只读边界而应禁用 | 不得为“消灭灰色”强行点亮；状态变化后按规则恢复 |
| `must-enable-after-real-service` | 目前因真实服务／数据／联调缺失而暂时置灰 | 三重关闭门全部通过后必须可用，不得永久标“后续任务” |

同一入口可以同时标记 `existing-approved + must-enable-after-real-service`：前者表示无需重新定义，后者表示实现仍未完成。

### 2.2 统一真相态

所有正式业务读取至少区分：

- `loading`：请求尚未形成结论；
- `live`：真实依赖、数据和本次查询均成功；
- `empty`：真实查询成功但结果确实为空；
- `not_ready`：关键依赖、配置、快照或数据尚未就绪；
- `stale`：只读使用上一份真实成功结果，且已超过该域的新鲜度门槛；
- `degraded`：部分依赖失败但仍有可追溯真实结果；
- `failed`：本次失败且没有可用真实结果；
- `offline`：客户端离线，只允许读取已标明时间的缓存，不得结算写操作；
- `unauthorized` / `forbidden`：身份失效或无权限；
- `conflict`：并发版本冲突，保留双方且不得静默覆盖。

每份正式响应或等价状态信封至少包含 `source`、`version`、`as_of`、`observed_at`、`last_success_at`、`freshness`、`coverage`、`revision`（适用于可变用户数据）与受影响错误范围。`observed_at` 不得冒充业务发生时间或刷新成功时间。

### 2.3 三重关闭门

任何 `must-enable-after-real-service` 入口只有同时满足以下条件才可解灰：

1. **真实依赖门：** 权威数据源、持久化、权限和服务 readiness 均满足该入口的 P0 契约；
2. **联调证据门：** 前后端契约、集成和浏览器 E2E 覆盖成功、空、陈旧、部分失败、全部失败、离线与权限状态；
3. **产品真相门：** 简体中文、移动端、键盘、屏幕阅读、时间／来源／模式标签、错误恢复和数据权利全部可验收。

仅解灰、仅新增路由、仅返回 HTTP 200、仅展示设计稿、仅有数据库表或仅有测试夹具，均不能关闭入口。

## 3. AI Workflow Control Center 产品增量

### 3.1 当前真相与 P0 真实纵切

当前六个导航视图可浏览，但项目、角色、缺陷、发布、成熟度、时间与来源均来自 `control-center/app/dashboard-data.ts` 的演示常量；全局搜索与导出也只处理演示快照。`db/schema.ts` 为空，`worker/` 没有工作流读取器，真实 API／fetch 数量为 0。

P0 真实纵切固定为：识别且限制在 AIWorkFlow 根仓 → 只读解析项目清单及每项目 workflow 文件 → 形成同一 `root_head` 的一致快照 → 分别返回项目、角色、审批、产物、事件、问题、发布、来源／新鲜度／错误 → 六个视图、搜索、筛选、详情和导出消费真实快照 → 单项目损坏时隔离失败 → 重读后恢复。业务文件、Git、审批、缺陷和发布的写入次数始终为 0。

### 3.2 入口与动作关闭矩阵

| 入口／动作 | 当前真相 | 处置 | 正式可用或保持禁用的条件 | 禁止的假实现 |
|---|---|---|---|---|
| 顶部真实性条与演示横幅 | 固定“演示快照 2026-08-04” | `existing-approved` + `must-enable-after-real-service` | 改由服务返回 `root_head`、工作树状态、观测时间、最近成功、覆盖与错误；无真实快照时显示 `not_ready` | 把页面加载时间、固定字符串或前端环境变量显示为“实时” |
| 总览 | 演示阶段、风险、缺陷和成熟度 | `existing-approved` + `must-enable-after-real-service` | 所有数值能下钻到结构化来源；覆盖不足显示未知，不用 0 或百分比推断 | 静态 KPI、阶段编号换算进度、全局样例复用为项目事实 |
| 项目与阶段 | 四项目常量及演示阶段矩阵 | `existing-approved` + `must-enable-after-real-service` | 根仓全部登记项目真实聚合；阶段、角色、门、产物、工作副本状态逐条可追溯 | 前端项目数组、文件夹存在或 README 文案冒充阶段完成 |
| 角色协作 | 11 个角色的忙闲和负载均为演示 | `existing-approved` + `must-enable-after-real-service` | 只按结构化工作流计算 active／queued／awaiting-review／blocked；无证据为 unknown | 推断角色在线、用演示百分比冒充真实负载 |
| 质量与复测 | DEMO 缺陷和演示趋势 | `existing-approved` + `must-enable-after-real-service` | 只聚合已结构化问题、审查和 QA 证据；未建立问题域时为 `coverage=not_available` | 演示缺陷进入真实集合；空集合写成 0 缺陷 |
| 迭代与发布 | 演示燃尽、流图与门禁 | `existing-approved` + `must-enable-after-real-service` | 只展示有审批、产物或事件证据的本地／测试／生产状态；URL 与健康分离 | 有 URL 或发布方案即显示上线；静态图表称真实迭代 |
| 成熟度与治理 | 演示评分、热力图与建议 | `existing-approved` + `must-enable-after-real-service` | 只有规则版本、样本、缺失证据和来源齐全才计算；否则显示 unknown | 固定 42 分、未实测百分比或算法建议冒充治理结论 |
| 项目／时间／迭代／来源筛选 | 只筛前端演示数组 | `existing-approved` + `must-enable-after-real-service` | 服务端或等价真实查询返回有效筛选、覆盖和稳定结果；过滤空与数据不可用分开 | UI 变化但实际数值未过滤；跨项目复用无覆盖数据 |
| 全局搜索与详情抽屉 | 搜索演示项目、角色、缺陷 | `existing-approved` + `must-enable-after-real-service` | 搜索真实项目／角色／审批／产物／事件／问题／发布；详情含来源路径、哈希和时间 | 前端常量搜索或无来源详情冒充监管 |
| 导出报告 | 下载演示 JSON | `new-delta` + `must-enable-after-real-service` | 导出当前真实查询快照、筛选、来源、哈希、错误与生成时间；导出不写业务状态 | 改文件名或移除“演示”字样即称真实报告 |
| 刷新／重试 | 仅页面刷新或样例文案 | `new-delta` + `must-enable-after-real-service` | 仅触发只读重新观测；幂等、可取消，读取中根仓变化则丢弃混合快照并重读 | 固定成功 toast；使用旧内存数据却显示刷新成功 |
| 通知按钮 | 点击只提示“演示状态” | `new-delta` + `correctly-disabled-state` | 通知中心不属于当前监管 P0；正式模式应隐藏或明确禁用，不得伪装可操作。以后需独立产品批准 | 保留可点击假通知、用固定消息冒充真实待办 |
| 缺陷状态流转按钮 | 代码中永久 disabled | `existing-approved` + `correctly-disabled-state` | Control Center 继续是只读监管面；不得解灰。用户须回对应固定角色／工作流完成变更 | 因“全部放开”而增加审批、改缺陷、发布或 Git 写入口 |
| 发布／审批写操作 | 当前不存在 | `existing-approved` + `correctly-disabled-state` | 保持不存在或只读说明；所有副作用写入数量为 0 | 隐式写 workflow、Git、数据库、远端或生产环境 |

### 3.3 Control Center 新增裁决

- “全部置灰入口关闭”不改变已批准只读定位。缺陷流转、审批、发布、回滚和 Git 操作是**正确禁止**，不属于待解灰能力。
- 搜索、筛选、详情、只读刷新和导出是真实监管读取能力；真实服务联调后必须可用。
- 通知中心没有批准的数据源与状态机，本轮不升为 P0；正式候选不得保留假可点击入口。

## 4. AI English Learning 产品增量

### 4.1 当前真相与 P0 真实纵切

当前 `/word` 已形成真实的单浏览器行内拼写、查看答案、同日插题、跨日队列和本地恢复纵切，但事实源仍是源码内三个词和 `localStorage`。账号 Alex、B1、词库、统计与首页数据为预置；Chat 使用固定 `tutorReplies`，语音使用 `MOCK_TRANSCRIPT`，后端为空。

正式 P0 由两条缺一不可的纵切构成：

1. **学习与持续复习：** 真实身份／访客边界 → A1–C2 定级与目标 → 合规版本化词库 → 服务端今日计划 → Word attempt／hint／reveal／submit／finalize 原子事件 → 服务端日内插题与跨日曲线 → 刷新、重登、第二设备恢复同一 revision → 事件可复算统计 → 提醒、导出与删除。
2. **真实 AI 与语音：** 20 个场景及自由会话 → 真实模型 turn／history／恢复 → 真实 STT／TTS → 权限、限额、安全、隐私、失败与文本降级 → 学习证据写回。

只完成第一条可称“学习纵切可用”，不得称 PRD v1.4 全功能完成。

### 4.2 入口与动作关闭矩阵

| 入口／动作 | 当前真相 | 处置 | 正式可用或保持禁用的条件 | 禁止的假实现 |
|---|---|---|---|---|
| 身份、登录、退出、定级 | 仅预置 Alex／B1，无真实会话与定级路由 | `existing-approved` + `must-enable-after-real-service` | A/B 用户隔离；真实登录、退出、过期、401/403；定级结果及依据持久化；访客明确限制 | 静态头像、localStorage、toast 或客户端等级冒充账号／定级 |
| 首页今日计划与连续学习 | 数字、目标、News 和部分统计硬编码 | `existing-approved` + `must-enable-after-real-service` | 服务端返回计划原因、词库版本、到期／逾期、`as_of`；空计划、未定级、陈旧和失败分开 | 常量、随机数、客户端自增冒充个性化和连续学习 |
| Word 词库／纯背／下一词 | 仅三个源码内词条循环 | `existing-approved` + `must-enable-after-real-service` | 合规、版本化、带来源／校验和的 A1–C2 词库；服务端计划选词；缺词隔离 | 三词 seed、静态数组或前端循环冒充真实词库 |
| 行内填词、提示、检查、查看答案、重试、下一题 | 本地状态机真实；查看答案会记薄弱且不算独立答对 | `existing-approved` + `must-enable-after-real-service` | 服务端幂等事件与 revision 原子结算；刷新、重登和第二设备恢复；失败不推进 | `navigator.onLine`、localStorage 成功或 UI 反馈冒充服务结算；看答案算答对 |
| 复习中心、同日插题、跨日曲线与掌握 | 单浏览器规则可运行 | `existing-approved` + `must-enable-after-real-service` | 服务端唯一事实源与规则版本；多设备并发控制；漏学、再次查看回退、掌握退出可重放 | 设备时钟、本地队列或双写分叉冒充跨设备记忆 |
| 开始／跳过／暂停／恢复／重置 | 本地可用，离线／异常／提交中会禁用 | `existing-approved`；条件禁用为 `correctly-disabled-state` | 命令幂等、权限与冲突可见；成功后以服务端 revision 重读 | 为消灭灰态而在离线、冲突或提交中强行可用 |
| 提醒与时区 | 浏览器通知仅本机；时区选择禁用；短信／邮件待接入 | `existing-approved` + `must-enable-after-real-service`；短信／邮件为 `correctly-disabled-state` | P0 提醒时间、用户时区、静默期、权限与错过状态服务端保存；浏览器请求与送达分开。短信／邮件不在当前 P0 | 浏览器通知请求冒充已送达；设备时区冒充用户设置；待接入文案冒充通道 |
| 20 场景、自由对话、发送与历史 | 四个静态联系人、固定回复与初始线程 | `existing-approved` + `must-enable-after-real-service` | 20 场景与自由对话真实模型、turn 状态机、历史、恢复、限额和安全均联调 | canned reply、计时器、静态历史或 seed 静默回退冒充 AI |
| 麦克风与 STT | 不采集音频，注入固定 `MOCK_TRANSCRIPT` | `existing-approved` + `must-enable-after-real-service` | 显式权限、真实采集／转写、可编辑确认；拒绝、取消、超时、格式、离线和供应失败可见 | 固定 transcript、动画或按钮点亮冒充录音／转写 |
| TTS、发音评分和反馈 | 浏览器朗读可运行；86 分和建议为静态 | `existing-approved` + `must-enable-after-real-service` | 正式 TTS 与真实音频／转写／turn 关联；浏览器朗读只作标明的降级；评分有证据与推断标签 | browser speech 冒充正式 TTS；常量分数冒充评测 |
| 统计与成长 | 内存初值、点击自增、静态图片 | `existing-approved` + `must-enable-after-real-service` | 从服务端事件可复算，显示口径、规则版本、`as_of` 与重算状态 | 硬编码、图片或前端自增冒充学习事实 |
| 设置与账户 | switch 仅前端态，“资料最新”与退出为演示 | `existing-approved` + `must-enable-after-real-service` | 账号、学习和提醒偏好服务端保存；pending／success／conflict／error；退出撤销会话 | 视觉切换或 toast 冒充保存／登出 |
| 同步、导出、删除与隐私 | 只有 Word 本地备份／重建，无账户级能力 | `existing-approved` + `must-enable-after-real-service` | 多端 revision 收敛；人类与机器可读导出；删除立即撤权并说明备份期限；AI／语音第三方发送前告知与最小化 | 导出浏览器 JSON冒充账户导出；清 localStorage 冒充服务端删除 |
| 健康、就绪、陈旧、失败与离线 | 后端为空；Word 主要依赖 `navigator.onLine` | `existing-approved` + `must-enable-after-real-service` | 进程健康与依赖就绪分离；所有数据有来源／版本／时间；写操作离线 fail-closed | 页面 200、空目录或浏览器在线冒充服务健康／真实持久化 |

## 5. AI Model Radar 产品增量

### 5.1 当前真相与 P0 真实纵切

当前只有 `/today` 路由和一条硬编码演示事件；“全部事件、来源目录、偏好与反馈、质量说明”四个导航被代码和测试明确禁用；趋势、版本、开源、详情与刷新运行详情没有路由；后端为空，运行时来源、连接器和 live 快照均为 0。

P0 真实纵切固定为：加载版本化来源 registry 且政策轴与 runtime 轴分离 → 精确端点通过合规复核与 canary → Observation／Candidate／Event／Evidence 持久化 → 主源核验、时间校验、未来隔离、去重与 0–20 条价值门 → 形成不可变 live 快照与 08:30 日报 → Today、Events、Trends、Versions、Open Source、Detail、Sources、Quality 查询 → 本地所有者受控手动刷新 → 前端不再静默读取 seed／硬编码 → 审查与 QA。

首个真实连接器只能证明“首条 live 纵切”；按已批准根计划，全部 22 个 `P0/allow` 原子端点完成真实运行与验收后，才可关闭“全功能完成”门。

### 5.2 入口与动作关闭矩阵

| 入口／动作 | 当前真相 | 处置 | 正式可用或保持禁用的条件 | 禁止的假实现 |
|---|---|---|---|---|
| 全局真相栏 | 能诚实标演示，但时间与状态硬编码 | `existing-approved` + `must-enable-after-real-service` | 服务返回模式、快照、完整时间契约、最近成功、覆盖和错误范围 | 页面时间或静态 `LIVE` 文案冒充刷新成功 |
| 今日雷达 | 固定一条演示事件 | `existing-approved` + `must-enable-after-real-service` | live 快照返回 0–20 条正式事件；真实空榜、陈旧、降级、失败分开 | 换成更像新闻的静态 JSON；启动失败自动回 seed |
| 全部事件 | disabled、无路由 | `existing-approved` + `must-enable-after-real-service` | 真实搜索、组合筛选、排序、游标分页、结果数与返回上下文联调 | 只解灰导航、前端数组或空表 200 |
| 趋势与版本演进 | 无导航／路由 | `existing-approved` + `must-enable-after-real-service` | 7/30/90 日真实样本，显示样本量、来源覆盖、缺失天、规则版本、`as_of` 和等价表 | 演示折线、市场份额或客户端临时聚合 |
| 开源／发布专题 | 无导航／路由 | `existing-approved` + `must-enable-after-real-service` | 主源证据；区分 open-source／open-weights／source-available、许可证、tag／commit、breaking／deprecation | Star、普通 commit、公开仓库或厂商营销冒充正式发布 |
| 事件详情与证据链 | 不存在 | `existing-approved` + `must-enable-after-real-service` | 主源、发布方、版本、时间、事实标签、置信度、开发行动、修正／撤回历史齐全 | 无主源正式事件；厂商观点写成独立事实 |
| 来源目录 | disabled、无路由 | `existing-approved` + `must-enable-after-real-service` | `allow/conditional/manual_only/disabled` 与 runtime 状态独立；最近尝试／成功／验证、失败和条件可追溯 | 把 allow 或官方身份显示成“已连接”；组合生态束直接启用 |
| 质量说明 | disabled、无路由 | `existing-approved` + `must-enable-after-real-service` | 候选、隔离、核验、去重、正式事件、撤回、覆盖、缺失和规则版本来自运行记录 | 固定健康分、未实测百分比或只检查 HTTP 200 |
| 手动刷新与日报 | 无入口／运行详情 | `new-delta` + `must-enable-after-real-service` | 只有本地所有者可触发；幂等、限频、可取消；展示每来源进度、部分／全部失败、遗漏补偿与日报记录；公开读取不隐式采集 | 前端重载静态 JSON或固定“刷新成功” |
| 偏好与反馈 | disabled；旧 PRD 为 P1 会话态 | `new-delta` + `must-enable-after-real-service` | 升为发布 P0：本地单用户服务持久化关注、降权、已读、收藏、不相关和纠错；可查看、撤销、重置、导出、删除；服务重启后保持；只影响排序，不越过主源／合规／证据硬门 | 只改前端内存、localStorage 或声称云端／跨设备保存 |
| 偏好跨设备与账号 | 既无账号域也无批准范围 | `new-delta` + `correctly-disabled-state` | 本次 P0 明确不要求跨设备；正式界面必须说明“本地单用户”。未来账号／同步须独立隐私范围与审批 | 在无账号与权限设计时暗中上传或宣称云同步 |
| 空、错、陈旧、离线、未来隔离 | 当前无业务状态机 | `existing-approved` + `must-enable-after-real-service` | `empty/not_ready/stale/degraded/failed/offline/future-quarantined` 均由真实状态信封驱动；>24h 标可能过期，>48h 不称今日 | 所有异常统一“暂无数据”；全部失败回 seed |

### 5.3 Model Radar 新增裁决

- “偏好与反馈”从 P1 会话态升级为正式发布 P0，但边界是**本地单用户服务持久化**，不是未经批准的账号和跨设备系统。
- 本地所有者可以手动刷新；普通只读查询不得隐式触发采集。刷新不绕过来源政策、频率、凭证或安全门。
- `allow` 只是政策候选，不等于运行连接。`conditional` 未满足条件、`manual_only` 和 `disabled` 均不得由 UI 提供规避入口。

## 6. Frontend Career Radar（前端职业成长雷达）产品增量

### 6.1 当前真相与 P0 真实纵切

当前只有 `/directions` 和 `/source-workbench` 两条路由。前者只展示一个硬编码研究方向，后者可真实完成浏览器内输入、校验和人工分类预览，但不会自动分类、摘要、整合或保存。技术栈、招聘证据、AI 增量、个人证据和移动“更多”均禁用；后端为空，运行时来源、连接器和获批公司 ATS 实例均为 0。

正式 P0 由五条纵切组成：

1. **公共情报：** 精确 allowlist → 连接器／调度 → Observation／Claim → 不可变日快照／趋势 → 方向 → 技术栈 → 招聘证据 → 来源质量；至少 13 个获批 P0 技术原子端点和 1 个获批公司级 ATS 实例完成运行验收。
2. **用户材料：** 输入 → 保存模式、敏感与权利确认 → 双轴分类候选 → 人工确认 → 摘要／事实分层 → 六类研究关系 → 仅本次或私有档案；失败不丢原文且重试幂等。
3. **个人成长：** 账号目标 → 证据六态 CRUD → 可解释差距 → 路线调整／暂停 → 未来方向 → 历史当时依据；目标、公共要求、已确认证据缺一则保持 unknown。
4. **同步与数据权利：** A/B 账号隔离 → 多端并发与离线冲突 → 导出 → 证据／账号删除 → 备份到期与恢复演练。
5. **横切真相门：** 简中、320px、键盘／读屏、真相态、health／readiness、安全日志、审查与 QA。

### 6.2 入口与动作关闭矩阵

| 入口／动作 | 当前真相 | 处置 | 正式可用或保持禁用的条件 | 禁止的假实现 |
|---|---|---|---|---|
| 全局快照与真实性条 | 固定 2026-08-03、10+2 目的样本 | `existing-approved` + `must-enable-after-real-service` | 真实版本、`as_of`、覆盖、health／readiness、最近成功／失败；旧快照只作标明的降级 | 页面 200、静态快照或设计稿称 live／最新 |
| 01 职业方向总览 | 硬编码“产品型前端”1/8 | `existing-approved` + `must-enable-after-real-service` | 8/8 方向来自版本化公共查询，含证据、地区、层级、时间、置信度与限制 | 静态卡、虚构排名／适配分或预置个人推荐 |
| “查看该方向的技术栈”按钮 | disabled | `existing-approved` + `must-enable-after-real-service` | 方向上下文进入真实 02 路由，能力域、优先级、证据、版本和失效条件完整 | 仅解灰、跳空页或把项目技术选型冒充职业技术栈 |
| 02 技术栈全景 | 桌面／移动 disabled，无路由 | `existing-approved` + `must-enable-after-real-service` | 固定为第二层；8 类能力域及 P0／P1／P1-AI／P2／观察项可查询、比较和追溯 | 导航、占位图或静态清单即算完成 |
| 03 招聘证据与趋势 | disabled，无路由 | `existing-approved` + `must-enable-after-real-service` | 13 个 P0 技术原子端点 + 至少 1 个获批公司／board／site 的 ATS 实例；去重、7/30/90 日、n/N、地区、层级、缺失日、规则和 `as_of` | 目的抽样外推市场份额；ATS 模板冒充实例；0 源绘制趋势 |
| 旧 04 AI 增量 | disabled，且与最新 IA 存在偏差 | `new-delta` + `must-enable-after-real-service` | AI 增量优先映射进 02 能力域和 03 变化证据；不得保留无数据独立空壳。若以后保留独立页，须单独批准信息架构 | 直接解灰旧导航、静态 AI 清单或营销新闻 |
| 来源与质量目标页 | 当前无路由；policy 有研究裁决但 runtime=0 | `existing-approved` + `must-enable-after-real-service` | 政策四态与 runtime 独立；精确 endpoint、canary、刷新、失败、停用和权利可追；>24h stale，>48h 不称当前 | allow／conditional 冒充 runtime enabled；一个绿点掩盖部分失败 |
| 05 信息源输入 | 1–100,000 字符输入、校验、清空确认可用，但只在当前标签页 | `existing-approved` + `must-enable-after-real-service` | 明确“仅本次／保存私档”；敏感检测与发送前同意；选择保存才持久化；失败保留原文；重复提交幂等 | 可输入即称已整合；静默上传／保存；关闭即丢却称成长记录 |
| 元数据与双轴分类 | 元数据未进入提交；“分析”只打开人工选择 | `existing-approved` + `must-enable-after-real-service` | 来源渠道和内容类型分别给候选、置信度与依据；人工逐轴纠正／确认并保留历史 | 默认未知、硬编码类别或按钮名称冒充自动分析 |
| 摘要、对照研究、保存与合并 | 明确未启用 | `existing-approved` + `must-enable-after-real-service` | 最小摘要；事实／来源观点／系统推断／未知分层；六类关系；用户招聘材料只进用户目的样本；逐条合并 | Mock 摘要、关键词命中冒充事实；静默覆盖公共研究；公开再分发全文 |
| 06 个人证据档案 | disabled，无路由／账号／服务 | `existing-approved` + `must-enable-after-real-service` | 私有 CRUD；六态证据；接受、编辑、拒绝、未知、删除与历史均可追 | 预置档案、一次输入自动变已掌握、跨账号可见 |
| 差距、路线、未来方向与历史 | 无运行入口，只有目标态设计 | `existing-approved` + `must-enable-after-real-service` | 三项输入齐全才计算；结论可解释可推翻；路线可调／暂停／恢复；历史保留当时依据和发生／发现时间 | 伪竞争力分、缺证据仍生成路线、模型想象或静默改写过去 |
| 账号、同步、导出与删除 | 全缺失 | `existing-approved` + `must-enable-after-real-service` | A/B 隔离；成功同步后 10 秒目标收敛；人类／机器可读导出；删除撤权、活动数据 24h、备份不超过 30 天 | localStorage 冒充同步；只删 UI；假导出；静默覆盖冲突 |
| 移动“更多” | disabled | `existing-approved` + `must-enable-after-real-service` | 可访问菜单覆盖全部 P0 页面；键盘／读屏／320px 操作与桌面一致 | 只解灰、外链或占位菜单 |
| 无草稿时“清空” | 条件 disabled，行为正确 | `existing-approved` + `correctly-disabled-state` | 无草稿继续禁用；有草稿可用且二次确认、默认焦点取消、Esc／取消保留 | 为消灭灰态强制常亮或无确认删除 |

### 6.3 Career Radar 新增裁决

- 当前旧“04 AI 增量”不得作为独立空壳直接点亮；按最新批准信息架构并入技术栈与市场变化证据。本裁决不删除历史导航，只规定正式实现映射。
- 公司级 ATS 实例为招聘纵切硬门。技术源、目的抽样或用户输入均不能替代至少一个合规、获批、运行验收通过的公司／board／site 实例。
- 用户正文默认私有，不公开再分发；只有用户明确选择保存才进入私有服务。事实、来源观点、系统推断和未知必须分离，任何自动结果都需人工确认后才能影响个人证据与路线。

## 7. 四项目统一功能完成定义

一项 P0 能力只有同时满足以下 DoD 才能标记完成：

1. 真实数据或明确受控降级；正式路径中的 Mock、seed、硬编码和静态回退为 0。
2. 前后端契约、数据库迁移、重启持久化、真实来源／用户数据联调均通过。
3. 健康与依赖就绪分离；来源、版本、时间、新鲜度、覆盖和错误范围可追溯。
4. 成功、空、加载、未就绪、陈旧、降级、失败、离线、权限和冲突均有产品行为与恢复路径。
5. 用户可见内容完整简体中文；320px、200% 放大、键盘和屏幕阅读器可完成全部 P0 流程，状态不只依赖颜色。
6. 写操作具备身份、权限、幂等、并发版本和审计；只读产品的副作用写入为 0。
7. 个人数据说明用途、保存位置、第三方传输、导出、删除和备份期限；日志不得记录凭证或敏感正文。
8. 契约、集成、E2E、异常、恢复、安全、备份与回滚证据齐全；代码审查未关闭 P0／P1 为 0，QA `must_fix` 为 0。
9. 产品、UI、架构、任务拆解、实现、审查与 QA 产物均已在各自门通过；不得用某一角色产物替代其他门。
10. 生产部署仍需以后单独授权；本地完整不自动等于生产可发布。

## 8. 增量验收标准（Given–When–Then）

以下 AC 只补入口级差距；各项目已批准 PRD 与发布附录 AC 继续有效。

### 8.1 跨项目统一 AC

- **AC-XR-REAL-01 盘点完整性：** Given 基线提交 `d3277734`，When 对四项目导航、按钮、空态、demo、hardcode、disabled、待接入和后端目录复核，Then 每一类当前入口均能在本文件找到处置标记、真实关闭条件和禁止假实现，未归类入口数为 0。
- **AC-XR-REAL-02 三重关闭门：** Given 任一 `must-enable-after-real-service` 入口，When 真实依赖、契约／E2E 或产品真相门任一未通过，Then 入口不得显示为正式可用；三门全部通过后入口可用且不得继续永久标“后续任务”。
- **AC-XR-REAL-03 正确禁用：** Given 输入无效、提交中、离线写入、权限不足、并发冲突、危险确认或只读边界，When 用户查看动作，Then 动作保持禁用并说明原因；不得为了消除灰色强行启用。
- **AC-XR-REAL-04 零假完成：** Given 审核正式候选，When 检查完成证据，Then demo／seed／Mock／硬编码／空后端／仅 HTTP 200 对正式完成率贡献均为 0。
- **AC-XR-REAL-05 真相态：** Given 成功、空、未就绪、陈旧、部分失败、全部失败、离线、无权限或冲突，When 任一项目读取或写入，Then 状态与恢复动作可区分，未知不显示为 0，失败不显示成功。
- **AC-XR-REAL-06 持久化：** Given 任一需持久化的 P0 数据已成功写入，When 服务重启、页面刷新或用户重新登录，Then 结果按权限恢复；测试夹具、前端内存和 localStorage 不作为服务端持久化证据。
- **AC-XR-REAL-07 简中与无障碍：** Given 320px、200% 放大、键盘和屏幕阅读器，When 用户完成每个项目 P0 纵切，Then 导航、操作、状态、图表等价表、错误与数据权利均可理解和操作。
- **AC-XR-REAL-08 健康与就绪：** Given进程存活但关键依赖不可用，When 分别检查健康与就绪，Then 健康可成功而就绪失败或降级；页面 200 不替代 readiness。
- **AC-XR-REAL-09 数据权利：** Given 产品处理个人材料、学习记录、偏好或语音，When 用户查看、导出或删除，Then 范围、第三方传输、进度、失败和备份期限明确，跨账号泄露数为 0。
- **AC-XR-REAL-10 质量门：** Given 项目准备声明全功能完成，When 汇总契约、集成、E2E、审查、QA、安全、备份与恢复，Then 所有 P0 通过、未关闭 P0／P1 和 QA `must_fix` 均为 0。
- **AC-XR-REAL-11 计划关系：** Given 已批准根重排计划，When 实施团队拆解工作，Then 继续复用既有工作项并增加本矩阵的入口证据映射，不复制第二份计划或让本文件覆盖已批准来源政策。
- **AC-XR-REAL-12 发布冻结：** Given 本地四项目达到完整 DoD，When 未获得单独生产部署授权，Then 生产仍保持冻结，不执行域名、凭证、付费采购、外部发送或上线动作。

### 8.2 Control Center AC

- **AC-CC-REAL-01：** Given 真实监管候选，When 遍历六个导航、全局筛选、搜索、详情和导出，Then 业务记录全部来自允许读取的根仓事实，演示记录进入正式集合数量为 0。
- **AC-CC-REAL-02：** Given 任一聚合数字，When 用户查看详情，Then 100% 能回到项目、源文件、SHA256、`root_head` 与观测时间；覆盖不足显示 unknown。
- **AC-CC-REAL-03：** Given 一个项目文件损坏，When 查询其他项目，Then 其他结果可用且整体 `degraded`，失败项目、来源与最后成功时间明确。
- **AC-CC-REAL-04：** Given 用户尝试审批、改缺陷、发布、回滚或写 Git，When 使用 Control Center，Then 可执行入口数为 0，业务与 Git 副作用写入数为 0。
- **AC-CC-REAL-05：** Given 只读刷新期间根仓发生变化，When 两次边界校验不一致，Then 本次混合快照不发布并明确重读；固定“刷新成功”提示数为 0。
- **AC-CC-REAL-06：** Given 用户导出报告，When 导出完成，Then 文件含当前筛选、快照、来源、哈希、错误与生成时间，不包含凭证、聊天正文或任意文件内容。

### 8.3 AI English Learning AC

- **AC-AEL-REAL-01：** Given A、B 两个账号与访客，When 分别学习、刷新、重登和退出，Then 账号记录隔离、访客限制明确、退出会话失效，预置 Alex 数据贡献为 0。
- **AC-AEL-REAL-02：** Given 用户未查看答案独立拼写、使用提示、答错或确认查看答案，When 服务结算，Then 事件幂等、计分语义正确、查看答案登记薄弱且不算答对，第二设备恢复同一 revision。
- **AC-AEL-REAL-03：** Given 今日计划与复习队列，When 跨日、漏学、再次查看、跳过、暂停或恢复，Then 服务按规则版本可重放，客户端日期或本地队列不成为唯一事实源。
- **AC-AEL-REAL-04：** Given正式词库候选，When 检查 A1–C2、来源、许可、版本和校验和，Then 覆盖满足批准范围；源码三个词和静态数组不计入正式覆盖。
- **AC-AEL-REAL-05：** Given 20 场景或自由会话，When 用户连续交互、刷新或供应商失败，Then 真实 AI turn 与历史可恢复、失败明确且不回固定回复。
- **AC-AEL-REAL-06：** Given 用户授权麦克风并提交有效语音，When STT／TTS／反馈完成，Then 结果关联真实音频、转写和 provider 记录；`MOCK_TRANSCRIPT`、固定 86 分和静态建议进入正式结果数量为 0。
- **AC-AEL-REAL-07：** Given 学习事件已产生，When 查看统计或导出，Then 统计可由服务端事件与规则版本复算；前端初值、自增和静态图贡献为 0。
- **AC-AEL-REAL-08：** Given 用户请求账户导出或删除，When 流程完成，Then 可查看范围与进度，删除立即撤权并说明备份期限；清 localStorage 不得返回账户删除成功。

### 8.4 AI Model Radar AC

- **AC-AMR-REAL-01：** Given live 候选，When 查看今日、全部、趋势、版本、开源、详情、来源和质量，Then 正式路由可用率 100%，disabled／空壳数为 0，所有结果来自真实服务。
- **AC-AMR-REAL-02：** Given registry 中 22 个 `P0/allow` 原子端点，When 声明全功能完成，Then 每个端点均有实际 canary、运行、最近尝试／成功／验证和失败证据；首个连接器不得替代完整覆盖。
- **AC-AMR-REAL-03：** Given 当前 Asia/Shanghai 自然日或过去 24h，When 生成 Today，Then 0–20 条正式事件满足主源、时间、去重和行动价值门；不足不凑数，未来时间被隔离。
- **AC-AMR-REAL-04：** Given 7/30/90 日趋势，When 用户查看图表，Then 同时显示样本量、来源覆盖、缺失天、规则版本、`as_of` 与等价表，且只称“已接入来源样本趋势”。
- **AC-AMR-REAL-05：** Given 本地所有者触发刷新，When 重复点击、部分失败、全部失败或取消，Then 操作幂等、限频并显示真实进度；公开查询触发外部采集次数为 0。
- **AC-AMR-REAL-06：** Given 用户保存偏好、收藏、不相关或纠错，When 服务重启后查看、撤销、导出或删除，Then 本地单用户记录一致；localStorage-only、外部上传和虚假跨设备声明数量为 0。
- **AC-AMR-REAL-07：** Given live 全部失败，When 存在或不存在上一份真实快照，Then 分别显示 stale/degraded 或 not_ready；seed 静默进入 live 的记录数为 0。

### 8.5 Frontend Career Radar AC

- **AC-CFR-REAL-01：** Given 正式公共情报候选，When 遍历方向、技术栈、招聘、来源和质量，Then 8/8 方向、8 类能力域、13 个 P0 技术端点和至少 1 个获批公司 ATS 实例均有真实联调证据。
- **AC-CFR-REAL-02：** Given 招聘与技术趋势，When 查看 7/30/90 日结果，Then 展示 n/N、来源覆盖、地区、层级、缺失天、规则版本与 `as_of`；目的样本被称为市场份额次数为 0。
- **AC-CFR-REAL-03：** Given 用户输入文章、搜索摘录、招聘／面试要求或脱敏简历，When 请求分析，Then 来源渠道与内容类型分别给候选、置信度和依据，用户可逐轴纠正并确认；按钮点亮不得直接返回“已整合”。
- **AC-CFR-REAL-04：** Given 用户确认分类，When 摘要与研究对照完成，Then 事实、来源观点、系统推断和未知分开，六类关系逐条可确认，用户招聘内容只进入用户目的样本。
- **AC-CFR-REAL-05：** Given 用户目标、公共要求或已确认证据缺一，When 请求差距与路线，Then 返回证据不足／unknown；三项齐全后结论可解释、可推翻并保留规则与历史。
- **AC-CFR-REAL-06：** Given A、B 账号与两台在线设备，When 编辑、离线恢复和同步，Then 跨账号泄露为 0，成功同步后 10 秒内目标收敛，冲突不静默覆盖。
- **AC-CFR-REAL-07：** Given 用户导出、删除证据或删除账号，When 操作完成，Then导出可读且可机读、证据删除触发重算、账号立即撤权、活动数据 24h 内删除、备份不超过 30 天。
- **AC-CFR-REAL-08：** Given 正式导航，When 遍历桌面和移动入口，Then技术栈、招聘、来源质量、信息整合、个人证据、差距、路线、未来与历史均可达；旧 AI 增量空壳和“后续任务”永久入口数为 0。

## 9. 不做项与安全边界

- 本轮不修改 UI Prompt、设计资产、前端、后端、数据库、架构、任务拆解、测试、服务脚本或部署配置。
- 本轮不启停本地服务，不联网采集，不购买 API，不申请凭证，不绕过 robots、API、登录、验证码、付费墙、速率或平台条款。
- 不自动批准本文件，不自动路由固定 04／05／06／07／08／09／10／11，不解冻任何既有下游工作单元。
- Control Center 不升级为写控制面；Model Radar 不在无独立批准时扩为账号／跨设备系统；Career Radar 不承诺抓取“所有招聘”或市场份额；English 不用 Mock AI／语音或本地状态冒充完整学习服务。
- 不把最新 UI 设计、当前前端审查通过、来源 allowlist 或根计划批准解释为真实业务已经实现。

## 10. 影响与审核门

本文件获批前，四项目原下游状态与审核门全部保持；四项目仍为 NO-GO。获批后也只代表产品差距与入口关闭条件获批，不代表任何 UI、架构、开发、审查、QA 或部署获批。

后续若进入实施，必须由总体协调依据已批准根计划和 WIP=1 选择唯一下一工作项；本产品交付不预选、不自动路由该下一站。

当前停止在 `cross-project-real-product-delta-review`，等待超级无敌帅超超总选择“通过 / 修改 / 打回”。
