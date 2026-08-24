# Frontend Career Radar 公开来源自主核验增量

- 版本：1.0
- 项目：`market-analysis-dev`
- 变更组：`research-20260821-public-source-verification-001`
- 变更：`research-20260821-career-public-source-verification-001`
- 角色：固定 `01 市场调研员`（`role-market-researcher`）
- 核验日：2026-08-21（Asia/Shanghai）
- 基线：`docs/00-source-allowlist.md` v1.0、`docs/00-source-registry.csv` v1.0、`docs/00-source-runtime-readiness.md` v1.0
- 状态：`ready-for-review`
- 停止门：`source-runtime-readiness-review`

> 本文只做公开来源的匿名、只读核验。未登录、未使用 Cookie/API Key、未绕过 robots/验证码/付费墙，未调用招聘申请接口，未批量拉取或存储职位，未改 registry、未启用连接器、未写代码或部署。它不是运行 canary、自动化授权或法律意见。

## 1. 结论

1. **公开技术趋势来源可由项目自主发现与核验。** MDN Blog、W3C News、公开 GitHub framework releases 都可作为无用户凭证的国内外前端技术趋势证据；它们覆盖标准、浏览器/平台变化和框架版本，不替代招聘市场样本。
2. **招聘来源仍不能被“技术可达”误写为可运行。** Wikimedia Foundation 官方招聘页持续公开、匿名可读，并回链到 Greenhouse 职位；但 Greenhouse API 的职位数据属于其客户数据，第三方最小字段长期复用范围仍未获得明确命名批准。
3. **因此三个既有事实保持不变：** `R=0`；`CAR-END-017 rights unresolved`；`CR-CONN-002=blocked-not-instantiated`。本报告没有新增 approved recruitment instance、connector 或趋势样本。
4. **对国内来源保持克制。** 中国商业招聘平台的登录、反爬、条款或再分发边界未在本轮被推翻；不能因为“项目需要真实数据”而绕过限制。公开政府/高校岗位页仅可做人工发现和回主源核验，不能充当批量自动来源。

## 2. 核验方法与边界

- 复用既有 allowlist、registry、2026-08-16 readiness 及 `CAR-END-017` 的 conditional 边界；没有新建招聘候选或改动端点判定。
- 匿名读取官方网页/官方文档；XML RSS 与 JSON API 如被研究浏览器 MIME/安全策略拒绝显示，记录为工具限制，不认定源站失败。
- 不从职位正文抽取或保存技能、薪资、联系人、申请问题、图片、logo 或任何候选人数据；不请求 `content=true`、申请 POST、内部/未列出职位。

## 3. 公开技术趋势来源

| 来源与精确入口 | 本轮匿名核验 | 最小字段与更新方式 | 权利/失败边界 | 结论 |
|---|---|---|---|---|
| [MDN Blog](https://developer.mozilla.org/en-US/blog/)；RSS `https://developer.mozilla.org/en-US/blog/rss.xml` | 官方博客本轮公开可读、无需登录；可见最近官方文章日期为 2026-06-15。研究浏览器不支持 RSS XML 渲染，不是 feed 远端失败。 | `title,published_at,canonical_url,short_summary,license,hash`；发布驱动，既有建议每 6 小时以下条件读取，未来启动前须单端点 canary。 | [MDN 许可说明](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license) 指出文档通常 CC BY-SA，须署名/回链；不复制全文、视觉资产或未单独许可内容。 | **事实｜高：公开技术趋势候选。** 不等于招聘需求。 |
| [W3C News](https://www.w3.org/news/)；RSS `https://www.w3.org/news/feed/` | 新闻页本轮公开可读；RSS 被研究浏览器以 MIME 限制拒绝渲染，不是站点故障。 | `guid,title,published_at,canonical_url,TR_status,hash`；周级/不定期，后续如获批每日以下检查即可。 | [W3C 2023 文档许可](https://www.w3.org/copyright/document-license-2023/)覆盖相应文档；测试套件/软件仍须逐仓库许可。 | **事实｜高：标准变化旁证。** |
| [React 官方公开 releases](https://github.com/react/react/releases)；REST `https://api.github.com/repos/facebook/react/releases` | 官方 public release 页本轮无需登录可读，页面列出最近 release 与发布日期；[GitHub 文档](https://docs.github.com/en/rest/releases/releases)确认 public resources 的 releases GET 可无认证。 | `release_id,tag_name,name,published_at,prerelease,html_url,license,hash`；发布驱动，未来只对 allowlist 仓库低频条件 GET。 | 不下载 asset、不收用户资料；响应头/官方限流优先，429/403 不绕过；版本发布不等于市场招聘信号。 | **事实｜高：框架生态证据。** |
| 既有 Node/Vue/Angular/Svelte/Vite/Next/Nuxt/Astro/React Router 官方 GitHub Release 端点 | 本轮不逐一拉取；仍仅保留 approved registry 中的技术来源。 | 同 GitHub release 最小字段；按项目自身发布节奏。 | 每仓库许可证、官方身份和配额独立；不能因一个 React 页面可读而推断全部源都稳定。 | **事实｜高（既有登记）/未知（本轮未逐源重验）。** |

### 3.1 对职业雷达的正确用途

这些来源可以为“技术栈趋势、标准成熟度、框架维护活跃度”提供可追溯事实；不能直接证明中国大陆前端岗位需求、薪资、公司招聘数量或用户必须学习的优先级。任何职业建议仍需与合法招聘样本、地区/层级分层和权威统计交叉验证。

## 4. 公开招聘具体实例：Wikimedia Foundation + Greenhouse

| 维度 | 本轮/既有证据 | 结论 |
|---|---|---|
| 第一方主体与回链 | [Wikimedia Foundation 招聘页](https://wikimediafoundation.org/jobs/)本轮匿名公开可读，列出 Remote 的产品/技术岗位，并通过 `grnh.se` 回链到 `job-boards.greenhouse.io/wikimedia/jobs/{id}`。页面页脚说明除另注外站点内容为 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。 | **事实｜高：** 具体公司与 board 关系可核验。 |
| 精确端点 | `https://boards-api.greenhouse.io/v1/boards/wikimedia/jobs`；2026-08-16 readiness 已做一次匿名 GET/ETag/304 的小样本核验。本轮不重复请求 JSON 或保存岗位。 | **事实｜高（历史一手小样本）：** 技术可达的具体候选存在。 |
| 官方文档状态 | `https://developers.greenhouse.io/job-board` 本轮会跳转登录页；这显示文档入口的访问形态发生变化，但不等于公开 board endpoint 已失效。 | **事实｜高：** 不可以使用登录绕过或将文档入口替换成网页爬虫。 |
| 权利边界 | [Greenhouse MSA](https://www.greenhouse.com/master-subscription-agreement) 将 job descriptions 列为 Customer Data；Wikimedia 的站点许可没有明确延伸到 Greenhouse 第三方 API 数据域。其[条款](https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use)也将第三方资源责任与其自身项目内容分开。 | **事实｜高；推断｜中高：** 最小字段长期复用仍须命名权利审核。 |

### 4.1 严格不变的招聘状态

```text
conditional_recruitment_instance_candidates = 1   # CAR-END-017 提案/研究候选
approved_executable_recruitment_instances (R) = 0
runtime_enabled_recruitment_instances = 0
CR-CONN-002 = blocked-not-instantiated
```

`CAR-END-017` 仍未写入 registry，`rights unresolved` 仍未解除。即使第一方招聘页可公开读取，或 Greenhouse 端点未来再次返回 200，也不能视为“允许持续抓取、商业展示或再分发”。

### 4.2 未来仅在明确批准后才可做的最小字段边界

如果且仅如果雇主书面确认，或项目指定产品/法务审核人明确记录许可解释，后续 canary 才可考虑：`employer,board_token,external_job_id,title,location,first_published,updated_at,absolute_url,first_seen,last_seen,closed_at,etag,hash,accessed_at`。

永久排除：`content=true`、描述/HTML、logo/图片、薪资正文、内部 ID、requisition/compliance 字段、联系人、申请问题、简历和所有候选人/申请数据；不调用 POST，不用作模型训练。

## 5. 更新频率、失败与降级

- 技术来源为发布驱动，未来日报可每日检查；不是供应商“每日一定发布”的承诺。
- 若未来获批：优先官方 RSS/API/Release；`429` 服从 `Retry-After`，无响应时指数退避；`401/403`、验证码、robots/许可/条款改变、跨域重定向或字段越界立即熔断，不切换账号、IP、UA 或 Cookie。
- 招聘来源的降级链仅可为：公司官方 careers 页人工核验 → 已批准的公司级 ATS 最小字段端点。受限商业招聘平台只做人工线索，不能成为自动化回退。
- 当前未获批，故本项目不轮询、不抓取、不建立任何“伪实时”招聘图表。

## 6. 事实、推断和限制

- **事实｜高：** MDN、W3C、React Release 和 Wikimedia 招聘页本轮均能匿名公开读取；官方链接见上文。
- **事实｜高：** RSS/JSON 的浏览器 MIME/安全拒绝和 Greenhouse 文档跳转登录是当前工具/入口观察；它们不能被夸大为源站整体不可用，也不能成为绕过的理由。
- **推断｜高：** 技术趋势源可自主核验并为职业雷达提供证据，但不构成招聘市场样本。
- **推断｜高：** `CAR-END-017` 只能维持 concrete conditional candidate；在权利、CR-PM-102 映射、canary、`.REV`、`.QA` 和明确运行授权前，不能让 `R` 从 0 变 1。
- **未知：** 中国大陆公开、可长期复用且有明确授权的公司级 ATS 实例；该缺口不能由受限平台或示例数据填补。

## 7. 审核停止点

本报告不改写主工作流，不批准后端/UI/架构/开发，不改 registry，不启用连接器，不路由下游。它停在 `source-runtime-readiness-review`，并应返回原主门。
