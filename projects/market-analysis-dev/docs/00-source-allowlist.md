# Frontend Career Radar 来源白名单专项调研

- 项目：Frontend Career Radar（前端职业成长雷达）
- change_id：`research-20260814-career-source-allowlist-001`
- 版本：1.0
- 状态：ready-for-review
- 信息截止日 / 访问日：2026-08-14（Asia/Shanghai）
- 研究角色：固定 `01 市场调研员`
- 入场依据：超级无敌帅超超总于 2026-08-14 对《来源白名单专项调研入场申请》明确回复“同意”
- 入场时安全返回点：`product-release-scope-review`；调研期间并行治理已在提交 `b55ffe4` 批准该门并把当前权威门推进为 `cross-project-replanning-direction`。本交付只返回当前权威门，不覆盖该决定、不自动路由任何下游角色
- 配套登记表：[`docs/00-source-registry.csv`](./00-source-registry.csv)

## 1. 调研摘要

本轮只回答“哪些一手来源可以成为后续采集的合法、稳定、可追溯入口”，不实现采集器、API、数据库、排序服务或部署。

结论如下：

1. **技术动态的核心池可以自动化。** MDN、W3C、WHATWG、TC39、浏览器厂商、框架官方博客和 GitHub Releases 均能提供可追溯的一手更新；优先使用 RSS、公开 API 和官方仓库元数据，正文只保留最小必要摘要、哈希和原链接。【事实｜高置信度】
2. **招聘证据不能依赖通用商业招聘站抓取。** Greenhouse、Lever、Ashby 提供公开的已发布岗位接口，但第三方聚合与再分发权利并非全部明确，因此列为“条件许可核心源”，须以明确公司白名单、最小字段、回链、删除同步和逐源复核为前提。【事实 + 角色推断｜高 / 中置信度】
3. **中国大陆岗位覆盖存在真实缺口。** 腾讯招聘条款明确禁止以程序抓取平台信息；字节 robots 允许部分公开路径但没有赋予再利用权；阿里、美团、华为未验证到适用于第三方聚合的公开稳定 API。因此这些站点不进入自动采集核心池，只能人工、回链或待书面授权。【事实｜中高—高置信度】
4. **职业趋势必须与招聘证据分层。** 国家统计局、BLS、O*NET用于年度 / 版本校准；Stack Overflow、State of JS、GitHub Octoverse、WEF 只能作为带样本偏差的背景证据，不能替代中国招聘样本。【事实 + 角色推断｜高置信度】
5. **“实时”不等于价值更高。** 浏览器发布和高风险弃用可 1—6 小时更新；技术 RSS 6—24 小时；获批 ATS 4—6 小时；统计调查按月检查新版即可。产品每日快照可在 09:00 生成，同时保留来源时间、首次发现和最后核验时间。【角色推断｜高置信度】

核心方法是：

> 官方技术源 + 合法公开 ATS 公司白名单 + 权威统计低频校准；聚合平台只做发现线索，无法回到官方原始记录的内容不进入核心样本。

## 2. 口径、时间窗与判定规则

### 2.1 地区与时间窗

- 招聘基线：中国大陆一线 / 新一线城市及公开远程岗位；全球公开岗位只作技术方向和远程对照。
- 技术动态：全球 Web 标准、浏览器、JavaScript / TypeScript、Node.js、主流前端框架及工程工具。
- 趋势数据：优先最近一个完整发布版本；年度调查不被伪装成日更数据。
- 访问与合法性核验日：2026-08-14。动态条款、robots、接口文档必须在启用前复核，并至少每 30 天复核一次。

### 2.2 白名单状态

| 状态 | 含义 | 可执行边界 |
|---|---|---|
| `allow` | 官方 RSS / 公开 API / 明确开放许可，且用途与接口说明一致 | 可自动读取最小必要字段；遵守速率、署名、回链、删除同步 |
| `conditional` | 页面公开或接口公开，但第三方聚合、全文存储、再分发权利未完全明确 | 默认只存元数据、短摘要、证据哈希和原链接；逐域 / 逐公司批准后启用 |
| `manual_only` | 允许人工浏览核验，但不具备清晰自动化授权或稳定公开接口 | 不调用隐藏 XHR、不绕过登录 / 验证码 / 付费墙；人工留证 |
| `disabled` | 条款禁止、需要未获授权的密钥 / 登录，或存在反爬、隐私、版权冲突 | 不自动访问；只有新授权和重新核验后才可变更状态 |

`robots.txt` 只表达自动抓取偏好，不是访问授权。RFC 9309 明确 Robots Exclusion Protocol 不是访问授权机制；条款、版权、API 文档和数据用途仍要独立检查（[RFC 9309，2022-09](https://www.rfc-editor.org/rfc/rfc9309.html)）。【事实｜高置信度】

### 2.3 来源优先级

1. P0：官方、机器可读、许可和更新语义清晰；可作为生产白名单核心。
2. P1：官方公开，但第三方聚合或内容再利用边界需逐源确认；条件启用。
3. P2：年度趋势、方法报告、人工核验来源；只作校准或候选。
4. P3：受限聚合平台、社交平台、搜索摘要；只能发现线索或直接禁用。

### 2.4 端点原子登记规则

配套 CSV 同时保留“来源生态束”和“可执行端点”两层：

- `CAR-END-*` 且 `category=endpoint-policy` 的 16 行是端点级运行裁决；每行只对应一个精确 URL、一个访问方式和一个四态决定。
- 其他行描述技术组织、框架、招聘或趋势来源生态。若 `access_method` 含 `+`，该行是**不可直接执行的组合束**，其 `decision` 不能授权任何子端点。
- 未来连接器只能使用 `CAR-END-*` 端点行，或使用不含 `+` 且确实只描述一个 endpoint/path 的原子行；存在冲突时，端点行优先，`disabled` 优先于其他状态。
- `link-only`、`pending authorization`、`pending legal` 等只放在 `notes / allowed_use / prohibited_use` 作为限定词；决定值始终只有 `allow / conditional / manual_only / disabled`。

由此可把框架博客与 GitHub Releases、W3C HTML 与 RSS、厂商职位说明与 ATS API 分别熔断，不会由组合行误放行。【角色推断｜高置信度】

2026-08-14 终检对 16 个 `allow / conditional` 原子端点各做一次 5 秒上限的无登录 GET：8 个返回 HTTP 200，`CAR-END-013` 返回 HTTP 403，另 7 个在本地网络窗口内超时；未重试、未换身份、未绕限。该快照只反映当时可达性，不改变接口权利判断；403 / 超时端点在实现前必须按官方限额低并发 canary，失败则降级或人工复核，禁止回退到登录态或商业招聘页抓取。【事实 + 运行判断｜高置信度】

## 3. 核心来源池

### 3.1 官方技术与标准源

| 来源 | 可访问方式与更新频率 | 决策与证据 |
|---|---|---|
| MDN Blog | [RSS](https://developer.mozilla.org/en-US/blog/rss.xml)，日—周级；建议 6 小时条件请求 | `allow`。MDN 说明文档通常采用 CC BY-SA、示例代码通常 CC0，必须署名并遵守具体页面许可（[许可说明](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Attrib_copyright_license)）。【事实｜高】 |
| W3C News / Technical Reports | [News RSS](https://www.w3.org/news/feed/) + [TR](https://www.w3.org/TR/)，周级 / 不定期；建议每日 | `allow`。W3C 文档许可允许在保留版权声明和原链接等条件下复制分发（[2023 Document License](https://www.w3.org/copyright/document-license-2023/)）；软件和测试套件另查许可证。【事实｜高】 |
| WHATWG | [Blog](https://blog.whatwg.org/)、[Feed](https://blog.whatwg.org/feed)、[GitHub](https://github.com/whatwg)；提交持续、博客低频 | `conditional`。监控提交 / issue / release 元数据，规范正文按具体许可核验，不整篇复制。【事实 + 推断｜高 / 中】 |
| TC39 | [Proposals](https://github.com/tc39/proposals)、[Notes](https://github.com/tc39/notes)；建议 6 小时检查提案阶段变化 | `allow`，按仓库 LICENSE 使用；会议纪要只做摘要和回链。【事实｜高】 |
| Chrome for Developers / Chrome Releases | [开发者博客](https://developer.chrome.com/blog)提供 RSS；[Chrome Releases](https://chromereleases.googleblog.com/)；发布可达日级 | `allow`，抓标题、版本、日期、短摘要和链接；Google Developers 页面通常 CC BY 4.0、代码 Apache 2.0，具体页脚优先。【事实｜高】 |
| Firefox / MDN release notes | [Firefox for developers](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases) + [Firefox releases](https://www.mozilla.org/en-US/firefox/releases/)；稳定版约月级 | `allow`，每日检查版本页即可；许可按 MDN / Mozilla 页面分别记录。【事实｜高】 |
| WebKit Blog | [Blog](https://webkit.org/blog/) + [RSS](https://webkit.org/feed/)；月内多次 | `conditional`，只存元数据、短摘要、分类和链接；不复制 Apple / WebKit 视觉素材或整篇正文。【事实 + 推断｜高 / 中】 |
| TypeScript Blog | [官方博客](https://devblogs.microsoft.com/typescript/) + [Feed](https://devblogs.microsoft.com/typescript/feed/)；版本期高频 | `conditional`，正文版权逐页核验；版本元数据优先 GitHub Releases。【事实｜高】 |
| Node.js | [Blog](https://nodejs.org/en/blog/) + [release/LTS policy](https://nodejs.org/en/about/previous-releases)；patch 可周级 | `allow`，建议 6 小时检查 GitHub release，Blog 每日；保存版本、LTS 状态和原链接。【事实｜高】 |
| GitHub Releases 重点仓库 | [Releases REST API](https://docs.github.com/en/rest/releases/releases)；建议 1—6 小时，使用 ETag | `allow`。匿名请求主限额为 60 次 / 小时；必须遵守 `Retry-After` / reset，不得多 token 绕限（[官方限额文档](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)）。首批仓库：React、Vue、Angular、Svelte、Vite、Next.js、Nuxt、Astro、React Router、TypeScript、Node.js。【事实｜高】 |

框架博客用于解释“为什么变”，GitHub release 用于确认“何时、哪个 tag 变了”。同一事件合并，不把博客和 release 计为两条市场信号。【角色推断｜高置信度】

### 3.2 招聘证据源

| 来源 | 官方事实 | 白名单结论 |
|---|---|---|
| Greenhouse Job Board API | 官方文档说明已发布 Job Board 的 GET 数据公开且无需认证，示例端点为 `GET /v1/boards/{board_token}/jobs`（[文档](https://developers.greenhouse.io/job-board)，访问 2026-08-14）。【事实｜高】 | `conditional`。只允许明确纳入的公司 board token；第三方聚合 / 再分发权利未被该文档普遍授予，启用前逐公司核验；不调用申请 POST、不采候选人数据。 |
| Lever Postings API | 官方文档说明 `published` 岗位公开，并明确公开岗位可能被第三方抓取；GET 支持 JSON（[官方仓库](https://github.com/lever/postings-api)，访问 2026-08-14）。【事实｜高】 | `conditional`。只抓公开岗位最小字段与 hosted URL；不调用申请 POST；客户岗位文本版权仍需回链和最小存储。 |
| Ashby Job Postings API | 官方接口返回当前已发布岗位，字段包括 `publishedAt`、远程 / 工作方式、岗位和申请 URL（[文档](https://developers.ashbyhq.com/docs/public-job-posting-api)，访问 2026-08-14）。【事实｜高】 | `conditional`。只收 `isListed=true`；接口文档主要面向组织自建 careers page，第三方聚合用途需逐公司确认。 |
| 企业官方 careers page | 官方职位页是原始证据，但动态站点不天然等于开放接口。【事实｜高】 | `manual_only` 或逐域 `conditional`。优先回溯至上述 ATS；不猜测隐藏 XHR，不访问 referral / 登录接口。 |

获批 ATS 的目标更新频率为 4—6 小时，但产品仍按日生成职业快照。删除 / 下线也必须形成状态事件，并保留 `first_seen_at`、`last_seen_at`、`closed_at`，避免把已关闭岗位继续统计为当前需求。【角色推断｜高置信度】

### 3.3 权威趋势校准源

| 来源 | 时间与口径 | 用途与限制 |
|---|---|---|
| 国家统计局城镇单位工资 | [2025 年城镇单位就业人员年平均工资](https://www.stats.gov.cn/sj/zxfb/202605/t20260515_1963707.html)，2026-05-15 发布；全国、年度，明确不含个体工商户和自由职业者 | `allow`；只能作行业 / 区域背景，不能写成“前端工资”。【事实｜高】 |
| 国家统计局统计公报 | [2025 年国民经济和社会发展统计公报](https://www.stats.gov.cn/sj/zxfb/202602/t20260228_1962662.html)，2026-02-28 发布 | `allow`；宏观就业和软件业背景，年度更新。【事实｜高】 |
| BLS Web Developers | [Occupational Outlook Handbook](https://www.bls.gov/ooh/computer-and-information-technology/web-developers.htm)，页面覆盖 2024—2034 预测，最后修改 2025-08-28；2026-08-14 的自动化链接复核返回 `403` | `manual_only`；仍可作美国职业分类的一手人工引用，但不得按当前条件自动读取，也禁止外推为中国市场结论。【事实｜高】 |
| O*NET Web Developers | [15-1254.00](https://www.onetonline.org/link/details/15-1254.00)，页面标示 Updated 2026；[引用许可](https://www.onetonline.org/shared/cite)为 CC BY 4.0 | `allow`；用于任务 / 技能分类，按 USDOL / ETA 要求署名。【事实｜高】 |
| Stack Overflow Survey | [2025 Survey](https://survey.stackoverflow.co/2025/)及[方法](https://survey.stackoverflow.co/2025/methodology)：49,009 份、177 国，采集期 2025-05-29 至 2025-06-23；高活跃用户更易被招募 | `conditional`；只作年度偏好旁证，明确自选择偏差和中国代表性不足。【事实｜高】 |
| State of JS | [2025 About](https://2025.stateofjs.com/en-US/about/)：13,002 份，2025-09-24 至 2025-11-10 收集，2026-02-03 发布；官方说明仅是特定开发者子集快照 | `conditional`；技术兴趣 / 满意度旁证，不能替代招聘需求。【事实｜高】 |
| GitHub Octoverse | [2025 Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)，2025-10-28 发布、2026-02-28 更新 | `conditional`；平台行为趋势，不把 GitHub 使用量等同岗位需求。【事实｜高】 |
| WEF Future of Jobs | [Future of Jobs Report 2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/in-full/)，2025-01-07 发布 | `conditional`；限定词为 `link-only`。仅作全球雇主观点，版权保留，不复制图表 / 大段正文。【事实｜高】 |

## 4. 候选池、受限池与失败记录

### 4.1 候选 / 待授权来源

- 中国公共招聘网、全国就业公共服务平台、国家大学生就业服务平台：属于官方招聘发现入口；教育部 2026-06-04 的[专项招聘通知](https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202606/t20260604_1438739.html)确认相关平台承载线上招聘，但本轮未验证到适用于第三方批量再利用的稳定公开 API。结论：`manual_only`，不抓简历、账号或个人数据。【事实｜高】
- Remotive：其 API 说明与总服务条款在抓取 / 再分发上存在潜在冲突（[API](https://remotive.com/remote-jobs/api)、[Terms](https://remotive.com/terms-of-use)）。结论：默认 `disabled`，只有书面确认“API专门条款优先”后才启用。【事实 + 推断｜高】
- SmartRecruiters、Workable、Recruitee：公开文档不等于本项目已有授权。SmartRecruiters / Workable 的相应接口需要 API key 或客户权限；Recruitee 的第三方聚合边界尚未核清。结论：`disabled`，限定词为 `pending legal`。【事实｜高】

### 4.2 中国商业招聘与公司站

| 站点 | 核验结果（2026-08-14） | 决策 |
|---|---|---|
| 腾讯招聘 | [服务协议](https://careers.tencent.com/m/zh-cn/termsservice.html)第 7.2.4 禁止通过程序 / 软件抓取平台相关信息；页面抓取超时、robots 跳 404 | `disabled` 自动采集；只允许人工浏览原链接或书面授权。【事实｜高】 |
| 字节跳动招聘 | [robots.txt](https://jobs.bytedance.com/robots.txt)允许 `/experienced`、`/society`、`/campus`，禁止 `/referral`；页面为动态 SPA，未发现公开招聘 API | `manual_only` / `link-only`。robots 不等于再利用授权；不得访问 referral / 登录接口。【事实｜高】 |
| 阿里人才 | 页面重定向 / 空 SPA，robots 返回 404，未验证到公开稳定 API 或再利用许可 | `disabled`，限定词为 `pending authorization`。【事实｜高】 |
| 美团招聘 | 页面 / 检索持续超时，robots 请求重定向到招聘 SPA，不是规则文件；无明确公开 API | `disabled`，限定词为 `pending authorization`；记录失败，不无限重试。【事实｜高】 |
| 华为招聘 | 公开页可浏览但职位由动态接口渲染；robots 本轮超时，页脚保留版权且无公开 API | `manual_only`，限定词为 `link-only`；禁止猜测内部接口。【事实｜中高】 |
| BOSS直聘、拉勾、猎聘、智联、前程无忧、LinkedIn、Indeed | 未核到可供本产品合法批量采集的一手公开接口，常伴登录、验证码、反爬或商业条款 | `disabled`；只接受用户提供的合法授权 API / 数据导出。【角色推断｜高】 |

超时或不确定来源已按超级无敌帅超超总的执行要求降级，没有以搜索摘要冒充完成核验。

## 5. 逐源合法性检查与运行门

每个来源首次启用、条款变更、域名 / 接口变更或 30 天复核时，必须完成：

1. 确认发布主体、canonical URL、地区、语言、内容类型和用途。
2. 独立记录 `robots_url/result/checked_at`、`terms_url/result/checked_at`、API 文档和具体许可；任何一项不明确不得提升为 `allow`。
3. 明确认证需求、速率、User-Agent、缓存 / 条件请求、署名、回链、可存字段、保留期和删除同步。
4. 检查是否包含姓名、邮箱、简历、申请表、内部岗位或不可公开字段；本项目一律不采候选人个人数据。
5. 由来源负责人记录 `last_success_at`、`last_failure_at`、失败原因、降级目标和下次人工复核日。

**启用硬门：** 只有登记表状态为 `allow`，或 `conditional` 且填写了具体公司 / 域名授权与复核人，才能进入未来连接器配置。报告本身不构成技术实现授权。【角色推断｜高置信度】

## 6. 更新频率与降级策略

| 来源类型 | 建议轮询 | 降级链 |
|---|---:|---|
| 浏览器发布 / GitHub Releases | 1—6 小时；ETag / `If-None-Match` | 遵守 `Retry-After` / reset → 指数退避 → 3 次失败转每日人工核验；不得多 token / 多账号绕限 |
| 技术 RSS / 官方博客 | 6—24 小时 | RSS → 官方博客列表每日一次 → 连续 3 次失败转人工周检 |
| 获批 Greenhouse / Lever / Ashby | 4—6 小时 | 官方 ATS API → 公司官方职位页人工核验 → 政府 / 高校公开页人工抽样 |
| 中国公司站 | 默认人工日检 / 周检 | 无公开授权不调用隐藏 XHR；失败只记录，不用聚合站补造 |
| 统计 / 年度调查 | 每月检查是否有新版；按年度 / 版本更新 | 原始机构页 → 官方 PDF / 数据表 → 无法核验则保留上一版并标“非当前” |

实时方案会增加限额、误报和条款风险，却不会提高年度趋势的有效信息量；因此采用“事件级小时更新 + 09:00 日快照 + 年度校准”的混合方案。【角色推断｜高置信度】

## 7. 去重、重要性排序与证据结构

### 7.1 去重

- 技术事件主键：`canonical_url + release_id/tag`。同一发布的官方博客、GitHub release、浏览器 release note 聚合到一个 `event_cluster_id`，以最接近发布方的 release / changelog 为主记录。
- 招聘主键：优先 `source_id + company + external_job_id`；无 ID 时使用 `company + normalized_title + normalized_location + apply_url_hash`。
- 趋势主键：`publisher + report_title + edition/version + published_at`；修订版保留版本链，不覆盖旧证据。

### 7.2 重要性排序（供后续产品 / 数据角色实现，不在本轮编码）

建议评分维度：

- 35% 证据权威性：官方机器源 > 官方 HTML > 权威报告 > 聚合发现。
- 25% 职业影响：稳定版 / 弃用 / 安全 / 招聘技能变化 > 教程 / 营销内容。
- 20% 新颖性：首次出现、非重复、与近 30 天基线差异。
- 10% 中国 / 远程相关性：地区、语言、岗位层级与目标市场匹配。
- 10% 可行动性：能否转为学习补强、风险提醒或岗位证据。

事实分、推断分必须分开保存；低置信度不能因热度被抬成事实。每个聚类最多占日榜一个位置，避免同一大版本刷屏。【角色推断｜高置信度】

### 7.3 可追溯字段

最低来源字段见 CSV；未来岗位事件还应包含：

`record_id, source_id, company, external_job_id, title, location, country, workplace_type, employment_type, seniority_raw, seniority_normalized, published_at, updated_at, first_seen_at, last_seen_at, closed_at, job_url, apply_url, description_hash, evidence_excerpt, skills_raw, skills_normalized, fact_inference_label, confidence, accessed_at`。

技能、层级、AI 影响和能力标签均属于抽取 / 推断；必须保留原文短证据、规则版本和置信度，不能写成招聘方明示事实。

## 8. 风险、反证与不成立条件

| 风险 | 反证 / 不成立条件 | 控制措施 |
|---|---|---|
| 公开接口被误解为任意再分发许可 | Greenhouse / Ashby 文档主要服务企业自建招聘页 | 公司白名单、最小字段、回链、删除同步；上线前逐公司 / 条款确认 |
| robots 允许被误解为法律授权 | RFC 9309 明确 robots 不是访问授权 | 条款、版权、API 文档、用途四项独立核验 |
| 国内岗位样本不足 | 受限平台不能通过技术绕过补齐 | 明示覆盖率和缺口；扩大获批官方 ATS / 公司页，不造数 |
| 调查偏差被包装成市场事实 | SO / State of JS 均有自选择 / 社区样本偏差 | 只作来源观点，和真实岗位分层展示 |
| 接口限额 / 波动 | GitHub、ATS 可返回 403 / 429 / 5xx | ETag、退避、缓存、单一身份；不绕限；3 次失败降级 |
| 版权与全文缓存 | 岗位描述、博客、图表仍可能受版权保护 | 只存最小必要摘要、结构化事实、哈希和原链接；不整篇再发布 |
| 岗位关闭不同步 | 公开岗位随时撤下 | `last_seen_at/closed_at`、删除 / 下线事件、每日复核 |

若后续无法获得足够的中国大陆官方岗位授权，本产品只能诚实定位为“公开可验证样本雷达”，不能宣称覆盖中国全部前端招聘市场。【角色推断｜高置信度】

## 9. 给当前产品 / 架构门的输入边界

本报告允许当前产品 / 架构工作使用以下输入：

- 白名单状态机、逐源合规字段、来源身份与健康状态；
- 技术 / 招聘 / 趋势三类不同更新节奏；
- 招聘证据最小字段、去重键、关闭事件和样本覆盖率；
- 受限来源的禁用 / 人工 / 待授权状态；
- 日快照必须显示 `as_of`、样本量、覆盖范围、缺失天数和规则版本。

本报告**不授权**：

- 实现爬虫、连接器、API、数据库、定时任务或生产部署；
- 绕过登录、验证码、robots、付费墙、接口限额或访问控制；
- 复制整篇文章、完整岗位正文、图表或个人数据；
- 把本轮交付当作产品 PRD / UI / 架构的批准，或自动路由 `02`。

## 10. 待审核决策

请超级无敌帅超超总选择：

- **通过**：只批准本来源证据产物，返回并停留在当前 `cross-project-replanning-direction`；不改变已批准的发布范围，不自动启动任何角色；
- **补充指定调研**：明确要追加的公司、技术生态、地区或法律问题；
- **打回重做**：说明需要重做的口径。
