# Frontend Career Radar CR-BE-101 本地后端基座 QA 测试报告

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
