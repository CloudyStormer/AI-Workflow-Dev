# Frontend Career Radar 来源运行可行性增量

- 版本：1.0
- 项目：`market-analysis-dev`
- 变更组：`research-20260816-real-runtime-source-readiness-002`
- 变更：`research-20260816-career-source-runtime-readiness-002`
- 角色：固定 `01 市场调研员`（`role-market-researcher`）
- 信息截止日：2026-08-16
- 现场访问窗：2026-08-16 12:28—12:34（Asia/Shanghai）
- 研究授权基线：`d3277734804745fa092803c84419861443f0cdc1`
- 落盘安全基线：`a2f79f4df27c04244a764dc36d0b9d2e7ea2a808`
- 状态：`ready-for-review`
- 停止门：`source-runtime-readiness-review`

> 本文是匿名、只读、小样本的来源实例核验，不是连接器 canary、自动采集授权或法律意见。本轮未批量拉取岗位，未使用登录、Cookie、API Key、验证码、申请 POST 或候选人数据，未修改来源 registry，也未启用运行时。

## 1. 结论

1. **具体实例已找到：** Wikimedia Foundation 官方招聘页与 Greenhouse board `wikimedia` 的主体关系、具体公共 API URL和实时岗位样本均已核实。建议将精确端点 [`https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs`](https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs) 以 `CAR-END-017` 提交审核。
2. **政策建议只能是 `conditional`：** Wikimedia 招聘站页脚声明站点内容通常采用 CC BY-SA 4.0，但 Greenhouse API 位于第三方域；Greenhouse 条款把职位描述视为客户数据，没有给无关第三方一揽子长期抓取/再发布许可。站点许可是否覆盖 API 最小字段仍需命名审核。
3. **当前仍是 NO-GO：** `CAR-END-017` 只是“具体 conditional 候选 1”，不是“获批可执行招聘实例 1”。`R=0`、`runtime_enabled=false`、招聘连接器=0，`CR-CONN-002` 必须继续 `blocked-not-instantiated`。
4. **报告通过不等于权利条件满足：** 对本报告回复“通过”只批准研究结论和 conditional 提案；仍须 Wikimedia 书面确认，或项目指定产品/法务审核人明确接受精确 GET、最小事实字段、频率、留存、署名和删除边界，随后再经 `CR-PM-102` 映射、实现 canary、`.REV` 与 `.QA`。
5. **样本限制：** 当前 board 有 18 个公开职位，但只有一条经本轮点检的岗位带 JavaScript/浏览器隐私相关要求，不能据此称为前端市场总体，也不能绘制 7/30/90 日招聘趋势。

## 2. 方法与边界

- 先从公司第一方招聘页确认法律主体和 ATS 回链，再核验精确公开 GET；不猜测隐藏 XHR，不访问申请接口。
- 每个目标只做一次或必要的一次条件请求；8 秒连接上限、20—30 秒总上限，不重试风暴、不换账号/UA/IP。
- 只读取结构与最小字段；未请求 Greenhouse `?content=true`，未保存职位全文、logo、联系人、申请问题或候选人信息。
- 将“技术可达”“robots 未禁”“内容权利”“项目批准”“runtime enabled”分开，不以任何单项替代其他门。

## 3. Wikimedia + Greenhouse 现场证据

| 证据 | 现场结果 | 标签与置信度 |
|---|---|---|
| 主体与回链 | Wikimedia Foundation 官方[招聘页](https://wikimediafoundation.org/jobs/)列出职位并链接至 `job-boards.greenhouse.io/wikimedia/jobs/{id}`，确认 board token `wikimedia` 与公司主体关系。 | 事实｜高 |
| 精确 API | 2026-08-16 12:33:01+08:00，匿名 GET `https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs` 返回 HTTP/2 200、`application/json`，无需登录/API Key/Cookie。 | 事实｜高 |
| 响应规模与字段 | 本次响应约 1,445 字节、18 个公开职位；无 `content` 字段。可用最小字段包括 `id`、`title`、`location`、`first_published`、`updated_at`、`absolute_url`。 | 事实｜高；单一一手来源 |
| 增量能力 | 响应 ETag 为 `W/"fad1f90a66b382dc4549d94af5541b5e"`；携 `If-None-Match` 的必要复核返回 304、空 body。 | 事实｜高 |
| robots | [`boards-api.greenhouse.io/robots.txt`](https://boards-api.greenhouse.io/robots.txt) 现场只禁止 `/embed/`，未禁止该 API 路径；[Wikimedia robots](https://wikimediafoundation.org/robots.txt) 对招聘页无禁止。robots 不是使用授权。 | 事实｜高 |
| API 公开性 | Greenhouse 官方 Job Board 文档说明已发布职位的 GET 数据公开且无需认证；`content=true` 会加入完整职位描述，本提案明确禁止使用。官方网页文档现场会跳转登录，因此同时保留其[官方文档仓库](https://github.com/grnhse/greenhouse-api-docs)作为可追溯依据。 | 事实｜高 |
| Wikimedia 许可 | 官方招聘页页脚说明，除另注外，该站内容采用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。 | 事实｜高 |
| 权利缺口 | Greenhouse [MSA](https://www.greenhouse.com/master-subscription-agreement) 将职位描述归为客户数据；Wikimedia 页脚许可的对象是“该站”内容，未明确写明覆盖 Greenhouse API 域及第三方持续聚合。 | 事实｜高；许可解释推断｜中高 |

### 3.1 点检岗位样本

| 字段 | 现场值 | 说明 |
|---|---|---|
| `external_job_id` | `8090103` | API 与公开职位 URL 可交叉定位。 |
| 标题 | `Software Engineer III, Product Safety & Integrity` | 来源事实；不是纯前端标题。 |
| 地区 | `Remote` | 公开页列出指定美国州及多个国家；不代表中国大陆远程可申请。 |
| 层级 | `Software Engineer III`；规范化为 `mid` 仅可作推断 | 规范化层级为角色推断｜中等置信度。 |
| 时间 | `first_published=2026-07-29T11:59:21-04:00`；`updated_at=2026-08-14T20:13:08-04:00` | 来源事实。 |
| 前端相关性 | 公开页提及 JavaScript 或相近语言、大规模应用和浏览器隐私标准 | 只能作前端相邻证据，不能外推整体招聘需求。 |
| 原始链接 | [`https://job-boards.greenhouse.io/wikimedia/jobs/8090103`](https://job-boards.greenhouse.io/wikimedia/jobs/8090103) | 只回链，不复制全文。 |

## 4. 精确 registry 提案（本轮未写入 CSV）

| 字段 | 提议值 |
|---|---|
| `source_id` | `CAR-END-017` |
| `project_id` | `market-analysis-dev` |
| `source_name` / `publisher` | `Wikimedia Foundation Greenhouse Public Jobs Endpoint` / `Wikimedia Foundation / Greenhouse` |
| `category` / `tier` | `endpoint-policy` / `P0` |
| `region` / `language` | `global/remote` / `en` |
| `canonical_url` / `endpoint_url` | `https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs` |
| `access_method` | `public-api` |
| `auth_required` / `login_required` | `no for GET` / `no` |
| `robots_url` / `robots_result` | `https://boards-api.greenhouse.io/robots.txt` / `200; only /embed/ disallowed; target API path not disallowed as observed 2026-08-16` |
| `terms_url` | `https://www.greenhouse.com/master-subscription-agreement` |
| `rights_summary` | `Wikimedia careers site states CC BY-SA 4.0; Greenhouse API is third-party-hosted customer data; cross-domain minimum-field reuse scope unresolved` |
| `allowed_use` | `one-off technical verification and canonical linking; minimal factual metadata only after named rights approval` |
| `prohibited_use` | `runtime polling before conditions; ?content=true; descriptions/HTML/images/logo/salary text; application POST; applicant/contact data; AI training` |
| `decision` / `decision_reason` | `conditional` / `company identity, board and public GET verified, but long-term third-party collection/reuse scope is not explicit` |
| `observed_frequency` | `continuous/event-driven; no SLA` |
| `recommended_polling` | `none before rights approval; 24h with ETag after approval` |
| `rate_limit` | `no fixed public GET limit found; response headers govern` |
| `retention_policy` | `no production retention before approval; after approval structured facts long-term, raw <=24h, closed tombstone <=90d` |
| `attribution_linkback` | `required; Wikimedia Foundation + CC BY-SA 4.0 + official careers/job link` |
| `personal_data` | `discard internal/requisition/compliance/applicant/contact/application fields; never call POST` |
| `traceability_fields` | `employer; board token; external job ID; title; location; first_published; updated_at; first/last seen; closed_at; absolute URL; ETag; hash; accessed_at` |
| `fallback` | `Wikimedia official careers page for manual confirmation; no restricted commercial job board fallback` |
| `disable_condition` | `careers backlink removed; rights approval absent/withdrawn; terms/license/robots/host change; 401/403/captcha; PII; unlisted/internal jobs; close-sync failure` |
| `last_verified_at` / `verification_result` | `2026-08-16` / `official careers backlink verified; board GET 200 with 18 public jobs; ETag conditional request 304; rights condition unresolved` |
| `fact_or_inference` / `confidence` | `fact+inference` / `high-technical/medium-high-rights` |
| `notes` | `execution_authority=true; parent=CAR-JOB-001; concrete_instance_candidate=true; approved_recruitment_instance=false; runtime_enabled=false; content_parameter_forbidden=true` |

审批前和报告通过后，只要权利条件仍未命名满足，该提案均保持 `conditional`：

- `conditional_recruitment_instance_candidates=1`
- `approved_executable_recruitment_instances R=0`
- `runtime_enabled_recruitment_instances=0`

## 5. 对照候选：Smile + Lever

Smile 官方[招聘页](https://smile.io/careers)确实回链一条 `Senior Front-End Engineer` 到 Lever；单岗位 API 在 2026-08-16 匿名返回 200 JSON，字段含 Toronto、Remote、Canada、岗位 ID和链接。Lever [Postings API 文档](https://github.com/lever/postings-api)说明 published postings 公开可见且可能被第三方抓取。

但 [Smile Terms](https://smile.io/terms-of-service) 对复制、发布、分发和商业利用设置广泛限制，未给本产品持续聚合最小字段的明确许可。因此该实例只作为“技术可达不等于可持续复用”的反证，不增加第三个候选，不进入本轮 registry 提案。

## 6. 权利条件、运行门与硬停止

`CAR-END-017` 从 `conditional` 升为可执行实例前，以下项目必须全部完成：

1. Wikimedia 书面确认其许可覆盖该 Greenhouse 精确 GET 的最小事实字段用途；或指定产品/法务审核人书面接受该精确用途、频率、留存、署名、同方式共享和删除边界；
2. 该命名结论写入来源政策并由超级无敌帅超超总审核；普通“报告通过”本身不替代权利审核；
3. `CR-PM-102` 完成 `endpoint_id + concrete_instance ↔ CR-CONN-002` 双向映射；
4. 低频 ETag canary、下线/关闭同步、字段白名单和 PII 丢弃测试通过 `.REV` 与 `.QA`；
5. 获批环境另行登记 `runtime_enabled=true`。

任一项缺失，`R=0`、`CR-CONN-002=blocked-not-instantiated`。官方回链消失、条款/许可/robots/host 改变、需要登录/API Key/验证码、401/403、持续 429、出现内部/未列出职位或个人/申请数据、必须抓全文、无法同步关闭或无法履行 CC BY-SA 条件时立即 fail closed。

## 7. 事实、推断与未知项

- `[事实｜高]`：官方招聘回链、精确 URL、匿名 HTTP 200、18 个公开职位、字段、ETag/304、robots 和许可/条款文本。
- `[推断｜高]`：具体候选从 0 变 1不等于 `R` 从 0 变 1；HTTP 200和 robots Allow 不等于长期复用授权。
- `[推断｜中高]`：最小事实元数据+署名回链可能形成可接受边界，但必须由命名审核人承担许可解释；这不是法律意见。
- `[未知]`：权利审核人及结论、未来 board 中前端岗位密度、7/30/90 日样本覆盖、关闭同步稳定性、实现 canary、`.REV/.QA` 和运行环境。

## 8. 审核停止点

本报告只请求审核来源运行可行性结论，不批准固定 03 的跨项目产品差距产物，不修改其待审门，不授权固定 02、05、07 或其他角色，不启用连接器，不路由下游。审核选项：**通过 / 补充指定调研 / 打回重做**。
