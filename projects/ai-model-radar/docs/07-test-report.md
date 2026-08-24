# AI Model Radar MR-DATA-001 Policy Loader QA 测试报告

## 1. 交付元数据

- 项目：`AI Model Radar`
- 项目 ID：`ai-model-radar`
- 工作项：`MR-DATA-001.QA`
- 变更 ID：`test-20260824-radar-mr-data-001-qa-001`
- 报告版本：`1.0`
- 报告产物：`artifact-radar-mr-data-001-test-report-001`
- 固定角色：`10 测试工程师` / `role-qa`
- 角色任务 ID：`019fb746-5875-77b3-809a-08a16100d950`
- QA 入场授权：`approval-20260824-radar-mr-data-001-qa-entry`
- 输入复审产物：`artifact-radar-mr-data-001-fix-rereview-001`
- 输入报告：`docs/06-code-review.md` v1.1
- 输入报告 SHA256：`c911c06cb8d7c43dd824160fb69e4d41dc2f89ad229417fda8d001967ea83987`
- 已复审源码提交：`69ee48262f447a58c5d6677ef6537ab21213bc85`
- 复审交付提交：`b89945f0188facd43ed31d685a65d9b0a5d4cdec`
- QA 执行基线：`b36911952151b911565331101b495e1de23ba79d`
- 执行日期：2026-08-24
- 停止门：`test-report-review`

## 2. QA 结论

**MR-DATA-001.QA 通过：12/12 个 QA 测试项通过，仓库 policy 自动化测试 21/21 通过，P0/P1/P2 缺陷均为 0。**

本结论证明当前本地 policy loader 能够确定性读取已批准 registry，在 29 个 endpoint 上逐一无损保留全部 35 个字段（共 1015 次字段逐值比较），并满足 CSV/项目/URL fail-closed、整树深冻结、JSON 往返与 MR-DATA-002 bundle 身份隔离要求。

本报告不证明任何真实来源已经接入或产品已经具备实时数据。当前真相仍为 `approvalScope=research-only`、`runtimeEnabled=false`、live connectors=0、live snapshots=0、network collection=0、SQLite=0；`MR-DATA-002+` 未启动。

## 3. 测试范围与排除项

### 3.1 已测试

- Node.js 22.12.0 下 `backend/src/policy/loader.test.mjs` 全量 21 项测试。
- 29 个 endpoint × 35 个批准字段逐值相等与字段数量/顺序一致性。
- Registry 72 条数据行、35 列与四态计数 `22 / 4 / 0 / 3`。
- UTF-8 BOM、CRLF、quoted comma、quoted newline、escaped quote。
- 未闭合引号、非 quoted 字段内引号、quoted 字段后非法字符。
- 数据行宽度、跨项目行、非法绝对 URL、非 HTTPS URL。
- 完整结果 JSON 序列化往返与递归深冻结。
- `approvalId`、`generatedFromCommit`、`bundleSha256` 及 snake_case 等价字段不存在。
- 生产 policy 源码无网络客户端、SQLite、connector、snapshot 或 `runtimeEnabled=true` 路径。

### 3.2 明确排除

- `MR-DATA-002` 及后续工作项。
- 网络采集、外部 API 调用、connector/runtime/live 能力。
- SQLite、迁移、数据库文件或持久化。
- Registry 政策裁决或内容修改。
- 前端、服务部署、生产发布、English、Control。

## 4. 测试环境与方法

- macOS 隔离 worktree，测试前后工作树干净。
- Node.js：`v22.12.0`。
- 依赖：仅 Node.js 内置模块；未安装或升级依赖。
- 网络：未发起网络请求。
- 数据：只读取仓库内 `docs/00-source-registry.csv` 与负向 fixture；未创建数据库或业务数据。
- 方法：仓库自动化测试 + 独立内联只读探针 + Git/源码静态边界扫描。

## 5. 测试结果

| ID | 测试项 | 结果 | 核心证据 |
|---|---|---|---|
| QA-DATA-01 | 输入与源码完整性 | 通过 | 输入报告 SHA256 匹配；`69ee482` 至 QA 基线的 `backend/src/policy` 零漂移 |
| QA-DATA-02 | 仓库 policy 回归 | 通过 | Node 22.12.0 下 21/21 通过，0 fail/skip/todo |
| QA-DATA-03 | 29×35 无损字段 | 通过 | 29 endpoint、35 字段、1015 次原值比较全部相等 |
| QA-DATA-04 | Registry 结构与四态计数 | 通过 | 72 行、35 列；allow=22、conditional=4、manual_only=0、disabled=3 |
| QA-DATA-05 | BOM/CRLF 与 quoted 正向边界 | 通过 | BOM、CRLF、逗号、换行、转义引号确定性解析 |
| QA-DATA-06 | malformed CSV fail-closed | 通过 | 精确得到 `CSV_UNCLOSED_QUOTE`、`CSV_INVALID_QUOTE`、`CSV_TRAILING_CHARACTERS` |
| QA-DATA-07 | 行宽与跨项目 fail-closed | 通过 | 精确得到 `REGISTRY_ROW_WIDTH_INVALID`、`PROJECT_ID_MISMATCH` |
| QA-DATA-08 | URL/HTTPS fail-closed | 通过 | 精确得到 `ENDPOINT_URL_INVALID`、`ENDPOINT_URL_UNSAFE` |
| QA-DATA-09 | 深冻结 | 通过 | 完整 loader 结果递归 `Object.isFrozen=true` |
| QA-DATA-10 | JSON 往返 | 通过 | `JSON.parse(JSON.stringify(result))` 与原值深相等 |
| QA-DATA-11 | Bundle 身份隔离 | 通过 | camelCase 与 snake_case 的 6 个 MR-DATA-002 身份字段全部不存在 |
| QA-DATA-12 | 真相与禁止边界 | 通过 | runtime=false、所有 endpoint 零执行授权；仅 `node:crypto`/`node:fs/promises`，无网络/SQLite/connector/live 实现 |

通过率：`12 / 12 = 100%`。

## 6. 独立机械证据

```json
{
  "registry_rows": 72,
  "headers": 35,
  "endpoints": 29,
  "field_comparisons": 1015,
  "counts": {
    "allow": 22,
    "conditional": 4,
    "manual_only": 0,
    "disabled": 3,
    "endpointTotal": 29
  },
  "json_round_trip": true,
  "deep_frozen": true,
  "bundle_identity_fields": [],
  "runtime_enabled": false,
  "all_execution_authorized_false": true,
  "all_endpoint_runtime_enabled_false": true
}
```

异常边界精确错误码：

```json
{
  "unclosed": "CSV_UNCLOSED_QUOTE",
  "quote_in_unquoted": "CSV_INVALID_QUOTE",
  "trailing_after_quote": "CSV_TRAILING_CHARACTERS",
  "row_width": "REGISTRY_ROW_WIDTH_INVALID",
  "cross_project": "PROJECT_ID_MISMATCH",
  "invalid_url": "ENDPOINT_URL_INVALID",
  "http": "ENDPOINT_URL_UNSAFE"
}
```

## 7. 缺陷与遗留分类

- 本轮必须修复：0。
- 已明确接受为遗留：0。
- P0：0。
- P1：0。
- P2：0。

原复审问题 `CR-P1-001` 与 `CR-P2-001` 均在本轮 QA 中保持关闭，未发现回归。

## 8. 真实性边界与上线建议

- 当前产物只是本地、内容寻址、research-only 的 policy loader，不是采集器、连接器、数据库或可见新闻服务。
- `allow` 仅表示政策资格，不表示执行授权；所有 endpoint 均保持 `executionAuthorized=false` 与 `runtimeEnabled=false`。
- live connectors、live snapshots、网络采集与 SQLite 数量均为 0。
- 当前不能宣称 AI Model Radar 已经获得真实动态、实时刷新或本地可用数据链路。
- QA 建议：**允许当前 MR-DATA-001 测试报告进入 `test-report-review`；不启动 MR-DATA-002+、DevOps、部署或生产发布。**

## 9. 停止门

本测试单元在 `test-report-review` 停止，等待超级无敌帅超超总审核当前报告；不批准本报告，不自动路由任何下游角色。
