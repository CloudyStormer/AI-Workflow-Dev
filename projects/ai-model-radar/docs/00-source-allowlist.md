# AI Model Radar 来源白名单专项调研

- 项目：AI Model Radar
- change_id：`research-20260814-radar-source-allowlist-001`
- 版本：1.0
- 状态：ready-for-review
- 信息截止日 / 访问日：2026-08-14（Asia/Shanghai）
- 研究角色：固定 `01 市场调研员`
- 入场依据：超级无敌帅超超总于 2026-08-14 对《来源白名单专项调研入场申请》明确回复“同意”
- 地区：全球 + 中国大陆；语言以中英文官方源为主
- 入场时安全返回点：`product-release-scope-review`；调研期间并行治理已在提交 `b55ffe4` 批准该门并把当前权威门推进为 `cross-project-replanning-direction`。本交付只返回当前权威门，不覆盖该决定、不自动路由任何下游角色
- 配套登记表：[`docs/00-source-registry.csv`](./00-source-registry.csv)

## 1. 调研摘要

本轮建立的是“每天持续发现国内外主要模型 / 平台变化的来源系统”，不是列出 20 条新闻，也不实现爬虫、接口、数据库、任务调度或部署。

结论如下：

1. **主链必须以官方结构化源开始。** 推荐顺序为：官方 RSS / API / Atom / `llms.txt` → 官方 changelog / release notes → 官方 GitHub Releases / 模型卡 → 官方新闻 HTML。聚合媒体和社区只做发现，必须回主源核验。【事实 + 角色推断｜高置信度】
2. **国内外都要覆盖，但“所有平台 / 所有模型”是持续扩展目标，不能伪装成一次性穷举完成。** 本次核心池覆盖 OpenAI、Anthropic、Google / Gemini、Meta / Llama、xAI、Mistral、Cohere，以及 Qwen / 百炼、DeepSeek、智谱、百度千帆、火山方舟 / 豆包、腾讯混元、Kimi、MiniMax；另为 AWS Nova、Microsoft Phi、NVIDIA、IBM Granite、讯飞、华为盘古、阶跃星辰、百川、零一万物、商汤等设置待验证候选位。【事实 + 范围声明｜高置信度】
3. **GitHub、Hugging Face 和 arXiv 是跨厂商高价值机器源，但不能单独证明“新模型正式发布”。** commit、`lastModified`、SDK 发版只是线索；必须由厂商公告、模型卡、release note 或论文交叉确认。【事实 + 角色推断｜高置信度】
4. **页面公开不等于允许全文复制。** 默认长期只保留标题、发布方、时间、版本、事件类型、canonical URL、短摘要、许可证标识和内容哈希；正文、PDF、Release assets、模型权重和 gated 内容不镜像。【事实 + 角色推断｜高置信度】
5. **无需把所有源“实时爬一遍”。** 结构化发布源按 1—2 小时增量，官方 HTML 每日，论文 3—6 小时 / 每日批次，状态源 5—10 分钟但独立成可用性事件；足以支撑每日筛选约 10—20 个高价值事件。【角色推断｜高置信度】

## 2. 白名单判定与来源层级

### 2.1 判定状态

| 状态 | 含义 | 允许动作 |
|---|---|---|
| `allow` | 官方公开机器接口 / RSS / Atom，目标路径和用途清晰 | 最小字段增量读取、条件请求、署名回链；不等于全文 / 权重再分发许可 |
| `conditional` | 官方 HTML、需 API key / OAuth / 协议接受，或内容许可证逐项变化 | 条件满足前不运行；默认只存元数据、短摘要、链接和哈希 |
| `manual_only` | 只能由真人正常访问做小样本核验 | 不自动请求、不复制 Cookie、不批量存储、不绕验证 |
| `disabled` | 条款 / robots 禁止、登录 / 验证码 / 私有页、风险高且规则未核清 | 立即停用；不能换 IP、UA、账号或抓隐藏接口规避 |

RFC 9309 明确 Robots Exclusion Protocol 不是访问授权机制；robots `Allow` 不能推翻条款禁止，robots 缺失 / 404 也不能被当成自动化许可（[RFC 9309，2022-09](https://www.rfc-editor.org/rfc/rfc9309.html)）。【事实｜高置信度】

### 2.2 来源优先级

1. P0：厂商官方 release / changelog / RSS / API、官方仓库发布、官方模型卡。
2. P1：官方新闻 / Blog / 云产品公告 HTML、官方状态页。
3. P2：论文 / 标准 / 政策和高质量行业研究；用于趋势与交叉验证。
4. P3：媒体、社区、排行榜、社交平台；仅发现线索，不能直接发布成事实。

### 2.3 端点原子登记规则

配套 CSV 同时保留“来源生态束”和“可执行端点”两层：

- `AIR-END-*` 且 `category=endpoint-policy` 的 29 行是端点级运行裁决；每行只对应一个精确 URL、一个访问方式和一个四态决定。
- 其他行用于描述厂商 / 平台来源生态、版权与降级关系。若 `access_method` 含 `+`，该行是**不可直接执行的组合束**，其 `decision` 只是整束的研究分级；连接器不得据此放行任何子端点。
- 未来连接器只能使用 `AIR-END-*` 端点行，或使用不含 `+` 且确实只描述一个 endpoint/path 的原子行；存在冲突时，端点行优先，`disabled` 优先于其他状态。
- `link-only`、`pending verification`、`client-only` 等只作为 `notes / allowed_use / prohibited_use` 限定词，不新增第五种决定；决定值始终只有 `allow / conditional / manual_only / disabled`。

因此，厂商 HTML、`llms.txt`、GitHub、HF 和状态接口可以分别熔断，不会因同属一个厂商而互相继承许可。【角色推断｜高置信度】

2026-08-14 终检对 26 个 `allow / conditional` 原子端点各做一次 5 秒上限的无登录 GET：16 个返回 HTTP 200，10 个在本地网络窗口内超时；未重试、未换身份、未绕限。该快照只反映当时可达性，不取代前述官方文档、条款和逐源核验；超时端点在实现前必须先做低并发 canary，失败时按登记表降级，不能退回受限网页抓取。【事实 + 运行判断｜高置信度】

## 3. 国内外厂商核心来源池

### 3.1 国际厂商

| 厂商 | 已验证官方入口与日期 | 判定、频率与风险 |
|---|---|---|
| OpenAI | [News](https://openai.com/news/)、[News RSS](https://openai.com/news/rss.xml)、[Release Notes](https://openai.com/products/release-notes/)、[Status JSON](https://status.openai.com/api/v2/summary.json)、[GitHub](https://github.com/openai)、[Python SDK Releases Atom](https://github.com/openai/openai-python/releases.atom)。2026-08-14 核验到 News 8月仍更新，RSS / JSON / Atom 无需登录。【事实｜高】 | RSS / 状态 / Atom=`allow`，HTML=`conditional`；RSS / release 每小时，GitHub 每2小时，状态 5—10分钟。只存元数据和短摘要，遵守[使用条款](https://openai.com/policies/terms-of-use/)。本轮 HTML 直接请求曾返回 403，但搜索索引和 RSS 可读，运行时应优先 RSS 并记录降级。【事实 + 推断｜高】 |
| Anthropic / Claude | [Newsroom](https://www.anthropic.com/news)、[Platform Release Notes](https://platform.claude.com/docs/en/release-notes/overview)、[Claude Code CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md)、[GitHub](https://github.com/anthropics)。Release Notes 核验到 2026-08-11。【事实｜高】 | 官方文档 / GitHub=`conditional`；release notes 每小时，News 每日。`status.claude.com` 本地证书域名校验失败，暂不自动接入；降级为 release notes + 人工状态核验。【事实｜高】 |
| Google / Gemini / DeepMind | [Gemini API changelog](https://ai.google.dev/gemini-api/docs/changelog)、[Google AI RSS](https://blog.google/innovation-and-ai/technology/ai/rss/)、[DeepMind Blog](https://deepmind.google/blog/)、[Vertex AI release notes](https://cloud.google.com/vertex-ai/generative-ai/docs/release-notes)。Gemini 页最后更新 2026-07-21，并说明正文 CC BY 4.0、代码 Apache 2.0。【事实｜高】 | RSS=`allow`；Gemini 文档=`conditional`（限定词：按页面许可保留署名与例外）；DeepMind HTML=`conditional`。每小时检查 RSS / changelog，Blog 每日。Vertex 页面本轮超时，列候选，不声称稳定采集。【事实｜高】 |
| Meta / Llama | [Llama 文档 / 模型入口](https://ai.meta.com/llama/get-started/)、[Meta AI Blog](https://ai.meta.com/blog/)、[Meta-Llama GitHub](https://github.com/meta-llama)、[HF 官方组织](https://huggingface.co/meta-llama)。【事实｜高】 | GitHub / HF 公开元数据=`allow`，权重=`conditional`。每2小时查元数据、Blog 每日。gated 模型可能要求登录、专用许可证或地区条件；禁止自动接受协议、绕过 gating 或镜像权重。【事实｜高】 |
| xAI | [API Release Notes](https://docs.x.ai/developers/release-notes)、[`llms.txt`](https://docs.x.ai/llms.txt)、[News](https://x.ai/news)、[Status](https://status.x.ai/)。Release Notes 核验到 2026-08-12，`llms.txt` 公开。【事实｜高】 | `llms.txt`=`allow`；HTML=`conditional`。每小时查 docs、News 每日。标准状态 JSON 本轮 403，禁用 JSON，降级低频 HTML / 人工核验；不为监控调用付费推理 API。【事实｜高】 |
| Mistral | [News](https://mistral.ai/news/)、[Docs Changelog](https://docs.mistral.ai/resources/changelogs)、[`llms.txt`](https://docs.mistral.ai/llms.txt)、[Status](https://status.mistral.ai/)、[GitHub](https://github.com/mistralai)、[HF](https://huggingface.co/mistralai)。【事实｜高】 | GitHub / HF 元数据=`allow`；`llms.txt` 与 HTML=`conditional`。docs robots 本轮 404，不能视为许可；上线前复核条款后才能启用 `llms.txt`。降级到 GitHub / HF + 人工公告。【事实｜高】 |
| Cohere | [Release Notes](https://docs.cohere.com/v2/changelog)、[`llms.txt`](https://docs.cohere.com/llms.txt)、[Blog](https://cohere.com/blog)、[Status JSON](https://status.cohere.com/api/v2/summary.json)、[GitHub](https://github.com/cohere-ai)、[HF CohereLabs](https://huggingface.co/CohereLabs)。Release Notes 核验到 2026-07-07；`llms.txt` / status JSON 可读。【事实｜高】 | 机器源=`allow`，Blog=`conditional`；结构源每小时、Blog 每日。来源监控不调用推理 API，因此不消费模型调用额度。【事实 + 推断｜高】 |

### 3.2 中国厂商与平台

| 厂商 / 平台 | 已验证官方入口与日期 | 判定、频率与风险 |
|---|---|---|
| 阿里云百炼 / Qwen | [百炼平台更新](https://help.aliyun.com/zh/model-studio/model-release-notes)、[模型上下架与更新](https://help.aliyun.com/zh/model-studio/newly-released-models)、[Qwen Blog](https://qwenlm.github.io/blog/)、[GitHub](https://github.com/QwenLM)、[HF](https://huggingface.co/Qwen)。百炼 2026年7月仍有密集更新。【事实｜高】 | 百炼 HTML / Blog=`conditional`；GitHub / HF 元数据=`allow`。云公告每日，仓库元数据每2小时。Qwen Blog `/index.xml` 本轮 404；许可证逐仓读取，不按品牌统一假定 Apache 2.0。【事实｜高】 |
| DeepSeek | [API Change Log](https://api-docs.deepseek.com/zh-cn/updates/)、[GitHub](https://github.com/deepseek-ai)、[HF](https://huggingface.co/deepseek-ai)、[Status](https://status.deepseek.com/)。Change Log 核验到 2026-04-24。【事实｜高】 | Changelog=`conditional`、GitHub / HF 元数据=`allow`；每2—4小时。Status 连续超时，降级候选；不得用社交媒体传闻补成官方事实。【事实｜高】 |
| 智谱 GLM / Z.AI | [新品发布](https://docs.bigmodel.cn/cn/update/new-releases)、[Z.AI Release Notes](https://docs.z.ai/release-notes/new-released)、[`llms.txt`](https://docs.z.ai/llms.txt)、[Blog](https://z.ai/blog)、[GitHub](https://github.com/zai-org)。Release 页面有 2026-06-16 等明确记录。【事实｜高】 | 本轮 Z.AI robots 探测超时，全部先=`conditional`；只读标题、日期、链接和短摘要。每2小时查 docs / GitHub；降级到官方仓库 / 模型卡。【事实｜高】 |
| 百度文心 / 千帆 | [千帆更新记录](https://cloud.baidu.com/doc/qianfan/s/Mmh8l4qwj)、[平台更新日志](https://cloud.baidu.com/doc/qianfan/s/Gmh4stncc)、[文档入口](https://cloud.baidu.com/doc/qianfan/)；页面标记更新时间 2026-04-23，但部分可见条目偏旧。【事实｜中高】 | HTML=`conditional`；每日 / 每周低频检查。不能由页面更新时间推断新模型发布；若连续30天无有效条目，移候选并由百度智能云公告人工核验。【事实 + 推断｜中高】 |
| 字节豆包 / 火山方舟 / Seed | [方舟文档](https://www.volcengine.com/docs/82379/)、[模型列表 / 公告](https://www.volcengine.com/docs/82379/1554711)、[Seed Blog](https://seed.bytedance.com/en/blog)、[GitHub](https://github.com/ByteDance-Seed)、[HF](https://huggingface.co/ByteDance-Seed)、[模型服务协议](https://www.volcengine.com/docs/82379/1142195?lang=zh)。模型公告核验到 2026-07-02。【事实｜高】 | 官方 HTML=`conditional`；GitHub / HF 元数据=`allow`。公告每日、仓库每2小时；服务协议单独留档并定期复核。【事实｜高】 |
| 腾讯混元 | [产品动态](https://cloud.tencent.com/document/product/1729/97765)、[产品公告](https://cloud.tencent.com/document/product/1729/132069)、[迁移公告](https://cloud.tencent.com/document/product/1729/131925)、[GitHub](https://github.com/Tencent-Hunyuan)。产品动态核验到 2026-06-22；官方说明旧平台迁往 TokenHub，计划 2026-09-30 停服。【事实｜高】 | HTML=`conditional`，GitHub 元数据=`allow`。建立迁移专项；旧来源标 `sunsetting`，TokenHub 稳定后替换，不长期依赖旧页。【事实 + 推断｜高】 |
| Moonshot / Kimi | [Kimi API Docs](https://platform.kimi.com/docs/overview)、[`llms.txt`](https://platform.kimi.com/docs/llms.txt)、[GitHub](https://github.com/MoonshotAI)、[Kimi Code Releases](https://github.com/MoonshotAI/kimi-code/releases)。【事实｜中高】 | GitHub Atom / API=`allow`；docs / llms=`conditional`（本地 curl 超时、网页可读）。Docs 每日，GitHub 每小时。Kimi Code 发版只代表客户端，不能直接等同模型发布。【事实 + 推断｜高】 |
| MiniMax | [Model Release Notes](https://platform.minimax.io/docs/release-notes/models)、[模型文档](https://platform.minimax.io/docs/guides/models-intro)、[`llms.txt`](https://platform.minimax.io/docs/llms.txt)、[News](https://www.minimax.io/news)、[GitHub](https://github.com/MiniMax-AI)、[HF](https://huggingface.co/MiniMaxAI)。Release Notes 核验到 2026-07-31。【事实｜高】 | GitHub / HF 元数据=`allow`；docs / llms=`conditional`（llms 本地超时）。Release 每2小时，News 每日；不调用付费推理接口。【事实｜高】 |

## 4. 跨厂商机器源与研究源

| 平台 | 访问、限额和版权事实 | 白名单结论 |
|---|---|---|
| GitHub Releases / Atom | [REST Releases API](https://docs.github.com/en/rest/releases/releases)；公开匿名主限额 60次 / 小时，认证通常 5,000次 / 小时，另有并发 / points 等次级限制；429 / 403 必须按 `Retry-After` 或 reset 退避（[限额](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)、[最佳实践](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api)）。公开可读不改变仓库许可证或作者版权。【事实｜高】 | `allow` 公开白名单组织的 release / tag 元数据；Webhook 优先，否则 30—120 分钟条件 GET；commit 只作线索，不镜像资产。 |
| Hugging Face Hub | [Hub API](https://huggingface.co/docs/hub/en/api)、[OpenAPI](https://huggingface.co/.well-known/openapi.json)、[rate limits](https://huggingface.co/docs/hub/rate-limits)；限额按 5 分钟窗口和 API / Resolver / Pages 分类且可变化。Gated models 可能要求登录、协议或人工批准（[说明](https://huggingface.co/docs/hub/en/models-gated)）。【事实｜高】 | 公开模型 / repo 元数据=`allow`；gated / private / 未知许可证=`conditional`；禁止自动申请权限、接受条款或下载 / 镜像权重。 |
| arXiv | [API manual](https://info.arxiv.org/help/api/user-manual.html)、[API terms](https://info.arxiv.org/help/api/tou.html)、[RSS](https://info.arxiv.org/help/rss.html)。旧 API / RSS / OAI 合计单连接、最多每3秒一次；描述性元数据 CC0，论文 PDF / source 通常仍归作者或出版商。【事实｜高】 | 元数据=`allow`，PDF / source=`conditional`；按 `cs.AI/cs.CL/cs.LG/cs.CV` 每3—6小时或每日批次，只链接摘要页。 |
| OpenReview | [API v2](https://docs.openreview.net/getting-started/using-the-api)、[Python client](https://github.com/openreview/openreview-py)、[Terms](https://openreview.net/legal/terms)。匿名 `/notes` 本轮返回 403；论文版权归作者，评审含身份 / 隐私风险。【事实｜高】 | `conditional`；只经官方客户端读取公开、已发布 / 已接收论文元数据，不采匿名、受限或个人评审数据。 |
| Statuspage / 官方状态 JSON | 例如 [OpenAI Status API](https://status.openai.com/api/)、[GitHub Status API](https://www.githubstatus.com/api/)；public page 可匿名，private / audience-specific 需登录。【事实｜高】 | public JSON / RSS=`allow`，但只生成服务可用性事件；不能把故障恢复当产品发布。 |

## 5. 候选来源池与覆盖缺口

下列厂商 / 平台属于“应覆盖但本轮没有验证到稳定发布流、条款或接口”的候选，不进入自动核心池：

- 国际：AWS / Amazon Nova（[Bedrock 文档历史](https://docs.aws.amazon.com/bedrock/latest/userguide/doc-history.html)）、Microsoft Phi（[官方 GitHub](https://github.com/microsoft)）、NVIDIA Nemotron（[NVIDIA AI Blog](https://blogs.nvidia.com/blog/category/deep-learning/)）、IBM Granite（[GitHub](https://github.com/ibm-granite)）、AI21、Databricks、Snowflake、Aleph Alpha。
- 中国：讯飞星火（[官方文档](https://www.xfyun.cn/doc/spark/)）、华为盘古（[华为云文档](https://support.huaweicloud.com/pangu/)）、阶跃星辰（[开放平台](https://platform.stepfun.com/docs)）、百川智能（[开放平台](https://platform.baichuan-ai.com/docs)）、零一万物（[GitHub](https://github.com/01-ai)）、商汤日日新（[开放平台](https://platform.sensenova.cn/)）、上海 AI Lab / InternLM（[GitHub](https://github.com/InternLM)）、ModelScope（[模型库](https://modelscope.cn/models)）。

这些入口是【事实：官方入口存在｜中高置信度】，但其“可自动读取、更新频率、robots / 条款 / 许可证”尚未全部核完。因此登记为 `candidate/pending_verification`，由每周缺口任务逐一提升或淘汰，不以搜索摘要或转载替代。

**覆盖率表达：** 产品必须显示“已启用厂商 / 目标厂商”“近 24 小时成功源 / 启用源”“待验证候选数”“连续失败数”。在候选未清零前不能宣称“全球所有模型全量覆盖”。【角色推断｜高置信度】

## 6. 受限平台与发现源

| 平台 | 核验事实 | 决策 |
|---|---|---|
| X | [Terms](https://x.com/en/tos)未经书面同意禁止 crawl / scrape；[robots](https://x.com/robots.txt)对 `*` 禁止。【事实｜高】 | Web 自动化=`disabled`；只有已批准 X API 可转 `conditional`。 |
| Reddit | [User Agreement](https://redditinc.com/policies/user-agreement)和[Data API Terms](https://redditinc.com/policies/data-api-terms)限制 scraping 和商业 / 超范围 API 使用；[robots](https://www.reddit.com/robots.txt)限制 JSON / API / search，部分 RSS 可见。【事实｜高】 | API=`conditional`，RSS / 人工只作发现；关键事实必须回官方源，支持删除同步。 |
| 微博 | [服务协议](https://weibo.com/signup/v5/protocol)要求遵 robots 且限制未经许可自动获取；[robots](https://weibo.com/robots.txt)对 `*` 禁止。【事实｜高】 | Web=`disabled`；仅获批开放平台 API 可 `conditional`。 |
| Bilibili | [用户 / 开发者协议](https://open.bilibili.com/agreement/developer-service)限制未经书面许可的机器人 / 爬虫获取内容。【事实｜高】 | Web=`disabled`；获批开放平台 API 才可按范围 `conditional`。 |
| 媒体、newsletter、排行榜 | 可提供发现速度或横向视角，但常有版权、付费、营销与二次转载风险。【角色推断｜高】 | P3 发现池；只存线索 URL，必须回厂商、仓库、模型卡、论文或监管原文。 |

## 7. 逐源合法性与版权运行门

每个实际 endpoint / path 必须单独登记，不给整个平台“一刀切”放行：

1. 发布主体、地区、语言、内容类别、canonical URL、机器端点。
2. auth / login / captcha / paywall；禁止使用浏览器 Cookie 或共享登录态采集。
3. API 文档、条款版本、robots UA + path 结果、许可证、署名 / 回链 / 删除要求。
4. 允许字段、禁止字段、原始响应 TTL、结构化保留期、个人信息标记。
5. 限额、并发、条件请求、退避、熔断、降级、最后成功 / 失败和下次合规复核日。

默认长期保留：native ID、标题、发布方、发布时间、版本、事件类型、canonical URL、license、hash、抽取事实与证据关系。原始 HTML / JSON 只在隔离处理区短暂解析，默认不超过 24 小时；图片、视频、PDF、权重、Release assets、账号数据和个人信息不镜像。【角色推断｜高置信度】

## 8. 更新频率、失败退避与降级

| 来源 | 建议频率 | 失败处理 |
|---|---:|---|
| 官方 RSS / Atom / release notes / changelog | 1小时 | ETag / Last-Modified；429 按 `Retry-After`；3次失败标 `degraded` |
| GitHub / HF 白名单组织元数据 | 1—2小时 | Webhook优先；串行 / 限额头驱动；不能换 token 绕限 |
| 官方 News / Blog / 云公告 HTML | 每日 | 结构化源失败后的同发布方备源；连续7天失败转候选 |
| arXiv | 3—6小时或每日批次 | 单连接、请求间隔至少3秒；PDF不镜像 |
| OpenReview | 每周 / 重要会议窗口 | 403立即冻结，人工复核官方客户端 / 权限 |
| public Status JSON | 5—10分钟 | 独立状态通道；只在广泛故障 / 重大区域影响时进主榜 |
| 条款 / robots / license | 每周哈希复核；至少每月人工复核 | 变化立即冻结新采集，重新审批 |

无明确响应头时采用 `5m → 30m → 2h → 24h` 退避；401 / 403 / captcha / robots 或条款变化立即熔断；7天无成功转候选，30天人工决定停用。统一降级链：

> 官方结构化接口 → 同发布方允许的 HTML / `llms.txt` → 官方 GitHub / HF / 模型卡 → 人工核验 → 候选冻结。

受限平台失败不能回退为网页抓取，第三方转载不能顶替官方事实源。【角色推断｜高置信度】

## 9. 去重与重要性排序

### 9.1 事件去重

- 精确主键：`source_id + native_id`；其次 canonical URL（去除 UTM / ref）+ 版本 / 模型 ID。
- 跨源聚类：`vendor + model/product + normalized_version + event_type + 72h window`。
- 辅助证据：公告 / release body 规范化哈希、Git tag、HF repo ID、arXiv ID / DOI、24小时标题语义相似度。
- 同一事件的 Blog、Changelog、GitHub、HF、论文合成一个 `event_cluster_id`，保留全部 `evidence_urls`，不删证据。
- SDK release、客户端 release、模型发布分别建事件，除非官方明确它们是同一发布；例如 Kimi Code 发版不能自动标成 Kimi 模型发布。

### 9.2 重要性（100分候选）

| 维度 | 权重 | 说明 |
|---|---:|---|
| 市场 / 开发影响 | 25 | 新模型、下线、安全、破坏性 API、许可证变化最高 |
| 来源权威 | 20 | 厂商公告 / 官方 repo / 模型卡 / 论文优先 |
| 新颖性 | 15 | 首次出现、非重复、相对基线变化 |
| 生态覆盖 | 15 | 国内外区域、开闭源、模态和供应商多样性 |
| 可行动性 | 10 | 对开发迁移、成本、能力选择的直接影响 |
| 时效 | 10 | 发布时间与首次发现差 |
| 交叉证据 | 5 | 多个独立一手证据一致 |

合规不明直接不发布；未核验社区线索建议扣 25、营销稿扣 15、重复事件扣 100。重要性与事实置信度分开：单一官方公告可以高置信但低重要性，热门传闻也不能获得事实置信度。【角色推断｜高置信度】

## 10. 可追溯字段与产品输入边界

来源登记字段见 CSV。未来事件记录至少应有：

`event_id, source_id, source_item_id, canonical_url, title, published_at, updated_at, discovered_at, vendor, model_or_product, event_type, version_or_tag, content_hash, evidence_urls, license_at_event_time, importance_score, fact_inference_label, confidence, review_status`。

本报告允许当前产品 / 架构门使用：来源状态机、核心 / 候选池、更新节奏、健康状态、去重键、事实 / 推断 / 置信度、10—20 条日筛排序方法和版权边界。

本报告**不授权**：

- 实现爬虫、连接器、API、数据库、队列、定时任务或部署；
- 调用付费模型推理接口做来源监控；
- 绕过登录、验证码、robots、gating、限额或条款；
- 自动接受模型许可证、下载 / 镜像权重、全文、PDF、图片、视频或 Release assets；
- 把本交付当作产品 / 架构批准，或自动路由 `02`。

## 11. 待审核决策

请超级无敌帅超超总选择：

- **通过**：只批准本来源证据产物，返回并停留在当前 `cross-project-replanning-direction`；不改变已批准的发布范围，不自动启动任何角色；
- **补充指定调研**：明确要追加的厂商、地区、平台或法律问题；
- **打回重做**：说明需要重做的口径。
