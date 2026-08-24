# AI Model Radar MR-DATA-001 代码审查报告

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
