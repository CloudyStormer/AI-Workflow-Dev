# Frontend Career Radar（前端职业成长雷达）发布完整性：真实本地产品任务拆解

> 项目 ID：market-analysis-dev
> 工作项：CR-PM-101
> 变更编号：plan-20260821-career-real-local-product-task-breakdown-001
> 产物：artifact-career-release-completeness-task-breakdown-001
> 版本：1.0
> 负责角色：固定 02 项目经理（role-pm）
> 入场依据：超级无敌帅超超总于 2026-08-21 直接授权“两个项目都做成真的、真实后端/网络数据/输入利用，部署后排”
> 交付状态：ready-for-review
> 停止门：task-breakdown-review
> 本文只做任务拆解；没有创建代码、连接器、数据库、服务、测试环境或部署。

## 1. 管理结论

当前 Source Workbench 只在浏览器标签页内预览，不能满足“真实产品”的口径。本拆解将既有已批准的产品、UI 和架构边界转为本地优先的真实纵切：

1. 先形成可验证的 Node.js + TypeScript + Fastify 后端、SQLite/WAL/迁移、health/readiness 与真实命令合同；
2. 再让用户提交真实正文，经明确权利与保存模式后进入私有档案，支持幂等、revision/CAS、导出、删除、跨重启恢复；
3. 再由实际正文驱动可解释的本地分析。未有模型、证据或可用公共快照时必须输出 UNKNOWN 或 evidence_insufficient，不能补造结论；
4. 网上数据只允许走已批准的精确来源与七步运行门。T=13 仅表示 13 个技术 endpoint 可被规划，绝不等于已经采集或已启用；招聘 R=0 仍是完整产品硬阻断；
5. 前端逐步以 API 真相态替换浏览器内存预览，并保持“职业方向总览 → 技术栈全景”为前两层；
6. 本地稳定运行、备份恢复、隐私负测、真实浏览器端到端和完整简体中文在生产部署前闭合。

所有下游工作项均为 planned-not-authorized。本产物通过前，不授权任何开发、数据、前端、审查、QA、运维或来源运行工作。通过后，唯一候选下一站是 CR-BE-101，由固定 07 后端工程师执行一个 4 小时的后端基座单元；是否入场仍以当时的单步登记、输入哈希与工作树安全状态为准。

## 2. 权威输入与逐项哈希

| 输入 | 版本/状态 | SHA256 | 本拆解使用方式 |
|---|---|---|---|
| 根级重排计划：docs/04-four-project-release-completeness-replanning-plan.md | v1.0，已批准 | 96decb8f1835cc85bd530c21b2969d4d077f31e6086425ea911f9d5b187bbe26 | 继承本地真实优先、生产冻结和单步授权 |
| 共享 ADR：architecture/03-four-project-shared-boundary-adr.md | v1.0，已批准 | e3073a01ceda280b8dda4d77b58de7e9755d3f77d21f6ebb5497c8882508840a | 继承公共/私有/治理边界与共享契约约束 |
| PRD：docs/02-prd.md | v1.3，已批准 | 680a399c4984c443e7bf5f5c0aa0c628e919a061839d5659c3ddbc22ddf08705 | 继承真实输入、个人证据、来源、账号与数据权利 AC |
| UI：ui/12-release-completeness-ui-design-v1.7.md | v1.7，已批准 | 636d3fcecc3266b8cdc3234614dda68222f67294016d9f22129f87fd552d7fae | 作为前端实现参考；既有 UI 审核链保留 |
| 架构：docs/06-release-completeness-architecture.md | v1.0，已批准 | 0f6cebe45056ea5171805348f1ecc92bb5ac97b7ee3b6404aa4e05cfad9e6029 | Fastify、SQLite、私有域、七步来源门、测试与本地命令合同 |
| 来源白名单：docs/00-source-allowlist.md | 已批准研究输入 | 8e590b31a19b8d4aecd910561ebcc5ee5e423d1dc299ebc4c2d6e4379c3e607e | 只允许精确 endpoint、许可、robots 与最小字段边界 |
| 来源登记：docs/00-source-registry.csv | 已批准研究输入 | 43355d302df64a323e3ee6fe299530d72fd6df8a54bb4b24a06158a9f3621b06 | 固定 60 行 × 35 列、16 个 endpoint-policy 原子裁决 |
| 来源运行就绪报告：docs/00-source-runtime-readiness.md | 已批准条件性研究结论 | ee6f32549187ed51939a3b2c11accf4c9cd67b9e50d3c5fbcc70c29949536dbd | 固定 T=13、R=0、CAR-END-017 与 CR-CONN-002 的不可绕过条件 |

旧 docs/05-task-breakdown.md 是早期静态演示范围的历史产物，继续保留，不能改写、迁移或复用为本轮权威拆解。

## 3. 冻结事实、范围和不变量

| 事实/边界 | 本轮要求 |
|---|---|
| 当前实现 | 前端已有可浏览方向页与 Source Workbench 预览；backend 仅有 .gitkeep，尚无 package、源码、迁移、数据库、API、Worker 或后端测试。 |
| 私有正文 | 只进入 Career 私有域；不得进入公共研究库、CDN、Control、日志、trace、指标、URL、浏览器持久存储或其他用户。 |
| 输入合同 | 1–100000 Unicode；来源渠道与内容类型为独立双轴；保存模式为仅本次处理或保存私有档案；重复操作用幂等键和 revision/CAS 防重。 |
| 分析合同 | 必须实际读取正文；输出中文摘要、双轴建议、技术/岗位/证据候选、研究关系、依据与置信度；不确定时为 UNKNOWN，不许以 mock、静态句子或空成功冒充分析。 |
| 技术来源 | 13 个 P0/allow 技术 endpoint 可规划，分别为 CAR-END-001、003、004、007 至 016；未实施、未 canary、未 .REV/.QA、runtime_enabled=false。 |
| 招聘来源 | R=0；CAR-END-017 仍是 registry 外 conditional 候选，权利未解决；CR-CONN-002=blocked-not-instantiated。技术来源不能替代招聘分母。 |
| 网络与运行 | 连接器、canary、抓取、调度、runtime、live snapshot 都未授权；每次网络字节都须经过精确 NetworkRequestPermit 和七步门。 |
| 本地可用性 | 目标是本地真实稳定可用；必须有 loopback 服务、单一启动/停止/健康入口和局部失败隔离。当前不启动服务。 |
| 明确后置 | 生产部署、域名、DNS、CDN、证书、云资源、WAF、付费、外部账号、凭证和高可用均 deferred，不在任何本轮或默认下一站范围。 |

## 4. 授权、容量与伴随审核约定

### 4.1 全局 DoR

每个后续工作项启动前均须同时满足：

1. 本任务拆解及该工作项均已获单独、唯一、可追溯授权；
2. 其前置项及对应审核状态已经满足，权威输入 SHA 未漂移；
3. 目标路径没有其他角色重叠写入，工作树干净且无 Git 锁；
4. 仅使用项目内路径和根仓，不创建嵌套 Git，不夹带其他项目；
5. 涉及第三方、来源、账号、隐私、凭证、删除、外发或环境的任务已获得对应高风险具体授权。

### 4.2 全局 DoD

每个后续工作项交付时均须：

1. 只交付本项限定的文件、契约、测试和不含私密内容的验证证据；
2. 用户可见内容完整使用简体中文，含状态、错误、空态、键盘与读屏文案；
3. 不把 HTTP 200、seed_demo、静态快照、浏览器内存或测试 fixture 冒充真实 live 完成；
4. 执行适用 lint、typecheck、unit、contract、integration、security、E2E 或恢复检查，并记录真实未验证项；
5. 精确暂存、普通提交、普通推送，在本人固定角色任务报告并停在本项停止门。

### 4.3 持续 .REV/.QA 伴随门

下表每个会修改代码、迁移、脚本或自动化测试的原子项 X 都绑定两个尚未授权的衍生原子项：

| 衍生项 | Owner/工时 | 依赖与 DoR | DoD、验证、交付 | 停止门 |
|---|---|---|---|---|
| X.REV | 固定 09；1–4h | X 的精确提交、范围、契约和测试证据齐全 | 复核安全、隐私、来源、并发、错误真相态和 diff；P0/P1 未清零则 changes-requested，不得自动转 QA | code-review-conclusion-review |
| X.QA | 固定 10；1–4h | X.REV 通过，且测试输入/环境获准 | 执行正向和负向契约、集成、浏览器或恢复证据；失败如实阻断 | qa-delivery-review |

X.REV 与 X.QA 只是本计划中的伴随门，不是潜伏授权。任何一个未通过，都阻止其后续依赖项；没有任何任务会因本文通过而批量启动。

G-ALL-QA 是一个显式汇总门：第 6 节所有适用的代码、迁移、脚本和自动化测试工作项均已完成各自 X.REV 与 X.QA，且没有未解决 P0/P1。它只用于最终独立审查 CR-REV-101 的 DoR，不代表这些工作项可以并行或被自动授权。

G-PUBLIC-SNAPSHOT 是一个显式外部真相门：CR-SRC-104.QA 已通过，且当前公共 snapshot 的 policy、watermark、as_of、coverage 与 hash 可追溯。它可为分析和成长派生提供只读输入；它不是 live 声明，R=0、coverage 无效或 snapshot 不可用时仍必须返回 not_ready/UNKNOWN。

### 4.4 固定角色容量泳道

固定 07、08、06、09、10、11 各自 WIP=1。不同角色只可在文件范围不重叠、上游门已满足时并行；同一角色按下表依赖顺序串行。固定 04 的既有 UI 审核链不被本计划关闭或替代。

## 5. 唯一首项和里程碑

| 项目 | 决定 |
|---|---|
| 唯一候选首项 | CR-BE-101，固定 07，4h：后端 package、TypeScript strict、Fastify 进程骨架、未来命令入口与 health/readiness 最小真相态。 |
| 为何唯一 | backend 为空；它不需要来源、模型、招聘权利、账号凭证、生产资源或 UI 改写，并为所有 SQLite/API/前端联调任务提供唯一基础。 |
| 首项状态 | declared-not-authorized。本文通过前不得入场；本文通过也只可触发这一站，不能同时触发数据、前端、连接器或运维。 |
| M0 基础可测 | CR-BE-101 至 CR-BE-104、CR-DATA-101；后端命令能被真实验证，但业务与来源仍 not_ready。 |
| M1 私有真实输入 | CR-DATA-102/103、CR-BE-105 至 109；用户正文可按保存模式真实持久化或仅本次处理。 |
| M2 可解释本地分析 | CR-ANL-101 至 106；无模型/无证据时输出 UNKNOWN，不进入公网。 |
| M3 公共数据安全基座 | CR-SRC-101 至 105、CR-CONN-T01 至 T13 的代码与伴随门；runtime 仍 false。 |
| M4 真实前后端联调 | CR-FE-101 至 109；按 API 真相态逐步解灰，不满足来源门时保持 not_ready。 |
| M5 本地韧性与总验收 | CR-OPS-101 至 104、CR-REV-101、CR-QA-101 至 104；本地恢复和安全证据闭合。 |
| M6 生产冻结 | 仅形成未来条件与证据；DNS/CDN/云/证书/生产发布仍需新的具体授权。 |

## 6. 原子任务清单

所有行的状态均为 planned-not-authorized，并继承第 4 节全局 DoR/DoD 与 X.REV → X.QA 伴随门。表内“验证命令”均为未来实现后的目标命令，本轮没有执行它们。

### 6.1 A. 后端基础与 SQLite 基座

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-BE-101<br>固定07 · 4h | 本文通过；backend 为空；不要求外部来源、账号或固定 API 端口 | Node.js + TypeScript strict + Fastify 骨架；仅 loopback/测试端口；healthz 与明确 not_ready 的 readyz；不联网 | npm run lint/typecheck/build/test:unit；Fastify inject；backend/package.json、tsconfig、src/apps/api | 精确 Node patch/API port 尚 TBD；不得以 200 冒充 ready；atomic-delivery-review |
| CR-BE-102<br>固定07 · 3h | CR-BE-101.QA；本地端口/数据目录由配置显式提供 | dev/build/lint/typecheck/test 命令合同、配置校验、优雅启动停止；缺配置安全失败，不监听公网 | 命令契约与进程生命周期测试；backend/src/config、scripts | 默认端口或数据库路径不能静默冒充已批准生产参数；atomic-delivery-review |
| CR-DATA-101<br>固定08 · 3h | CR-BE-101.QA；架构的多库边界未漂移 | 建立 governance/public/private/seed/ledger 独立 migration manifest 与 checksum 规则；不选择未审 ORM 语义 | migration manifest fixture；backend/migrations、tests/fixtures | migration 不是业务数据库已上线；atomic-delivery-review |
| CR-BE-103<br>固定07 · 4h | CR-BE-102.QA、CR-DATA-101.QA；SQLite driver/query 层与架构兼容 | SQLite 连接工厂、WAL、foreign_keys、busy_timeout、事务边界与临时真实 SQLite 测试；库文件 gitignored | npm run test:integration；WAL/FK/并发忙等待负测；backend/src/infrastructure/sqlite | driver 未批准或跨库 ATTACH 一律停止；atomic-delivery-review |
| CR-BE-104<br>固定07 · 3h | CR-BE-103.QA | readyz 分列 schema、迁移、public/private/governance/ledger、worker 与删除 replay；缺任一依赖返回 not_ready | healthz/readyz contract tests；backend/src/health | 不能把 seed、空库或 transport 成功写成 ready；atomic-delivery-review |

### 6.2 B. 私有提交、版本、导出和删除

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-DATA-102<br>固定08 · 4h | CR-DATA-101.QA | 创建 Material、MaterialRevision、ClassificationRevision、ConsentReceipt、Operation 与 Idempotency 的私有 schema；正文与公共库物理隔离 | migration up/down 与 FK/unique fixture；backend/migrations/private | 正文进入 public/seed/governance 即 P0；atomic-delivery-review |
| CR-DATA-103<br>固定08 · 3h | CR-DATA-102.QA | 创建导出、tombstone、deletion_generation、restore anchor 与审计表；删除账本独立于私有库 | schema/ledger replay fixture；backend/migrations/ledger | 仅删 UI 或活动行均不算删除；atomic-delivery-review |
| CR-BE-105<br>固定07 · 3h | CR-BE-104.QA；Career 本地身份/会话/step-up 的未决输入已获得专门决定 | 实现独立 Career identity port、host-only session、租户复合边界与无 provider 时 not_ready；不复用 English/父域 Cookie | tenant isolation、CORS/CSRF、no-parent-cookie 负测；backend/src/modules/identity | 身份提供方、会话 TTL、密钥仍 TBD 时不得假造真实账号；atomic-delivery-review |
| CR-BE-106<br>固定07 · 4h | CR-BE-105.QA、CR-DATA-102.QA | POST materials:analyze 接收 1–100000 Unicode、双轴、权利确认、ephemeral/private_saved；URL-only 外部网络字节=0 | 长度/Unicode/XSS/URL-only/consent contract tests；backend/src/modules/material-intake | 自动 URL 抓取、静默保存或第三方外发均阻断；atomic-delivery-review |
| CR-BE-107<br>固定07 · 4h | CR-BE-106.QA | 用 idempotency_key、payload hash、revision、If-Match/If-None-Match 保存原文、元数据与操作历史；重启后不丢 | duplicate/restart/CAS conflict integration tests；private repositories/API | 同键异 payload 必须报 IDEMPOTENCY_KEY_REUSED；atomic-delivery-review |
| CR-BE-108<br>固定07 · 3h | CR-BE-107.QA | PATCH classification 写入候选、用户确认、纠正与历史，事实/提取/推断分层；用户招聘材料标 purpose_sample | revision history、cross-tenant、confirmed≠verified 负测；classification module | 用户确认不得提升公共事实；atomic-delivery-review |
| CR-BE-109<br>固定07 · 4h | CR-BE-108.QA、CR-DATA-103.QA；高风险导出/删除实施另获当时授权 | 实现异步 private no-store export 与删除状态机、撤权、tombstone、代际重放钩子；无授权不暴露执行端点 | export privacy、delete/retry/restore-ledger contract tests；sync-rights module | 删除、下载或账户权限均不能由本计划自动实际执行；atomic-delivery-review |

### 6.3 C. 实际正文驱动的本地分析

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-ANL-101<br>固定07 · 3h | CR-BE-107.QA | 建立分析 Operation 与持久化输入引用；每个输出可追溯 material revision，失败保留输入 | operation/restart/idempotency tests；backend/src/modules/material-analysis | 不能读取缓存示例替代本次正文；atomic-delivery-review |
| CR-ANL-102<br>固定07 · 3h | CR-ANL-101.QA | 纯本地文本规范化、段落切分与可回链的中文抽取式摘要；不能证实时输出 UNKNOWN | Unicode/HTML/empty/unknown fixtures；analysis/summary | 不引入外部模型、网络或无依据的生成文本；atomic-delivery-review |
| CR-ANL-103<br>固定07 · 3h | CR-ANL-102.QA | 输出来源渠道和内容类型双轴候选、证据偏移、置信度与用户确认状态 | dual-axis/offset/confidence fixtures；analysis/classification | 一个轴不能覆盖另一轴；atomic-delivery-review |
| CR-ANL-104<br>固定07 · 4h | CR-ANL-103.QA | 从实际正文提取技术、岗位、证据候选，标事实/提取/推断/未知与可解释依据 | extraction false-positive/PII/redaction fixtures；analysis/extraction | 不得把模型推断或关键词命中写成外部核验；atomic-delivery-review |
| CR-ANL-105<br>固定07 · 3h | CR-ANL-104.QA、G-PUBLIC-SNAPSHOT | 将候选与版本化公共 snapshot 比为新增、印证、重复、冲突、证据不足；无 snapshot 时如实 not_ready | relation/replay/unknown fixtures；analysis/relation | 私有材料不可改写公共事实；atomic-delivery-review |
| CR-ANL-106<br>固定07 · 3h | CR-ANL-105.QA | 可取消、可重试、跨重启恢复的操作状态；失败/限额/未就绪保持输入与真相态 | cancel/retry/restart fixtures；operation state module | 第三方模型仍默认 DENY，任何 provider/凭证/费用/隐私发送另列阻断选项；atomic-delivery-review |

### 6.4 D. 个人证据、差距、路线、历史和同步

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-GRW-101<br>固定07 · 4h | CR-BE-108.QA | 实现个人事实/证据 CRUD、来源/时间/贡献/可见性/确认与六态语义，支持 CAS | evidence revision、tenant isolation、semantic-state fixtures；personal-evidence module | 自述、系统评估、模型推断不得混写；atomic-delivery-review |
| CR-GRW-102<br>固定07 · 4h | CR-GRW-101.QA、G-PUBLIC-SNAPSHOT | 以公共 snapshot、目标、证据、规则四版本链生成可解释 gap；任一缺失则 UNKNOWN | missing-input/recompute/determinism tests；growth/gap | 不得生成竞争力分数或成功保证；atomic-delivery-review |
| CR-GRW-103<br>固定07 · 4h | CR-GRW-102.QA | 生成版本化 roadmap、future、history，并在证据删除/更正后带原因重算 | historical replay/delete-recompute fixtures；growth/roadmap | 历史不可原地覆盖；atomic-delivery-review |
| CR-GRW-104<br>固定07 · 4h | CR-GRW-103.QA；身份、会话和同步安全输入已解决 | 实现 sync delta、冲突 rebase、导出/删除关联状态；客户端时间不作 LWW 权威 | two-client/CAS/tombstone tests；sync-rights module | 未有真实账号与密钥边界时不得宣称跨设备完成；atomic-delivery-review |

### 6.5 E. 来源运行安全基座、快照与调度

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-SRC-101<br>固定07 · 3h | CR-BE-104.QA；registry/allowlist SHA 匹配 | 只读加载 policy bundle，逐 endpoint 复核 hash/decision/rights；invalid 或 conditional 条件不齐即 fail closed | 60×35、T13/R0、四态 decision fixtures；source-policy module | 该 loader 不改 registry，不启连接器；atomic-delivery-review |
| CR-SEC-101<br>固定07 · 4h | CR-SRC-101.QA | 实现每次 socket 前的 NetworkRequestPermit 与 SSRF/redirect/MIME/size/time/rate 负门；用户 URL 永远拒绝 | loopback/RFC1918/rebind/redirect/401/403/429 fixtures；acquisition permit module | permit 缺失时网络字节必须为 0；atomic-delivery-review |
| CR-DATA-104<br>固定08 · 4h | CR-DATA-101.QA、CR-SRC-101.QA | 增加 governance/public 的 observation、evidence、fetch run、水位、snapshot、manifest 与 pointer schema | migration/FK/hash/immutable snapshot fixtures；migrations/governance/public | 私有正文不得跨库 ATTACH 或写入 public；atomic-delivery-review |
| CR-SRC-102<br>固定07 · 4h | CR-SEC-101.QA、CR-DATA-104.QA | 实现精确 endpoint 的条件 GET、ETag/304、限流、超时、Retry-After、失败隔离与 fixture transport；不做真实 canary | no-network fixture、rate/retry/byte-budget tests；acquisition client | 401/403/login/captcha 不重试、不换身份；atomic-delivery-review |
| CR-SRC-103<br>固定07 · 4h | CR-SRC-102.QA | 规范化时间/技术/岗位/地区，保留 source/as_of/rights/policy/hash；去重只作可解释规则 | normalization/dedupe/fact-inference fixtures；research-evidence module | 当前时间不能填补未知发布时间；atomic-delivery-review |
| CR-SRC-104<br>固定07 · 4h | CR-SRC-103.QA | 以水位、coverage、as_of、裁剪、重聚合和 pointer CAS 发布不可变 snapshot；无 current_success 不发布 | snapshot replay/publish、all-source-failed、coverage shrink 负测；publishing module | seed/demo 或 canary 绝不进入 live 指针；atomic-delivery-review |
| CR-SRC-105<br>固定07 · 3h | CR-SRC-104.QA | 用 DB lease + fake clock 表达技术 6h、招聘每日、09:00 snapshot 的 due/missed/failed/no_change；R=0 时招聘调度 blocked | scheduler fake-clock/restart/missed fixtures；refresh worker | 不得补造过去成功或把 R=0 写成成功；atomic-delivery-review |

### 6.6 F. 13 个可规划技术 endpoint 适配器

以下每项均只实现对应精确 endpoint 的 fixture 适配器、字段白名单和关闭条件；没有单独 ExecutionAuthorization、同 revision canary、.REV、.QA、CoverageFreshnessPolicy 和 EnvironmentRuntimeRegistration 前，runtime_enabled 必须始终为 false。

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-CONN-T01<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-001 不漂移 | W3C News RSS 适配器，保留 GUID/date/license/link | 仅 fixture contract；connectors/car-end-001 | 权利/robots 变化即停；atomic-delivery-review |
| CR-CONN-T02<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-003 不漂移 | WHATWG GitHub API 适配器，最小 repo/commit/release metadata | 仅 fixture contract；connectors/car-end-003 | 不复制 spec/full repo；atomic-delivery-review |
| CR-CONN-T03<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-004 不漂移 | Chrome Releases Feed 适配器，版本/渠道/日期/链接 | 仅 fixture contract；connectors/car-end-004 | 不镜像文章或视觉资产；atomic-delivery-review |
| CR-CONN-T04<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-007 不漂移 | Node.js Releases API 适配器，tag/LTS/日期/链接 | 仅 fixture contract；connectors/car-end-007 | GitHub 限额/许可变化即停；atomic-delivery-review |
| CR-CONN-T05<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-008 不漂移 | React Releases API 适配器，release metadata only | 仅 fixture contract；connectors/car-end-008 | 不抓 asset/full text；atomic-delivery-review |
| CR-CONN-T06<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-009 不漂移 | Vue Core Releases API 适配器，含 prerelease 标记 | 仅 fixture contract；connectors/car-end-009 | prerelease 不可默认为趋势事实；atomic-delivery-review |
| CR-CONN-T07<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-010 不漂移 | Angular Releases API 适配器，最小版本字段 | 仅 fixture contract；connectors/car-end-010 | 不以 patch 变化推断市场需求；atomic-delivery-review |
| CR-CONN-T08<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-011 不漂移 | Svelte Releases API 适配器，最小版本字段 | 仅 fixture contract；connectors/car-end-011 | 许可/API 变化即停；atomic-delivery-review |
| CR-CONN-T09<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-012 不漂移 | Vite Releases API 适配器，最小版本字段 | 仅 fixture contract；connectors/car-end-012 | 不回退到非登记源；atomic-delivery-review |
| CR-CONN-T10<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-013 不漂移 | Next.js Releases API 适配器，保留 prerelease 状态 | 仅 fixture contract；connectors/car-end-013 | 403/超时不能绕过；atomic-delivery-review |
| CR-CONN-T11<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-014 不漂移 | Nuxt Releases API 适配器，最小版本字段 | 仅 fixture contract；connectors/car-end-014 | 不镜像 blog 正文；atomic-delivery-review |
| CR-CONN-T12<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-015 不漂移 | Astro Releases API 适配器，保留 package scope | 仅 fixture contract；connectors/car-end-015 | 许可/API 变化即停；atomic-delivery-review |
| CR-CONN-T13<br>固定07 · 2h | CR-SRC-102.QA；CAR-END-016 不漂移 | React Router Releases API 适配器，最小版本字段 | 仅 fixture contract；connectors/car-end-016 | 不将 release 元数据写为市场份额；atomic-delivery-review |

招聘连接器 CR-CONN-002 不进入可执行队列。它的 DoR 是至少一个命名公司/board/site 的 P0 allow 具体实例、权利审核结论、CR-PM-102 的 endpoint_id ↔ concrete_instance 映射、逐端点授权与独立 canary/.REV/.QA；在条件满足前，R=0、CR-CONN-002=blocked-not-instantiated，招聘视图只能诚实显示 not_ready。

### 6.7 G. 前端真实 API 联调与逐步解灰

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-FE-101<br>固定06 · 3h | CR-BE-104.QA；既有 UI 设计审核链未漂移 | 建立 API adapter 与 Research/Private/Operation 真相态模型；正式路径无 hardcoded demo 回退 | API envelope contract；frontend/src/api | UI 审核未通过时不改视觉结构；atomic-delivery-review |
| CR-FE-102<br>固定06 · 4h | CR-FE-101.QA、CR-BE-107.QA、CR-ANL-101.QA | Source Workbench 实际提交→保存模式/权利确认→后端 operation；正文不写 URL/Storage | browser submission/reload/privacy E2E；source-workbench feature | 静默保存/外发或浏览器预览回退即阻断；atomic-delivery-review |
| CR-FE-103<br>固定06 · 3h | CR-FE-102.QA、CR-ANL-105.QA | 显示中文摘要、双轴、提取、关系、依据、置信度及 unknown/retry 状态 | result truth-state/keyboard E2E；analysis result UI | 未就绪不能被渲染为“分析成功”；atomic-delivery-review |
| CR-FE-104<br>固定06 · 3h | CR-FE-103.QA、CR-BE-108.QA、CR-ANL-106.QA | 恢复、历史 revision、冲突 rebase、取消/失败可见；刷新后读取后端真相 | reload/CAS/retry E2E；history UI | 客户端时钟或本地缓存不能覆盖服务端 revision；atomic-delivery-review |
| CR-FE-105<br>固定06 · 4h | CR-FE-101.QA、CR-SRC-104.QA | directions→stacks 维持前两层，来源、时间、样本、coverage、truth 状态均来自 API | route/source/not_ready/stale E2E；public catalog UI | 静态研究不得冒充实时来源；atomic-delivery-review |
| CR-FE-106<br>固定06 · 4h | CR-FE-105.QA；R≥1、招聘 runtime/coverage/snapshot 全部真实通过 | 逐步解灰招聘证据、地区、层级、样本和缺失日；R 未达标时保持 not_ready | recruitment/live/degraded/zero-sample E2E；evidence UI | T=13 不得替代招聘数据；atomic-delivery-review |
| CR-FE-107<br>固定06 · 4h | CR-FE-104.QA、CR-GRW-103.QA | 个人证据、gap、roadmap、future、history 呈现四版本链与可推翻条件 | evidence/gap/unknown/recompute E2E；personal growth UI | 不得生成保证、分数或伪个人事实；atomic-delivery-review |
| CR-FE-108<br>固定06 · 4h | CR-FE-107.QA、CR-GRW-104.QA、CR-BE-109.QA | 接入 sync/export/delete 状态与确认，显示本地范围、错误、重试和删除进度 | privacy/delete/export/conflict E2E；data-rights UI | 高风险操作无单独授权不得实际执行；atomic-delivery-review |
| CR-FE-109<br>固定06 · 4h | CR-FE-105.QA 至 CR-FE-108.QA | 真实 API 全路径的简中、320px、200%、键盘、读屏、焦点、非颜色真相态收口 | browser E2E、a11y scan、人工键盘记录；frontend/a11y | 禁用入口、设计图或 HTTP 200 对完成率贡献为 0；atomic-delivery-review |

### 6.8 H. 本地可用性、审查与质量收口

| 任务 | 依赖及特定 DoR | DoD | 验证与候选交付 | 风险与停止门 |
|---|---|---|---|---|
| CR-OPS-101<br>固定11 · 3h | CR-BE-102.QA、CR-FE-101.QA；本地端口与命令合同已明确 | 设计并实现单一本地 start/stop/status/health 入口，前后端独立故障不互相伪绿 | loopback start/stop/status contract；根级/项目脚本候选 | 不创建云资源、不替换现有全项目监督器；atomic-delivery-review |
| CR-OPS-102<br>固定11 · 3h | CR-OPS-101.QA、CR-BE-104.QA | 常驻进程监督、日志定位和 health/readiness 聚合；一项失败显示局部影响 | stop/restart/partial-failure fixture；local service evidence | 日志不含正文、Cookie、Token 或完整 URL；atomic-delivery-review |
| CR-OPS-103<br>固定11 · 4h | CR-BE-109.QA、CR-DATA-103.QA | 以 SQLite online backup/隔离恢复、integrity/FK/hash/ledger replay 验证真实可恢复性 | npm run test:backup-restore；restore evidence | 不直接覆盖活动库；删除代际不符必须 fail closed；atomic-delivery-review |
| CR-OPS-104<br>固定11 · 3h | CR-OPS-102.QA、CR-SEC-101.QA | 形成本地 manifest、制品 SHA、结构化指标/日志白名单与未知运维参数清单 | manifest/hash/redaction checks；output/release-evidence 候选 | 不是生产部署或监控已配置声明；atomic-delivery-review |
| CR-REV-101<br>固定09 · 4h | G-ALL-QA（所有适用 X.QA 已通过）且 diff/证据完整 | 独立复核私有隔离、七步门、SSRF、CAS、删除恢复、真相态和前后端联调；P0/P1 未清零则阻断 | 重跑适用命令与差异审计；docs/06-code-review.md 候选 | 单一源或单测不代表发布完整；code-review-conclusion-review |
| CR-QA-101<br>固定10 · 4h | CR-REV-101 通过 | 后端/API/SQLite/迁移/幂等/CAS/重启与私有隔离测试 | unit/contract/integration/security evidence | HTTP 200 不能替代业务断言；qa-delivery-review |
| CR-QA-102<br>固定10 · 4h | CR-QA-101 通过 | 实际正文、unknown、关系、来源断连、重复提交、并发修改与重试端到端测试 | browser/API E2E evidence | mock 不能替代真实 local persistence；qa-delivery-review |
| CR-QA-103<br>固定10 · 4h | CR-QA-102 通过 | 完整简中、320px、200%、键盘、读屏、XSS/CSRF/SSRF/日志泄漏负测 | responsive/a11y/security evidence | 单靠自动扫描不宣称完全无障碍；qa-delivery-review |
| CR-QA-104<br>固定10 · 4h | CR-QA-103 通过、CR-OPS-103.QA 通过 | 备份/恢复、删除代际、来源失效、局部故障、manifest 与 P0/P1=0 总门 | recovery/release-evidence audit | 招聘 R=0 或 production TBD 时不能给全产品 live/production GO；qa-delivery-review |

## 7. 验收覆盖矩阵

| 用户要求 | 主要任务 | 必须出现的真实证据 |
|---|---|---|
| Fastify + SQLite/WAL/迁移、health/readiness、真实命令 | CR-BE-101 至 104、CR-DATA-101 | dev/build/lint/typecheck/test、migrations、健康与就绪分离 |
| 提交、私有保存、历史、导出/删除、跨重启 | CR-DATA-102/103、CR-BE-105 至 109 | 1–100000、双轴、consent、idempotency、CAS、tombstone、恢复证据 |
| 真实正文驱动分析 | CR-ANL-101 至 106 | 输入 revision、摘要/候选/依据、unknown、失败重试、零外发断言 |
| 合法网上真实数据 | CR-SRC-101 至 105、CR-CONN-T01 至 T13、CR-CONN-002 阻断槽 | source/time/rights/policy/hash、七步门、snapshot；R=0 时明确 not_ready |
| 前端真实联调与逐步解灰 | CR-FE-101 至 109 | 提交→保存→分析→回显→刷新→历史；API 真相态；前两层信息架构不变 |
| 备份恢复、并发、隐私、浏览器和无障碍 | CR-OPS-103、CR-QA-101 至 104 | restart、delete/recovery、source outage、320px、键盘、读屏、安全负测 |
| 本地常驻、启动/停止/健康、生产后置 | CR-OPS-101 至 104 | loopback 本地入口、局部失败隔离、manifest；无云/域名/CDN/部署动作 |

## 8. 已知阻断、风险和不作隐性假设

| 项目 | 当前事实 | 计划处理 |
|---|---|---|
| 招聘真实数据 | R=0；CAR-END-017 权利未解决；CR-CONN-002 未实例化 | 保留为硬阻断槽，不允许技术 endpoint 或假数据掩盖；满足条件后才重新进行单项计划/授权。 |
| CoverageFreshnessPolicy | UNKNOWN/0 approved | 不创建 runtime/live 或 coverage 分母；只允许 fixture 和 not_ready 真相态。 |
| 身份、session、step-up、加密/KMS | 架构列为 TBD | 私有保存/同步/导出/删除的真实执行必须先补齐专门输入；不得用共享 Cookie、默认密钥或伪账号绕过。 |
| 第三方模型 | provider、区域、留存、训练、成本与 consent 全部 UNKNOWN | 默认 DENY，发送数为 0；本地分析先走可解释路径；未来外发须单独用户授权。 |
| UI 设计链 | 既有 UI v1.7 路径和审核历史必须保留 | 前端只在审查通过的视觉/交互边界内实施；本任务不修改 UI 资产或关闭旧门。 |
| 生产环境 | 域名、DNS、CDN、证书、WAF、云资源、预算、on-call 全部 TBD | M6 仅记录证据需求；不创建资源、不部署、不切流。 |

## 9. 本轮计划工件验证与停止点

本轮仅验证任务拆解与 Career workflow 登记，预期检查：

1. 八份以上权威输入 SHA256 与本表逐项一致；
2. 60 个直接工作项均标 planned-not-authorized，直接工时均为 2–4 小时，且 CR-BE-101 是唯一无工作项依赖的候选首项；
3. 依赖只引用前置任务或显式外部硬门，无循环；每个代码/迁移/脚本/测试项都带 X.REV 和 X.QA 伴随门；
4. T=13、R=0、CAR-END-017、CR-CONN-002、runtime_enabled=false、live connectors=0、live snapshots=0 未被改写；
5. YAML/JSONL 解析、项目结构、Skill lock/漂移、Git 边界、精确 diff 和尾随空格检查通过；
6. 本轮不运行未来后端命令、不启动任何服务、不联网抓取、不修改 registry/allowlist、不生成数据库，也不部署。

本产物停在 task-breakdown-review。审核只判断该计划是否忠于已批准输入、是否能够把 Source Workbench 从标签页预览收敛为真实本地产品、是否保留来源与隐私硬门，以及是否只有一个可启动候选首项。

- 通过：仅允许按一跳规则登记 CR-BE-101；其余 59 个直接项和全部伴随门继续 planned-not-authorized。
- 修改：只按指定意见修订本拆解。
- 打回：保留现场，不启动任何下游。
