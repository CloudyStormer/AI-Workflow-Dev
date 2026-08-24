# Frontend Career Radar（前端职业成长雷达）CR-BE-101 后端基座代码审查

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
