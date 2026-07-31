# AI Model Radar 市场调研报告

## 0. 调研元数据

| 项目 | 内容 |
|---|---|
| 项目 | `ai-model-radar` |
| 调研角色 | `role-market-researcher` |
| 调研日期 | 2026-07-31 |
| 信息截止 | 2026-07-31 18:15（Asia/Shanghai） |
| 地区 | 中国大陆、北美、欧洲及全球公开互联网 |
| 重点时间窗 | 当前可持续来源生态；法规和平台规则保留仍有效的较早文件 |
| 入场依据 | `workflow/approvals.yaml` 中 `approval-20260731-market-research-entry` |
| 事实标签 | `事实`：来源明确记载或本次直接访问结果；`来源观点`：发布方自述但未独立验证；`推断`：本角色基于证据形成的判断 |
| 置信度 | 高：一手来源且可复核，或两条独立高质量证据一致；中：单一一手来源、自述或有限样本；低：社区线索、访问不稳定或仍待验证 |

本报告不是法律意见，也不是已批准的 PRD、架构或采集实现方案。平台条款、robots、API 价格与访问资格会变化，正式开发前必须由相应角色重新核验。

## 1. 调研摘要

1. **可以做，但不应以“全网爬虫”作为成立前提。** OpenAI、Anthropic、Google、xAI、Mistral、Cohere、阿里云百炼、DeepSeek、智谱等均已有公开的官方新闻、changelog、发布页或代码仓库；OpenAI、Google DeepMind、Google AI Blog、多个状态页和 arXiv 还提供 RSS/JSON 等机器可读入口。以“官方源优先、社区源发现、二次核验后入榜”的分层方式，可构成有追溯性的动态雷达。`事实 + 推断｜高`（见[核心来源池](#7-建议的核心来源池)及[访问核验](#10-访问条款robots版权与平台风险)）
2. **每天 10–20 条应该是排序后的事件上限，不是抓取站点数或必须填满的新闻配额。** 同一模型发布通常会同时出现在公司新闻、API changelog、GitHub、媒体与社区中；先聚类为“事件”，再按影响、行动价值、证据、时效和多样性排序，才能避免把同一件事重复算五次。`推断｜高`
3. **推荐混合时效，而不是全量实时。** 仅对服务中断、重大安全事件、模型下线/价格生效、强监管公告做 15–30 分钟级监测；官方发布、GitHub、论文和评测以 2 小时级采集；每天固定生成一版 10–20 条摘要并支持按需刷新。这样能保留紧急性，同时降低噪音、平台压力、重复推理和合规暴露。`推断｜高`
4. **X、Reddit、微博和哔哩哔哩不能成为 MVP 的刚性核心依赖。** 2026-07-31 访问到的 [X robots](https://x.com/robots.txt) 对通用机器人 `Disallow: /`，X Developer Policy 还要求批准的 API 用途、展示/删除同步及再分发限制；[Reddit robots](https://www.reddit.com/robots.txt) 对通用机器人全站禁止，商业用途可能需要单独协议；[微博 robots](https://weibo.com/robots.txt) 对通用机器人全站禁止；哔哩哔哩虽未在 robots 中全站禁止，但其开放平台存在开发者准入和协议约束。四者应采用官方 API/正式授权或人工发现，不得依赖浏览器 Cookie、共享账号或规避访问控制。`事实 + 推断｜高`
5. **目前不足以证明核心池每天稳定产出恰好 10–20 条高价值事件。** 本轮验证了来源与近期开源/发布活跃度，但没有完成连续 30 天的历史回放、召回率/误报率测量和人工相关性标注。建议在项目经理获批后，将“14–30 天影子运行与人工标注”列为立项验证，而不是提前承诺产量。`事实 + 推断｜高`

## 2. 原始需求、研究目标与边界

### 2.1 原始需求

齐总希望减少每天逐个打开收藏站点的重复操作，在一个入口汇聚国内外主要大模型的官方更新、新闻、论文、社区和论坛信号，支持定时或按需刷新、跨来源去重、重要性排序和原文回链，每日筛出约 10–20 条值得关注的动态。

### 2.2 本轮研究目标

- 验证一手/高质量来源是否足以支撑该产品。
- 识别可访问方式、自然更新频率、登录要求、条款、robots、版权和平台风险。
- 比较同类聚合、Newsletter、研究与模型评测产品。
- 给出去重、事件聚类、重要性排序和摘要置信度方法。
- 比较实时、小时级和每日方案，并给出建议边界。

### 2.3 排除项

- 不决定最终产品功能、页面、技术栈、数据库和部署方案。
- 不创建采集器，不登录第三方账号，不调用需付费/需授权 API。
- 不把厂商自述性能、媒体排名或社区热度直接认定为客观事实。
- 不承诺抓取条款不明、robots 禁止、需登录或可能侵犯版权的内容。
- 不进入项目经理、PRD、UI/UX、架构或开发阶段。

## 3. 需要验证的关键假设与结论

| 假设 | 结论 | 证据与限制 | 性质/置信度 |
|---|---|---|---|
| 主要厂商存在可持续的一手来源 | 基本成立 | 多家厂商具有新闻、API changelog、文档发布页或官方 GitHub；但格式分散、部分无 RSS | 事实｜高 |
| 不抓 X/微博/B站也能做出有价值的第一版 | 成立概率高 | 官方 changelog、新闻 RSS、GitHub、论文、评测和监管源已覆盖“正式发生了什么”；社媒更多承担早发现和讨论热度 | 推断｜高 |
| 社区热度可直接代表重要性 | 不成立 | 热度易受平台用户结构、发布时间、营销和重复传播影响；应只做弱信号 | 推断｜高 |
| 只按 URL 或标题即可去重 | 不成立 | 同一事件会有多语言、多标题、多平台和后续修订，需要实体+事件类型+版本/日期+语义聚类 | 推断｜高 |
| 全量实时优于每日摘要 | 不成立 | 大部分厂商更新是发布驱动而非秒级流；全量实时增加噪音、成本、重复与条款风险 | 推断｜高 |
| 核心来源自然保证每日 10–20 条 | 待验证 | 需要至少 14–30 天影子运行，测量候选量、独立事件量和高分事件量 | 事实 + 推断｜高 |

## 4. 行业现状、趋势与驱动因素

### 4.1 来源已经从“新闻网站”分裂为多条并行信号链

| 信号链 | 典型内容 | 代表证据 | 结论 | 性质/置信度 |
|---|---|---|---|---|
| 公司新闻/研究博客 | 正式模型发布、研究、安全、公司与政策 | [OpenAI News](https://openai.com/news/)、[Anthropic Newsroom](https://www.anthropic.com/news)、[Google DeepMind News](https://deepmind.google/blog/) | 适合确认“大事”，但会混入公司宣传和非模型内容 | 事实 + 推断｜高 |
| API changelog/发布说明 | 模型 ID、功能、价格、弃用、生效时间 | [OpenAI API Changelog](https://developers.openai.com/api/docs/changelog)、[Claude Platform Release Notes](https://platform.claude.com/docs/en/release-notes/overview)、[Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog) | 对开发者最可行动，是 MVP 的最高优先级来源 | 事实 + 推断｜高 |
| 官方代码与权重 | 开源模型、SDK、CLI、Release、README | [Qwen GitHub](https://github.com/QwenLM)、[DeepSeek GitHub](https://github.com/deepseek-ai)、[Moonshot AI GitHub](https://github.com/MoonshotAI)、[MiniMax GitHub](https://github.com/MiniMax-AI) | 可发现开源与工程进展，但 commit 噪音远高于 release | 事实 + 推断｜高 |
| 状态页 | 中断、降级、恢复、安全运营事件 | [OpenAI Status](https://status.openai.com/history)、[Claude Status](https://status.claude.com/history)、[Google Cloud Status](https://status.cloud.google.com/) | 适合单独的紧急通道，不宜与普通新闻同榜竞争 | 事实 + 推断｜高 |
| 论文/模型社区 | 新论文、权重、模型卡、社区讨论 | [Hugging Face Daily Papers](https://huggingface.co/papers)、[arXiv cs.AI RSS](https://export.arxiv.org/rss/cs.AI)、[arXiv cs.CL RSS](https://export.arxiv.org/rss/cs.CL) | 召回高但噪音大，需要作者/机构/主题过滤和后续验证 | 事实 + 推断｜高 |
| 独立评测 | 能力、价格、速度和偏好变化 | [Arena Blog/Leaderboards](https://arena.ai/blog)、[Artificial Analysis Methodology](https://artificialanalysis.ai/methodology/intelligence-benchmarking)、[Stanford HELM](https://crfm.stanford.edu/helm/latest/) | 不能把单一总榜当真相，应保留评测方法和适用范围 | 事实 + 推断｜高 |
| 监管与标准 | 备案、标识、模型义务、风险框架 | [中国网信网](https://www.cac.gov.cn/)、[EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)、[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | 更新频率低但影响高，应设置高权重而非高频抓取 | 事实 + 推断｜高 |

### 4.2 更新节奏不均匀，发布日会突发聚集

- 2026-07-31 访问时，[OpenAI News](https://openai.com/news/) 显示 7 月 29–30 日连续多条更新，[OpenAI API Changelog](https://developers.openai.com/api/docs/changelog) 也有 7 月 30 日记录；[Anthropic Newsroom](https://www.anthropic.com/news) 显示 7 月 30 日安全文章和 7 月 24 日模型发布。`事实｜高`
- [阿里云百炼模型上下架与更新](https://help.aliyun.com/zh/model-studio/newly-released-models) 在 2026 年 7 月列出多条按日期的模型上架记录；[智谱新品发布](https://docs.bigmodel.cn/cn/update/new-releases) 与 [DeepSeek API Change Log](https://api-docs.deepseek.com/updates/) 也提供发布驱动的更新记录。`事实｜高`
- 因此“固定每源每小时一条”不符合真实分布；更合理的是增量拉取、事件聚类和每日排序。`推断｜高`

## 5. 用户问题、现有替代方案与证据边界

### 5.1 已知用户问题

当前唯一已验证的用户是齐总本人；痛点来自 `docs/00-intake.md`，包括站点分散、重复打开、同一事件重复传播、缺少中外合并视角和重要性筛选。尚未进行外部用户访谈、日志分析或付费意愿验证。`事实｜高`

### 5.2 现有替代方式

1. 自己维护浏览器收藏、RSS 阅读器和社媒关注列表。
2. 订阅每日 AI Newsletter，由编辑替用户筛选。
3. 使用 Feedly/AlphaSignal 等聚合与检索产品。
4. 直接看厂商官方博客、GitHub、Hugging Face Papers 和模型榜单。
5. 依赖量子位、机器之心、AIbase 等中文媒体做二次筛选。

### 5.3 产品机会

机会不在于“比搜索引擎抓更多”，而在于：

- 为齐总维护一套可解释、可调权重的中外模型来源池。
- 把多篇传播内容合并为一个可追溯事件，显示主源、佐证、异议和更新时间。
- 将开发者可行动变更（API、价格、下线、开源、评测变化）与泛公司新闻区分。
- 明确展示 `事实 / 来源观点 / 系统推断` 及置信度。

以上为基于原始需求和竞品观察的机会判断，未经过外部用户或商业化验证。`推断｜中`

## 6. 同类产品与聚合工作流

| 产品/来源 | 可见定位与更新节奏 | 优点 | 对本项目的限制/启示 | 性质/置信度 |
|---|---|---|---|---|
| [Feedly AI](https://feedly.com/ai) | 自称从数百万来源实时聚合、分析和优先排序 | 自定义主题、成熟订阅生态、可接 API | 厂商“实时/数百万源”是自述；通用市场情报不等于大模型事件级证据链 | 来源观点 + 推断｜中 |
| [AlphaSignal](https://alphasignal.ai/) | 自称实时追踪论文、仓库、模型和发布，并有最近 24 小时列表 | 覆盖 AI 工程与研究，接近目标品类 | 排序和来源可靠性机制不透明，不能直接把其热度当事实 | 来源观点 + 推断｜中 |
| [TLDR AI](https://tldr.tech/ai) | 官网称每个工作日一封，5 分钟读完，覆盖新闻、论文与工具 | 技术密度高、人工编辑 | 邮件是下游摘要，不适合作为事实主源，也不可批量再发布原文 | 事实 + 推断｜高 |
| [The Rundown AI](https://www.therundown.ai/) | 官网定位“每天 5 分钟”了解 AI 新闻与应用 | 面向非纯技术用户，叙事清晰 | 偏应用与教程，国内一手源和技术 changelog 不是其核心 | 事实 + 推断｜中 |
| [Hugging Face Daily Papers](https://huggingface.co/papers) | 提供日/周/月视图和邮件订阅 | 论文发现强，社区信号可见 | 只覆盖研究，社区排序不等于业务重要性 | 事实 + 推断｜高 |
| [Arena](https://arena.ai/blog) | 持续更新模型偏好/专项排行榜及评测研究 | 能补充厂商自评，覆盖多类模型 | 人类偏好和专项榜有样本/类别边界，不能替代发布事实 | 事实 + 推断｜高 |
| [Artificial Analysis](https://artificialanalysis.ai/methodology/intelligence-benchmarking) | 模型能力、价格、速度等比较；公开方法和版本 | 方法透明度较高、便于观察能力变化 | 其 Intelligence Index 为英文文本评测集合，官方也承认单一指标有适用限制 | 事实 + 推断｜高 |
| [机器之心](https://www.jiqizhixin.com/) | 中文 AI 媒体，含文章库、SOTA 模型、Shortlist 和周度会员通讯 | 中文研究与行业覆盖广 | 部分登录/会员内容；应作为发现与解读，不做唯一事实源 | 事实 + 推断｜高 |
| [量子位](https://www.qbitai.com/) | 中文 AI 媒体，首页在本次访问中显示分钟/小时级连续更新 | 国内动态快，覆盖模型、研究和产业 | 标题与媒体叙事可能强调传播性；重大事实需回到原始发布 | 事实 + 推断｜高 |
| [AIbase](https://www.aibase.com/zh/news) | AI 新闻、日报、产品库和模型工具聚合 | 召回广、中文浏览方便 | 页面混合新闻与二次摘要，事实链和授权边界需逐条核验 | 事实 + 推断｜中 |

**竞争判断：** 在本次有限公开扫描中，没有验证到一个产品同时完整满足“中文+英文、官方 changelog 优先、事件级去重、合规分层、事实/推断标签、每日用户可控 10–20 条”全部条件；但 Feedly AI、AlphaSignal、TLDR AI、Hugging Face Daily Papers、Arena 和中文 AI 媒体分别解决了其中一部分。该差异只能视为立项机会假设，不能视为“市场空白”结论。`推断｜中`

## 7. 建议的核心来源池

“核心来源池”是来源簇，不是 17 条新闻，也不是最终不可变清单。进入核心池的前提是：公开可访问、可回链、身份明确、对主要事件有直接证据价值，并且存在合规的低频访问路径。

| ID | 来源簇与直接入口 | 地区/类型 | 建议访问方式 | 自然更新节奏 | 核心用途与限制 | 性质/置信度 |
|---|---|---|---|---|---|---|
| C01 | [OpenAI News](https://openai.com/news/)、[News RSS](https://openai.com/news/rss.xml)、[API Changelog](https://developers.openai.com/api/docs/changelog)、[Model Release Notes](https://help.openai.com/en/articles/9624314-model-release-notes)、[Status RSS](https://status.openai.com/history.rss) | 国外/厂商 | RSS 优先；changelog 每 2 小时条件请求；状态 15–30 分钟 | 发布驱动；状态实时 | 模型、API、产品、价格/弃用、安全；新闻与 API 记录要合并为事件 | 事实｜高 |
| C02 | [Anthropic Newsroom](https://www.anthropic.com/news)、[Claude Platform Release Notes](https://platform.claude.com/docs/en/release-notes/overview)、[Status RSS](https://status.claude.com/history.rss) | 国外/厂商 | 公开 HTML 每 2 小时；状态 RSS 15–30 分钟 | 发布驱动 | 官方新闻与 API 变更；本次验证 `anthropic.com/news/rss.xml` 为 404，不能假设有 RSS | 事实｜高 |
| C03 | [Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog)、[Google DeepMind RSS](https://deepmind.google/blog/rss.xml)、[Google AI RSS](https://blog.google/innovation-and-ai/technology/ai/rss/)、[Cloud incidents JSON](https://status.cloud.google.com/incidents.json) | 国外/厂商 | RSS/JSON 优先；changelog 每 2 小时 | 发布驱动；状态实时 | 模型、研究、API、云服务；Google 多入口重叠，需要实体与产品线归并 | 事实｜高 |
| C04 | [Meta AI Blog](https://ai.meta.com/blog/)、[Meta Llama GitHub](https://github.com/meta-llama) | 国外/厂商/开源 | 公开 HTML 每 4 小时；GitHub REST/Release API 每 2 小时 | 发布驱动 | 研究、Llama、开源；本次验证博客 `/rss/` 为 404 | 事实｜高 |
| C05 | [xAI News](https://x.ai/news)、[xAI Release Notes](https://docs.x.ai/developers/release-notes)、[xAI Status](https://status.x.ai/) | 国外/厂商 | Release Notes 公开 HTML；状态页；不以 X 网页抓取替代 | 发布驱动 | API/模型正式更新；社媒内容必须走 X API/授权，见风险章节 | 事实｜高 |
| C06 | [Mistral News](https://mistral.ai/news/)、[Mistral Changelog](https://docs.mistral.ai/resources/changelogs)、[Mistral Status](https://status.mistral.ai/) | 国外/厂商 | 公开 HTML 每 2 小时；状态页 | 发布驱动 | 模型、API、安全、弃用；本次未验证到可用官方新闻 RSS | 事实｜高 |
| C07 | [Cohere Release Notes](https://docs.cohere.com/v2/changelog)、[Cohere Research](https://cohere.com/research) | 国外/厂商 | 公开 HTML 每 4 小时 | 发布驱动 | 企业模型、检索与研究；优先保留 changelog，营销内容降权 | 事实 + 推断｜高 |
| C08 | [阿里云百炼模型上下架与更新](https://help.aliyun.com/zh/model-studio/newly-released-models)、[平台功能更新](https://help.aliyun.com/zh/model-studio/model-release-notes)、[Qwen GitHub](https://github.com/QwenLM) | 国内/厂商/开源 | 公开 HTML 每 2 小时；GitHub API | 发布驱动，近期可多次/周 | Qwen 与百炼模型、上下线、开源；百炼也收录第三方模型，必须标记实际提供方 | 事实 + 推断｜高 |
| C09 | [DeepSeek API Change Log](https://api-docs.deepseek.com/updates/)、[DeepSeek GitHub](https://github.com/deepseek-ai) | 国内/厂商/开源 | 公开 HTML 每 2 小时；GitHub API | 发布驱动 | 模型/API/开源；本次 `feed.xml` 返回 HTML，不能当 RSS | 事实｜高 |
| C10 | [智谱新品发布](https://docs.bigmodel.cn/cn/update/new-releases)、[模型概览](https://docs.bigmodel.cn/cn/guide/start/model-overview)、[THUDM GitHub](https://github.com/THUDM) | 国内/厂商/开源 | 公开 HTML 每 2 小时；GitHub API | 发布驱动 | GLM/API/开源；厂商性能描述标“来源观点” | 事实 + 推断｜高 |
| C11 | [火山引擎发布中心](https://www.volcengine.com/news)、[火山方舟模型公告入口](https://www.volcengine.com/docs/82379/66619f8df281250274ef4f88?lang=zh) | 国内/厂商 | 公开 HTML 每 2 小时；有正式 API/Feed 再切换 | 发布驱动 | 豆包、方舟模型发布/下线；本次 `/news/rss` 返回 HTML，不当 RSS | 事实｜高 |
| C12 | [Kimi Platform Docs](https://platform.kimi.com/docs/overview)、[Moonshot AI GitHub](https://github.com/MoonshotAI) | 国内/厂商/开源 | 文档每日；GitHub API 每 2 小时 | 发布驱动 | Kimi API、模型与开源；没有验证到统一 changelog，核心性依赖 GitHub 与官方公告补齐 | 事实 + 推断｜中 |
| C13 | [MiniMax GitHub](https://github.com/MiniMax-AI)、[MiniMax](https://www.minimax.io/) | 国内/厂商/开源 | GitHub API 每 2 小时；官网每日 | 发布驱动 | 模型与开源；本次官方 Release Notes 入口未稳定获取，需开发前再确认 | 事实 + 推断｜中 |
| C14 | [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)、[OpenAI Codex Releases](https://github.com/openai/codex/releases)、[Codex Changelog](https://learn.chatgpt.com/docs/changelog) | 全球/横向机制 | 对明确 watchlist 用 REST API/Atom；避免抓全站 Trending | 小时到日 | 捕获 SDK、CLI、开源权重和版本；只跟 release/tag，不把所有 commit 当新闻 | 事实 + 推断｜高 |
| C15 | [Hugging Face Daily Papers](https://huggingface.co/papers)、[Hub API](https://huggingface.co/docs/hub/en/api)、[arXiv cs.AI RSS](https://export.arxiv.org/rss/cs.AI)、[arXiv cs.CL RSS](https://export.arxiv.org/rss/cs.CL) | 全球/研究 | RSS/API，每日；HF API 受全站速率限制 | 每日 | 研究发现；仅机构/作者/主题 watchlist 或异常高信号进入候选，论文结论标作者观点 | 事实 + 推断｜高 |
| C16 | [Arena](https://arena.ai/blog)、[Artificial Analysis](https://artificialanalysis.ai/methodology/intelligence-benchmarking)、[Stanford HELM](https://crfm.stanford.edu/helm/latest/) | 全球/独立评测 | 每日/每周检查；优先官方数据集/API | 不定期 | 交叉验证厂商能力与排名变化；必须保留评测版本、样本和方法限制 | 事实 + 推断｜高 |
| C17 | [中国网信网](https://www.cac.gov.cn/)、[EU AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)、[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) | 全球/监管标准 | 官方页面每日一次或订阅官方通知 | 低频、高影响 | 监管、标识、风险框架；不需要高频抓取，但命中时高权重 | 事实 + 推断｜高 |

### 7.1 核心池的运行原则

- 厂商新闻、changelog、文档和 GitHub 若指向同一模型/版本，只生成一个事件，保留多条证据。
- 官方自评、参数、价格和发布日期可记录为“厂商声明/官方事实”；“领先、SOTA、第一”若无独立评测，不改写为客观结论。
- 状态页事件独立于普通日榜，只有重大持续中断或安全事件才进入每日摘要。
- 核心池不是永久白名单：连续 30 天无有效命中、入口失效、条款变化或重复噪音过高时，应降级并保留审计记录。

## 8. 候选来源池

候选池用于“发现可能值得核验的事件”，不能单独把内容推入正式 10–20 条摘要。

| ID | 来源 | 建议方式 | 价值 | 风险与入榜条件 | 性质/置信度 |
|---|---|---|---|---|---|
| D01 | [Hacker News Official API](https://github.com/HackerNews/API) | 官方 Firebase API，小时级关键词/域名过滤 | 早期技术讨论、官方链接传播 | 热度不代表重要性；必须找到主源或第二高质量证据 | 事实 + 推断｜高 |
| D02 | [OpenAI Developer Community Codex](https://community.openai.com/c/codex/37)、[Hugging Face Forums](https://discuss.huggingface.co/latest) | 公共页面/RSS，低频读取；遵守各站 robots/条款 | Bug、兼容性、使用反馈 | 用户帖子是线索；不把个案当普遍事实，不采集个人资料 | 事实 + 推断｜高 |
| D03 | X 上的厂商/研究者账号 | 仅官方 X API、嵌入或人工查看 | 首发、研究者解释、争议 | 禁止通用网页抓取；需批准 API 用途、展示和删除同步；必须回到主源 | 事实 + 推断｜高 |
| D04 | Reddit AI/ML 社区 | 仅 Reddit Data API/正式协议或人工查看 | 使用体验、问题爆发、争议 | robots 全站禁止通用爬虫；商业用途可能需单独协议；只作发现 | 事实 + 推断｜高 |
| D05 | 微博厂商/研究者账号 | 官方开放能力/授权或人工查看 | 国内首发与舆情 | 通用 robots `Disallow: /`；不使用 Cookie/模拟登录；必须回链官方主源 | 事实 + 推断｜高 |
| D06 | 哔哩哔哩官方/高质量技术视频 | 正式开放平台、公开视频人工收藏或授权 | 发布会、演示、中文解释 | 视频版权和转录风险高；不下载/再分发视频或全文字幕，事实需复核 | 事实 + 推断｜高 |
| D07 | [机器之心](https://www.jiqizhixin.com/)、[量子位](https://www.qbitai.com/)、[AIbase](https://www.aibase.com/zh/news) | 公共页面低频/人工订阅 | 中文召回、解释、国内产业线索 | 二次来源；付费/登录内容不自动化；必须回到原始发布 | 事实 + 推断｜高 |
| D08 | [TLDR AI](https://tldr.tech/ai)、[The Rundown AI](https://www.therundown.ai/)、[AlphaSignal](https://alphasignal.ai/) | 人工订阅或正式 Feed/API | 编辑筛选、遗漏检测 | 不能复制 Newsletter 正文，也不能作为唯一证据 | 事实 + 推断｜高 |
| D09 | [Feedly AI](https://feedly.com/ai) | 正式账户/API，若齐总后续批准采购 | 统一 RSS/情报工作流、候选召回 | 付费与再分发边界需核验；不应与自建来源池重复付费 | 来源观点 + 推断｜中 |
| D10 | OpenReview、会议官网、研究机构实验室博客 | 官方 API/RSS 或低频公开页面 | 论文首发、审稿与会议结果 | 入口分散，格式不稳定；仅对 watchlist 机构/会议启用 | 推断｜中 |

## 9. 可访问方式与建议更新频率

| 访问层级 | 允许方式 | 建议轮询 | 是否需要登录 | 失败策略 |
|---|---|---:|---|---|
| A：官方 RSS/Atom/JSON/API | RSS/Atom、公开 JSON、官方 REST API、Webhook | 状态 15–30 分钟；普通 1–2 小时 | 多数不需要；超过限额可能需要正式 Token | ETag/Last-Modified、指数退避、速率预算、失败不切网页绕过 |
| B：公开 changelog/新闻 HTML | robots 允许且条款未禁止的公开页面，条件请求 | 2–4 小时 | 不应需要 | DOM 变化报警；入口失效后降级人工，不模拟登录 |
| C：GitHub watchlist | Releases API、tags、官方仓库 Atom/API | 1–2 小时 | 公共数据可匿名；规模化建议 GitHub App | 只监控白名单仓库，遵守速率限制和 `Retry-After` |
| D：论文/评测 | arXiv RSS/API、HF API、评测方公开数据 | 每日；重大榜单每日一次 | 通常不需要 | 只取元数据/摘要，保留论文与方法版本 |
| E：媒体/Newsletter/论坛 | 正式 RSS/API、邮件订阅、人工查看 | 每日或每 4 小时 | 可能需要 | 只作发现，不复制正文，命中后寻找主源 |
| F：社交/视频平台 | 官方 API、正式嵌入、授权或人工查看 | 候选源按成本决定 | 经常需要 | 无授权即关闭；不得 Cookie 抓取、共享登录态或绕过反爬 |

**建议：** MVP 先做 A–D；E 只接少量公开 Feed/人工种子；F 默认关闭。`推断｜高`

## 10. 访问、条款、robots、版权与平台风险

### 10.1 通用原则

- [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) 于 2022-09 发布，明确 robots 规则用于控制爬虫访问，但“不是访问授权”。因此 robots 允许不等于获得版权或合同许可，robots 禁止则应作为自动访问停止信号。`事实｜高`
- 只保存完成雷达功能所需的最小数据：规范化 URL、标题、发布方、发布时间、抓取时间、事件字段、短自写摘要、证据类型、置信度和内容指纹；默认不保存全文、图片、视频、完整评论或付费内容。`推断/风险控制建议｜高`
- 展示原始链接、发布方和时间；所有摘要使用自己的表达，必要引用保持最短；不去除水印、不热链受限媒体、不把搜索摘要当事实。`推断/风险控制建议｜高`
- 为每个源维护 `access_mode / robots_checked_at / terms_checked_at / retention / delete_sync / rate_limit / owner`，条款或 robots 变化时自动停用而非继续抓取。`推断/风险控制建议｜高`

### 10.2 重点平台风险矩阵

| 平台/来源 | 本次核验事实（截至 2026-07-31） | 风险等级 | 建议 |
|---|---|---:|---|
| X | [robots](https://x.com/robots.txt) 对通用机器人全站禁止；[Developer Policy](https://docs.x.com/developer-terms/policy) 要求批准用例、遵守 API 限制，对展示、再分发、隐私及删除/修改同步有约束 | 高 | 不网页抓取；只用获批 API/嵌入或人工；仅存 ID/链接和最小摘要，按政策同步删除 |
| Reddit | [robots](https://www.reddit.com/robots.txt) 对通用机器人 `Disallow: /`；[Data API Terms](https://redditinc.com/policies/data-api-terms) 规定按正式访问凭证使用，商业用途或超限研究可能需单独协议，并限制用户内容用途 | 高 | MVP 不自动接入；若需要，先申请并审查商业用途、保留与删除要求 |
| 微博 | [robots](https://weibo.com/robots.txt) 对通用机器人全站禁止，仅对部分指定搜索/AI Agent 开有限路径；[微博服务使用协议](https://www.weibo.com/signup/v5/protocol/) 约束平台内容和服务使用 | 高 | 仅官方开放能力/书面授权或人工查看；禁止模拟登录、共享 Cookie、批量抓取 |
| 哔哩哔哩 | [robots](https://www.bilibili.com/robots.txt) 未全站禁止，但禁止部分路径；[开放平台管理规范](https://openhome.bilibili.com/agreement/management-protocol) 要求开发者准入并遵守开放平台和用户协议 | 中高 | 不以 robots 允许推定授权；优先官方开放平台/人工；不保存视频、字幕全文和评论数据 |
| OpenAI Developer Community | [robots](https://community.openai.com/robots.txt) 禁止部分 RSS/搜索/个人路径，但本次 `latest.rss` 可访问；论坛帖子由用户生成 | 中 | 低频读取公开最新 Feed，仅作线索；不抓个人资料，不把帖子当官方公告 |
| GitHub | 提供正式 [Releases API](https://docs.github.com/en/rest/releases/releases)；[REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) 当前公开数据匿名请求通常 60 次/小时、认证用户通常 5,000 次/小时，且有二级限流 | 低到中 | 用白名单仓库、条件请求、GitHub App；不抓全站，不规避限流，收到 403/429 按头部退避 |
| Hugging Face | [Hub API](https://huggingface.co/docs/hub/en/api) 提供开放端点、客户端和 Webhook，并明确受全站速率限制；[robots](https://huggingface.co/robots.txt) 当前允许通用抓取 | 低到中 | 优先 API/公开元数据；不下载大模型权重做新闻发现，不把社区 upvote 当事实 |
| arXiv | 提供 cs.AI/cs.CL RSS；论文全文、摘要和元数据仍有各自权利与使用边界 | 低到中 | 取元数据与短摘要，回链原文；作者结论标“来源观点”，不复制全文 |
| 厂商公开新闻/changelog | 多数无需登录且可直接回链，但并非都提供 Feed，也可能修改页面和条款 | 中 | 低频条件请求、缓存最小元数据、保留访问日期；营销断言需独立评测或降置信度 |
| 媒体/Newsletter/付费内容 | 具有编辑价值，但正文、图片和邮件内容通常不可自由再分发 | 中高 | 仅做人工/Feed 发现；保存标题、链接和自写短摘要，不绕过付费墙 |

### 10.3 中国生成式 AI 与内容标识相关约束

- [《生成式人工智能服务管理暂行办法》](https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm) 于 2023-07-13 发布、2023-08-15 起施行，适用于向中国境内公众提供生成式 AI 服务，并涉及个人信息、内容治理、服务协议、安全评估/算法备案等要求。`事实｜高`
- [《人工智能生成合成内容标识办法》](https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm) 于 2025-03-14 公布、2025-09-01 起施行，对生成合成文本、图片、音频、视频等显式/隐式标识提出要求。若未来雷达使用模型生成面向公众的摘要，产品与合规角色需要判断其适用性和标识实现。`事实 + 推断｜高`
- 本项目当前只是内部实验骨架，是否“向公众提供服务”、是否触发备案/标识义务、摘要是否构成受规制生成内容，均不能由市场调研阶段定论。`事实 + 推断｜高`

## 11. 去重、事件聚类与证据合并方法

### 11.1 先定义“事件”，再定义“文章”

建议事件主键为：

```text
event_key = organization
          + product_or_model_family
          + event_type
          + version_or_effective_date
          + primary_action
```

事件类型至少包括：`model-release`、`api-change`、`price-change`、`deprecation`、`open-source`、`research`、`evaluation`、`security-incident`、`service-incident`、`funding-ma`、`regulation`。

### 11.2 四层去重

1. **URL 规范化：** 去除 UTM/分享参数、跟踪短链，解析 canonical URL、重定向和镜像。
2. **精确内容：** 规范标题、Unicode、空白、日期和版本号，计算标题/摘要指纹。
3. **事件实体：** 抽取组织、模型、版本、事件类型、生效日期、价格/API 字段；相同实体与动作进入候选簇。
4. **跨语言语义：** 对中英文标题与短摘要做多语向量相似度，仅作为候选；最终由事件字段与规则确认，避免把同一厂商的两个不同版本误合并。

### 11.3 时间窗与更新链

- 普通新闻：72 小时内相似事件优先合并。
- 模型发布/API 变更：7 天内的新闻、changelog、GitHub、评测作为同一“发布链”的子证据，但价格调整、重大 Bug 或回滚可生成子事件。
- 状态事件：按 incident ID 聚合更新、恢复和复盘，不把每次状态更新算新新闻。
- 论文与开源：论文、模型卡、GitHub release 若由同一团队同日发布，归为同一研究/开源事件。

### 11.4 证据角色

| 角色 | 定义 | 示例 | 对置信度的影响 |
|---|---|---|---|
| 主源 | 对事件负责的官方发布、法规原文、代码 release | 厂商 changelog、CAC 通知 | 确认“发布/变更发生” |
| 技术佐证 | API 文档、模型卡、GitHub、状态页、论文 | 模型 ID、commit、incident | 提升可复核性 |
| 独立佐证 | 有方法的独立评测、可信媒体 | Arena、Artificial Analysis | 验证厂商性能/影响观点 |
| 传播线索 | 社媒、论坛、Newsletter、聚合站 | X 帖子、HN、量子位 | 只提升发现速度，不单独提升事实置信度 |
| 反证/异议 | 官方修订、评测冲突、已知限制 | 回滚、榜单方法限制 | 必须与主叙事并列显示 |

**关键规则：** 多家媒体转载同一新闻稿不是“多个独立来源”；它们共享同一证据根。`推断｜高`

## 12. 重要性排序与每日 10–20 条选择

### 12.1 硬门槛

候选事件必须同时满足：

- 与基础模型、关键模型平台、AI 开发工具、重要研究/评测、监管、安全或重大产业事件相关。
- 至少有一个可直接打开的原始来源；只有搜索摘要或无原文时不入正式榜。
- 事件时间、发布方和关键动作可抽取；无法确认时进入“待核验”。
- 访问方式与保存内容不违反当前已知 robots/条款边界。

### 12.2 建议评分

每个维度 0–100：

```text
score = 0.25 * impact
      + 0.18 * novelty
      + 0.18 * actionability
      + 0.16 * evidence_quality
      + 0.10 * affected_scope
      + 0.08 * urgency
      + 0.05 * diversity_value
      - penalties
```

| 维度 | 高分定义 |
|---|---|
| impact | 新旗舰模型、关键能力跃迁、价格/上下文/API 重大变更、开源权重、严重安全/服务事件、强监管 |
| novelty | 相对过去 30 天是否真正新增，而非旧闻重写或小修辞 |
| actionability | 会改变齐总的模型选型、开发、采购、风险判断或近期关注动作 |
| evidence_quality | 一手主源 + 技术佐证/独立佐证最高；单一厂商自述中等；社区传闻低 |
| affected_scope | 影响多个产品/大量开发者/跨地区，高于单个小众插件更新 |
| urgency | 下线、价格生效、严重漏洞、法规期限、持续中断最高 |
| diversity_value | 在不降质量前提下补足中国/海外、闭源/开源、产品/研究/政策视角 |

建议惩罚：近重复 `-30`；仅社区且未核验 `-25`；标题党/营销断言 `-10~-20`；只有付费墙无主源 `-15`；过时且无新增 `-10~-30`；赞助内容未明确标注则直接拒绝。

### 12.3 日榜配额与防垄断

- 正式日榜：分数建议 `>=65`，目标 10–20 条；不足 10 条时宁缺毋滥并说明“今日高置信事件不足”。
- 建议构成：官方模型/API/开源 6–10；研究/评测 2–4；政策/安全/重大公司事件 1–3；已核验社区信号 0–3。
- 单一厂商通常最多 3 条/日；重大主题可用“专题事件簇”承载多个子更新，而不是刷屏。
- 中国与海外各设最低关注线，但不设必须填满的硬配额；质量不足时不以低质量内容补位。
- P0 紧急提醒不占日榜配额，日榜中只保留一次事件总结。

### 12.4 事实、观点、推断与置信度

| 输出标签 | 条件 | 默认置信度 |
|---|---|---|
| 已确认事实 | 官方主源说明发生了发布/变更，且日期、对象可复核 | 高 |
| 单一来源厂商声明 | “性能第一”“提升 X%”等仅有厂商材料 | 中，并明确“厂商称” |
| 独立验证结论 | 至少一个方法透明的独立评测与官方对象一致 | 中到高，保留评测适用范围 |
| 系统推断 | 基于多个事实判断影响、趋势和下一步 | 中，展示推断依据 |
| 待核验 | 社区/媒体单源、无主源、互相冲突 | 低，不入正式日榜或显著警示 |

## 13. 实时、小时级、每日方案权衡

| 方案 | 延迟 | 质量/噪音 | 平台与成本 | 适用事件 | 结论 |
|---|---:|---|---|---|---|
| 全量实时/分钟级 | 最低 | 噪音、重复和未核验信息最高 | 请求、推理、告警疲劳、条款风险最高 | 极少数真正实时信号 | 不建议作为默认方案 `推断｜高` |
| 小时级 | 1–2 小时 | 能较快完成初步聚类和主源确认 | 中等；适合 RSS/API/GitHub/公开 changelog | 模型/API/开源/重要新闻 | 建议作为常规采集层 `推断｜高` |
| 每日 | 12–24 小时 | 最适合跨源核验、排序和阅读 | 最低；用户负担最小 | 绝大多数研究、评测、行业与政策 | 建议作为主要交付层 `推断｜高` |
| 混合 | 紧急 15–30 分钟；常规 2 小时；摘要每日 | 在速度和证据质量间平衡 | 可按来源风险分层控制 | 全部 | 首选 `推断｜高` |

### 13.1 推荐运行节奏

1. **P0 紧急层（15–30 分钟）：** 官方状态 RSS/JSON、明确安全公告、已知模型下线/价格生效、监管紧急通知。
2. **常规采集层（每 2 小时）：** 官方 RSS/changelog、GitHub Releases、国内厂商发布页。
3. **研究/评测层（每日 1–2 次）：** arXiv、Hugging Face Papers、Arena、Artificial Analysis、监管站点。
4. **正式摘要（每日一次）：** 建议北京时间 08:30 或齐总指定时间，输出过去 24 小时高分事件；支持按需刷新。
5. **周度复盘：** 看漏报、误报、来源贡献、厂商/地区偏置、重复率和人工改分，调整来源权重。

具体时间、模型调用量和成本需要项目经理/架构阶段结合运行环境决定；本报告不提供虚假成本数字。`事实 + 推断｜高`

## 14. 机会、风险、反证与未知事项

### 14.1 主要机会

- 官方 API/changelog 与社区讨论之间存在“确认发生”与“是否值得关注”的组合空间。
- 国内外厂商入口分散，且中英文同一事件重复传播，事件级去重具有直接价值。
- 现有 Newsletter 多为统一编辑口味；齐总可配置的行动价值、厂商权重和地域平衡形成差异化。
- 把“厂商声明”和“独立验证”分开，能比普通新闻流更可信。

以上均为机会判断，尚无用户规模、付费或留存证据。`推断｜中`

### 14.2 主要风险

| 风险 | 影响 | 缓解 | 置信度 |
|---|---|---|---|
| 平台条款/robots 变化 | 来源中断、账号/API 被封、法律争议 | 官方 API 优先、每日规则缓存、源级 kill switch、无授权不采 | 高 |
| 版权与再分发 | 投诉、下架、商业化受限 | 最小元数据、自写短摘要、原文回链、不存全文/媒体 | 高 |
| 厂商营销偏差 | 误导排名和能力判断 | 标记来源观点、接独立评测、展示反证 | 高 |
| 语义去重误合并 | 不同版本被合成一个事件 | 实体/版本/日期硬约束、人工复核高分簇 | 高 |
| 重要性算法偏置 | 热门厂商、英语内容或高流量媒体占满日榜 | 厂商上限、地区与类型多样性、周度人工校准 | 高 |
| 来源数量膨胀 | 成本与噪音失控 | 白名单、来源贡献率、连续无命中降级 | 高 |
| 真实高价值量不足 | 无法稳定满足每日 10–20 | 不硬凑数；扩大候选池前先做影子运行和缺口分析 | 高 |
| 过度依赖第三方聚合 | 断链、二手错误、再分发限制 | 聚合站只作发现，正式事件回到主源 | 高 |

### 14.3 反证与不成立条件

- 如果 30 天影子运行中，核心池平均每天不足 6 个独立高分事件，而齐总仍要求 10–20 条，则需要扩大到应用、AI 基础设施和产业新闻，产品定位会从“大模型雷达”变成“AI 行业雷达”。`推断｜高`
- 如果齐总真正关注的是社交舆情/圈内传闻而非正式动态，则不接 X、微博、B站会显著降低价值；此时必须先解决正式 API/授权和数据保留问题。`推断｜高`
- 如果现有 Feedly/AlphaSignal/Newsletter 已能满足齐总的来源和排序需求，自建工具的长期维护价值可能低于订阅组合。应在项目计划阶段设置“购买/组合替代”比较。`推断｜中`

### 14.4 仍未知事项与补证计划

| 未知项 | 当前状态 | 建议补证 |
|---|---|---|
| 每日独立候选/高分事件真实数量 | 不足以判断 | 14–30 天影子采集，人工标注 300–500 个候选或全部样本 |
| 去重阈值和跨语言误合并率 | 不足以判断 | 建立同事件/非同事件标注集，报告 precision/recall |
| 齐总对类别、地区、厂商的真实偏好 | 只有原始口述 | 项目经理阶段确认权重与“不想看”清单 |
| 哪些付费 API/Newsletter 值得采购 | 未调用付费服务 | 先用免费核心池测缺口，再做小额试用对照 |
| 国内平台正式 API 商业资格与成本 | 未申请 | 产品范围确定后逐平台法务/条款核验 |
| 公开摘要是否触发更严格的内容/标识义务 | 未定产品形态 | 产品/合规阶段按是否公开、是否商业化、是否生成内容判断 |
| 单条摘要允许保留的引用长度和媒体展示方式 | 未定 | 法务/版权审查，默认不保存正文和图片 |

## 15. 给项目经理的立项输入与建议边界

在齐总批准本报告、并单独批准项目经理入场后，建议项目经理只把以下内容作为立项输入：

1. 先验证 A–D 级核心来源，不把 X、微博、B站、Reddit 接入作为 MVP 前置条件。
2. 将 14–30 天影子运行设为首个证据里程碑，测量来源成功率、候选量、独立事件量、重复率、人工相关性、漏报和平均核验时间。
3. MVP 的交付目标是“每天最多 10–20 个有原始链接的事件”，不是“抓取尽可能多的页面”。
4. 建立来源注册表、证据表、事件簇、版本历史和源级停用开关；不把全文数据库当默认需求。
5. 为每条输出保留事实/来源观点/系统推断、置信度、主源、佐证和反证字段。
6. 任何需要登录、付费、开发者申请、Cookie 或商业授权的来源都单独走审批，不得由开发角色自行扩大范围。
7. 在项目计划中保留“购买 Feedly/AlphaSignal/Newsletter 组合替代自建”的决策点。

本角色不决定 PRD、技术栈、排期、预算、UI 或生产上线。本报告通过前，不应启动项目经理、产品经理或其他下游角色。

## 16. 市场调研自查

- [x] 关键结论优先使用一手来源或官方规则。
- [x] 区分事实、来源观点和推断，并标注置信度。
- [x] 对搜索摘要、媒体标题和厂商性能自述未直接当作客观事实。
- [x] 纳入反证、不成立条件和未知项。
- [x] 明确 X、Reddit、微博、哔哩哔哩的访问/条款风险。
- [x] 给出核心来源池、候选来源池、访问方式和自然更新节奏。
- [x] 给出去重、排序、置信度与实时/小时/每日权衡。
- [x] 未伪造付费 API 调用、账号访问、用户访谈、历史回放或成本数据。
- [x] 停止在齐总市场调研审核门，不进入下游阶段。

## 17. 来源表

访问日期除另有说明外均为 2026-07-31。

| 编号 | 标题/发布方 | 发布/更新时间 | 直接链接 | 支持的结论 | 可靠性 |
|---|---|---|---|---|---|
| S01 | OpenAI News / OpenAI | 持续更新 | [openai.com/news](https://openai.com/news/) | 官方新闻入口、近期更新节奏、RSS 入口 | 一手/高 |
| S02 | OpenAI API Changelog / OpenAI | 持续更新；页面含 2026-07-30 条目 | [developers.openai.com](https://developers.openai.com/api/docs/changelog) | API、价格、模型和弃用变更 | 一手/高 |
| S03 | Model Release Notes / OpenAI | 持续更新 | [help.openai.com](https://help.openai.com/en/articles/9624314-model-release-notes) | ChatGPT/模型发布说明 | 一手/高 |
| S04 | OpenAI Status History/RSS / OpenAI | 持续更新 | [history](https://status.openai.com/history) / [RSS](https://status.openai.com/history.rss) | 状态事件与机器可读入口 | 一手/高 |
| S05 | Codex Changelog / OpenAI | 持续更新 | [learn.chatgpt.com](https://learn.chatgpt.com/docs/changelog) | Codex 正式产品更新 | 一手/高 |
| S06 | openai/codex Releases / OpenAI GitHub | 持续更新；页面含 2026-07-29 release | [github.com/openai/codex/releases](https://github.com/openai/codex/releases) | Codex CLI/开源版本 | 一手/高 |
| S07 | Anthropic Newsroom / Anthropic | 持续更新；页面含 2026-07-30 条目 | [anthropic.com/news](https://www.anthropic.com/news) | 官方模型、产品、安全与公司动态 | 一手/高 |
| S08 | Claude Platform Release Notes / Anthropic | 持续更新 | [platform.claude.com](https://platform.claude.com/docs/en/release-notes/overview) | Claude API/平台变更 | 一手/高 |
| S09 | Claude Status / Anthropic | 持续更新 | [history](https://status.claude.com/history) / [RSS](https://status.claude.com/history.rss) | 服务状态 | 一手/高 |
| S10 | Gemini API Release Notes / Google | 持续更新 | [ai.google.dev](https://ai.google.dev/gemini-api/docs/changelog) | Gemini API 模型与功能变化 | 一手/高 |
| S11 | Google DeepMind News/RSS / Google | 持续更新 | [news](https://deepmind.google/blog/) / [RSS](https://deepmind.google/blog/rss.xml) | 模型、研究、安全动态 | 一手/高 |
| S12 | Google AI Blog/RSS / Google | 持续更新 | [blog](https://blog.google/innovation-and-ai/technology/ai/) / [RSS](https://blog.google/innovation-and-ai/technology/ai/rss/) | Google AI 产品与研究 | 一手/高 |
| S13 | Google Cloud incidents JSON / Google | 持续更新 | [incidents.json](https://status.cloud.google.com/incidents.json) | 机器可读服务事件 | 一手/高 |
| S14 | AI at Meta Blog / Meta | 持续更新；页面含 2026-07 条目 | [ai.meta.com/blog](https://ai.meta.com/blog/) | Meta AI/研究/开源新闻 | 一手/高 |
| S15 | Meta Llama GitHub / Meta | 持续更新 | [github.com/meta-llama](https://github.com/meta-llama) | Llama 代码、SDK、开源进展 | 一手/高 |
| S16 | xAI Release Notes / xAI | 持续更新；页面含 2026-07 条目 | [docs.x.ai](https://docs.x.ai/developers/release-notes) | Grok API/模型与功能更新 | 一手/高 |
| S17 | Mistral Changelog / Mistral AI | 持续更新 | [docs.mistral.ai](https://docs.mistral.ai/resources/changelogs) | 模型、API、安全和弃用 | 一手/高 |
| S18 | Cohere Release Notes / Cohere | 持续更新 | [docs.cohere.com](https://docs.cohere.com/v2/changelog) | Cohere API/模型更新 | 一手/高 |
| S19 | 阿里云百炼模型上下架与更新 / 阿里云 | 持续更新；页面含 2026-07-30 条目 | [help.aliyun.com](https://help.aliyun.com/zh/model-studio/newly-released-models) | 国内外模型在百炼的上架、更新、下线 | 一手/高 |
| S20 | 百炼平台功能更新 / 阿里云 | 持续更新 | [help.aliyun.com](https://help.aliyun.com/zh/model-studio/model-release-notes) | 平台功能变化 | 一手/高 |
| S21 | Qwen GitHub / 阿里云 Qwen | 持续更新 | [github.com/QwenLM](https://github.com/QwenLM) | Qwen 开源模型与工具 | 一手/高 |
| S22 | DeepSeek API Change Log / DeepSeek | 持续更新；页面含 2026-04-24 条目 | [api-docs.deepseek.com](https://api-docs.deepseek.com/updates/) | DeepSeek 模型/API 变化 | 一手/高 |
| S23 | DeepSeek GitHub / DeepSeek | 持续更新 | [github.com/deepseek-ai](https://github.com/deepseek-ai) | 开源模型、论文、代码 | 一手/高 |
| S24 | 智谱新品发布 / 智谱 AI | 持续更新；页面含 2026-06-16 条目 | [docs.bigmodel.cn](https://docs.bigmodel.cn/cn/update/new-releases) | GLM 产品和模型发布 | 一手/高 |
| S25 | 火山引擎发布中心 / 火山引擎 | 持续更新 | [volcengine.com/news](https://www.volcengine.com/news) | 豆包/方舟与平台动态 | 一手/高 |
| S26 | Kimi Platform Docs / Moonshot AI | 持续更新 | [platform.kimi.com](https://platform.kimi.com/docs/overview) | Kimi API 官方文档 | 一手/高 |
| S27 | Moonshot AI GitHub / Moonshot AI | 持续更新 | [github.com/MoonshotAI](https://github.com/MoonshotAI) | Kimi 模型、研究和工具 | 一手/高 |
| S28 | MiniMax GitHub / MiniMax | 持续更新 | [github.com/MiniMax-AI](https://github.com/MiniMax-AI) | MiniMax 模型与开源工具 | 一手/高 |
| S29 | Hugging Face Daily Papers / Hugging Face | 每日/周/月 | [huggingface.co/papers](https://huggingface.co/papers) | 论文发现与社区信号 | 平台一手/高；排序为社区信号 |
| S30 | Hugging Face Hub API / Hugging Face | 持续更新 | [huggingface.co/docs/hub/en/api](https://huggingface.co/docs/hub/en/api) | 公开 API、Webhook、速率限制 | 一手/高 |
| S31 | arXiv cs.AI/cs.CL RSS / arXiv | 每日 | [cs.AI](https://export.arxiv.org/rss/cs.AI) / [cs.CL](https://export.arxiv.org/rss/cs.CL) | 研究元数据机器可读入口 | 一手/高 |
| S32 | Arena Blog/Leaderboard / Arena | 持续更新；页面含 2026-07-30 条目 | [arena.ai/blog](https://arena.ai/blog) | 独立评测变化、方法和榜单 | 高质量二手/高 |
| S33 | Intelligence Benchmarking Methodology / Artificial Analysis | 持续更新；当前 v4.1 | [artificialanalysis.ai](https://artificialanalysis.ai/methodology/intelligence-benchmarking) | 评测构成、权重和限制 | 高质量二手/高 |
| S34 | HELM / Stanford CRFM | 持续更新 | [crfm.stanford.edu](https://crfm.stanford.edu/helm/latest/) | 学术评测补充 | 高质量二手/高 |
| S35 | Hacker News Official API / Y Combinator | 持续更新 | [github.com/HackerNews/API](https://github.com/HackerNews/API) | 社区发现的正式 API | 平台一手/高 |
| S36 | Feedly AI / Feedly | 持续更新 | [feedly.com/ai](https://feedly.com/ai) | 同类市场情报/排序产品 | 厂商自述/中 |
| S37 | AlphaSignal / AlphaSignal | 持续更新 | [alphasignal.ai](https://alphasignal.ai/) | 同类 AI 聚合产品 | 厂商自述/中 |
| S38 | TLDR AI / TLDR | 每工作日 | [tldr.tech/ai](https://tldr.tech/ai) | 技术向 AI Newsletter | 一手产品说明/高 |
| S39 | The Rundown AI / The Rundown | 每日定位 | [therundown.ai](https://www.therundown.ai/) | 泛用户 AI Newsletter | 一手产品说明/高 |
| S40 | 机器之心 / 机器之心 | 持续/周度会员通讯 | [jiqizhixin.com](https://www.jiqizhixin.com/) | 中文 AI 媒体与竞品 | 高质量媒体/中高 |
| S41 | 量子位 / 量子位 | 分钟/小时级页面更新 | [qbitai.com](https://www.qbitai.com/) | 中文 AI 媒体与竞品 | 高质量媒体/中高 |
| S42 | AIbase AI 资讯 / AIbase | 小时/每日 | [aibase.com/zh/news](https://www.aibase.com/zh/news) | 中文聚合竞品 | 聚合/中 |
| S43 | X Developer Policy / X | 持续有效；访问 2026-07-31 | [docs.x.com](https://docs.x.com/developer-terms/policy) | API、展示、再分发、删除同步、隐私和限流风险 | 一手规则/高 |
| S44 | Reddit Data API Terms / Reddit | 持续有效；访问 2026-07-31 | [redditinc.com](https://redditinc.com/policies/data-api-terms) | 商业/API/用户内容使用限制 | 一手规则/高 |
| S45 | GitHub REST API Rate Limits / GitHub | 持续更新；访问 2026-07-31 | [docs.github.com](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) | 匿名/认证限流和退避 | 一手规则/高 |
| S46 | 哔哩哔哩开放平台管理规范 / 哔哩哔哩 | 2022-07-22 更新；访问 2026-07-31 | [openhome.bilibili.com](https://openhome.bilibili.com/agreement/management-protocol) | 开放平台准入和协议约束 | 一手规则/高 |
| S47 | 微博服务使用协议 / 微博 | 持续有效；访问 2026-07-31 | [weibo.com](https://www.weibo.com/signup/v5/protocol/) | 内容与服务使用约束 | 一手规则/高 |
| S48 | RFC 9309 Robots Exclusion Protocol / IETF | 2022-09 | [rfc-editor.org](https://www.rfc-editor.org/rfc/rfc9309.html) | robots 是爬虫访问规则，不是访问授权 | 标准/高 |
| S49 | 生成式人工智能服务管理暂行办法 / 中国网信网等七部门 | 2023-07-13；2023-08-15 施行 | [cac.gov.cn](https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm) | 中国境内公众生成式 AI 服务基本约束 | 官方法规/高 |
| S50 | 人工智能生成合成内容标识办法 / 四部门 | 2025-03-14；2025-09-01 施行 | [cac.gov.cn](https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm) | 显式/隐式标识要求 | 官方规则/高 |
| S51 | EU AI Act / European Commission | 持续更新；访问 2026-07-31 | [digital-strategy.ec.europa.eu](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) | 欧盟 AI Act 适用时间线和 GPAI 监管入口 | 官方法规说明/高 |
| S52 | AI RMF / NIST | 2023-01-26 首发；持续更新 | [nist.gov](https://www.nist.gov/itl/ai-risk-management-framework) | AI 风险管理框架和更新入口 | 官方标准/高 |

## 18. 审核停止点

市场调研产物已完成自查，当前应立即停止并等待齐总选择：

1. **通过并允许项目经理申请入场**；
2. **补充指定调研**；
3. **打回重做**。

未经齐总明确批准，不进入项目经理、PRD、UI/UX、架构或开发阶段。
