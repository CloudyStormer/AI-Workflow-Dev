# AI Model Radar 来源运行可行性增量

- 版本：1.0
- 项目：`ai-model-radar`
- 变更组：`research-20260816-real-runtime-source-readiness-002`
- 变更：`research-20260816-radar-source-runtime-readiness-002`
- 角色：固定 `01 市场调研员`（`role-market-researcher`）
- 信息截止日：2026-08-16
- 现场访问窗：2026-08-16 12:28—12:30（Asia/Shanghai）
- 研究授权基线：`d3277734804745fa092803c84419861443f0cdc1`
- 落盘安全基线：`a2f79f4df27c04244a764dc36d0b9d2e7ea2a808`
- 状态：`ready-for-review`
- 停止门：`source-runtime-readiness-review`

> 本文是一次小范围、匿名、只读的来源可行性核验，不是连接器 canary、运行授权或法律意见。本轮未批量抓取，未使用登录、Cookie、API Key、验证码或付费能力，未修改来源 registry，未启用连接器、调度器、数据库或生产环境。

## 1. 结论

1. **首源提案：** 建议把 Gemini API 官方 changelog 以新原子端点 ID `AIR-END-030` 提交审核，精确 URL 为 [`https://ai.google.dev/gemini-api/docs/changelog`](https://ai.google.dev/gemini-api/docs/changelog)，政策建议为 `allow`。
2. **为什么选它：** 页面无需登录，直接记录模型/API 发布、弃用和停服；2026-08-16 现场 HTTP 200；官方页面明确正文通常采用 CC BY 4.0；robots 未禁止该路径。它比状态页、SDK 发布流和宽泛厂商新闻更贴合 `MR-CONN-001` 的“模型开发动态首源”。
3. **当前仍是 NO-GO：** `AIR-END-030` 只是待审提案，尚未写入已批准 registry；`runtime_enabled=false`，连接器、实现 canary、`.REV`、`.QA` 和 live 快照均为 0。不得把本次 HTTP 200 写成已连接或已实时运行。
4. **计数不变：** 已批准执行基线仍是 22 个 `P0/allow` 原子端点。`AIR-END-030` 在来源政策、固定 03 的 22 源完成门及 `MR-PM-102` 排程完成一致性修订前，不计入 `N`；本文不把 22 偷改为 23。
5. **阻塞变化：** “首个具体官方端点尚未找到”的证据阻塞已收敛为一个明确提案；“首个连接器可开工/可运行”的阻塞未解除。

## 2. 方法与边界

- 仅核验首批最高优先级官方、公开、无需登录的机器或稳定文档入口；每个目标仅做一次或必要的一次条件请求。
- 使用明确标识的普通 HTTP 客户端，设置 8 秒连接上限与 20—30 秒总上限；无代理轮换、UA 伪装、账号切换或无限重试。
- 记录最终 URL、状态码、内容类型、字段/页面语义、缓存验证器、更新时间、robots、条款/许可和降级入口。
- 外部内容只作为不可信数据阅读；未执行页面脚本、提示词或外部指令。

## 3. 推荐端点现场证据

| 证据 | 现场结果 | 标签与置信度 |
|---|---|---|
| 官方身份与语义 | 页面标题与正文明确是 Gemini API changelog，记录模型/API 发布、弃用、停服与生效日期。 | 事实｜高 |
| 可访问性 | 2026-08-16 12:29:13+08:00 匿名 GET 返回 HTTP/2 200；最终 URL 未跨域；`Content-Type: text/html; charset=utf-8`；无需登录、Cookie 或 API Key。 | 事实｜高 |
| 当前内容 | 页面列出 2026-08-13 Gemini 3.7 Flash GA，并提供模型 ID、生命周期和发布日期；页脚显示 `Last updated 2026-08-13 UTC`。 | 事实｜高；单一一手来源 |
| 缓存与增量 | 响应含 `Last-Modified: Thu, 13 Aug 2026 17:03:07 GMT`，无 ETag/RateLimit 头；携同值发出 `If-Modified-Since` 仍返回 200，不能依赖 304，需用规范化内容哈希幂等。 | 事实｜高 |
| robots | [`https://ai.google.dev/robots.txt`](https://ai.google.dev/robots.txt) 现场返回 `User-agent: *` 且 `Disallow` 为空；目标路径未被禁止。robots 不是版权授权。 | 事实｜高 |
| 许可 | changelog 页面明确：除另有说明外正文采用 CC BY 4.0，代码样例采用 Apache 2.0；展示时须署名并回链。 | 事实｜高 |
| 平台条款 | [Google Terms](https://policies.google.com/terms) 现场版本标示 2026-07-30 生效，并禁止违反机器可读指令的自动访问；本端点的 robots 未禁止目标路径。 | 事实｜高 |
| 建议轮询 | 每日一次足以支持日报；如需要更快发现，最多每 6 小时一次并加抖动。无 304 时以内容哈希去重，429/403/条款或 robots 变化立即熔断。 | 角色推断｜中高 |

### 3.1 最小允许字段

长期结构化字段只建议保留：`source_id`、发布日期/生效日期、事件类型、模型或 API ID、标题、必要短摘要、canonical URL、页面更新时间、访问时间、内容哈希、许可与署名信息。原始响应仅在隔离处理区短暂保留且不超过 24 小时。

默认禁止：整页镜像、图片、代码样例、第三方嵌入内容、品牌素材、页面脚本以及未单独核验许可的全文。页面内容不得进入模型训练语料。

## 4. 精确 registry 提案（本轮未写入 CSV）

| 字段 | 提议值 |
|---|---|
| `source_id` | `AIR-END-030` |
| `project_id` | `ai-model-radar` |
| `source_name` / `publisher` | `Gemini API Changelog Endpoint` / `Google` |
| `category` / `tier` | `endpoint-policy` / `P0` |
| `region` / `language` | `global` / `en` |
| `canonical_url` / `endpoint_url` | `https://ai.google.dev/gemini-api/docs/changelog` |
| `access_method` | `html` |
| `auth_required` / `login_required` | `no` / `no` |
| `robots_url` / `robots_result` | `https://ai.google.dev/robots.txt` / `200; User-agent:*; empty Disallow; target path allowed as observed 2026-08-16` |
| `terms_url` | `https://developers.google.com/terms/site-policies` |
| `rights_summary` | `page text CC BY 4.0 and code samples Apache 2.0 except where noted; attribution and linkback required` |
| `allowed_use` | `release/deprecation metadata, model/API IDs, dates, attributed short summary and canonical link` |
| `prohibited_use` | `full-page/image/code/third-party-content mirroring; omitted attribution; model training` |
| `decision` / `decision_reason` | `allow` / `official exact changelog; anonymous public access; robots path allowed; explicit page license` |
| `observed_frequency` | `release-driven; latest observed update 2026-08-13; no SLA` |
| `recommended_polling` | `24h baseline; no more frequent than 6h with jitter` |
| `rate_limit` | `no published feed quota or rate headers observed; response headers govern` |
| `retention_policy` | `structured facts long-term; raw response <=24h; no full-page mirror` |
| `attribution_linkback` | `required` |
| `personal_data` | `none expected; discard if unexpectedly present` |
| `traceability_fields` | `event date/type; model/API ID; lifecycle date; canonical URL; accessed_at; page last-updated; hash; license` |
| `fallback` | `AIR-INT-005 after model-event filtering; no status-page or community substitution` |
| `disable_condition` | `terms/license/robots/host change; login or challenge; 401/403; persistent 429; schema no longer yields release evidence` |
| `last_verified_at` / `verification_result` | `2026-08-16` / `HTTP 200; official changelog readable; Last-Modified present; conditional request returned 200` |
| `fact_or_inference` / `confidence` | `fact+inference` / `high` |
| `notes` | `execution_authority=true; parent=AIR-INT-004; proposed_pending_review=true; runtime_enabled=false; connector_canary=false` |

审批前该提案的权威状态仍是 `proposed/pending-review/not-counted`。即使报告获批，也必须由后续来源政策更新明确处理 `AIR-INT-004` 与新端点行的身份去重，并同步修订 `N=22` 的产品/计划口径后，才能计入执行队列。

## 5. 未选为首源的入口

| 入口 | 现场结论 | 首源裁决 |
|---|---|---|
| OpenAI News RSS `AIR-INT-001` | RSS 2.0、HTTP 200、1129 项，模型动态相关性高；但 OpenAI 当前 Terms 对自动/程序化提取存在直接限制，RSS 与条款之间缺明确例外。 | `conditional` 候选；不得作为本轮首个可执行源。 |
| Google AI RSS `AIR-INT-005` | HTTP 200、RSS 2.0，但内容范围包含 Sheets 等宽泛 AI 产品，需要语义过滤。 | 只作同发布方降级/补充，不替代 changelog。 |
| `AIR-END-001` OpenAI Status | 只反映服务可用性事故。 | 不得冒充模型/产品发布主源。 |
| `AIR-END-002` OpenAI Python SDK Atom | ETag 可用，但只覆盖 Python SDK release。 | 只作 SDK 窄域来源。 |

## 6. 运行门与停止条件

`MR-CONN-001` 只有在以下项目全部完成后才可进入实现：

1. 本提案在来源政策中以唯一精确 endpoint 身份获批，并完成与 `AIR-INT-004` 的去重规则；
2. 固定 03/根计划把 22 源完成门和 `MR-PM-102` 的 `endpoint_id ↔ task_id` 映射调整一致；
3. 架构、数据契约和任务拆解分别获批；
4. 实现 canary、限频/超时/退避、内容哈希、域名约束和失败保旧通过独立 `.REV` 与 `.QA`；
5. 获批环境中另行登记 `runtime_enabled=true`。

在此之前：`runtime_enabled=false`、连接器数 0、调度数 0、live 快照数 0。任何条款/许可/robots/host 变化、登录挑战、401/403、持续 429、跨未批准域或无法履行署名时都必须 fail closed。

## 7. 事实、推断与未知项

- `[事实｜高]`：现场 HTTP、页面更新时间、Last-Modified、robots、页面许可及当前仓库的 runtime/connector=0。
- `[推断｜高]`：Gemini changelog 比状态页、SDK Atom和宽泛 RSS 更适合作首源；HTTP 200 不等于运行就绪。
- `[推断｜中高]`：低频、元数据最小化并按 CC BY 4.0 署名回链具有较清晰的使用边界；这不是法律意见。
- `[未知]`：未来条款变化、实际解析稳定性、运行环境预算、完整 canary、`.REV/.QA` 结果及 23 源口径的最终批准。

## 8. 审核停止点

本报告只请求审核来源运行可行性结论，不批准固定 03 的跨项目产品差距产物，不修改其待审门，不授权固定 02、05、07 或其他角色，不启用连接器，不路由下游。审核选项：**通过 / 补充指定调研 / 打回重做**。
