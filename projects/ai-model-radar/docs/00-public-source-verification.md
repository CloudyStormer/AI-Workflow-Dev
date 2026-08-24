# AI Model Radar 公开来源自主核验增量

- 版本：1.0
- 项目：`ai-model-radar`
- 变更组：`research-20260821-public-source-verification-001`
- 变更：`research-20260821-radar-public-source-verification-001`
- 角色：固定 `01 市场调研员`（`role-market-researcher`）
- 核验日：2026-08-21（Asia/Shanghai）
- 基线：`docs/00-source-allowlist.md` v1.0、`docs/00-source-registry.csv` v1.0、`docs/00-source-runtime-readiness.md` v1.0
- 状态：`ready-for-review`
- 停止门：`source-runtime-readiness-review`

> 本文只做公开来源的匿名、只读核验。未登录、未使用 Cookie/API Key、未绕过 robots/验证码/付费墙，未抓取入库、未改 registry、未启用连接器、未写代码或部署。它不是运行 canary、自动化授权或法律意见。

## 1. 结论

1. **无需用户提供服务器、数据库或新闻数据即可形成候选来源池。** 国际侧的 Gemini API changelog、GitHub 公开仓库/Release API、Hugging Face Hub API 与 arXiv 元数据服务；国内厂商侧的 Qwen、DeepSeek 官方 GitHub/Hugging Face 组织，以及阿里云百炼官方更新页，均已在既有 allowlist 中有一手来源路径。
2. **本次最强的公开、无账号、语义精确候选仍是 Gemini API changelog。** 2026-08-21 以匿名公开网页方式读取成功，页面明确说明其记录 Gemini API 更新，并按日期列出模型发布、弃用和停服事项。其页面许可与机器访问边界比 OpenAI RSS 的条款冲突更清晰。
3. **国内来源不应被省略。** Qwen 与 DeepSeek 的官方 GitHub 组织页可匿名浏览；GitHub 官方文档确认公开资源的 Releases GET 可无认证使用。二者适合“官方组织/仓库发生变化”的发现与回链，不可把仓库活动直接等同模型发布。
4. **可访问不等于已运行。** `AIR-END-030` 仍是提案、未写入 registry；批准口径仍为 `N=22`、`runtime_enabled=false`、连接器/调度/live snapshot 均为 0。任何来源都没有因本报告自动变为连接器。

## 2. 核验方法与边界

- 复用已批准的 source allowlist、registry 与 2026-08-16 readiness 结论；只复核公开官方入口，没有扩大白名单或重新判定历史来源。
- 先读公开网页/官方文档，再区分：本轮可匿名阅读、XML/JSON 被研究浏览器 MIME 限制、以及本机直连网络限制。后两种均不写成供应商站点故障。
- 本机对 Gemini 页做过一次无账号直连头部请求；本机网络在连接阶段超时，未到达远端。随后以公开网页核验完成内容级证据。没有代理绕过、换 UA/IP、重试风暴或登录。
- 所有候选仅建议未来在获批环境做单端点 canary；本报告不执行该动作。

## 3. 国内外官方来源核验结果

| 覆盖 | 来源与精确入口 | 本轮匿名核验 | 建议最小字段与频率 | 使用边界与失败方式 | 结论 |
|---|---|---|---|---|---|
| 国际模型/API 变更 | [Gemini API Release Notes](https://ai.google.dev/gemini-api/docs/changelog) | 公开页面可直接阅读，无需账号；页面称其记录 Gemini API 更新，当前可见按日期发布/弃用/停服记录，最新条目日期为 2026-08-13。 | `event_date,event_type,model_or_api_id,title,canonical_url,page_updated_at,accessed_at,source_hash,license`；发布驱动、无 SLA。若以后获批运行，日报基线即可，最多每 6 小时一次。 | Google Developers 站点政策说明多数文档内容为 CC BY 4.0，须署名并回链；不得复制代码、图片、商标或第三方嵌入物。许可/robots/host 变化、登录/403/429、页面不再提供生命周期证据均 fail closed。 | **事实｜高：公开且语义精确。** 仍仅提案 `AIR-END-030`，不计入 `N=22`。 |
| 国际厂商新闻 | [OpenAI News RSS](https://openai.com/news/rss.xml) | 既有 registry 记录为无账号 RSS；本轮研究浏览器不支持 XML 渲染，不能据此判为远端故障；本机直连受本地网络限制。 | `guid,title,published_at,canonical_url,short_summary,hash`；既有建议为不快于每小时，但本轮不启动轮询。 | [OpenAI Terms](https://openai.com/policies/terms-of-use/) 对程序化提取的适用边界仍需专门复核；RSS 存在不等于全文再发布许可。登录挑战、条款冲突或页面格式漂移即停。 | **事实｜中高：历史已核验的机器候选；本轮不升格。** |
| 国际开源发布 | [GitHub Releases REST API](https://docs.github.com/en/rest/releases/releases) `GET /repos/{owner}/{repo}/releases` | GitHub 官方文档说明 public release 可向所有人提供，且只请求公开资源时可不认证；本轮公开 React release 页也可匿名读取。 | `release_id,tag_name,name,published_at,prerelease,html_url,license,hash`；发布驱动。后续只对 allowlist 仓库低频条件 GET 或 webhook，不下载 assets。 | [官方限流说明](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) 与响应头优先；429/403 不得绕限，repo 许可证逐仓库适用。 | **事实｜高：无账号 API 能力已由官方文档确认。** |
| 中国开源模型 | [Qwen 官方 GitHub 组织](https://github.com/QwenLM)；既有原子入口 `https://api.github.com/orgs/QwenLM/repos` / [Qwen HF 元数据](https://huggingface.co/api/models?author=Qwen) | 官方 GitHub 组织页本轮可匿名打开；原始 JSON 不被研究浏览器渲染，不应误报 endpoint 失败。 | `repo_or_model_id,revision_or_tag,license,last_modified_or_published_at,canonical_url,hash`；事件驱动，后续至多 2 小时一次且只查元数据。 | 不镜像权重、模型卡全文或 release assets；gated repo/model、许可证或官方身份变化即停止。 | **事实｜高：国内官方组织可发现并回链；不是发布事实本身。** |
| 中国开源/API 更新 | [DeepSeek 官方 GitHub 组织](https://github.com/deepseek-ai)；既有原子入口 `https://api.github.com/orgs/deepseek-ai/repos` / [DeepSeek HF 元数据](https://huggingface.co/api/models?author=deepseek-ai) | 官方组织页本轮可匿名打开；原始 JSON 的浏览器显示限制同上。DeepSeek changelog HTML 仍维持既有 `conditional`，本轮未升级。 | 与 Qwen 相同的最小元数据；仓库/模型更新与公告需聚类并以官方公告/模型卡复核。 | 旧核验已记录 changelog/状态端点不稳定；不得因超时无限重试、不得以社区消息补位。 | **事实｜中高：国内候选持续保留，HTML 公告仍条件化。** |
| 中国平台模型更新 | [阿里云百炼模型发布说明](https://help.aliyun.com/zh/model-studio/model-release-notes) | 既有 allowlist 为官方、无需账号但 `conditional` 的 HTML 来源；本机本轮单次直连未到达远端，未形成新的可访问性结论。 | `date,region,model_id,lifecycle,canonical_url,hash`；若权利与访问条件保持可用，日级人工/低频核验。 | 页面版权/服务条款和模型原始厂商身份需逐事件分开；页面挑战、robots/条款变化即停止。 | **事实｜高（既有登记）/未知（本轮网络层未触达）。** 不升级。 |
| 全球模型生态元数据 | [Hugging Face Hub API](https://huggingface.co/docs/hub/en/api)；[arXiv API 使用条款](https://info.arxiv.org/help/api/tou.html) | 官方文档公开可读；本轮未拉取模型或论文数据。 | HF：`model_id,revision,last_modified,license,tags,url,hash`；arXiv：`arxiv_id,doi,category,date,abstract_url,hash`。 | HF 逐模型 license/gating 控制；arXiv API 有单连接、至少 3 秒间隔要求。都不镜像权重/PDF。 | **事实｜高：可作为官方元数据补充，不替代厂商发布。** |

### 3.1 更新节奏的正确解释

- 厂商 changelog、RSS 与 GitHub Releases 都是**发布驱动**，不是保证固定频率的新闻流；“每日”是未来日报的检查节奏，而非对上游发布频率的承诺。
- 在没有获批连接器前，本项目只保留研究建议，不执行轮询。未来若授权，推荐从**每天一次**开始，以 `canonical_url + native_id/guid/tag + date + hash` 幂等去重；仅在重要性/时效需求有证据时再缩短至 2—6 小时。
- 所有历史/本轮观察都不构成 SLA、配额承诺或持续可访问承诺。

## 4. 最小使用边界、去重与重要性

- 长期可留：来源 ID、原生 ID/GUID/tag、标题、日期、模型/API ID、事件类型、canonical URL、许可、访问时间和内容哈希。
- 默认不留：完整 HTML/XML/JSON 正文、图片、代码、模型权重、release assets、第三方嵌入内容、账号资料或访问凭据；原始响应如以后确需解析，隔离区最长 24 小时。
- 先按 `source_id + native_id` 去重，再以厂商/模型/事件类型/版本或 arXiv ID 和 72 小时窗口聚类；厂商公告、GitHub release、模型卡和论文可共同指向一个事件，但主证据优先厂商/官方仓库。
- 重要性与事实置信度分开：市场/开发影响、权威性、新颖性、生态覆盖、可行动性和时效性可排序；无主源复核、营销稿或重复事件不得进入日报。

## 5. 保持不变的运行事实与停止条件

| 项目事实 | 本轮后状态 |
|---|---|
| registry | 未修改；`AIR-END-030` 未新增；已批准 `P0/allow` 基线仍是 `N=22`。 |
| 运行状态 | `runtime_enabled=false`；connector、scheduler、live snapshot、真实运行/REV/QA 证据均为 0。 |
| 入口判定 | `AIR-END-030` 仅为 `proposed/pending-review/not-counted`；不把 source identity、组合束、状态页或 SDK Atom 冒充模型发布主源。 |
| 硬停止 | login/Cookie/API Key/验证码、403/429、robots 或条款/许可/host 改变、跨未批准域、需要全文或资产镜像、无法维持删改边界。 |

要把任何一个来源转为连接器，仍需来源政策的精确端点判定、产品/架构任务映射、获批环境中的 canary、`.REV`、`.QA` 与新的明确运行授权。报告通过本身不触发这些后续动作。

## 6. 事实、推断和限制

- **事实｜高：** Gemini changelog、GitHub Qwen/DeepSeek 组织页、GitHub Release 官方文档、Google 站点许可、Hugging Face/arXiv 官方文档均可匿名公开读取；具体链接见上表。
- **事实｜高：** 本机单次直连在连接阶段超时；研究浏览器对 XML/JSON 的不支持是工具限制，不等于源站失败。
- **推断｜中高：** Gemini changelog 是本次最适合未来模型动态首源的候选；GitHub/HF/arXiv 更适合作元数据/开源/论文补充。
- **未知：** 各端点未来的真实可用性、响应验证器、限流头、解析稳定性与运行环境预算；这些只能由未来获批的单端点 canary 证明。

## 7. 审核停止点

本报告不改写主工作流、不批准 UI/架构/开发、不启用连接器、不路由下游。它停在 `source-runtime-readiness-review`，并应返回原主门。
