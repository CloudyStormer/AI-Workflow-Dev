# AI Model Radar 持续代码审查报告

## v2.0 AMR-BI-DATA-101 双语 revision 数据基座代码审查

### 审查元数据

- project_id: `ai-model-radar`
- work_item: `AMR-BI-DATA-101.REV`
- change_id: `review-20260831-radar-bilingual-data-revision-foundation-001`
- authorization: `approval-20260831-radar-bilingual-data-revision-foundation-code-review-entry`
- input_artifact: `artifact-radar-bilingual-data-revision-foundation-001` v1.0
- input_aggregate_sha256: `36da55aaac3daa717c4ea387958dbcb46b5773a0cb425c5016d379fbed8ba995`
- reviewed_source_commit: `b24615e71501030d940365f75b16eb98a8e60237`
- diff_base: `94562e5a7390a6f96aa3256d325b619ff56fa6ee`
- delivery_commit: `12c4e25a58fe7c42b8f7c5d45542121407b18cbc`
- routing_baseline: `3983110308ee89e4d953fb11e3232dc4828a858d`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- reviewed_at: `2026-08-31T15:38:05+08:00`
- report_version: `2.0`
- conclusion: `changes-requested`
- finding_counts: `P0=0 / P1=3 / P2=1`
- stop_gate: `code-review-conclusion-review`

### 独立结论

**请求修改，阻断 QA 与 `AMR-BI-DATA-102+`。** 本批六个权威路径、aggregate SHA-256、前进式编号、migration 文件校验和、事务回滚、原文／中文字段物理分表、复合主键、外键、`locale=zh-CN`、唯一索引与 UPDATE/DELETE 不可变触发器均已真实落地。Node.js 24.19.0 下 lint、typecheck、build、后端 61/61 和专项 migration 4/4 全部通过。

但独立内存 SQLite 负向探针确认 3 项 Major：原文层的 `payload_sha256` 没有绑定父 `event_revisions` 的真实 payload；query readiness 只核对 migration 账本与文件哈希，双语表已缺失仍返回 true；当前状态 CHECK 可持久化 `formation_kind=none + status=stale + 中文正文` 等自相矛盾的事实。另有 1 项 Minor：`source_language` 的 SQL CHECK 接受 `--` 等非法语言标签。现有 4 个 migration 测试没有覆盖这些反例，因此绿灯不能推翻 findings。

| 严重级别 | 数量 | 门禁影响 |
| --- | ---: | --- |
| Blocker / P0 | 0 | 无 P0 |
| Major / P1 | 3 | 阻断 QA 和所有后续双语数据、后端、前端工作项 |
| Minor / P2 | 1 | 与 P1 修复一并进入回归门 |

### Major

#### CR-AMR-BI-P1-001：原文 revision 地址存在，但内容哈希可与父 revision 脱钩

- 位置：`backend/migrations/live/0002_bilingual_revision_foundation.sql:11-23`；`backend/tests/migration/migrations.test.ts:106-125`。
- 问题：外键只约束 `(event_id, original_revision)` 指向 `event_revisions(event_id, revision)`，没有约束 `event_original_revisions.payload_sha256` 等于所引用父 revision 的 `payload_sha256`。当前 64 位小写十六进制 CHECK 只验证格式，不验证 lineage 内容身份。
- 独立复现：在内存库中写入父 `event_revisions.payload_sha256=aaaa…`，随后以同一 `(event_id, revision)` 写入 `event_original_revisions.payload_sha256=bbbb…`，INSERT 成功；查询同时返回两个不同哈希。
- 影响：下游可把错误或伪造的原文 payload 标为既有 revision 的事实根，中文 `input_sha256`、幂等作业、快照 manifest 和恢复复算会建立在错误 lineage 上。地址可寻址不等于内容可追溯。
- 修复要求：在不改写已提交 migration 的前提下新增前进式修复 migration，以复合外键、不可变父哈希引用或等价的 INSERT 防护触发器强制两层哈希一致；为匹配与不匹配两条路径增加确定性测试。

#### CR-AMR-BI-P1-002：迁移表或触发器缺失时 query readiness 仍可报告已就绪

- 位置：`backend/src/infrastructure/migrations.ts:28-50`；`backend/src/infrastructure/repository.ts:95-100`。
- 问题：`verifyMigrations()` 只比较 migration 目录文件列表与 `schema_migrations` 的 ID/SHA，完全不检查 migration 声明的表、索引、触发器、外键启用状态或 `foreign_key_check`。账本行仍在时，schema 丢失或恢复不完整不会让 readiness fail closed。
- 独立复现：内存库正常应用 0001/0002 后 `verifyMigrations=true`；执行 `DROP TABLE chinese_counterpart_revisions` 后表数量为 0，但 `verifyMigrations` 仍返回 true。
- 影响：`/health/ready?capability=query` 可能把无法执行双语查询或已丢失不可变保护的库标为 `migration_state=applied`；恢复、文件损坏或错误运维后的真相态不可信。
- 修复要求：为每个 migration 保存并验证确定性 schema contract/fingerprint，至少核对本批两张表、索引、四个触发器、`PRAGMA foreign_keys=1` 与 `PRAGMA foreign_key_check`；任一缺失或漂移必须返回 false。增加删表、删触发器、禁用外键和孤儿行的 readiness 负测。

#### CR-AMR-BI-P1-003：状态 CHECK 可接受相互矛盾或实际为空的中文 revision

- 位置：`backend/migrations/live/0002_bilingual_revision_foundation.sql:39-84`。
- 问题：末尾 `OR status IN ('stale', 'needs_review')` 绕过这些状态的正文和形成方式一致性；`partial` 只判断字段非 NULL，不判断 trim 后非空。数据库因此接受 `formation_kind='none' + status='stale' + title_zh='不应存在的中文'`，也接受 `status='partial' + title_zh=''`。
- 影响：持久化状态、形成方式和真实内容可互相冲突，下游无法可靠计算 translation coverage、形成方式、旧 revision 与空态；这会重新制造架构明确禁止的“第三套业务真相”。
- 修复要求：在前进式修复 migration 中把每个当前允许状态定义为互斥真值表：`none` 只允许无译文／原文已是中文的组合；`ready/partial/stale/needs_review` 明确规定非空字段和允许的 formation kind；所有文本按 trim 后非空判断。为每个合法组合和跨组合反例建立表驱动测试。

### Minor

#### CR-AMR-BI-P2-001：`source_language` CHECK 接受非法 BCP 47 形态

- 位置：`backend/migrations/live/0002_bilingual_revision_foundation.sql:4-7`。
- 问题：当前约束只限制长度与字符集，因此 `--`、`12`、`-en`、`en-` 都能通过。架构要求未知语言使用明确 `und`，后续前端还会把该字段用于原文容器 `lang`。
- 修复要求：在写入边界使用经过验证的 BCP 47 canonicalization/allowlist，并由数据库保存规范化值；至少固化 `en`、`zh-CN`、`und` 正例和上述非法值反例。不要用“看起来像语言”的字符检查代替语义校验。

### 已通过项

- 权威差异严格为 `94562e5…b619..b24615e…237` 的 6 个 AI Model Radar 后端路径；`b24615e..HEAD` 对这些路径无漂移。
- aggregate SHA-256 独立复算为 `36da55aa…995`，迁移文件 SHA-256 为 `8b27857c…e7ec`，均与 artifact 登记一致。
- 0001 未被改写；0002 按文件名顺序前进应用，SQL 与 migration ledger 写入同一 `BEGIN IMMEDIATE` 事务，失败会回滚并保持对应 migration set 的 readiness=false。
- 原文和中文字段分属两张 STRICT 表；主键分别固定 `(event_id, original_revision)` 与 `(event_id, original_revision, locale, chinese_revision)`；中文外键、`zh-CN` 精确 locale、复合唯一键、查找索引和四个不可变触发器有效。
- 合法 fixture 可单独寻址原文与中文 revision；非法 locale、孤儿原文、重复中文内容、原文 UPDATE 和中文 DELETE 均由当前测试拒绝。
- checksum 内容漂移会被拒绝，已应用 migration 不会被静默重写；故意失败的 0003 不留下测试表或 migration 账本行。
- 差异未引入联网翻译、真实事件导入、4317/4174 接入、服务启停、活动数据库迁移、QA、`AMR-BI-DATA-102+` 或部署。

### 独立验证

| 检查 | 结果 |
| --- | --- |
| Git 基线 | `HEAD == origin/main == 3983110308ee89e4d953fb11e3232dc4828a858d`；工作树/暂存区干净，无 index lock |
| 权威路径与哈希 | 6/6 路径匹配；aggregate SHA-256=`36da55aa…995`；输入至 HEAD 无业务漂移 |
| Node.js | `v24.19.0` |
| `npm run lint` | 通过，0 warning |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过，只生成已忽略构建产物 |
| `npm test` | policy 33 + Vitest unit 23 + integration 3 + contract 2 = 61/61 通过 |
| `npm run test:migration-up-down` | 1 文件、4/4 通过 |
| 原文 payload lineage 探针 | 父 `aaaa…` / 原文 `bbbb…` 被同时接受，失败 |
| schema readiness 探针 | 正常为 true；删除 `chinese_counterpart_revisions` 后仍为 true，失败 |
| 状态矩阵探针 | `none/stale/中文正文` 与空字符串 `partial` 均被接受，失败 |
| 语言标签探针 | `source_language='--'` 被接受，失败 |
| 数据与外部动作边界 | 自定义探针均为内存 SQLite；未执行 `db:migrate`、未启停服务、network=0、真实事件=0 |

Node 命令受本机 Homebrew 初始化影响输出一次 `/bin/ps: Operation not permitted`，但目标命令均正常执行并返回退出码 0；这不是业务测试失败。仓库中既有已忽略 `.local-data` 数据库现场未作为输入、未迁移、未修改或暂存。

### 停止门与审核选项

- 当前停止门：`code-review-conclusion-review`。
- 推荐审核选项：`通过审查结论并仅授权固定 08 数据工程师修复 CR-AMR-BI-P1-001..003 与 CR-AMR-BI-P2-001` / `修改审查结论` / `打回审查`。
- 本次审查不自动批准修复、QA、`AMR-BI-DATA-102+`、4317/4174、联网翻译、真实事件导入、服务操作或生产部署；修复交付后必须回固定 `09` 复审。

## v1.1 修复复审结论

- 项目：`ai-model-radar`
- 工作项：`MR-DATA-001-FIX-001.REV`
- 变更：`rereview-20260824-radar-mr-data-001-fix-001`
- 授权：`approval-20260824-radar-mr-data-001-fix-rereview-entry`
- 输入产物：`artifact-radar-mr-data-001-fix-001` v1.1
- 修复源码提交：`69ee48262f447a58c5d6677ef6537ab21213bc85`
- 权威修复差异：`673df8be92516c2185979a98e4f00ea4dee0a3a3..69ee48262f447a58c5d6677ef6537ab21213bc85`
- 原审查产物：`artifact-radar-mr-data-001-code-review-001`
- 原审查 SHA256：`5e835a649cad886112ee19210c8aa4c835fcd6a1326b3d1a8a508e9d2c1a66f7`
- 审查角色：固定 `09 代码审查员`（`role-code-reviewer`）
- 复审时间：`2026-08-24T15:11:42+08:00`
- 报告版本：`1.1`
- 结论：`passed`
- 严重度：P0=0，P1=0，P2=0
- 停止门：`code-rereview-conclusion-review`

**复审通过。** 原 `CR-P1-001` 与 `CR-P2-001` 均已完整关闭，未发现修复回归或新增问题。本结论只表示当前复审产物可以提交超级无敌帅超超总审核，不代表 QA、`MR-DATA-002+`、connector/runtime/live、联网采集、SQLite、部署或任何下游已获授权。

| 原 finding | 状态 | 独立证据 |
| --- | --- | --- |
| `CR-P1-001` 无损政策输入 | closed | `approvedPolicyInput` 显式映射 registry 全部 35 字段；对 29 个 endpoint 逐一复核均为 35/35 原值相等，完整结果可 JSON 往返且整树深度冻结。后续本地消费者可直接使用 loader 结果，不需要绕过 loader 重读 CSV。 |
| `CR-P1-001` MR-DATA-002 边界 | closed | 生产结果整树不存在 `approvalId`、`generatedFromCommit`、`bundleSha256` 或 snake_case 等价字段；差异仅增加政策输入映射与测试，没有生成 bundle、审批身份或提交身份。 |
| `CR-P2-001` 确定性回归门 | closed | 仓库测试已覆盖 BOM、CRLF、quoted comma/newline、escaped quote、三类异常引号、行宽、跨项目、非法绝对 URL、非 HTTPS 和全树不可变；错误码均精确断言。 |

### v1.1 独立验证

| 检查 | 结果 |
| --- | --- |
| Git 基线 | `HEAD == origin/main == 578a6b33f2e98733efcaef794f9ff1fc508e43a4`；工作树/缓存区干净，无 index lock |
| 提交关系与源码漂移 | `673df8be…` 是 `69ee4826…` 祖先；`69ee4826…` 到路由基线的 `backend/src/policy` 无漂移 |
| 修复产物完整性 | 登记的 7 个文件 SHA256 全部匹配；loader=`67f28609…`，tests=`865e3baf…` |
| Node.js | `v22.12.0` |
| `node projects/ai-model-radar/backend/src/policy/loader.test.mjs` | 21/21 通过，0 fail/skip/todo |
| 全量政策输入探针 | 29/29 endpoint × 35/35 字段原值相等；完整树 JSON 往返通过、深度冻结通过 |
| Bundle 边界 | `approvalId/generatedFromCommit/bundleSha256` 及 snake_case 等价字段不存在；`MR-DATA-002` 未启动 |
| 独立 CSV 复算 | 72 行、35 列、29 endpoint；allow=22、conditional=4、manual_only=0、disabled=3；`AIR-END-030=false` |
| 内容地址 | registry SHA256 仍为 `c303e79e1fa9f7a1664ac718a1678bbcb6610b5309a5d5e4006e6d4b1d438f91` |
| 真相边界 | `approvalScope=research-only`、`runtimeEnabled=false`、live connectors=0、live snapshots=0 |
| 静态范围检查 | policy 生产源码仅使用本地 `node:crypto`、`node:fs/promises`；无 HTTP/DNS/网络采集、SQLite、迁移、部署或跨项目实现 |

长期“项目本地自带新闻服务”是未来产品实现边界，不构成本次联网、connector、runtime、live、SQLite 或 `MR-DATA-002` 授权；本复审没有扩张该边界。

### v1.1 停止门与审核选项

- 当前停止门：`code-rereview-conclusion-review`。
- 审核选项：`通过` / `修改复审结论` / `打回复审`。
- 本次交付不自动进入 QA，不启动 `MR-DATA-002+`、connector/runtime/live、网络采集、SQLite、English、Control、部署或生产发布。

## v1.0 原始审查记录（保留追溯）

- 项目：`ai-model-radar`
- 工作项：`MR-DATA-001.REV`
- 变更：`review-20260824-radar-mr-data-001-001`
- 审查角色：固定 `09 代码审查员`（`role-code-reviewer`）
- 输入产物：`artifact-radar-mr-data-001-policy-loader-001` v1.0
- 权威差异：`01ed90bc1439cf7e707b1cd5d2b26d05f4bcc8cf..a29e9c020a1d11cf9c8584af1edbcc481005169a`
- 输入路径：`backend/src/policy`
- 审查时间：2026-08-24（Asia/Shanghai）
- 结论：`changes-requested`
- 严重度：P0=0，P1=1，P2=1
- 停止门：`code-review-conclusion-review`

## 1. Findings

### CR-P1-001｜装载结果丢失后续采集链所需的政策约束

- **级别：** Major / P1
- **位置：** `backend/src/policy/loader.mjs:118`
- **证据：** `validateEndpoint()` 返回的不可变对象仅保留 URL、四态、授权/登录标记、权利摘要、允许/禁止用途、停用条件和最后核验时间。批准 registry 中的 `canonical_url`、`robots_url/result`、`terms_url`、`recommended_polling`、`rate_limit`、`retention_policy`、`attribution_linkback`、`personal_data`、`traceability_fields`、`fallback`、`verification_result`、`fact_or_inference`、`confidence` 等字段均被丢弃。
- **影响：** 当前返回值被定义为后续 SQLite/采集链可消费的内容寻址输入，但后续消费者无法仅依赖该不可变结果执行限频、保留期、署名、robots/条款、个人数据和追溯约束；它们只能重新读取原始 CSV 或另建默认值。前者绕开装载器的稳定输出契约，后者可能把合规约束静默降级。该缺口也使未来 `MR-DATA-002` 无法仅从本装载结果生成架构规定的完整 `EndpointPolicy`。
- **修复要求：** 在 `MR-DATA-001` 边界内保留完整、深度冻结且显式命名的政策输入字段，或定义等价的无损规范化记录；为缺失字段、嵌套不可变和序列化消费补契约测试。不要在本修复中生成 `approval_id`、`generated_from_commit`、`bundle_sha256` 等 `MR-DATA-002` bundle 字段。

### CR-P2-001｜正式测试未固化 CSV 与 URL 的关键负向边界

- **级别：** Minor / P2
- **位置：** `backend/src/policy/loader.test.mjs:21`
- **证据：** 已提交的 8 个测试覆盖四态、计数、重复 ID、组合束、模板、未知列、内容 SHA 漂移和 `AIR-END-030`，但未覆盖 BOM、CRLF、带逗号/换行/转义引号的 quoted field、异常引号、数据行宽度、跨项目行、非法绝对 URL/非 HTTPS，以及完整嵌套对象不可变。
- **影响：** 本次独立探针证明当前实现对这些输入行为正确，但这些边界没有进入仓库回归门，后续重构 parser 或 loader 时容易无声退化。
- **修复要求：** 把本报告第 3.2 节的边界探针转成确定性单元测试；保持无网络、无临时业务文件、错误码精确断言。

## 2. 通过项

- CSV schema 精确要求 35 列，列名、顺序、重复列、未知列和缺失列均 fail-closed。
- BOM、CRLF、quoted comma、quoted newline、双引号转义及三类异常引号的当前实现行为正确。
- 重复 `source_id`、跨项目行、非原子 endpoint ID、组合 access method、URL 模板、非法 URL、非 HTTPS/凭证/fragment 均拒绝。
- `allow / conditional / manual_only / disabled` 四态均保持 `executionAuthorized=false`、`runtimeEnabled=false`；只有研究政策资格被表达，不构成运行授权。
- 独立机械复算结果为 72 行、35 列、29 个原子 endpoint，`allow=22 / conditional=4 / manual_only=0 / disabled=3`；`AIR-END-030` 不在 registry、未计入 N，并由负向 fixture 拒绝。
- registry 原始内容 SHA256 与批准值 `c303e79e1fa9f7a1664ac718a1678bbcb6610b5309a5d5e4006e6d4b1d438f91` 一致；语义正确但字节漂移仍拒绝。
- 当前返回对象、endpoint、`exactEndpoint`、query key 数组和 policy disposition 均为深层不可变。
- 业务实现只导入 `node:crypto` 与 `node:fs/promises`；测试只读取本地 fixture，没有 HTTP、DNS、connector、runtime 或 live 采集路径。
- 差异未实现 bundle、SQLite、connector、服务、QA 或部署；`MR-DATA-002+` 未被启动。

## 3. 独立验证

### 3.1 上游测试复跑

```text
node backend/src/policy/loader.test.mjs
tests 8 / pass 8 / fail 0 / skipped 0
```

### 3.2 额外只读边界探针

```text
parser: BOM + CRLF + quoted comma/newline + escaped quote = pass
malformed quotes: unclosed / quote-in-unquoted / trailing-character = rejected
row width mismatch = REGISTRY_ROW_WIDTH_INVALID
cross-project row = PROJECT_ID_MISMATCH
invalid absolute URL = ENDPOINT_URL_INVALID
HTTP URL = ENDPOINT_URL_UNSAFE
deep immutability = pass
four states = zero execution authorization / zero runtime enablement
independent Ruby CSV recompute = 72 rows / 35 columns / 29 endpoints / 22-4-0-3
```

环境附注：Node 命令启动时 Homebrew shell 初始化输出一次 `/bin/ps: Operation not permitted`，但目标 Node 进程正常执行并以退出码 0 完成；这不是业务测试失败。

## 4. 审查结论与边界

本变更的 parser、内容地址锁、四态真相边界和主要 fail-closed 行为总体可靠，但 `CR-P1-001` 使其尚未形成后续持久化/采集链可安全消费的无损政策输入，因此本结论为 **changes-requested**，阻断 QA 与 `MR-DATA-002`。

本报告不修改业务实现或 registry 裁决，不授权 connector/runtime/live、联网采集、QA、后端扩展、部署或任何下游。结论提交后停在 `code-review-conclusion-review`，等待超级无敌帅超超总审核；若结论获批，唯一下一站应为固定 `08 数据工程师`仅修复上述 P1/P2。
