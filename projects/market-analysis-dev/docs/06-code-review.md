# Frontend Career Radar（前端职业成长雷达）持续代码审查报告

## v1.2 CR-DATA-101 migration contract 代码审查

### 审查元数据

- project_id: `market-analysis-dev`
- work_item: `CR-DATA-101.REV`
- change_id: `review-20260824-career-cr-data-101-001`
- authorization: `approval-20260824-career-cr-data-101-code-review-entry`
- input_artifact: `artifact-career-cr-data-101-001`
- artifact_version: `1.0`
- artifact_sha256: `8b4c06d783825f507f9cac81d44bdab2aa46b13a6d1c5929effe278d7f27c5ed`
- reviewed_source_commit: `2a688f6267cc9dff40e90b0ac672553d5d7a8406`
- diff_base: `b6b28a6767c07ae523c07120edeea34583b0877d`
- repository_review_baseline: `3f59d57d7fc1e947391a7e16d98af55beda781e5`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- reviewed_at: `2026-08-24T16:02:14+08:00`
- report_version: `1.2`
- conclusion: `changes-requested`
- finding_counts: `P0=0 / P1=1 / P2=0`
- stop_gate: `code-review-conclusion-review`

### 结论

**请求修改，阻断进入 QA。** 五域 manifest、精确字节 SHA-256、显式 down、restore-only、空合同真相态和现有测试在正常文件场景下工作正确；但迁移文件的目录约束只校验词法路径，随后使用会跟随符号链接的 `readFile`。独立探针证明，目录内规范文件名可以通过符号链接指向目录外 SQL，并在哈希匹配时被 loader 接受。这违反交付声明的 unsafe-path fail-closed 核心边界，形成 1 项 Major。

当前五个正式 manifest 均为空且为 `contract-only-not-applied`，项目内数据库文件数为 0，本轮也没有启动服务、联网、执行迁移或写入业务数据。因此未发生当前数据损坏；风险在于该 loader 后续一旦被迁移执行器消费，目录外文件可能被当成已验证 migration 读取或执行。

| 严重级别 | 数量 | 门禁影响 |
| --- | ---: | --- |
| Blocker / P0 | 0 | 无 P0 |
| Major / P1 | 1 | 阻断 QA，须由固定 `08 数据工程师`修复后复审 |
| Minor / P2 | 0 | 无独立 P2 |

### Major

#### CR-P1-003：词法路径检查无法阻止 migration 文件通过符号链接逃逸目录

- 位置：`backend/src/infrastructure/sqlite/migrations/manifest.ts:245-283`
- 问题：`verifyMigrationFiles` 对 up/down 文件先执行 `resolve(root, filename)` 并检查字符串前缀，随后直接 `readFile`。规范 basename 能阻止 `../`，但不能阻止目录内同名符号链接；`readFile` 会跟随链接到目录外真实文件。up 与 explicit-down 两条路径均存在相同行为。
- 独立复现：在仓外临时目录建立 `governance/0001_contract_probe.up.sql`，使其符号链接到同级目录外的 `outside.sql`；manifest 使用规范 ID/文件名并登记目标文件真实 SHA-256。`loadMigrationManifest(..., "governance")` 返回成功，探针输出 `SYMLINK_ESCAPE_ACCEPTED`，而不是 fail closed。临时目录已在探针结束时清理。
- 影响：交付 README 明确宣称 unsafe-path 输入 fail closed，但当前实现的验证边界可被链接绕过。未来执行器若信任本 loader 的成功结果并读取该路径，可能执行仓库 migration 目录外的环境依赖内容；即使当前仅做哈希校验，也会产生不稳定、不可封装的制品合同。
- 修复要求：对 manifest 引用的每个 up/down 文件使用不跟随链接的打开方式；至少 `lstat` 后拒绝符号链接和非普通文件，并对 manifest 根与候选文件执行 `realpath` 后确认真实父目录精确等于权威根。为避免检查与读取之间的替换竞态，优先使用带 `O_NOFOLLOW` 的只读文件句柄读取并对同一打开句柄计算 SHA-256。up 与 explicit-down 必须对称处理。
- 回归要求：增加 up symlink escape、down symlink escape、非普通文件和检查后替换边界的确定性负测；断言均抛出 `MigrationManifestError`。不得在修复中执行 migration、创建 SQLite、启动 `CR-DATA-102+` 或改变五域真相态。

### 已通过项

- 权威差异精确为 15 个新增文件；`b6b28a6…` 是 `2a688f6…` 祖先，源码提交至路由基线的 15 个目标文件无漂移。
- 按路径排序、换行终止的 15 条 `shasum -a 256` 记录聚合值为 `8b4c06d783825f507f9cac81d44bdab2aa46b13a6d1c5929effe278d7f27c5ed`，与输入产物完全一致；各 fixture 的 up/down 哈希也与精确文件字节一致。
- governance/public/private/seed/ledger 五个 manifest 的 mode、filename、stream_id 独立绑定；schema head 均为 0、migrations 为空、数据库未物化且状态为 `contract-only-not-applied`。
- loader 对 root/database/checksum/state/migration/rollback 使用精确字段集合；模式、文件名、stream、版本连续性、ID/版本一致性、checksum 格式、跨域、未知字段、重复 ID、非连续版本、非法 rollback、普通路径穿越、缺文件和哈希不匹配均采用 fail-closed 逻辑。
- SHA-256 直接计算 `readFile` 返回的原始 Buffer，符合 lowercase-hex/exact-file-bytes；没有换行或文本规范化。
- `restore-only` 只接受 strategy 字段；`explicit-down` 要求规范 down 文件名与独立 SHA-256，并对 down 文件再次验哈希。没有伪造不可逆迁移的 down SQL。
- 返回 manifest 进行递归冻结；现有非空 fixture 的 migration 与 rollback 也进入同一冻结树。
- 业务范围内未发现 SQLite driver、连接、ATTACH、迁移执行器、网络客户端、业务写入或 runtime enable 路径；项目数据库、WAL、SHM、journal 文件数量为 0。

### 独立验证

| 检查 | 结果 |
| --- | --- |
| Git 基线 | `HEAD == origin/main == 3f59d57d7fc1e947391a7e16d98af55beda781e5`；工作树/缓存区干净，无 index lock |
| 输入提交关系 | `b6b28a6…` 是 `2a688f6…` 祖先；15 个目标文件到路由基线无漂移 |
| 产物 SHA-256 | 15 文件聚合哈希精确匹配 `8b4c06d7…c5ed` |
| Node.js | `v24.19.0` |
| `npm run lint` | 通过，0 warning |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过，只生成已忽略 `dist/` |
| `npm test` | 5 个文件、41/41 通过 |
| focused Vitest | `migration-manifest.test.ts` 1 个文件、14/14 通过 |
| 数据库/运行真相 | DB/SQLite/sidecar 文件 0；服务未启动、network=0、业务写入=0、runtime_enabled=false |
| 额外 symlink 负向探针 | 失败：目录外目标被接受，输出 `SYMLINK_ESCAPE_ACCEPTED`，形成 `CR-P1-003` |

`npm test` 输出本机 npm mirror 配置弃用警告，但命令退出码为 0，不影响测试结果。未执行联网依赖审计，未启动 Fastify 监听、SQLite、migration runner、真实来源、分析或任何业务数据路径。

### 停止门与审核选项

- 当前停止门：`code-review-conclusion-review`。
- 推荐审核选项：`通过审查结论并仅授权固定 08 数据工程师修复 CR-P1-003` / `修改审查结论` / `打回审查`。
- 本次交付不自动启动修复，不进入 QA、`CR-BE-102` 审查、`CR-DATA-102+`、联网、实际数据库/业务数据写入、分析、前端、部署或任何下游。

## v1.1 CR-BE-101 修复复审结论（保留追溯）

- project_id: `market-analysis-dev`
- work_item: `CR-BE-101-FIX-001.REV`
- change_id: `rereview-20260824-career-cr-be-101-fix-001`
- authorization: `approval-20260824-career-cr-be-101-fix-rereview-entry`
- input_artifact: `artifact-career-cr-be-101-fix-001`
- reviewed_source_commit: `c6a9a1cc28d5251b57b4ce6375dd30ebe887fb11`
- diff_base: `01ed90bc1439cf7e707b1cd5d2b26d05f4bcc8cf`
- original_review_artifact: `artifact-career-cr-be-101-code-review-001`
- original_review_sha256: `cbf8e4970a24d72cd71f9f7ae845364f2ab8a35abb398373ca440474fdea3540`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- rereviewed_at: `2026-08-24T12:20:42+08:00`
- report_version: `1.1`
- conclusion: `passed`
- finding_counts: `P0=0 / P1=0 / P2=0`
- stop_gate: `code-rereview-conclusion-review`

**复审通过。** 原 2 项 P1 与 2 项 P2 均已真实关闭，未发现修复回归或新增问题；本结论只表示 `CR-BE-101-FIX-001` 可以提交超级无敌帅超超总审核，不代表 QA、`CR-BE-102+`、SQLite、来源运行、前端、部署或任何下游已获授权。

| 原 finding | 复审状态 | 独立证据 |
| --- | --- | --- |
| `CR-P1-001` request_id 合同 | closed | `OperationEnvelope` 已要求 `request_id:string`；delivery 将逐请求 Fastify `request.id` 传入两个响应。独立交错 inject 四次得到 `req-1..req-4`，均非空且互不相同。 |
| `CR-P1-002` api_schema 假 ready | closed | `api_schema=not_ready`，中文详情明确 JSON Schema/OpenAPI 尚未注册；`/readyz` 仍为 HTTP 503、`status/truth=not_ready`、`ready=false`。 |
| `CR-P2-001` health/readiness 缓存边界 | closed | `/healthz` 与 `/readyz` 均精确返回 `Cache-Control: private, no-store`，源码、单测与独立 inject 一致。 |
| `CR-P2-002` SQLite sidecar 忽略矩阵 | closed | 根 `.gitignore` 对 `.db/.sqlite/.sqlite3 × wal/shm/journal` 共 9 项全部覆盖；独立 `git check-ignore -v` 9/9 命中精确规则，无数据库或 sidecar 被跟踪。 |

### v1.1 独立验证

| 检查 | 结果 |
| --- | --- |
| Git 基线 | `HEAD == origin/main == a69dba8495d6059971c4f1153ec4b57836ce26d1`；工作树/缓存区干净，无 index lock |
| 提交关系与源码漂移 | `01ed90bc…` 是 `c6a9a1cc…` 祖先；`c6a9a1cc…` 到路由基线的 `.gitignore` 与 `backend/` 无漂移 |
| 修复产物哈希 | 7/7 登记输出 SHA-256 精确匹配；主文件为 `465b07f163ede46d9ccee2166a69eab1dc575aa4124331e2cc5d95cde564fa52` |
| Node.js / npm | `v22.12.0` / `10.9.0`，精确覆盖项目 engine 下界 |
| `npm run lint` | 通过，0 warning |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；只生成已忽略 `dist/` |
| `npm run test:unit` | 2 个文件、12/12 通过 |
| `npm test` | 聚合入口通过，12/12 |
| 独立 Fastify inject | 4 次交错请求均为独立 request_id；healthz=200/ok，readyz=503/not_ready；两者均 no-store；未监听端口 |
| SQLite sidecar | 9/9 `git check-ignore` 通过；未创建 SQLite、WAL、SHM 或 journal |
| 范围静态检查 | 未发现来源网络客户端、SQLite 实现、迁移、业务分析、私有用户数据、前端或部署改动 |

验证过程先由系统默认 Node.js 18.12.1 尝试 lint，因不满足 `engines >=22.12.0` 在加载 oxlint 时按预期失败；切换至项目合规 Node.js 22.12.0 后完整命令集全部通过。该首次失败属于运行时选择错误，不是业务回归。`npm test` 输出若干本机 npm mirror 配置弃用警告，不影响退出码和测试结果。

### v1.1 停止门与审核选项

- 当前停止门：`code-rereview-conclusion-review`。
- 推荐审核选项：`通过` / `修改复审结论` / `打回复审`。
- 本次交付不自动进入 QA，不启动 `CR-BE-102+`、SQLite/迁移、真实来源采集、业务分析、前端、服务监听、部署或生产发布。

## v1.0 原始审查记录（保留追溯）

## 审查元数据

- project_id: `market-analysis-dev`
- work_item: `CR-BE-101.REV`
- change_id: `review-20260824-career-cr-be-101-001`
- authorization: `approval-20260824-career-cr-be-101-code-review-entry`
- upstream_approval: `approval-20260824-career-cr-be-101-delivery`
- input_artifact: `artifact-career-backend-foundation-001`
- source_commit: `f90d10605819f07c8131338162ab7b9e4bae466e`
- diff_base: `91c26a5c391c6edb738acb2637bd5498ae0856f4`
- repository_review_baseline: `4590d53b2e44cda24b36f7e869c43b9f7427da03`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- reviewed_at: `2026-08-24T11:13:22+08:00`
- scope: 只读审查 CR-BE-101 的 Fastify、TypeScript strict、loopback、healthz/readyz 真相态、命令入口、最小测试和 SQLite/WAL 忽略边界
- excluded: CR-BE-102 或以后、代修代码/配置、SQLite/迁移、真实来源/网络采集、业务分析、私有用户数据、前端、服务启动、QA、部署及下游路由

## 结论

**结论：请求修改，不建议进入 QA。**

输入完整性和基础验证均通过：登记的 11 个输出文件 SHA-256 全部匹配，`source_commit` 到审查基线没有 `.gitignore` 或 `backend/` 源码漂移；Node.js 24.19.0 下 lint、TypeScript strict typecheck、build、`npm test` 和 `npm run test:unit` 均通过，Fastify inject 的 3 项测试也全部通过。实现确实只绑定 `127.0.0.1`，默认使用临时端口；没有 SQLite、迁移、网络客户端、来源采集、业务分析、私有数据、前端或部署实现。

但审查确认 2 项 Major：两个健康端点都缺少已批准架构强制要求的 `request_id`，无法建立请求级追踪合同；同时实现没有注册任何 Fastify JSON Schema/OpenAPI，却在 `readyz` 中把 `api_schema` 标为 `ready`。另有 2 项 Minor：health/readiness 未显式禁止缓存，且根级 SQLite 侧车忽略规则只覆盖 `.sqlite-*`，没有覆盖已被允许作为主文件后缀的 `.db-*` 与 `.sqlite3-*`。现有 3 项单测采用局部匹配，未能发现这些合同和真相态缺口。

| 严重级别 | 数量 | 门禁影响 |
| --- | ---: | --- |
| Blocker / P0 | 0 | 无 P0 |
| Major / P1 | 2 | 阻断进入 QA |
| Minor / P2 | 2 | 应随同一修复单元关闭 |
| 建议 | 0 | 无独立建议项 |

## Major

### CR-P1-001：healthz/readyz 响应缺少架构强制的 request_id

- 位置：`backend/src/contracts/operation.ts:18-35`；`backend/src/modules/health/application/health-service.ts:13-75`；`backend/src/modules/health/delivery/http-routes.ts:8-13`
- 问题：批准架构 `docs/06-release-completeness-architecture.md:431-434` 明确要求所有响应包含 `request_id`。当前 `OperationEnvelope` 类型没有该字段，两个服务返回值也不接收 Fastify 请求上下文；只读 inject 实证中 `/healthz` 和 `/readyz` 的 JSON 均没有 `request_id`。
- 影响：健康与就绪错误不能与 Fastify 请求、启动失败记录或后续结构化日志关联；调用方一旦按批准合同消费该字段会直接得到缺失值。由于类型本身遗漏，TypeScript strict 也无法阻止这一合同漂移。
- 建议：由 delivery 层把 Fastify `request.id` 作为只读输入传给健康服务，或在统一响应构造器/hook 中生成并注入；将 `request_id` 纳入 `OperationEnvelope` 和两个端点的完整响应断言。不得用固定值、进程级值或 `null` 代替逐请求标识。
- 严重性理由：这是已批准 API 公共合同的必填字段，当前两个已交付端点均不兼容。

### CR-P1-002：未实现运行时 schema，却把 api_schema 宣称为 ready

- 位置：`backend/src/apps/api/app.ts:6-11`；`backend/src/modules/health/domain/health-status.ts:21-26`；`backend/tests/unit/health-routes.test.ts:35-61`
- 问题：应用只创建 Fastify 并注册两个 handler，没有为请求或响应注册 JSON Schema，也没有生成或注册 OpenAPI。批准架构 `docs/06-release-completeness-architecture.md:94-100` 把 Fastify + JSON Schema/OpenAPI 和 API 出口运行时校验定为合同；但 `readyz` 把名为 `api_schema` 的组件返回为 `ready`，中文详情实际只证明“Fastify 本机后端基座已初始化”。现有单测只断言 sqlite/source_runtime/worker 为 not_ready，完全跳过 `api_schema`。
- 影响：整体 HTTP 状态虽仍为 503，但组件级监控、未来聚合器或人工排障会收到错误的局部绿色信号；这违反“不得以 transport/骨架成功冒充依赖就绪”的真相态原则。
- 建议：在 CR-BE-101 的最小修复范围内先把 `api_schema` 保持 `not_ready`，并用测试明确断言；只有后续获得单独授权、真正注册并验证响应 schema/OpenAPI 合同后，才能把该组件切为 `ready`。本建议不授权提前实现 CR-BE-102/104。
- 严重性理由：`readyz` 的核心职责就是提供可被机器消费的真实组件状态，当前局部状态与真实实现不符。

## Minor

### CR-P2-001：health/readiness 没有显式 no-store 缓存边界

- 位置：`backend/src/modules/health/delivery/http-routes.ts:8-13`
- 问题：批准架构 `docs/06-release-completeness-architecture.md:520-523` 明确 health/readiness 永不进入静态 CDN 缓存，API 默认 `private, no-store`。独立 inject 得到的两个响应头只有 `content-type`、`content-length`、`date` 和 `connection`，没有 `Cache-Control`。
- 影响：本机直连下通常不会触发缓存，但未来只要增加代理或统一网关，旧的 200/503 就可能被错误复用；健康真相态应在应用层提供防御性响应合同。
- 建议：在两个 route 或统一 health hook 上显式发送 `Cache-Control: private, no-store`，并增加响应头断言；不需要进入部署配置范围。

### CR-P2-002：SQLite 侧车忽略规则没有覆盖 db/sqlite3 主文件族

- 位置：根 `.gitignore:35-41`；`backend/.gitignore:1-2`
- 问题：根规则允许忽略 `*.db`、`*.sqlite`、`*.sqlite3` 三类主文件，却只补了 `*.sqlite-wal/shm/journal`。`git check-ignore` 实证显示 `probe.db-wal`、`probe.db-shm`、`probe.db-journal` 和对应 `probe.sqlite3-*` 均不被忽略；只有 `probe.sqlite-*` 被覆盖。`backend/var/` 的粗粒度忽略可保护契约目录内文件，但不能防止后续配置、测试夹具或误放路径产生侧车泄漏。
- 影响：SQLite WAL/SHM/journal 可能包含尚未 checkpoint 的真实数据；后续一旦数据库路径没有落在 `backend/var/`，这些侧车存在被误暂存的风险。
- 建议：对 `.db`、`.sqlite`、`.sqlite3` 三个允许的主文件族对称覆盖 `-wal`、`-shm`、`-journal`，并把完整矩阵纳入 `git check-ignore` 验证。当前没有发现任何已生成或已跟踪的数据库文件。

## 已通过的审查项

- Fastify 应用、server、health application/domain/delivery 分层符合 `delivery → application → domain → contracts` 方向，没有循环依赖。
- `tsconfig.json` 开启 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitReturns` 等约束；源码未使用 `any`。
- `resolveLoopbackPort` 拒绝非数字和越界值，`startLoopbackServer` 显式使用 `127.0.0.1`；本审查未调用 `listen` 或启动服务。
- `/healthz` 为 200 且只表达进程 alive；整体 `/readyz` 为 503/not_ready，SQLite、source runtime、worker 均未冒充完成。
- 源码和依赖声明中没有 SQLite driver、迁移、HTTP/HTTPS/net 客户端、来源连接器、业务分析或私有用户数据路径。
- 未发现被跟踪的 `.env`、密钥、令牌、私钥、数据库、WAL/SHM/journal、构建目录、依赖目录或嵌套 Git。
- 构建产物 `dist/` 与依赖 `node_modules/` 均由根规则忽略；`backend/var/` 也被项目规则整体忽略。

## 独立验证记录

| 检查 | 结果 |
| --- | --- |
| Git 基线 | `HEAD == origin/main == 4590d53b2e44cda24b36f7e869c43b9f7427da03`，工作树/缓存区干净，无 index lock |
| 输入提交关系 | `91c26a5…` 是 `f90d106…` 祖先；`f90d106…` 到审查基线的目标源码无漂移 |
| 登记输出 SHA-256 | 11/11 与 `artifact-career-backend-foundation-001` 完全一致 |
| Node.js / npm | `v24.19.0` / `8.19.2`；Node 满足 `>=22.12.0` |
| `npm run lint` | 通过，0 warning |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；只生成已忽略的 `dist/` |
| `npm run test:unit` | 通过，1 个文件、3/3 测试 |
| `npm test` | 通过；当前按范围只聚合 unit，3/3 测试 |
| 独立 Fastify inject | `/healthz=200`；`/readyz=503/not_ready`；未打开监听端口 |
| 网络/SQLite/敏感模式静态检查 | 未发现网络客户端、SQLite 实现、数据库文件或高置信度凭证 |
| SQLite 忽略矩阵 | `.sqlite-*` 通过；`.db-*`、`.sqlite3-*` 侧车失败，形成 CR-P2-002 |

## 验证限制与追溯备注

- 本轮按授权未执行联网 `npm audit`，因此不声明第三方依赖“无已知漏洞”；锁文件、已安装顶层依赖和当前源码已做离线一致性复核。
- 没有使用 Node.js 22.12.x 重跑；只验证了 Node.js 24.19.0。`engines` 下界兼容性仍需后续获批环境门验证。
- 没有启动真实监听服务；loopback 结论来自源码、端口解析单测和 Fastify inject，符合本轮“禁止启动服务”边界。
- 路由消息给出的完整提交 `4590d53d7dc87525da3baf0e53a2b2594a94413` 在本仓库不存在；实际远端路由提交为 `4590d53b2e44cda24b36f7e869c43b9f7427da03`，其主题、workflow 授权、源码提交、输入哈希、角色任务和停止门均匹配。本差异登记为非阻断追溯备注，不改写上游记录。

## 停止门与审核选项

- 当前停止门：`code-review-conclusion-review`
- 当前决策：等待超级无敌帅超超总审核 `artifact-career-cr-be-101-code-review-001`。
- 推荐审核选项：
  1. `通过`：批准本审查结论，并仅授权唯一责任角色固定 `07 后端工程师`修复上述 2 项 P1 与 2 项 P2；修复交付后回固定 `09 代码审查员`复审。
  2. `修改`：调整审查结论或范围，本角色修订后重新交付。
  3. `打回`：退回本审查产物，保留当前源码与治理现场。
- 本次交付不自动启动修复，不进入 CR-BE-102、SQLite/迁移、真实来源采集、业务分析、前端、QA、部署或生产发布。
