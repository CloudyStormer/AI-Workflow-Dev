# AI Model Radar 发布完整性权威任务拆解

> 版本：1.0
> 项目：`ai-model-radar`
> 工作项：`MR-PM-101`
> 变更编号：`plan-20260817-radar-release-completeness-task-breakdown-001`
> 产物：`artifact-radar-release-completeness-task-breakdown-001`
> 负责角色：固定 `02 项目经理`（`role-pm`）
> 入场审批：`approval-20260817-radar-release-completeness-task-breakdown-entry`
> 状态：`ready-for-review`
> 停止门：`task-breakdown-review`

## 1. 管理结论与授权边界

本文件把已经批准的发布完整性架构转为可审计的 **1–4 小时原子任务计划**。它是计划产物，不是开发、连接器、运行时或部署授权。

- **当前可执行开发工作项：0。** 本文件审核通过前，不路由任何数据、后端、前端、安全、QA 或运维角色。
- **唯一后续候选首项：`MR-DATA-001`，固定 `08 数据工程师`。** 它仅为 `proposed-first / planned-not-authorized`；除本文件通过外，仍需满足共享基线审批、无并发冲突和一次独立的固定 08 入场授权，才可开始。
- **`MR-PM-102` 不属于本轮。** 只有其未来独立获批，才可依据当时批准的精确 `endpoint_id` 生成每个来源的 `MR-CONN-NNN` 任务；不得把 22 个端点、组合束、模板 URL 或 `AIR-END-030` 提案提前视作已分派连接器。
- `docs/05-task-breakdown.md` 是历史静态演示范围。本文件不覆盖、不替代、不复用该旧产物的审批链。
- 生产继续冻结。任何域名、凭证、付费、环境、采集、canary、`runtime_enabled=true`、live 快照或部署都需要其自身的明确审批。

## 2. 权威输入与逐项 SHA256

| 输入 | 路径 | SHA256 | 本拆解使用方式 |
|---|---|---|---|
| 四项目重排计划 | `../../docs/04-four-project-release-completeness-replanning-plan.md` | `96decb8f1835cc85bd530c21b2969d4d077f31e6086425ea911f9d5b187bbe26` | 角色容量、持续 `.REV/.QA` 门与本轮 `MR-PM-101` 边界 |
| 共享边界 ADR | `../../architecture/03-four-project-shared-boundary-adr.md` | `e3073a01ceda280b8dda4d77b58de7e9755d3f77d21f6ebb5497c8882508840a` | 共享契约、五类地址、生产冻结与独有边界 |
| 发布完整性架构 | `docs/06-release-completeness-architecture.md` | `1529a866855eb1b5cbf34b349d38a7e2f50be8c8f914aeb7f8ed114fd2d99c10` | 本任务的唯一技术与验证约束来源 |
| 产品 PRD | `docs/02-prd.md` | `3ce842ef8e2b9661f2114b3b4a2b3361eeb8fac0f98a5071cd8e27c38a81a020` | 业务时间、事件、来源、趋势与真相态需求 |
| 发布完整性附录 | `docs/02-prd-release-completeness-appendix.md` | `a27cfecc196c29749387302a692d93af0b5b534af7da6805b6b297e064133f1d` | 完整 P0、真实数据、简中、恢复和完成门 |
| 已批准 UI 设计 | `ui/05-release-completeness-ui-design.md` | `a731232994db118117043aa50503273c91e5c438bc20f948d9e5137e43ba9324` | 页面、状态、响应式、键盘与读屏验收输入 |
| 来源白名单 | `docs/00-source-allowlist.md` | `9aa9bb926cc52aae28d11bbf676507ca313add83238cd81be6300a4d9f2f0498` | 官方优先、四态来源政策、权利和 fail-closed 条件 |
| 来源 registry | `docs/00-source-registry.csv` | `c303e79e1fa9f7a1664ac718a1678bbcb6610b5309a5d5e4006e6d4b1d438f91` | 当前批准端点集合与原子来源身份 |
| 来源运行可行性 | `docs/00-source-runtime-readiness.md` | `c59c0647204caa63b4ac9acc9f229dfab22c8b239b4b844a957c1e065681649f` | `AIR-END-030` 提案、NO-GO 与运行前置门 |

## 3. 冻结事实、真相边界与明确不做项

以下事实贯穿每一个后续任务的 DoR、DoD 和测试夹具；任何实现不得修改其含义：

| 冻结项 | 当前事实 | 对任务计划的约束 |
|---|---|---|
| 批准的 P0/allow 原子端点 | `N=22` | 必须逐 endpoint 建立证据与映射；本文件不生成其连接器队列 |
| `AIR-END-030` | `pending-not-in-registry-not-counted` | 不装载、不计入 N、不产生 `MR-CONN-*` 或运行权限 |
| 来源研究审批 | `research-only` | 不等于执行授权、canary、连接器或数据采集许可 |
| 运行时 | `runtime_enabled=false` | 不得以配置、HTTP 200、canary 或开发夹具推导为 true |
| 已连接来源 / live 快照 | `live_connectors=0`；`live_snapshots=0` | UI、API 和测试不得称实时、已连接或有真实日报 |
| 覆盖新鲜度策略 | `CoverageFreshnessPolicy=UNKNOWN/0 approved` | 阻断环境登记、runtime/live RefreshRun、live 发布与 live readiness；不为其擅定数值 |
| 生产 | `frozen` | 只可规划不可执行的制品、回滚输入和 NO-GO；不得部署或改基础设施 |

本轮不写业务代码、数据库、worker、服务、测试环境、来源 registry、来源政策或审批；不启动服务、不联网采集、不部署，也不改变旧 UI/前端待审门。

## 4. 依赖符号、容量与一跳规则

| 符号 | 含义 |
|---|---|
| `G0` | 本 `MR-PM-101` 任务拆解经 `task-breakdown-review` 明确批准；不自动等同下游入场 |
| `G1` | `XR-DATA-001`、`XR-QA-001`、`XR-SEC-001` 分别形成并获批；当前不得假定已完成 |
| `G2` | 对应工作项已获一次独立角色入场授权，且工作树无重叠、无 Git 锁 |
| `G3` | 对应精确 endpoint 已完成来源政策、执行授权和 `MR-PM-102` 的 `endpoint_id ↔ task_id` 映射 |
| `G4` | 对应 endpoint 已按同 revision 完成 canary、`.REV`、`.QA` 与获批环境登记；当前全部未满足 |
| `G5` | 本表 46 个实现原子的 `.QA` 均已通过；它是整体审查/发布证据入口，不是对下游的批量授权 |
| `V-ARCH` | 将候选交付逐项映射到批准架构、PRD、发布附录和 UI 设计；缺项不得补造 |
| `V-IMPL` | 仅在后续架构已登记且实际存在的 lint、typecheck、unit、contract、integration、migration/restore 命令上执行；当前后端命令均 `NOT_IMPLEMENTED`，不得伪报通过 |
| `V-GIT` | `scripts/check-git-boundary.sh`、精确 diff、敏感信息扫描、`git diff --check`、`HEAD==origin/main` 与干净工作树检查 |

固定 `06/07/08/09/10/11` 各自 WIP=1。每个实现原子交付、审查和 QA 都重新停门；通过一次最多让一个明确、输入完整且非高风险的相邻工作单元入场。

```mermaid
flowchart LR
  P["MR-PM-101 任务拆解审核"] --> G0["G0：计划获批"]
  G0 --> X["G1：共享数据 / 安全 / QA 基线逐件获批"]
  X --> D["数据与治理基础"]
  D --> Q["MR-PM-102：未来独立端点排程（本轮排除）"]
  Q --> C["G3 / G4：逐 endpoint 七步授权"]
  C --> B["处理、刷新、查询 API"]
  B --> F["完整简中前后端联调"]
  F --> A["整体验证、恢复与制品证据"]
  A --> N["生产仍冻结；另需明确授权"]
```

## 5. 原子交付的持续 `.REV/.QA` 伴随门

下面标为“实现原子”的 `MR-DATA-*`、`MR-BE-*`、`MR-FE-*` 和 `MR-OPS-*` 共 **46 项 / 159 小时**，每一项都自动派生两个同一范围的计划任务；派生任务不是当前授权。

| 派生任务 | owner / 工时 | DoR | DoD、验证与停止门 |
|---|---:|---|---|
| `<ID>.REV` | 固定 `09` / 2h | `<ID>` 已完成自测，且该原子交付得到明确审核通过 | 只审该原子 diff、同一 revision、架构/安全/来源真相边界和实际证据；P0/P1/P2 明确登记；停 `code-review-conclusion-review` |
| `<ID>.QA` | 固定 `10` / 2h | `<ID>.REV` 结论已获通过且 P0/P1=0 | 只测该原子契约、反例、回归和可追溯证据；停 `atomic-qa-review`；失败只返回原 owner 的同一原子修复 |

因此，实施计划包含 **50 个直接计划项 / 175 小时**、**92 个伴随门 / 184 小时**，合计 **142 个计划项 / 359 小时**。此估算不包括尚未获批的 22 个 endpoint 专属连接器任务及其伴随门，不能被解释为完整来源覆盖已经排程。

## 6. 里程碑与验收口径

| 里程碑 | 入口条件 | 目标 / 完成口径 | 不得声称 |
|---|---|---|---|
| M0 计划与共享前置 | 本文审核，`G0/G1` 逐件满足 | 唯一候选首项与共享基线明确、无越权路由 | 已经开始实现或来源已接入 |
| M1 数据与治理基础 | `MR-DATA-001..009` 及各自 `.REV/.QA` | 四态 policy、三库隔离、治理证据、迁移与恢复契约 fail-closed | `runtime_enabled=true` 或 live 可用 |
| M2 endpoint 执行链 | `MR-PM-102` 独立批准，逐 endpoint `G3/G4` | 每个纳入端点能按七步形成同 revision 证据 | 一个首源或 canary 等于 N=22 |
| M3 真实管线与发布 | M1/M2 合格 | 取数、证据、去重、排序、调度、快照、失败保旧和 API 契约可验证 | 仅 HTTP 200 即完整 |
| M4 完整简中联调 | M3 合格且 UI 输入未漂移 | Today、全部、趋势、详情、版本、开源、来源、质量、刷新和全真相态可验收 | 静态 / `seed_demo` 回退等于 live |
| M5 质量、恢复与非生产证据 | 全部原子 `.QA` 与整体审查通过 | P0/P1=0、恢复/回滚、可观测性、可追溯制品和 release gate 证据完整 | 生产已获授权 |
| M6 生产门 | M5 全部 PASS 且另有生产具体授权 | 仅可提出生产 GO/NO-GO 申请 | 自动发布、DNS/CDN/证书或云资源变更 |

## 7. 权威原子任务清单

所有“交付路径”都是后续获批实现时的候选路径，不构成本轮写入授权。所有任务的状态均为 `planned-not-authorized`，除非未来在对应工作项中另行登记。

### 7.1 数据、治理与持久化基础（固定 08）

| ID / 工时 / owner | 依赖与输入 | DoR | DoD | 验证 | 候选交付 / 风险 | 本项停止门 |
|---|---|---|---|---|---|---|
| `MR-DATA-001` · 4h · 固定08 | `G0,G1,G2`；批准 registry | policy 四态、N=22 与 `AIR-END-030` 事实可复算 | 装载 `allow/conditional/manual_only/disabled`；非法、组合束、模板和未知字段 fail-closed | 四态、重复 ID、组合束、AIR-END-030 负向 fixture；`V-IMPL` | `backend/src/policy/*`；风险：研究输入被当运行许可 | `atomic-delivery-review` |
| `MR-DATA-002` · 3h · 固定08 | `MR-DATA-001.QA` | 精确 endpoint 字段与 registry SHA 已冻结 | 生成内容寻址 bundle，保留 approval/commit/SHA；不以可变 CSV 作开关 | canonical JSON/SHA、URL 字段、空 endpoint 反例 | `backend/src/policy/bundle*`；风险：bundle 身份漂移 | `atomic-delivery-review` |
| `MR-DATA-003` · 4h · 固定08 | `MR-DATA-002.QA` | 七步对象与同 revision tuple 已批准 | 建立 `ExecutionAuthorization`、`ConnectorRevision`、`CanaryEvidence` 追加式持久化与 FK | 同 tuple/过期/撤销/不同 revision 反例 | `backend/migrations/*`；风险：研究审批替代执行审批 | `atomic-delivery-review` |
| `MR-DATA-004` · 4h · 固定08 | `MR-DATA-003.QA` | 环境登记和审计契约可复算 | 建立登记追加链、AuditRecord 与唯一 active 约束；不允许自动 latest | 双启用、supersede、撤销、跨环境反例 | `backend/src/governance/*`；风险：旧登记继续运行 | `atomic-delivery-review` |
| `MR-DATA-005` · 4h · 固定08 | `MR-DATA-004.QA` | 规范化 active set 定义已固定 | 现场复算 `H_calc`，要求与 DB head、外部 anchor 三方相等后才允许治理写 | 篡改链、缺 head、三方不等时 0 写 / 0 permit | `backend/src/governance/active-set*`；风险：异常集合被重锚定 | `atomic-delivery-review` |
| `MR-DATA-006` · 3h · 固定08 | `MR-DATA-005.QA` | anchor 权限与 CAS 接口有获批实现输入 | 建立单调 rollback anchor、generation/audit/revocation head 的候选适配层 | 旧 generation、缺 anchor、CAS 冲突反例 | `backend/src/governance/anchor*`；风险：旧备份复活授权 | `atomic-delivery-review` |
| `MR-DATA-007` · 4h · 固定08 | `MR-DATA-006.QA` | 模式边界与 DB 路径/权限已获批 | 建立 `governance/live/seed/local_user` 物理隔离、模式路由与跨库拒绝 | cross-mode read/write/restore 负测 | `backend/src/persistence/modes*`；风险：demo 污染 live | `atomic-delivery-review` |
| `MR-DATA-008` · 4h · 固定08 | `MR-DATA-007.QA` | Event/Evidence/Claim 时间与审计字段已冻结 | 建立 Observation、Evidence、Claim、Event、Revision 的最小 schema 和 hash 链 | 时区、未来时间、缺证据、版本回放反例 | `backend/migrations/*`；风险：不可追溯事实 | `atomic-delivery-review` |
| `MR-DATA-009` · 3h · 固定08 | `MR-DATA-008.QA` | snapshot、watermark、coverage policy 的输入稳定 | 建立 PublishedSnapshot、watermark、manifest、CoverageFreshnessPolicy 的迁移与空库路径 | up/down、空库、policy UNKNOWN、跨 bundle 反例 | `backend/migrations/*`；风险：用默认策略发布 live | `atomic-delivery-review` |

### 7.2 后端处理、API、安全与恢复（固定 07）

| ID / 工时 / owner | 依赖与输入 | DoR | DoD | 验证 | 候选交付 / 风险 | 本项停止门 |
|---|---|---|---|---|---|---|
| `MR-BE-001` · 3h · 固定07 | `MR-DATA-009.QA,G2` | 选项仅采用批准架构，不补选新技术 | 建立最小配置加载、127.0.0.1 默认绑定和 fail-closed 缺配置行为 | 缺配置/非法环境/无秘密日志反例 | `backend/src/config*`；风险：默认生产或秘密泄露 | `atomic-delivery-review` |
| `MR-BE-002` · 2h · 固定07 | `MR-BE-001.QA` | 进程与存储健康定义明确 | 区分 `/health/live` 与 `/health/ready`；ready 不得因 HTTP 200 冒充 live | 进程活但 DB/policy/snapshot 不就绪反例 | `backend/src/http/health*`；风险：健康混淆 | `atomic-delivery-review` |
| `MR-BE-003` · 3h · 固定07 | `MR-BE-002.QA` | 三类信封与错误码表可用 | 实现 Content/User/Operation 信封及最小安全错误映射 | 错误 scope、mode、禁止细节泄露 fixture | `backend/src/contracts/*`；风险：信封串域 | `atomic-delivery-review` |
| `MR-BE-004` · 3h · 固定07 | `MR-BE-003.QA` | 唯一 `local-owner` 语义和写 API 边界已批准 | 增加本地主体、Host/Origin、CORS/CSRF 和幂等请求前门，不设计新管理员 | 匿名写、父域 Cookie、`*` credentials 反例 | `backend/src/security/*`；风险：公开写能力 | `atomic-delivery-review` |
| `MR-BE-005` · 3h · 固定07 | `MR-BE-004.QA,MR-DATA-007.QA` | canary/runtime 和数据库模式可区分 | 按前缀先路由 request mode/data mode；拒绝跨模式 run/fetch/cancel | `cny_`/`live_` 错库、含混 ID 反例 | `backend/src/runtime/router*`；风险：canary 冒充 live | `atomic-delivery-review` |
| `MR-BE-006` · 4h · 固定07 | `MR-BE-005.QA,MR-DATA-002.QA` | 精确 endpoint policy 可读且 `runtime_enabled=false` | 实现 scheme/host/port/path/query 精确匹配与 URL 标准化；未授权 URL 0 网络字节 | template、组合束、跨域、query 注入反例 | `backend/src/fetch/endpoint-gate*`；风险：SSRF 越界 | `atomic-delivery-review` |
| `MR-BE-007` · 4h · 固定07 | `MR-BE-006.QA` | 网络边界、重定向和 MIME 限制已冻结 | 实现 DNS/IP、redirect、响应字节/压缩/MIME 前门，拒绝 loopback/私网/metadata | DNS rebind、私网、跨域 redirect、超限反例 | `backend/src/fetch/network-gate*`；风险：内网访问 | `atomic-delivery-review` |
| `MR-BE-008` · 3h · 固定07 | `MR-BE-007.QA` | 来源最小字段、限频和保旧策略可读 | 实现条件请求、超时、429/Retry-After、有限退避和内容哈希；失败不清旧数据 | 304、200 same hash、429、401/403、timeout 反例 | `backend/src/fetch/client*`；风险：绕过来源约束 | `atomic-delivery-review` |
| `MR-BE-009` · 4h · 固定07 | `MR-BE-008.QA,MR-DATA-008.QA` | 外部正文被标为不可信 | 仅解析允许字段，隔离脚本/提示注入/超限正文，保留 parser revision | 恶意 HTML、未来时间、缺字段、危险链接反例 | `backend/src/parse/*`；风险：不可信内容执行 | `atomic-delivery-review` |
| `MR-BE-010` · 4h · 固定07 | `MR-BE-009.QA` | Observation/Evidence/Claim schema 可写 | 规范化事实、厂商观点、推断和未知，保留 source/as_of/hash/许可证 | golden fixture、缺主源、错误时区反例 | `backend/src/pipeline/normalize*`；风险：推断冒充事实 | `atomic-delivery-review` |
| `MR-BE-011` · 3h · 固定07 | `MR-BE-010.QA` | 实体、版本、动作字段完整 | 实现硬键去重与相似候选；不同 version/tag/action 不强合并 | 同 URL、镜像、跨语言、相邻版本反例 | `backend/src/pipeline/dedup*`；风险：误合并历史 | `atomic-delivery-review` |
| `MR-BE-012` · 4h · 固定07 | `MR-BE-011.QA` | 准入规则与 0–20 边界可读 | 实现主源硬门、排序规则版本、单厂商约束和可解释分项 | 0/20、主源缺失、紧急项、重放反例 | `backend/src/pipeline/rank*`；风险：黑盒排序 | `atomic-delivery-review` |
| `MR-BE-013` · 4h · 固定07 | `MR-BE-012.QA,MR-DATA-009.QA,G2` | CoverageFreshnessPolicy 契约已冻结；实际策略仍可为 UNKNOWN | 校验 eligible/required/count/ratio/stale/hash/环境一致性；UNKNOWN/无效策略硬阻断 runtime/live，不擅定数值 | 空 eligible、跨 bundle、UNKNOWN、阈值/哈希不符反例 | `backend/src/coverage/*`；风险：缩小分母发布 | `atomic-delivery-review` |
| `MR-BE-014` · 3h · 固定07 | `MR-BE-013.QA,G2` | 幂等和七态契约可用；当前无 enabled source 是合法事实 | 创建幂等 RefreshRequest/RefreshRun，公开 GET 不得触发采集；无 enabled source 返回真实 not-ready | duplicate key、无 enabled source、公开调用反例 | `backend/src/refresh/request*`；风险：重复采集 | `atomic-delivery-review` |
| `MR-BE-015` · 4h · 固定07 | `MR-BE-014.QA` | 七态状态机与同库 FK 可用 | 增加 lease、safe cancel point、publication fence 与 `refresh_run_id` 取消语义 | re-entry、fetch ID 取消、fence 后取消反例 | `backend/src/refresh/state*`；风险：半发布 | `atomic-delivery-review` |
| `MR-BE-016` · 4h · 固定07 | `MR-BE-015.QA` | 调度频率、时区与权限已被批准 | 实现时区明确 scheduler、遗漏补偿、退避和重启恢复；不设生产 cron | fake clock、missed run、lease 接管反例 | `backend/src/scheduler/*`；风险：停机漏报 | `atomic-delivery-review` |
| `MR-BE-017` · 3h · 固定07 | `MR-BE-016.QA` | Watermark/snapshot schema、known-at 顺序可用 | 形成逐源水位、current_success 门与共同 `as_of`；全继承不得发布 | attempted=false、future-effective、全失败反例 | `backend/src/publish/watermark*`；风险：旧数据冒充今日 | `atomic-delivery-review` |
| `MR-BE-018` · 4h · 固定07 | `MR-BE-017.QA` | 规则、证据、排序都可重放 | 原子发布 immutable snapshot/current pointer；失败保留上一有效快照 | CAS 冲突、失败事务、重复 publish 反例 | `backend/src/publish/snapshot*`；风险：指针半切换 | `atomic-delivery-review` |
| `MR-BE-019` · 3h · 固定07 | `MR-BE-018.QA` | ContentEnvelope、snapshot/cursor 契约可用 | 提供 today/events 搜索、筛选、稳定排序和绑定 snapshot 的 cursor 分页 | 分页无重漏、query hash、snapshot changed 反例 | `backend/src/http/radar-list*`；风险：刷新越权 | `atomic-delivery-review` |
| `MR-BE-020` · 4h · 固定07 | `MR-BE-019.QA` | Event revision 与 trend fields 完整 | 提供详情、版本演进、开源专题和证据/未知态查询 | 修订/撤回、license unknown、版本关系反例 | `backend/src/http/radar-detail*`；风险：关系臆测 | `atomic-delivery-review` |
| `MR-BE-021` · 3h · 固定07 | `MR-BE-020.QA` | source policy 与水位/coverage 可读 | 提供来源、质量和刷新详情只读 API；不暴露策略秘密或采集写入口 | not_ready/stale/degraded/forbidden refresh 反例 | `backend/src/http/radar-quality*`；风险：质量幻觉 | `atomic-delivery-review` |
| `MR-BE-022` · 3h · 固定07 | `MR-BE-004.QA,MR-BE-021.QA` | local_user 物理库与 deletion generation 可用 | 实现偏好、互动、导出/删除和 If-Match；不改变公共事件 | A/B、CAS、tombstone、导出字段反例 | `backend/src/http/preferences*`；风险：删除复活 | `atomic-delivery-review` |
| `MR-BE-023` · 4h · 固定07 | `MR-BE-018.QA,MR-BE-021.QA` | 所有业务 ID 与安全字段已确定 | 结构化脱敏日志、来源/管线/发布/查询指标；未知指标保持 null/UNKNOWN | secret/query/body 漏洞扫描、标签高基数反例 | `backend/src/observability/*`；风险：日志泄露 | `atomic-delivery-review` |

### 7.3 完整简体中文前端联调（固定 06）

| ID / 工时 / owner | 依赖与输入 | DoR | DoD | 验证 | 候选交付 / 风险 | 本项停止门 |
|---|---|---|---|---|---|---|
| `MR-FE-001` · 3h · 固定06 | `MR-BE-003.QA,MR-BE-019.QA,G2` | API 信封和 UI 设计均未漂移 | 建立 API adapter 与 truth-state model；正式 `live` 路径没有 hardcoded demo 回退 | adapter contract、`live/seed_demo` 隔离反例 | `frontend/src/api/*`；风险：演示静默回退 | `atomic-delivery-review` |
| `MR-FE-002` · 3h · 固定06 | `MR-FE-001.QA` | UI 设计与完整简中文案输入可用 | 完成应用壳、导航、全局真相栏、空/未就绪/陈旧/降级/失败状态 | 路由、文案、状态不只靠颜色 fixture | `frontend/src/app/*`；风险：HTTP 200 冒充可用 | `atomic-delivery-review` |
| `MR-FE-003` · 4h · 固定06 | `MR-FE-002.QA,MR-BE-019.QA` | Today contract 已稳定 | Today 读取真实 API，展示来源、`as_of`、freshness 与真实 0 条解释 | Today live/empty/not_ready/stale E2E | `frontend/src/features/today/*`；风险：旧闻凑榜 | `atomic-delivery-review` |
| `MR-FE-004` · 4h · 固定06 | `MR-FE-003.QA,MR-BE-019.QA` | events/cursor/search 契约稳定 | 全部事件、搜索、筛选、排序、分页及表格等价文本可用 | 搜索/分页/snapshot changed/320px E2E | `frontend/src/features/events/*`；风险：趋势被称总体 | `atomic-delivery-review` |
| `MR-FE-005` · 3h · 固定06 | `MR-FE-004.QA` | Trends contract 有样本边界字段 | 7/30/90 日图表与等价表，显示样本、覆盖、缺失日、规则版本 | no-data/partial/stale/trend boundary E2E | `frontend/src/features/trends/*`；风险：误称市场份额 | `atomic-delivery-review` |
| `MR-FE-006` · 3h · 固定06 | `MR-FE-004.QA,MR-BE-020.QA` | 详情、证据、revision 契约稳定 | 事件详情展示原文链接、发布时间、证据、事实/推断、修订/撤回 | evidence missing/unsafe link/revision E2E | `frontend/src/features/detail/*`；风险：不可信内容执行 | `atomic-delivery-review` |
| `MR-FE-007` · 3h · 固定06 | `MR-FE-006.QA` | 开源语义与版本字段稳定 | 开源/开放权重/source-available、license/unknown、tag/commit 和行动可见 | open-status/unknown-version E2E | `frontend/src/features/open-source/*`；风险：开源语义混淆 | `atomic-delivery-review` |
| `MR-FE-008` · 3h · 固定06 | `MR-FE-002.QA,MR-BE-021.QA` | sources/quality/refresh status 契约稳定 | 展示来源政策轴×runtime轴、覆盖/失败原因与刷新详情；不增加刷新写入口 | disabled/conditional/stale/failed E2E | `frontend/src/features/sources/*`；风险：UI 暗示可强刷 | `atomic-delivery-review` |
| `MR-FE-009` · 3h · 固定06 | `MR-FE-008.QA,MR-BE-022.QA` | 本地用户接口和删除确认语义稳定 | 接入偏好/反馈/导出/删除确认，明确本地范围与失败/重试 | If-Match、删除确认、无权限、导出 E2E | `frontend/src/features/preferences/*`；风险：误报跨设备 | `atomic-delivery-review` |
| `MR-FE-010` · 4h · 固定06 | `MR-FE-003.QA,MR-FE-004.QA,MR-FE-005.QA,MR-FE-006.QA,MR-FE-007.QA,MR-FE-008.QA,MR-FE-009.QA` | 所有 P0 页面与状态已可访问 | 完成 320px、200% 缩放、键盘、读屏、焦点和中文错误/空态的全路径修正 | 320px、200%、键盘、读屏、非颜色 E2E | `frontend/src/a11y/*`；风险：只修视觉不修语义 | `atomic-delivery-review` |
| `MR-FE-011` · 4h · 固定06 | `MR-FE-010.QA,MR-BE-023.QA` | 全路由有真实 truth-state | 完成前后端真相态联调，删正式路径静态回退；保留显式 `seed_demo` 隔离 | full-route live/seed/empty/degraded E2E | `frontend/src/integration/*`；风险：seed 进入完成证据 | `atomic-delivery-review` |

### 7.4 非生产运维证据、整体审查与 QA（固定 11 / 09 / 10）

| ID / 工时 / owner | 依赖与输入 | DoR | DoD | 验证 | 候选交付 / 风险 | 本项停止门 |
|---|---|---|---|---|---|---|
| `MR-OPS-001` · 3h · 固定11 | `G5`；环境参数已知或显式 UNKNOWN | 构建/配置版本、制品 SHA 与来源版本可追溯 | 生成非生产 release manifest 模板与未知项清单；不创建资源 | manifest ↔ artifact SHA、UNKNOWN 非空检查 | `output/release-evidence/*`；风险：把模板当部署 | `atomic-delivery-review` |
| `MR-OPS-002` · 3h · 固定11 | `MR-OPS-001.QA`；批准的备份/回滚输入 | 定义应用、数据、policy 的可恢复验证步骤；生产动作=0 | restore drill plan / rollback input review | `architecture/` 或 `output/` 候选；风险：缺真实恢复证据 | `atomic-delivery-review` |
| `MR-OPS-003` · 4h · 固定11 | `MR-OPS-002.QA`；另有非生产环境授权 | 在获批隔离环境做只读/可恢复性预检，不做生产 DNS/CDN/部署 | health/readiness、manifest、backup/rollback 演练证据 | 非生产 evidence；风险：环境参数 TBD | `atomic-delivery-review` |
| `MR-REV-101` · 4h · 固定09 | `G5`；集成 diff 证据完整 | 复核跨原子来源合规、SSRF、治理、调度、真相态和安全边界 | 重跑适用 `V-IMPL`，P0/P1 分级 | `docs/06-code-review.md` 候选；风险：整合缺陷 | `code-review-conclusion-review` |
| `MR-QA-101` · 4h · 固定10 | `MR-REV-101` 通过且 P0/P1=0 | 覆盖逐 endpoint 七步、N=22、刷新/调度/快照和重启恢复 | coverage=100%、时钟/恢复 E2E | QA evidence；风险：单源冒充覆盖 | `qa-delivery-review` |
| `MR-QA-102` · 4h · 固定10 | `MR-QA-101` 通过 | 覆盖全 API/UI 路由、空榜、陈旧、降级、失败、live/demo 隔离 | API/UI 全路由 E2E | QA evidence；风险：禁用入口漏检 | `qa-delivery-review` |
| `MR-QA-103` · 4h · 固定10 | `MR-QA-102` 通过 | 覆盖安全负测、简中、a11y、性能、日志、备份/回滚与全部 P0 AC | P0/P1=0、must_fix=0、AC 追踪闭合 | QA/release evidence；风险：HTTP 200 代替验收 | `qa-delivery-review` |

## 8. 来源连接器与运行时的独立硬门

`MR-CONN-NNN` 不在本文件生成。未来 `MR-PM-102` 获批后，必须对每一个实际合格的 `endpoint_id` 单独创建 1–4 小时任务，并满足以下次序：

1. 精确 endpoint 已存在于批准 registry，`conditional` 的每项条件有证据；`manual_only/disabled` 永不自动执行。
2. 对同一 `source_id + policy_revision + connector_revision + environment_id` 有独立 `ExecutionAuthorization`。
3. 实现生成不可变 `ConnectorRevision`，但仍为 `runtime_enabled=false`。
4. 仅获批 canary 运行；canary 不能形成 live 水位、快照、指针、readiness 或覆盖分母。
5. 同 revision `.REV` 结论 P0/P1=0。
6. 同 revision `.QA=PASS`。
7. 有已批准、非 UNKNOWN 的 `CoverageFreshnessPolicyVersion` 后，才可形成一次精确环境登记；随后才可能 `runtime_enabled=true`。

任何缺步、证据变更、条款/robots/host 变化、401/403、持续 429、跨域、bundle/hash 不一致或 active set 三方不一致，都保持 fail-closed。`AIR-END-030` 在 policy、registry、N 和未来端点映射同步批准前，继续被排除。

## 9. 发布完整性覆盖映射

| 发布能力 / AC 组 | 主要计划项 | 完成时必须看到的真实证据 |
|---|---|---|
| 今日、全部、搜索、筛选、分页（AC-AMR-REL-01..03） | `MR-BE-019`、`MR-FE-003..004`、`MR-QA-102` | 真实 API、真实 snapshot、0 条解释、无禁用入口 |
| 证据、详情、版本、开源（04..06） | `MR-BE-010..012,020`、`MR-FE-006..007` | 主源/证据/unknown/修订可追溯，不臆测 |
| 刷新、调度、失败、日报（07..08） | `MR-BE-014..018`、`MR-QA-101` | 幂等、时钟、失败保旧、current pointer、真实运行证据 |
| 持久化、模式、健康（09..11） | `MR-DATA-007..009`、`MR-BE-002,013,017..018` | 重启/恢复、live/seed 隔离、health≠ready |
| 不可信内容、中文、无障碍（12..14） | `MR-BE-007..009,023`、`MR-FE-002,010..011`、`MR-QA-103` | SSRF/注入负测、完整简中、320px/200%/键盘/读屏 |
| 备份、回滚、统一完成门（15..16） | `MR-DATA-004..009`、`MR-OPS-*`、`MR-QA-103` | 备份/恢复/回滚演练、P0/P1=0、SHA manifest、一切真相态通过 |

## 10. 本轮验证与已知限制

本任务只验证计划工件和治理登记，不启动架构声明的未来实现命令。交付前应至少完成：

- 九份权威输入 SHA256 逐项匹配；
- 任务 ID 唯一、依赖只引用前置/显式门、直接工时均为 1–4 小时；
- `MR-DATA-001` 是唯一候选首项，全部其他工作均为 `planned-not-authorized`；
- `MR-PM-102`、`AIR-END-030`、连接器、canary、runtime、live snapshot、服务、测试环境和部署都没有被授权；
- YAML/JSONL 解析、项目结构、Skill lock/漂移、Git 边界、精确 diff 与尾随空格检查通过。

已知限制：后端目录和其命令合同尚未实现；CoverageFreshnessPolicy 仍为 UNKNOWN；来源审批不等于运行许可；N=22 尚没有 endpoint 专属执行任务；所有生产参数仍为 TBD，故本计划不构成发布承诺。

## 11. 审核停止点

本产物停在 `task-breakdown-review`。审核时只判断本任务拆解是否忠于批准输入、是否保留冻结边界、是否有唯一候选首项及是否没有潜伏授权。

- **通过**：仅批准本任务拆解；后续是否、何时让 `MR-DATA-001` 入场，仍按当时前置输入、唯一性和一跳规则单独登记。
- **修改**：只返回固定 02 修订本文件和必要登记。
- **打回**：作废本轮待审拆解，不启动任何下游。
