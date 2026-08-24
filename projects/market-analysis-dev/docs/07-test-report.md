# Frontend Career Radar（前端职业成长雷达）持续 QA 测试报告

## v2.0｜CR-BE-102 本地运行合同 QA

### 1. 交付元数据

- 项目 ID：`market-analysis-dev`
- 工作项：`CR-BE-102.QA`
- 变更 ID：`test-20260824-career-cr-be-102-qa-001`
- 报告版本：`2.0`
- 报告产物：`artifact-career-cr-be-102-test-report-001`
- 固定角色：`10 测试工程师` / `role-qa`
- 角色任务 ID：`019fb746-5875-77b3-809a-08a16100d950`
- QA 入场授权：`approval-20260824-career-cr-be-102-qa-entry`
- 输入审查产物：`artifact-career-cr-be-102-code-review-001`
- 输入报告：`docs/06-code-review.md` v1.3
- 输入报告 SHA256：`ff4b320e87099b117b924fe44a4a08442a02ddd3cb75ba21be127b8a499b209b`
- 已审查源码提交：`b6b28a6767c07ae523c07120edeea34583b0877d`
- 审查交付提交：`ca9f15258de8406c806eab12bbb6c649dec56948`
- QA 执行基线：`ca9f15258de8406c806eab12bbb6c649dec56948`
- 写锁释放与回归基线：`c20b328ee143992c5d31e6584e18781e8aaa6122`
- 执行环境：Node.js `v24.19.0` / npm `10.9.0`
- 执行日期：2026-08-24
- 停止门：`test-report-review`

### 2. QA 结论

**CR-BE-102.QA 结论为 `passed-with-accepted-legacy`：12/12 个 QA 测试项通过；本批 P0=0、P1=0，保留 1 项已由超级无敌帅超超总明确接受为非阻断遗留的 P2。**

Node 24 下 lint、typecheck、build、聚合 test 与 runtime/lifecycle 聚焦测试全部通过；原 QA 执行基线为 41/41，对齐固定08交付后的安全基线全量回归为 45/45，CR-BE-102 聚焦回归仍为 15/15。运行配置在构建 Fastify app 前 fail closed，host 固定为 `127.0.0.1`，启动/关闭失败不会冒充成功，SIGINT/SIGTERM 与幂等关闭合同通过，`/readyz` 继续返回 503/not_ready。

`CR-P2-003` 不阻断当前 QA，但必须在项目最终完成门前补齐 `artifact-career-cr-be-102-001.outputs` 中遗漏的 `backend/tests/unit/health-routes.test.ts` 及其 SHA256，且需增加权威路径数与 outputs 数一致性检查。本报告不将其伪装为已修复。

### 3. 测试范围与排除项

#### 3.1 已测试

- `dev/build/lint/typecheck/test` 命令声明、分发和失败传播合同。
- Node 24 下 lint、TypeScript strict typecheck、build、聚合测试及 runtime/lifecycle 聚焦测试。
- 显式 `PORT` 与 `DATA_DIR`、非法值 fail-closed、配置在 build app 前加载。
- `HOST` 环境覆盖无效，监听参数始终为 `127.0.0.1`。
- 启动失败回滚关闭、启动与关闭同时失败的 `AggregateError` 真相态。
- 并发/重复 stop 复用同一 Promise，只调用一次 close。
- SIGINT/SIGTERM 共用 shutdown、监听器清理与关闭失败 exitCode=1。
- `/readyz` 503、`not_ready`、`api_schema=not_ready`、`private, no-store`。

#### 3.2 明确排除

- `CR-BE-103+`。
- `CR-DATA-101` 及其当前并行修复、SQLite、migration 和数据库状态。
- 真实来源、网络采集、业务分析、私有用户数据。
- 前端、English、Control、部署与生产发布。

### 4. 测试结果

| ID | 测试项 | 结果 | 核心证据 |
|---|---|---|---|
| QA-102-01 | 输入与源码完整性 | 通过 | 输入报告 SHA256 匹配；CR-BE-102 的 8 个权威路径从 `b6b28a6` 到 QA 基线零漂移 |
| QA-102-02 | 命令合同 | 通过（环境限制已隔离） | package 明确 `dev/build/lint/typecheck/test`；`npm run dev` 正确分发到 tsx watch，同源无 watch 入口按配置合同执行 |
| QA-102-03 | Lint | 通过 | Node 24 下 `npm run lint` exit 0，0 warning |
| QA-102-04 | Typecheck | 通过 | `npm run typecheck` exit 0 |
| QA-102-05 | Build | 通过 | `npm run build` exit 0，仅写入已忽略 `dist/` |
| QA-102-06 | 聚合回归 | 通过 | CR-BE-102 QA 执行基线 5 个文件、41/41；写锁释放后 `c20b328` 回归 5 个文件、45/45 |
| QA-102-07 | Runtime/lifecycle 聚焦回归 | 通过 | 2 个文件、15/15 测试通过 |
| QA-102-08 | `PORT` fail-closed | 通过 | 0/65535 接受；10 组缺失、格式错误或越界输入拒绝 |
| QA-102-09 | `DATA_DIR` 与配置顺序 | 通过 | 7 组缺失/相对/空白/NUL/根目录输入拒绝；配置失败前 buildApp 调用数为 0 |
| QA-102-10 | Loopback、启动和幂等关闭 | 通过 | host 固定 127.0.0.1；并发 stop 复用 Promise、close=1；启动失败回滚 close=1；双失败保留两项原因 |
| QA-102-11 | SIGINT/SIGTERM 与关闭失败 | 通过 | 两信号共用一次 stop；监听器归零；关闭失败设置 exitCode=1 并记录原错误 |
| QA-102-12 | `readyz` 真相态 | 通过 | HTTP 503、not_ready、api_schema=not_ready、private/no-store |

通过率：`12 / 12 = 100%`。

说明：聚合测试包含当前仓库内 CR-DATA 测试，仅用于验证 `npm test` 命令合同与本批无破坏回归；从 41 增至 45 的 4 项测试来自固定08在 `c20b328` 登记的 CR-DATA-101-FIX-001，不纳入本 QA 的 12 项结论，也不代表固定10复审或批准该修复。

### 5. 独立运行证据

```json
{
  "node": "v24.19.0",
  "host": "127.0.0.1",
  "invalid_ports_rejected": 10,
  "invalid_data_dirs_rejected": 7,
  "config_before_build": true,
  "idempotent_close_calls": 1,
  "start_failure_rollback_close_calls": 1,
  "aggregate_start_and_close_failure": true,
  "signals": ["SIGINT", "SIGTERM"],
  "signal_stop_calls": 1,
  "shutdown_failure_exit_code": 1,
  "readyz": {
    "status": 503,
    "truth": "not_ready",
    "api_schema": "not_ready",
    "cache_control": "private, no-store"
  }
}
```

编译入口与同源 TypeScript 入口在未设置 `PORT`/`DATA_DIR` 时均真实退出 1，并输出完整简体中文配置错误；没有调用 Fastify build、没有监听、没有创建数据目录。

### 6. 沙箱 EPERM 真实性说明

`npm run dev` 已正确解析并启动 `tsx watch src/apps/api/main.ts`，但 tsx 在进入项目代码前创建内部 IPC Unix socket 时被桌面沙箱以 `listen EPERM` 拒绝。该 EPERM：

- 不来自 Frontend Career Radar 的监听逻辑；
- 不作为产品测试通过证据；
- 不作为产品缺陷或启动失败结论；
- 由无 watch 的同源 TypeScript 入口、编译入口、15 项聚焦测试和独立 fake-listener/lifecycle 探针补足产品合同验证。

本轮未尝试绕过沙箱、未请求旧式工具审批，也未启动常驻服务。

### 7. 缺陷与遗留分类

- 本轮必须修复：0。
- 已明确接受为遗留：1（`CR-P2-003`）。
- P0：0。
- P1：0。
- P2：1。
- 新发现缺陷：0。

`CR-P2-003` 的遗漏文件当前 SHA256 为 `e2ec44e59dd6bb0ef8dedae74252f6798c3bd158976177fad613f1646c6edb42`；当前 artifact outputs 为 7 项、权威路径为 8 项。该遗留不阻断 CR-BE-102.QA，但阻断项目最终完成门宣称“制品 8/8 完整可追溯”。

### 8. 真实性边界与上线建议

- 当前验证的是本地后端运行合同，不是 SQLite、来源、分析或前端联通。
- `/readyz=503/not_ready` 是正确且必须保留的真实状态。
- 本轮没有真实监听成功证据，不声称实际端口服务已在沙箱内运行。
- 当前仍不能看到真实职业数据，也不能宣称 Career 已真实可用。
- QA 建议：**允许 CR-BE-102 测试报告进入 `test-report-review`；不进入部署或生产，不启动 CR-BE-103+。最终完成门前必须补齐 CR-P2-003，并等待独立 CR-DATA 链路闭环。**

### 9. 停止门与并发写锁

固定00已在 `c20b328ee143992c5d31e6584e18781e8aaa6122` 释放 Career workflow 写锁。固定10以可恢复方式保护并恢复本报告，安全对齐后仅登记 CR-BE-102.QA 必要事实；固定08的 CR-DATA-101-FIX-001 产物、验证结果与 `backend-data-fix-delivery-review` 停止门均保持不变。

本测试单元完成后停在 `test-report-review`，不批准本报告、不路由下游、不启动 CR-BE-103+、部署或生产发布。

---

## v1.0｜CR-BE-101 本地后端基座 QA（历史版本）

## 1. 交付元数据

- 项目：Frontend Career Radar（前端职业成长雷达）
- 项目 ID：`market-analysis-dev`
- 工作项：`CR-BE-101.QA`
- 变更 ID：`test-20260824-career-cr-be-101-qa-001`
- 报告版本：`1.0`
- 报告产物：`artifact-career-cr-be-101-test-report-001`
- 固定角色：`10 测试工程师` / `role-qa`
- 角色任务 ID：`019fb746-5875-77b3-809a-08a16100d950`
- QA 入场授权：`approval-20260824-career-cr-be-101-qa-entry`
- 输入复审产物：`artifact-career-cr-be-101-fix-rereview-001`
- 输入报告：`docs/06-code-review.md` v1.1
- 输入报告 SHA256：`d7f8a9c142c6d6e3e067b4e9e01ae0e91db371dfdd9c97e52c39cf848f0ebd5a`
- 已复审源码提交：`c6a9a1cc28d5251b57b4ce6375dd30ebe887fb11`
- 复审交付提交：`673df8be92516c2185979a98e4f00ea4dee0a3a3`
- QA 执行基线：`578a6b33f2e98733efcaef794f9ff1fc508e43a4`
- 执行日期：2026-08-24
- 停止门：`test-report-review`

## 2. QA 结论

**CR-BE-101 本地后端基座 QA 通过，10/10 个测试项通过，P0/P1/P2 缺陷均为 0。**

本结论只证明当前 Fastify/TypeScript 后端基座在 Node.js 22.12.0 下满足已批准的原子范围：静态质量门、构建、12/12 自动化测试、健康与就绪真相态、逐请求 `request_id`、`private, no-store`、回环地址与端口校验、SQLite sidecar 忽略矩阵及范围边界均通过。

本报告不证明产品已经具备真实数据能力，也不构成上线或部署建议。`/healthz` 仅表示进程级存活；`/readyz` 必须且实际返回 503，`api_schema`、`sqlite`、`source_runtime`、`worker` 均保持 `not_ready`。CR-BE-102+、SQLite/迁移、真实来源采集、业务分析、前端联调和服务部署均未实现或未纳入本轮。

## 3. 测试范围与排除项

### 3.1 已测试

- Node.js 22.12.0 / npm 10.9.0 运行基线。
- `npm run lint`、`npm run typecheck`、`npm run build`、`npm run test:unit`、`npm test`。
- `/healthz` 200、逐请求唯一非空 `request_id`、`private, no-store`。
- `/readyz` 503、`status=not_ready`、`api_schema=not_ready`、`private, no-store`。
- `127.0.0.1` 回环约束、默认/边界端口与非法配置 fail-closed。
- `.db`、`.sqlite`、`.sqlite3` 的 `-wal`、`-shm`、`-journal` 共 9 种 sidecar 忽略规则。
- 无网络客户端、无 SQLite 实现、无数据库文件、无业务/前端/部署越界。

### 3.2 明确排除

- `CR-BE-102` 及后续工作项。
- SQLite、迁移与任何数据库状态写入。
- 网络来源采集、外部 API、真实数据接入与业务分析。
- 前端改动、前后端联调、English、Control。
- 常驻服务、部署、生产发布与任何下游自动路由。

## 4. 环境与方法

- macOS 隔离 worktree。
- Node.js：`v22.12.0`。
- npm：`10.9.0`。
- 依赖：复用同一根仓共享主工作树中已安装的 `backend/node_modules`，仅建立临时本地符号链接执行测试，测试后已移除；未安装或升级依赖。
- 服务契约：Fastify `inject` 独立四请求并发验证，不发起网络请求。
- 源码与边界：Git 差异、已跟踪文件、依赖声明与关键调用模式静态扫描。

## 5. 测试结果

| ID | 测试项 | 结果 | 核心证据 |
|---|---|---|---|
| QA-101-01 | 输入与源码完整性 | 通过 | 输入报告 SHA256 匹配；`c6a9a1c` 到 QA 基线的 `backend/` 零漂移 |
| QA-101-02 | Lint | 通过 | Node 22.12.0 下 `npm run lint` exit 0 |
| QA-101-03 | TypeScript strict/typecheck | 通过 | `npm run typecheck` exit 0 |
| QA-101-04 | 构建 | 通过 | 隔离 worktree 中 `npm run build` exit 0 |
| QA-101-05 | 自动化回归 | 通过 | `npm run test:unit` 与 `npm test` 均为 2 个文件、12/12 测试通过 |
| QA-101-06 | `healthz` 契约 | 通过 | 两次独立请求均为 200；逐请求 ID 非空且互异；`private, no-store` |
| QA-101-07 | `readyz` 真相态 | 通过 | 两次独立请求均为 503；`api_schema=not_ready`；`private, no-store` |
| QA-101-08 | 回环与配置失败 | 通过 | host 固定 `127.0.0.1`；0/65535 接受；5 组非法端口拒绝；非法 `PORT` 主入口 exit 1 |
| QA-101-09 | SQLite sidecar 忽略 | 通过 | `git check-ignore -v` 9/9 命中根 `.gitignore` 对应规则 |
| QA-101-10 | 范围与回归边界 | 通过 | 无后端源码漂移、无已跟踪数据库文件、无网络/SQLite 依赖或实现、无业务/前端/部署改动 |

通过率：`10 / 10 = 100%`。

## 6. 关键运行证据

### 6.1 独立四请求注入

```json
{
  "status_codes": [200, 503, 200, 503],
  "request_ids_unique": 4,
  "cache_control": ["private, no-store"],
  "api_schema": ["not_ready", "not_ready"]
}
```

### 6.2 回环与配置

```json
{
  "host": "127.0.0.1",
  "valid_ports": [0, 65535],
  "invalid_ports_rejected": 5
}
```

非法 `PORT=not-a-port` 通过正式主入口失败并返回退出码 1，错误文案为完整简体中文：`PORT 必须是 0 到 65535 之间的整数。`

### 6.3 执行环境观察

共享主工作树首次构建因桌面沙箱禁止向该外部 worktree 的 `dist/` 写入而返回 `EPERM`；同提交、同 Node、同依赖在本固定任务的可写隔离 worktree 重跑构建通过。一次真实端口绑定尝试同样被桌面沙箱以 `listen EPERM` 拒绝，因此未将该尝试计为产品失败或通过证据；接口状态码和响应契约由 Fastify `inject` 与自动化测试独立覆盖。

以上均属于执行环境限制，不是项目缺陷，也未触发旧式工具审批、服务常驻或部署。

## 7. 缺陷与遗留分类

- 本轮必须修复：0。
- 已明确接受为遗留：0。
- P0：0。
- P1：0。
- P2：0。
- 执行环境观察：1 组（外部 worktree 写入与真实端口绑定被桌面沙箱拒绝），不影响本轮可注入契约与构建证据。

## 8. 真实性边界与上线建议

- `healthz=200` 只能解释为进程级应用对象可响应，不能解释为数据链路就绪。
- `readyz=503/not_ready` 是当前真实状态，不是待掩盖的失败。
- API Schema、SQLite/迁移、来源运行时、Worker、真实数据聚合均未实现。
- 当前尚不能在本地看到真实职业数据；超级无敌帅超超总的更大目标仍需后续经批准的 CR-BE-102+ 工作项完成。
- QA 建议：**允许 CR-BE-101 测试报告进入 `test-report-review`；不建议部署或生产发布，不自动授权 CR-BE-102+ 或 DevOps。**

## 9. 停止门

本测试单元在 `test-report-review` 停止，等待超级无敌帅超超总审核当前明确测试报告；不批准当前报告，不递归推进后续角色。
