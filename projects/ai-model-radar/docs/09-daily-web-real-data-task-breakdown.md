# AI Model Radar｜真实日更网页最短可见纵切任务拆解

> - 版本：1.0
> - 日期：2026-08-26（Asia/Shanghai）
> - 项目 ID：ai-model-radar
> - 工作项：AMR-PM-DAILY-WEB-001
> - 变更编号：plan-20260826-radar-daily-web-real-data-001
> - 产物：artifact-radar-daily-web-real-data-task-breakdown-001
> - 入场授权：approval-20260826-radar-daily-web-task-breakdown-entry
> - 上游批准：approval-20260826-radar-daily-web-architecture-v1
> - 停止门：task-breakdown-review
> - 当前状态：待审核；本表所有下游工作项均为 planned-not-authorized
> - 生产发布：冻结

## 1. 管理结论

本拆解把“尽快在页面看到实质真实数据”收敛为一个可验证、可恢复的最短纵切：

1. 只通过内部、内容寻址的导入端口，将已核验的 2026-08-25 人工公共网页批次写入真实 SQLite。
2. 为每条记录建立稳定事件 identity、追加式 revision、Evidence 与不可变 PublishedSnapshot；以 CAS 原子移动 current pointer。
3. 经 Fastify 查询 API 让简体中文页面读取真实持久化结果；浏览器不能直接读取仓库 JSON，正式路径不能回退 Demo。
4. 当日没有成功快照时，Today 必须返回真实的 not_ready、stale 或 failed，保留最近成功历史链接；不能把 2026-08-25 改标为 2026-08-26 的“今日”。
5. 自动来源采集、connector runtime、canary 与生产部署不属于这条首批纵切。它们保留为独立的后续任务与七步门，当前 runtime 继续为 0。

本文件不是开发授权、导入授权、网络采集授权或服务启动授权。它通过审核前，不得启动固定 06、07、08、09、10、11 或修改任何业务代码、数据库、来源配置与运行环境。

唯一首个候选工作项为 AMR-BE-101，由固定 07 后端工程师执行，预估 4 小时。它只建立严格的本地 Fastify/TypeScript 命令与 health/readiness 基础，不写入真实数据、不联网、不启动正式服务。只有本拆解经审核通过、届时输入仍一致且没有并发冲突时，才可按一跳规则单独登记该项入场；当前仍是 planned-not-authorized。

## 2. 权威输入与冻结事实

| 输入 | 版本／状态 | SHA-256 | 本轮使用方式 |
|---|---|---|---|
| docs/08-daily-web-architecture-assessment.md | v1.0，已批准 | 83a94b0cc83fa0e6c6a2080aedbfd0fa891a36c79af559ae1111bc7b240a56e5 | 数据、后端、查询与恢复的唯一架构边界 |
| docs/02-daily-data-web-product-delta.md | v1.0，已批准 | 2661cfc4bcaecdd7eb57523b840f3f59f1befd88cb1311368371542b470700b2 | 真实日更产品 AC 与日期语义 |
| ui/08-daily-web-ui-design.md | v1.0，已批准 | 5505f08f181ffea782e681d388fa8e73b45d6b888ca5b2695b3349b9e827cc3f | 简体中文 TruthBar、页面、响应式与无障碍输入 |
| docs/06-release-completeness-architecture.md | v1.5，已批准 | 1529a866855eb1b5cbf34b349d38a7e2f50be8c8f914aeb7f8ed114fd2d99c10 | 来源七步门、通用安全与 release 边界 |
| output/daily/2026-08-25.json | 已核验一次性输入，尚未入库 | 76d8f93aeac9a57f4e8fba959750a43e2775ca9da41eacb48de4de64f605be6c | 首批真实历史数据的唯一允许导入输入 |
| docs/daily/2026-08-25.md | 人类可读研究证据 | 4242377fe27121b6c5d5afdd4af5e7d1a973e573ecb30f772b6f0308d1becbd4 | 用于人工追溯，不作为浏览器或服务直接数据源 |

冻结事实：

- 批次有 6 条记录、1 条当日预发布项和 5 条覆盖缺口；collection_mode 是 manual_public_web_verification。
- 当前 database rows written、live connector、live snapshot 和 runtime_enabled 均为 0；backend 仅有 policy/bundle 基础，尚无 package、Fastify、迁移、SQLite 业务库、API、Worker 或 Daily Web 集成测试。
- manual_verified_import 是真实、可追溯的人工核验输入，但不是自动采集成功；导入后 automation_state 仍为 not_ready，不能因有真实历史快照将 runtime 变为 enabled。
- 当前 N=22 只是来源政策基线。每一个真实 connector 仍须依次满足精确 policy、执行授权、ConnectorRevision、canary、同 revision 的 .REV、.QA、CoverageFreshnessPolicy 与 runtime registration 七步门。

## 3. 范围、非目标与共同 DoR/DoD

### 3.1 本轮范围

- 一次性已核验输入的 SHA/schema/path 校验、SQLite 持久化、稳定 identity/revision、Evidence、不可变快照与 current pointer。
- RefreshRequest 的每日首次互动与手动刷新幂等；runtime 未就绪时记录并复用 dependency_not_ready，而不是制造 FetchRun 或网络字节。
- Today、事件、历史、快照、来源质量、刷新详情、health/readiness 的真实 API 接缝。
- API 驱动的完整简体中文页面联调、失败保旧、重启/恢复、浏览器端到端与安全负测。

### 3.2 本轮明确不做

- 不执行本文件内的任何开发、数据库导入、网络采集、canary、runtime 注册、服务启动、端口分配、账号/凭证、云资源、域名/CDN、生产部署。
- 不修改来源 allowlist、registry、policy bundle、已核验 JSON 或研究 Markdown。
- 不把手工批次伪装为自动 connector、当日自动刷新、live runtime 或生产运行。
- 不启动收藏、跨设备同步、生成式 AI 摘要、个性化推荐或后续项目的工作项。

### 3.3 所有工作项的共同 DoR

每个下游工作项在获得其独立入场授权前均不得开始。获授权后还必须同时满足：

1. 上游对应 .REV 与 .QA 已通过，输入 SHA、设计和 API 契约未漂移；
2. 根仓 HEAD 与 origin/main 一致、目标文件无重叠改动、没有 index.lock；
3. 只处理本项目路径，且不夹带其他项目或本机数据库、凭证、缓存；
4. 任何会写数据库、运行导入、启动服务、联网或操作真实来源的动作都有本次精确授权；没有授权时仅可使用离线 fixture；
5. 所有对外可见界面新增文案均为完整简体中文，并覆盖状态、错误、空态、移动端与无障碍文案。

### 3.4 所有工作项的共同 DoD

- 输出与本项范围、架构不变量、输入 SHA 以及最小权限边界一致；
- 真实结果、Demo、seed、manual import、runtime 和失败状态分开命名，未知不以 0 补齐；
- 验证命令有实际执行证据；失败、未执行项和剩余限制如实登记；
- 只精确暂存本项文件，完成独立交付并停止在本项审核门；不得连续自动启动下一个工作项。

## 4. 连续审查与 QA 伴随门

每一个会改变代码、迁移、测试、脚本或 API 契约的实施项 X，均预先绑定两个独立、未授权的原子工作项：

| 伴随项 | owner／工时 | 依赖与 DoR | DoD、验证与停止门 |
|---|---|---|---|
| X.REV | 固定 09 代码审查员，1–4 小时 | X 已交付且差异、契约、测试证据完整 | 独立审查正确性、安全、不可变性、CAS、幂等、来源边界与回退；P0/P1 为 0 才可通过，否则停 code-review-conclusion-review |
| X.QA | 固定 10 测试工程师，1–4 小时 | X.REV 通过；所需隔离 fixture/本地环境已明确授权 | 执行该项正向、负向、恢复与浏览器验证；任何必须修复缺陷都停 qa-delivery-review，不得把 Mock、Demo 或 HTTP 200 当真实完成 |

这些伴随门是依赖图的一部分，不是本次对固定 09/10 的入场授权。它们也不允许跳过既有审核或一次通过跑完整链路。

## 5. 依赖图、里程碑与容量

| 里程碑 | 达成条件 | 不得误称为 |
|---|---|---|
| M0：本地服务基础 | AMR-BE-101 及其 .REV/.QA 通过 | 已有真实数据或已启动服务 |
| M1：真实历史持久化 | 输入校验、SQLite、identity/revision、快照与 pointer 可重放 | 自动采集、runtime enabled 或“今日已更新” |
| M2：可见真实网页 | API 与中文页面从 M1 真实快照读取，前端 Demo 正式路径为 0 | 完整来源覆盖、生产发布 |
| M3：失败保旧与本地可恢复 | 刷新未就绪、坏输入、发布失败、重启/恢复的负测成立 | 自动化日更或高可用 |
| M4：来源运行准备 | policy/runtime 双轴、请求幂等和单 endpoint 任务模板可审计 | 已经联网采集或已启用 connector |
| M5：完整 Daily Web 验收候选 | AC-AMR-DW-01 至 15 的数据、服务、前端、审查与 QA 证据闭合 | 生产可发布；该门仍需另行生产授权 |

固定角色容量均为 WIP=1。固定 07 的顺序主链为 AMR-BE-101 → AMR-BE-102 → AMR-BE-103 → AMR-BE-104 → AMR-BE-105 → AMR-BE-106 → AMR-BE-107；固定 08 仅在其输入稳定后串行处理 AMR-DATA-101 与 AMR-DATA-102；固定 06 在 API 契约和 UI 输入稳定后才进入前端链。此表不承诺日历日期，不把并行角色容量误写成授权。

## 6. 原子任务清单

所有表内状态均为 planned-not-authorized；工时均为单个 1–4 小时原子单元。

### 6.1 M0：本地后端与数据基座

| ID／owner／工时 | 依赖与特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| AMR-BE-101／固定 07／4h／唯一首项 | 本拆解通过；backend 尚为空；无端口、数据库或网络执行授权 | 建立 Node.js + TypeScript strict + Fastify 本地工程、显式配置读取、dev/build/lint/typecheck/test/test:unit 命令；health/live 只证明进程，query readiness 在未迁移时明确 not_ready | backend/package.json、tsconfig、app/server/config、health 单测；预期执行 npm run lint、npm run typecheck、npm run test:unit、npm run build | 端口与精确依赖仍 TBD；仅允许 loopback/测试端口，不启动正式服务；停 atomic-delivery-review |
| AMR-DATA-101／固定 08／4h | AMR-BE-101.QA；数据库对象/迁移编号契约稳定 | 建立 radar-live 与 radar-governance 的前进式迁移清单，覆盖 ImportBatch、ImportRecord、Observation、Evidence、EventIdentity、EventRevision、Snapshot、Pointer、Refresh/Audit；禁止 seed/live attach | migrations、schema checksum、临时 SQLite migration fixture；预期 npm run db:migrate 与 npm run test:migration-up-down | 具体 SQLite driver 不可暗自替架构决定；迁移失败使 readiness=false；停 atomic-delivery-review |
| AMR-BE-102／固定 07／4h | AMR-DATA-101.QA；driver/query 选择已按架构边界冻结 | 实现 SQLite 连接、foreign keys、WAL、busy timeout、事务 UnitOfWork 与迁移 runner；无迁移或 checksum 不符时 query readiness=false | infrastructure/sqlite、迁移集成测试；预期 npm run test:integration、npm run test:migration-up-down | 不直接复制活动 WAL；不得写入项目外数据库；停 atomic-delivery-review |
| AMR-DATA-102／固定 08／4h | AMR-BE-102.QA；2026-08-25 输入 SHA 未变 | 为 ImportBatch、lineage、event/revision、SnapshotItem、水位和 PublicationRecord 建 fixture，冻结 6 条记录、1 个预发布项、5 个覆盖缺口的断言 | fixtures、schema/lineage tests；预期 import fixture contract test | fixture 不是业务数据写入；不得重写 JSON 或把缺口补造为事件；停 atomic-delivery-review |

### 6.2 M1：一次性已核验输入、真实持久化与不可变快照

| ID／owner／工时 | 依赖与特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| AMR-BE-103／固定 07／4h | AMR-BE-102.QA、AMR-DATA-102.QA；本次精确导入执行授权尚未获得时仅 fixture | 实现 ImportVerifiedBatch：路径 allowlist、普通文件/软链接拒绝、读前后 SHA、schema、project/date/timezone/rights 校验；同 content address 重放返回原批次 | importing module、CLI adapter、坏路径/错 SHA/读取中变化负测；预期 npm run test:unit 与 import contract test | 本项不运行真实导入；不能接受浏览器路径、URL、凭证或联网补数；停 atomic-delivery-review |
| AMR-BE-104／固定 07／4h | AMR-BE-103.QA；identity/rule revision 输入固定 | 根据 canonical 主源、发布方、对象、动作、版本/tag/commit 与时间建立 stable identity；只追加 EventRevision/Evidence/DuplicateDecision，不覆盖历史 | identity/revision/evidence 模块和 6 条 fixture；预期 identity collision、revision CAS、撤回/恢复测试 | 仅标题模糊合并、last-write-wins 或 UPDATE/DELETE 已发布对象均为 P0；停 atomic-delivery-review |
| AMR-BE-105／固定 07／4h | AMR-BE-104.QA；publisher 质量门/manifest canonicalization 明确 | 构造确定性 manifest、固定 SnapshotItem revision、来源水位与 PublicationRecord；在单 SQLite 事务内写快照并用 revision CAS 移动 current pointer，失败回滚保旧 | publishing module、snapshot replay、pointer CAS/crash/manifest mismatch 负测；预期 npm run test:snapshot-replay-publish | 导入成功不自动移动 pointer；不能清空旧内容或回退 Demo；停 atomic-delivery-review |
| AMR-BE-106／固定 07／4h | AMR-BE-105.QA；query schema 与 UI 输入未漂移 | 实现 snapshot-bound Today、Events、Event detail、History、Snapshot、Sources、Source quality、health/readiness API；cursor 绑定 snapshot ID 与 query hash | Fastify contract/integration tests；预期 npm run test:contract 与 npm run test:integration | HTTP 200 不等于 live；无 2026-08-26 快照必须展示历史链接和正确 truth；停 atomic-delivery-review |
| AMR-OPS-101／固定 11／3h | AMR-BE-105.QA；本地备份路径与保留输入已明确 | 为本地 SQLite 形成 online backup、隔离 restore、integrity/FK/schema/manifest/pointer readback 的操作契约；生产动作=0 | backup/restore scripts 与临时库演练 fixture；预期 npm run test:backup-restore | 不复制活动 WAL，不原地覆盖活动库；停 atomic-delivery-review |

### 6.3 M2：中文版 API 联调与最短可见真实页面

| ID／owner／工时 | 依赖与特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| AMR-FE-101／固定 06／3h | AMR-BE-106.QA；ui/08 设计仍匹配；前端正式 API host 输入明确 | 建立 API adapter、snapshot-bound 客户端状态与 TruthBar；正式路径不读取 output/daily JSON，Demo/seed 只保留明确隔离入口 | frontend API adapter、contract fixtures；预期 npm run lint、npm run test、npm run build | 静态卡片、localStorage 或 HTTP 200 不能成为真实数据证据；停 atomic-delivery-review |
| AMR-FE-102／固定 06／4h | AMR-FE-101.QA；M1 的真实导入/快照 API 已有隔离集成证据 | Today 页读取真实 snapshot，明确显示 snapshot_date、as_of、人工核验采集模式、来源/证据和 2026-08-26 无快照时的非“今日”状态 | /today 组件、路由与 320/390/200%/键盘测试；预期浏览器 E2E | 不得把 8 月 25 日改标今日，也不得暗退 demo；停 atomic-delivery-review |
| AMR-FE-103／固定 06／4h | AMR-FE-102.QA；Events/History/Snapshot/Source API 契约稳定 | 完成事件详情、历史、快照详情、来源质量与刷新详情的中文页面；游标/返回上下文与 snapshot 绑定 | 事件、历史、来源页面与 E2E；预期 snapshot changed、empty/not_ready/stale/degraded/failed 断言 | 跨快照拼页、未知变 0、来源政策与 runtime 混成一个绿灯均阻断；停 atomic-delivery-review |
| AMR-FE-104／固定 06／4h | AMR-FE-103.QA；M1/M3 失败信封与 UI 设计状态矩阵完整 | 完成错误、失败保旧、刷新不可用、空态、移动端、读屏与表格等价内容；所有新增用户可见文案为简体中文 | TruthBar 八态、焦点/键盘、320px、200% 与读屏 E2E；预期 npm run test:e2e | 不可用状态不得遮蔽最近安全历史；停 atomic-delivery-review |

### 6.4 M3：真实来源运行的 fail-closed 准备

| ID／owner／工时 | 依赖与特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| AMR-SRC-101／固定 07／3h | AMR-BE-102.QA；已批准 policy bundle hash 不变 | 让服务加载来源 policy 与 runtime registration 的双轴状态，默认 runtime_enabled=false；manual import 不可写入 connector 计数或水位 | policy/runtime contract tests；预期 runtime=false 时网络字节 0 | 不允许 policy 文件、HTTP 200 或 manual batch 偷偷打开 runtime；停 atomic-delivery-review |
| AMR-BE-107／固定 07／4h | AMR-SRC-101.QA；AMR-BE-106.QA | 实现 daily-first interaction 与手动 refresh 的 RefreshRequest 幂等；未就绪时仅记录/reuse dependency_not_ready，绝不创建 FetchRun 或发网络字节 | 多 tab/同日重放/键冲突/not_ready 集成测试 | GET 查询不得触发刷新；未来 runtime 改变不得把旧 request 原地变成 run；停 atomic-delivery-review |
| AMR-SRC-102／固定 08／3h | AMR-SRC-101.QA；N=22 registry/policy 映射在输入中可复算 | 输出每个 endpoint 的独立执行任务模板，绑定 endpoint、policy、connector revision、environment、canary、.REV、.QA 与 coverage policy；不生成 connector 实现 | endpoint mapping fixture、四态/UNKNOWN 测试 | 22 是政策基线而非已运行连接器；manual_only/disabled 永不进入自动任务；停 atomic-delivery-review |
| AMR-SRC-103／固定 07／3h | AMR-SRC-102.QA；仅在未来有精确 endpoint 执行授权时才可开始 | 实现可测试的 NetworkRequestPermit/connector port 与离线 fixture；无 permit、未登记 runtime 或 URL 漂移时拒绝且网络字节为 0 | SSRF、redirect、private IP、条件请求、401/403/429 fixture tests | 本项不运行 canary、真实连接器或任何网络请求；停 atomic-delivery-review |

真实 connector 的执行不在本拆解中统一授权。未来每一个精确 endpoint 都必须有自己的 1–4 小时实施工作项，且按架构七步序列分别获批。当前最短可见纵切只使用内容寻址的 manual_verified_import；这是对“页面真实数据”最短而诚实的路径，不是对“自动采集已完成”的声明。

### 6.5 M4：跨层审查、QA 与本地可恢复性

| ID／owner／工时 | 依赖与特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| AMR-REV-101／固定 09／4h | M1 的所有相关 .REV 已结束，集成 diff/测试证据齐备 | 独立复核输入路径、identity/revision、immutable snapshot、pointer CAS、错误保旧、runtime=0 与日志脱敏 | 重跑适用单测/集成测试，输出审查结论 | P0/P1 未清零时不得进入 QA；停 code-review-conclusion-review |
| AMR-QA-101／固定 10／4h | AMR-REV-101 通过；隔离临时 SQLite/fixture 可用 | 验收“导入 6 条真实记录 → 发布 manual snapshot → 重启仍可查询 → 2026-08-26 不伪称今日 → 失败保旧”纵切 | 真 SQLite、API 与浏览器 E2E，记录实际结果 | Mock、Demo、内存 Map 或只看 HTTP 200 一律不合格；停 qa-delivery-review |
| AMR-QA-102／固定 10／4h | AMR-QA-101 通过 | 覆盖重复导入、重复首次互动、坏输入、CAS 冲突、cursor 跨快照、发布失败、恢复、来源断连与 runtime 字节为 0 | 负测/重启/恢复/安全与浏览器证据 | 失败清空页面、旧 pointer 移动、manual import 变 connector 成功均为阻断；停 qa-delivery-review |
| AMR-QA-103／固定 10／4h | AMR-QA-102 通过 | 覆盖 AC-AMR-DW-01 至 15、完整简体中文、320px、390px、200%、键盘、读屏和 TruthBar 八态；P0/P1=0 | AC 追踪矩阵与 E2E 证据 | 不以设计稿、页面截图或静态卡片替代真实服务数据；停 qa-delivery-review |

## 7. 真实数据验收口径

首批页面可以称为“有实质真实数据”，必须同时满足以下全部条件：

1. 只接受 expected SHA 为 76d8f93aeac9a57f4e8fba959750a43e2775ca9da41eacb48de4de64f605be6c 的 2026-08-25 批次；输入变更、根外路径、软链接、schema 或字段不符时业务写入为 0。
2. 真实 SQLite 能在重启后保留 ImportBatch、6 条记录、identity/revision、Evidence、PublishedSnapshot、SnapshotItem、manifest 与 current pointer，并可复算哈希。
3. 浏览器经 API 读取持久化 snapshot；前端正式模式不会直接读取仓库 JSON，也不会在请求失败时显示 demo 记录。
4. 8 月 26 日没有成功快照时，Today 明确展示真实日期与状态，指向可读的 8 月 25 日历史；不伪造当日内容。
5. 导入、刷新、quality 或 publish 失败均不移动旧 pointer；页面同时显示操作错误和最近安全内容的真实状态。
6. 来源自动运行保持 runtime_enabled=false、live connector=0、live snapshot=0；前端明确区分“人工核验真实快照”和“自动运行未就绪”。
7. 独立审查 P0/P1=0，QA 的 AC-AMR-DW-01 至 15、恢复、浏览器、中文与无障碍证据全部可追溯。

## 8. 风险、外部依赖与阻断策略

| 风险／未知项 | 当前处理与停止条件 |
|---|---|
| 本地 SQLite driver、精确依赖、端口、DB/backup 路径尚 TBD | 固定 07/05 在首项交付前按架构补齐；未明确不启动服务或真实导入 |
| 输入是人工核验而非自动采集 | 明确展示 manual_verified_import 与 date；不为“快”虚构自动刷新 |
| N=22 来源政策不代表可运行来源 | 单 endpoint 七步门、精确授权与同 revision .REV/.QA；任何缺步 fail closed |
| 当前没有 2026-08-26 成功快照 | Today 必须显示历史/未就绪或失败；不能复制旧内容改日期 |
| 发布中断或并发写入 | transaction + manifest + pointer CAS；失败保旧，恢复先隔离验证 |
| Demo 静默回退 | 正式 API adapter 与浏览器负测阻断；seed/demo 路径分离标识 |
| 完整中文与无障碍遗漏 | 每个前端项把状态、错误、320px、200%、键盘和读屏列为 DoD；QA 复验 |
| 生产部署、云、域名、证书与凭证 | 全部冻结并后置；本任务不请求、不配置、不执行 |

## 9. 本轮验证与审核停止点

本项目经理交付只验证任务拆解与 workflow 登记，不执行未来命令、不运行导入、不写库、不启动服务、不联网采集。交付前必须验证：

- 上游架构 SHA 与本文件所有冻结事实一致；
- 21 个直接工作项均为 1–4 小时、ID 唯一，依赖只指向前置项或明确的 .REV/.QA 门；
- AMR-BE-101 是唯一候选首项；其余工作项均为 planned-not-authorized；
- manual import、自动 runtime、Demo、真实页面和生产状态没有混写；
- YAML/JSONL 解析、项目结构、Git 根边界、精确 diff、尾随空格与 Skill lock/漂移检查通过。

本产物停在 task-breakdown-review。审核结论只决定本拆解是否合格；它不代表任何下游实现、导入、网络采集、数据库写入、服务启动或部署已经发生。

审核选项：通过 / 修改 / 打回。
