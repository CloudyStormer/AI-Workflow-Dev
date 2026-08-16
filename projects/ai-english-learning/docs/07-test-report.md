# AI English Learning spaced recall 存储 generation ABA 测试报告

## 1. 交付元数据

| 项目 | 内容 |
|---|---|
| `project_id` | `ai-english-learning` |
| `change_id` | `test-20260816-spaced-recall-storage-generation-aba-frontend-fix-004` |
| 产物 | `artifact-spaced-recall-storage-generation-aba-test-report-001` |
| 负责角色 | 固定 `10 测试工程师`（`role-qa`） |
| 入场授权 | `approval-20260816-spaced-recall-storage-generation-aba-qa-entry` |
| 上游批准 | `approval-20260816-spaced-recall-storage-generation-aba-code-rereview-conclusion` |
| 输入产物 | `artifact-spaced-recall-storage-generation-aba-code-rereview-004` |
| 输入报告 | `docs/06-code-review.md` |
| 输入报告 SHA-256 | `b00e5b48324149f1e8b81f5bc3dee59e13cc65a8f4931a26e02445fee2bedf30` |
| 被测源码提交 | `d3277734804745fa092803c84419861443f0cdc1` |
| 差异基线 | `a5d0d1f30c6635f293a20938a19ad4087bc5a2b3` |
| QA 路由安全基线 | `38c3e0a23aff09a175588c73feebc09f92763e4d` |
| QA 写锁释放基线 | `e595b57971fc15c3feeefaddb75bf37fc9c5e880` |
| 报告编写基线 | `e739c88b3a7024d58de177035162867f74c1f2ca`；包含写锁释放基线，English 前端无后续漂移 |
| 测试日期 | 2026-08-16（Asia/Shanghai） |
| 报告状态 | 待超级无敌帅超超总审核 |
| 停止门 | `test-report-review` |

## 2. 测试结论

**结论：本次 spaced recall 存储 generation/epoch ABA 修复及授权内既有回归通过。15/15 个范围验收项通过，Node 24.19.0 与最低支持版本 Node 22.12.0 合计 10/10 个执行门通过，未发现新的 Blocker、Major 或 Minor 缺陷；本轮必须修复项 0，已明确接受为遗留缺陷 0。**

领域门证明持久化 envelope 具备独立 generation，旧 v1 只在共享 Web Lock 内迁移，普通写同时服从 exact raw、revision 与 generation，破坏性重建必换代。A→B→A 业务等值回环中，旧代写入被拒绝；真实双标签 React 场景中，旧页面 fail-closed 并刷新到新代，随后新代写入成功，两标签最终一致。

**上线建议：本修复可作为当前浏览器／当前设备本地 spaced recall 前端实现通过 QA，但 AI English Learning 整体仍不可以进入生产发布。** 本报告不证明真实后端、账号、多用户、跨设备同步、云端持久化或 PRD v1.4 其他能力已实现，也不授权 DevOps、部署或生产切换。

## 3. 强制真实性边界

以下事实是本报告结论的一部分：

1. spaced recall 学习状态仍只保存在当前浏览器与当前设备的 `localStorage`，不承诺跨设备同步。
2. 本地备份只表示浏览器生成下载内容，不代表云备份、服务端持久化或自动恢复；重建前导出的旧备份不会自动导入。
3. 真实 workflow backend、账号、多用户、服务端记忆、数据库状态、跨设备收敛及 PRD v1.4 其他完整发布能力未在本轮作为已实现功能测试。
4. 浏览器通知仅按本地权限与规则请求；本轮不声明真实通知已经送达，也不覆盖短信或邮件通道。
5. 本轮未修改业务代码、产品需求或 UI，未访问生产环境，未启动后端、未重启共享服务，也未执行部署。
6. 当前存储修复测试通过不得解释为 AI English Learning 整体真实可用、正式发布完整或生产发布已解冻。

## 4. 测试范围与排除

### 4.1 本轮覆盖

- generation/epoch envelope 的生成、格式校验、安全随机能力缺失时 fail-closed。
- 旧 v1 无 generation 数据在 exact-source 与共享 Web Lock 内迁移，以及竞争迁移冲突刷新。
- 全部复习主存储生产写路径共用同一个 origin 级 Web Lock；锁忙、锁缺失、写入失败与回读不确定均不无锁降级。
- 普通写继承当前 generation，并同时校验 exact raw、revision 与 generation。
- 破坏性重建在用户确认与备份门之后换代，且写后逐字回读。
- 重建成功后 `Word` 的 React state、state ref 与 CAS raw ref 同步更新。
- 领域 A→B→A 业务等值 ABA 与真实双标签 React 旧代拒绝／新代保存。
- 既有队列、异常隔离与恢复、跳过、提醒、时区、离线、答案查看、拼写和重建后继续答题回归。
- 下载隔离、临时 Chrome profile 清理、完整简体中文、键盘与读屏语义代理、1440/390/320 响应式、console clean。

### 4.2 明确排除

- 后端、数据库、账号、多用户、跨设备服务及 PRD v1.4 其他功能。
- Control Center demo QA、并行 English UI 设计或任何其他项目现场。
- 产品、UI、业务代码修改，服务启停，DevOps、部署和生产发布。
- 批准本测试报告、预批准未来产物或自动路由任何后续角色。

## 5. 环境、基线与证据来源

| 项目 | 结果 |
|---|---|
| Git 根 | 单一 AIWorkFlow 根；报告在隔离分支 `codex/10` 编写 |
| 被测源码完整性 | `d327773` 为当前基线祖先；到 `e739c88` 的 `projects/ai-english-learning/frontend` 无漂移 |
| 输入完整性 | `docs/06-code-review.md` SHA-256 精确匹配 |
| Node.js | `24.19.0` 与最低支持版本 `22.12.0` |
| 浏览器 | Google Chrome `151.0.7922.138` |
| 操作系统 | macOS `15.7.4`，arm64 |
| 固定 10 独立执行 | Node 24 lint、typecheck/build、领域、1,200 组 cloze、真实 Chrome/CDP；Node 22 lint、typecheck/build、领域、1,200 组 cloze；输入、源码、下载与临时目录核验 |
| Node 22 浏览器证据 | 按收口指令复用只读独立支援的真实 Chrome/CDP 全门 exit 0 证据；固定 10 核对其范围、运行时、断言与清理结果后纳入结论 |
| 业务改动 | 0；测试执行和报告编写均未改业务实现 |

本报告没有把代码复审结论直接当作 QA 通过。固定 10 重新核验测试脚本与生产写路径，独立执行 Node 24 完整门和 Node 22 非浏览器门，并按超级无敌帅超超总的明确收口指令复用 Node 22 独立浏览器支援证据。支援证据的来源在报告中保留，不伪称为固定 10 本人重复执行。

## 6. 范围验收结果

| ID | 验收项 | 独立证据 | 结果 |
|---|---|---|---|
| QA-EL-01 | 输入、源码与安全基线完整 | 报告哈希匹配；`d327773` 为祖先；English 前端到 `e739c88` 无漂移 | 通过 |
| QA-EL-02 | generation envelope 与安全生成 | 初始数据、合法格式、`randomUUID`/安全随机兼容分支及随机能力缺失拒绝均有领域断言 | 通过 |
| QA-EL-03 | 旧 v1 锁内迁移 | 无 generation 的合法 v1 只以 exact source raw 进入共享锁迁移；竞争结果不覆盖新值 | 通过 |
| QA-EL-04 | 全部生产写共享 Web Lock | 普通写、加载归一化和破坏性重建使用同一独占锁名；无锁和锁忙均 fail-closed | 通过 |
| QA-EL-05 | 普通写代次继承与校验 | 普通域变更保持 generation；raw、revision 或 generation 任一不符均返回冲突 | 通过 |
| QA-EL-06 | 破坏性重建换代 | 仅在备份、确认、exact-source 和锁门满足后写入；新 generation 不等于调用方或当前存储代次 | 通过 |
| QA-EL-07 | `Word` state/ref/raw 同步 | 重建成功后 React state、`recallStateRef`、`recallStorageRawRef` 同步为新代，后续 cloze 可继续作答 | 通过 |
| QA-EL-08 | 领域 A→B→A 等值 ABA | 去除 generation 后业务 envelope 完全相等；三代 token 不同，旧代写冲突且未落盘 | 通过 |
| QA-EL-09 | 真实双标签 React ABA | 旧代提醒写在共享锁内 fail-closed 并刷新；新代重试保存，两标签读取一致 | 通过 |
| QA-EL-10 | 既有存储安全与异常回归 | 队列、损坏项隔离/恢复、未知版本、锁忙、source-changed、write-unverified 和重建门均通过 | 通过 |
| QA-EL-11 | 下载隔离与临时清理 | `ai-english-learning-recall-backup-*.json` 为 0→0；`english-recall-cdp-*` 为 0→0；原生下载点击在测试中被抑制 | 通过 |
| QA-EL-12 | 完整简体中文与真实性文案 | `lang=zh-CN`；正常、冲突、锁忙、存储异常、恢复和本地数据边界均有简体中文状态 | 通过 |
| QA-EL-13 | 响应式 | 真实 Chrome 覆盖 1440×1000、390×844、320×844，无页面或复习对话框横向溢出 | 通过 |
| QA-EL-14 | 键盘、焦点与读屏语义代理 | Dialog/alertdialog、tablist、状态 live region、中文可访问名称存在；Esc 关闭并恢复焦点，重建后焦点回到 cloze textbox | 通过 |
| QA-EL-15 | 构建、console 与既有 cloze 回归 | 双 Node lint/build/领域/cloze 均通过；真实 Chrome console 0 error / 0 warning；1,200 组随机 cloze 通过 | 通过 |

范围验收通过率：**15/15（100%）**。

## 7. 自动化与浏览器执行记录

| 环境 / 检查 | 结果 |
|---|---|
| Node 24.19.0 `npm run lint` | 通过 |
| Node 24.19.0 `npm run build`（含 `tsc -b`） | 通过 |
| Node 24.19.0 `npm run test:spaced-recall` | 通过 |
| Node 24.19.0 `npm run test:cloze` | 通过，1,200 组随机边界 |
| Node 24.19.0 `npm run test:browser` | 通过，固定 10 独立真实 Chrome/CDP |
| Node 22.12.0 `npm run lint` | 通过 |
| Node 22.12.0 `npm run build`（含 `tsc -b`） | 通过 |
| Node 22.12.0 `npm run test:spaced-recall` | 通过 |
| Node 22.12.0 `npm run test:cloze` | 通过，1,200 组随机边界；仅出现 Node 22 对 type stripping 的预期实验性运行时提示 |
| Node 22.12.0 `npm run test:browser` | 通过，采用收口指令指定的独立只读支援证据 |
| 自动化合计 | 10/10 通过 |
| 生产构建 | JS `407.18 kB`（gzip `124.84 kB`）；CSS `65.03 kB`（gzip `14.27 kB`）；无块大小告警 |
| 浏览器控制台 | 0 error / 0 warning |
| 下载与临时目录 | 两套运行证据均为 Downloads 0→0、临时 profile 0→0；固定 10 收口复核仍为 0 |

固定 10 首次以普通受限沙箱启动 Node 24 浏览器门时，环境在测试断言开始前以 `listen EPERM 127.0.0.1` 拒绝本地监听；随后在允许本地监听的隔离执行中，同一 Node 24 浏览器门通过。该事件是测试环境阻塞，不是产品失败。旧式 Node 22 审批型执行已按收口指令取消，不计入产品结果；Node 22 浏览器结论使用已完成、范围一致、可复核的独立支援证据。

## 8. 缺陷与遗留处置

| 分类 | 数量 | 处置 |
|---|---:|---|
| Blocker / P0 | 0 | 无 |
| Major / P1 | 0 | 无 |
| Minor / P2 | 0 | 无 |
| 本轮必须修复 | 0 | 无 |
| 已明确接受为遗留缺陷 | 0 | 无需以遗留缺陷放行 |

未实现的后端、账号、多用户、跨设备同步和 PRD v1.4 其他能力不属于本轮新发现缺陷，也不能被本报告豁免；它们仍由既有产品完整性与重规划门管理，并继续阻断整体生产发布。

## 9. 已知限制与剩余风险

1. 本轮读屏覆盖以真实 Chrome DOM 行为、ARIA 语义、live region、焦点与键盘路径为代理，没有执行 VoiceOver／NVDA 实际语音输出会话，因此不扩大为“所有辅助技术完全兼容”。
2. 响应式真实浏览器门覆盖 1440、390、320；本轮授权未要求 1024，故不声称本批独立覆盖 1024。
3. 未测试生产 URL、真实后端故障、账号隔离、跨设备一致性、云端迁移、生产负载或通知真实送达。
4. 未运行联网依赖漏洞审计；本批依赖未变化，不能据此宣称第三方依赖不存在已知漏洞。

## 10. QA Checklist

- [x] 授权范围、输入哈希、源码与写锁释放基线已核验。
- [x] generation、旧 v1 迁移、共享锁、普通写和重建换代已覆盖。
- [x] `Word` state/ref/raw 同步与重建后继续答题已覆盖。
- [x] 领域与真实双标签 A→B→A 已覆盖。
- [x] 下载隔离和仓外临时目录精确清理已覆盖。
- [x] 简体中文、键盘、焦点、读屏语义代理、1440/390/320 和 console clean 已覆盖。
- [x] 两套 Node 基线的证据来源已逐项标明，没有伪造固定 10 重复执行。
- [x] 本轮没有未关闭 Blocker／Major／Minor；缺陷已完成互斥分类。
- [x] 当前浏览器／当前设备本地存储边界与生产冻结已写入结论。
- [x] 未修改业务代码，未触碰 Control 文件，未启停共享服务，未进入部署或生产。

## 11. 停止门与审核选项

- 当前产物：`artifact-spaced-recall-storage-generation-aba-test-report-001`
- 当前停止门：`test-report-review`
- QA 建议：**批准本次 generation ABA 修复及授权内既有回归测试通过；继续保持 AI English Learning 整体生产发布冻结。**
- 本报告交付后不自动路由 DevOps 或任何后续角色，也不批准未来测试报告。
- 审核选项：
  1. `通过`：只批准当前测试报告与本批 QA 结论；后续如何回到既有跨项目重规划队列由既有治理决定，不授权部署。
  2. `修改`：指出需要补充或修订的证据、范围或结论，由固定 `10 测试工程师`更新后重新交付。
  3. `继续测试`：明确新增测试范围；未明确前不扩大到后端、PRD v1.4 其他功能或生产环境。
