# AI English Learning 记忆曲线 v1.3 前端代码审查

## 审查元数据

- project_id: `ai-english-learning`
- change_id: `review-20260806-spaced-recall-frontend-v1-3`
- input_artifact: `artifact-spaced-recall-frontend-001`
- source_commit: `159815d59c2efb885317bbaebfa1e1981fd8c2fa`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- reviewed_at: `2026-08-10T15:58:51+08:00`
- scope: 记忆曲线 v1.3 前端交付的正确性、安全、性能、可维护性、测试、无障碍、简体中文、数据真实性边界与已批准产品/UI/架构契约
- excluded: 代修前端、产品/UI 变更、后端、QA、部署与生产发布

## 结论

**结论：请求修改，不建议进入 QA。**

权威提交到审查时 `HEAD` 的目标前端与 `design-qa.md` 均无漂移，7 项已登记输入 SHA-256 全部一致。合规 Node.js 24.14.0 下 lint、生产构建、间隔复习确定性验证和 1,200 组行内填空随机验证均通过。行内查看答案、弱证据幂等登记、S0～S4/D+30 主路径、离线不结算、本地修订冲突保护、简体中文、键盘/读屏语义以及当前浏览器/设备的数据真实性边界总体实现清楚；静态安全审查未发现高置信度 XSS、动态代码执行、凭证泄漏或越权写入问题。

但审查确认 3 项 Major 和 4 项 Minor。单条非法到期记录会把整个复习存储置为不可恢复的只读锁死状态，首次跳过没有真正移动到队尾，现有测试也无法覆盖这两项及提醒 UI 集成；此外，免打扰提醒只在结束时刻的单一分钟窗口释放，权限状态分支不可达，多薄弱词最终平局没有按规则随机打散，失败回退历史缺少阶段前后信息。当前至少存在 P1，因此应先由固定 `06 前端工程师`修复，再回固定 `09 代码审查员`复审。

| 严重级别 | 数量 | 门禁影响 |
| --- | ---: | --- |
| Blocker | 0 | 无 P0 |
| Major | 3 | 存在 P1，阻断进入 QA |
| Minor | 4 | 应随修复批次处理或明确登记 |
| 建议 | 2 | 不单独阻断当前门禁 |

## Major

### CR-P1-001：一条非法到期记录会锁死整个复习域，没有按单项异常隔离并继续下一题

- 位置：`frontend/src/utils/spacedRecall.ts:1351-1399,1474-1529`；`frontend/src/pages/Word.tsx:248-255,545-582`
- 问题：持久化状态中任一学习项的 `dueDay` 非法时，`isRecallItemValue` 令整个 `isSpacedRecallState` 失败，`loadSpacedRecallState` 返回全局 `storage-error/corrupt`。页面随后虽然用空白状态重新注册题库，却把 `recallStorageStatus` 固定为 `corrupt`，`commitRecallResult` 会拒绝所有后续复习写入；界面没有导出原始数据、隔离坏项、重新验证或确认重建的恢复入口。只读复现把单个 `dueDay` 改为 `not-a-date` 后，加载结果即为全局 `{status: "storage-error", reason: "corrupt"}`。
- 影响：一个坏项会让所有正常学习项都无法开始或结算，用户也无法在产品内恢复。它与 PRD `AC-SR-36` 及 UI Prompt“非法到期时间生成单一异常项、继续下一可用题”的边界相反。
- 建议：加载时先做可恢复的逐项校验，把非法项转成保留原始快照与原因的 `data-exception`，正常项继续工作；对整体 JSON/版本损坏提供明确、二次确认的备份导出与安全重建路径，并在成功恢复前保持原始值不被覆盖。
- 严重性理由：异常恢复是 v1.3 P0 范围；当前故障会导致整个核心复习流程不可用。

### CR-P1-002：首次跳过只记次数，没有把学习项移到当前队列末尾

- 位置：`frontend/src/utils/spacedRecall.ts:833-906`；`frontend/src/pages/Word.tsx:1866-1875,1942-1955`
- 问题：`skipRecallItem` 第一次跳过仅写入 `skipCountsByDay` 和事件；它没有更新任何参与 `buildReviewQueue` 排序的字段。队列仍按到期日、薄弱证据数和 `lastAppearanceAt` 排序，因此跳过前后的顺序完全一致。只读复现中两个同条件项目的队列在首次跳过前后均为 `["alpha", "beta"]`。活动题流程会临时查找另一个项目绕开当前词，但队列弹层、关闭后再次“开始复习”以及其他队列消费者仍看到原顺序。
- 影响：违反 PRD `AC-SR-33`“当天首次跳过移到队尾”的明确语义；从队列弹层点击跳过后，主入口可立刻再次选择同一项，用户无法可靠延后当前题。
- 建议：把“当日首次跳过后的队尾优先级”建模为可持久化、可恢复的调度字段或队列游标，并让所有队列消费者共享同一排序结果；第二次跳过继续使用次日抑制语义。增加队列前后顺序和刷新恢复测试。
- 严重性理由：跳过是核心队列控制，当前域模型与 UI 表现不一致，且不只是展示问题。

### CR-P1-003：测试只覆盖域函数和填空工具，无法验证队列/提醒/恢复的 React 集成

- 位置：`frontend/package.json:9-13`；`frontend/scripts/verify-spaced-recall.mjs:1-577`；`frontend/scripts/verify-inline-cloze.mjs`；`design-qa.md`
- 问题：`test:spaced-recall` 通过动态转译直接调用 `spacedRecall.ts`，`test:cloze` 只验证填空工具不变量；没有组件或浏览器级断言覆盖 `RecallCenter`、`Word` 与浏览器存储/通知的组合行为。现有测试只断言两次跳过后的抑制，从未断言第一次跳过的队列顺序；提醒测试只检查恰好 `08:00`，没有检查 `08:01+`、睡眠/后台恢复；损坏测试只断言“保留原文”，没有验证用户可恢复并继续正常项。`design-qa.md` 将这些状态标为通过，但不是可重复的自动门禁。
- 影响：CR-P1-001、CR-P1-002 及下面的提醒/权限问题均能在 lint、build、两项测试和设计 QA 全绿时交付，当前验证结果不能支撑“异常恢复、提醒和队列控制完整通过”的结论。
- 建议：增加 React/浏览器级回归，至少覆盖首次/二次跳过及刷新、单项非法到期隔离与恢复、localStorage 修订冲突、免打扰跨分钟/跨后台恢复、四种通知权限文案、键盘焦点与 320/390px 溢出；保留现有确定性域测试作为快速层。
- 严重性理由：多个核心 P1 已实际漏检，测试缺口会持续放行同类回归。

## Minor

### CR-P2-001：免打扰提醒只在结束时刻的单一分钟窗口释放

- 位置：`frontend/src/utils/spacedRecall.ts:1166-1218`；`frontend/src/pages/Word.tsx:591-619,1794-1853`
- 问题：跨午夜免打扰仅在 `nowMinutes === quietEndMinutes` 时把提醒归到前一学习日。只读复现中自定义 `23:00` 提醒、`22:00～08:00` 免打扰在 `08:00` 返回请求通知，但 `08:05` 已退回 `before-reminder-time`。页面依赖每 60 秒计时和可见性恢复；设备睡眠、标签冻结或用户在 `08:01` 后打开都会错过顺延机会。
- 影响：`AC-SR-25` 的“顺延到免打扰结束一次”只在非常窄的运行条件下成立；可能直到下一晚才再次进入判断。
- 建议：持久化待释放的提醒学习日/有效窗口，免打扰结束后首次恢复时做一次幂等判断；如果产品决定“用户已打开页面则只显示队列、不补系统通知”，也应显式返回该原因而不是误报“尚未到提醒时间”。

### CR-P2-002：未询问、已拒绝和平台不支持的权限文案分支不可达

- 位置：`frontend/src/components/RecallCenter.tsx:216-237,746-753`；`frontend/src/pages/Word.tsx:1804-1809`
- 问题：除 `granted` 外所有权限都被映射为 `externalNotificationMode = in-app-only`；`getPermissionText` 在第 223～225 行先对该模式直接返回通用文案，导致后面的 `permission` switch 永远不能显示“未询问 / 已拒绝 / 不支持”的具体原因。
- 影响：违反 `AC-SR-23` 及 UI Prompt 的四态权限文案要求，用户无法判断是否应授权、修改浏览器设置，还是当前平台根本不支持。
- 建议：先按权限状态分支，再叠加外部通道边界；每个状态保持简体中文、可操作原因和“不声称送达”的真实性说明。

### CR-P2-003：多薄弱词最终平局按 itemId 固定排序，没有随机打散

- 位置：`frontend/src/utils/spacedRecall.ts:774-804`
- 问题：候选项先按轮次、窗口剩余、证据数和最近出现时间排序，但最终平局使用 `itemId.localeCompare`；域函数没有接收本次调度的稳定随机键。随机性只用于每个机会的 3～7 偏移，不用于同条件候选打散。
- 影响：不满足 PRD 多薄弱词竞争“合格项中随机打散”和 `AC-SR-10`，相同条件下字典序靠前的学习项会长期占优。
- 建议：在保持刷新幂等的前提下，为会话和候选集合生成稳定随机秩，并增加首轮覆盖、窗口临界和最终平局的确定性测试。

### CR-P2-004：答错/查看导致的阶段回退历史缺少前后阶段

- 位置：`frontend/src/utils/spacedRecall.ts:514-547`；`frontend/src/pages/Word.tsx:1638-1676`
- 问题：`applyWeakEvidence` 在写事件前直接把学习项重置到 `S0`，事件 metadata 仅保留 `masteryGain` 和新 `dueDay`，没有 `fromStage/toStage`。历史 UI 又只从这两个 metadata 字段构建阶段变化，因此 S2/S3/S4 或维护复习失败后，用户只能看到“已登记薄弱证据”，不能追溯从哪个阶段回到 S0。
- 影响：`AC-SR-32` 要求历史能看到阶段变化与到期日；当前成功推进有前后阶段，失败回退却缺失关键审计信息。
- 建议：在变更前捕获原状态/阶段，在弱证据事件中记录 `fromStatus/fromStage/toStatus/toStage` 与原因；历史展示只读消费这些事件，不从当前状态反推过去。

## 安全、性能、真实性与架构核验

### 已通过

- 未发现 `dangerouslySetInnerHTML`、直接 `innerHTML`、`eval`、`new Function`、未校验外部导航、`postMessage`、Cookie/认证凭证写入或前端网络提交；用户文案均由 React 文本节点转义。
- 未发现被 Git 跟踪的 `.env`、API Key、访问令牌、Cookie、SSH 私钥、`auth.json` 或嵌套 `.git`。
- `localStorage` 只保存当前浏览器/设备的复习状态，`sessionStorage` 保存本标签会话与查看答案记录；持久化读取有版本和结构校验，写入有 revision compare-and-set，冲突时不覆盖较新记录。CR-P1-001 是恢复粒度/可用性问题，不是静默覆盖或数据外泄。
- 浏览器通知仅在用户开启、权限允许、在线且真实有到期项时请求；记录明确为“已请求”而非“已送达”。短信、邮件、跨设备同步、离线结算和后端能力均被清楚标为待接入或不支持。
- 输入没有新增 API、鉴权、数据库或部署实现；与另行待审的 `artifact-english-word-local-service-architecture-001` 保持边界，没有伪装已接入后端。
- 生产构建通过，主 JS 约 `373.72 kB`（gzip `115.88 kB`），主 CSS 约 `63.49 kB`（gzip `13.92 kB`），未出现构建块大小告警。本批没有发现足以单独阻断的性能回归。
- `RecallCenter` 对话框与重置确认实现焦点进入/返回、Escape、Tab 陷阱、方向键标签页；行内答案保持单一语义输入，结果有礼貌播报；`prefers-reduced-motion`、320/390px 响应式与简体中文覆盖有源码和既有 Design QA 证据。

### 验证限制

- 按本轮明确指令未运行联网 `npm audit`，因此本报告不声明第三方依赖“无已知漏洞”。锁文件与运行代码的静态审查未发现直接高危用法；后续获批的依赖审计应使用可用、可信的 registry。
- 仓库前端没有定义 CSP、HSTS、frame 限制等部署响应头；这些可能由未来本地服务或边缘层提供。本轮不是部署审查，仅登记为真实运行环境验收项，不据此判定当前应用漏洞。
- 本轮没有进入 QA，也没有重新执行浏览器网络离线模拟；响应式/视觉结论使用权威 `design-qa.md` 与已有截图，核心业务结论使用源码和确定性只读复现。

## 建议

### CR-S-001：把 `Word.tsx` 的复习编排拆到可测试控制器/Hook

`Word.tsx` 已超过 2,300 行，同时管理填空、持久化、提醒、队列、对话框和导航。建议在修复批次中保持产品行为不变，把复习状态持久化与浏览器事件编排提取为单一 Hook/控制器，让域函数、React UI 和浏览器适配层分别可测；这不是授权大改 UI。

### CR-S-002：在真实运行门禁复核依赖与响应头

后续获批的部署/安全审查应复核锁文件依赖漏洞，并在真实 URL 或本地服务上验证 CSP、HSTS、`X-Content-Type-Options`、Referrer Policy 与 frame 限制。本建议不授权当前角色联网审计、修改服务或部署。

## 验证记录

| 检查 | 结果 |
| --- | --- |
| `git diff 159815d... HEAD -- frontend design-qa.md` | 目标输入无漂移 |
| 输入 SHA-256 对照 `workflow/artifacts.yaml` | 7/7 一致 |
| Node.js | `24.14.0`，满足 `>=22.12.0` |
| `npm run lint` | 通过 |
| `npm run build` | 通过 |
| `npm run test:spaced-recall` | 通过 |
| `npm run test:cloze` | 通过，1,200 组随机提示用例 |
| 首次跳过顺序只读复现 | 失败：`[alpha,beta]` 跳过 `alpha` 后仍为 `[alpha,beta]` |
| 免打扰释放只读复现 | `08:00` 请求；`08:05` 错误返回 `before-reminder-time` |
| 单项非法 due 只读复现 | 全局返回 `storage-error/corrupt` |
| 安全危险模式与敏感文件静态检查 | 未发现高置信度问题 |
| `npm audit` | 按指令未执行；不作无漏洞结论 |
| Git 边界 | AIWorkFlow 单一根仓，目标目录无嵌套仓库 |

## 停止门与下一步

- 当前停止门：`code-review-conclusion-review`
- 当前决策：等待超级无敌帅超超总审核本代码审查结论
- 推荐审批选项：
  1. `通过`：批准本审查结论，并仅授权唯一责任角色固定 `06 前端工程师`进入上述 P1/P2 修复；修复后回固定 `09 代码审查员`复审。
  2. `修改`：调整审查结论或范围，本角色修订后重新交付。
  3. `打回`：本审查产物退回复审。
- 本次交付不自动启动修复、不进入 QA、不处理后端架构待审产物、不进入部署或生产发布。

---

## 复审更新（2026-08-11）

### 复审元数据

- change_id: `rereview-20260811-spaced-recall-frontend-fix-001`
- authorization: `approval-20260811-spaced-recall-code-rereview-entry`
- input_artifact: `artifact-spaced-recall-frontend-fix-001`
- source_commit: `a6ae859aab648829ae65df75220c82990a690bb0`
- diff_base: `f0cd4672e16c20d70dc1c0393dec21fe935a5a44`
- original_review: `artifact-spaced-recall-code-review-001`
- original_review_sha256: `a9fcdc86972eec74ec58d27fcbcc12365fe60fc81744dc14279a950bb9a6b9c5`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- rereviewed_at: `2026-08-11T17:31:38+08:00`
- scope: 只读核验原 3 项 Major、4 项 Minor 的修复处置、回归门禁、简体中文、无障碍与数据真实性边界
- excluded: 代修前端、产品/UI 变更、固定 02 的后端/联调任务拆解、QA、部署与生产发布

### 复审结论

**结论：请求继续修改，不建议进入 QA。**

`CR-P1-002`、`CR-P1-003` 与 `CR-P2-001`～`CR-P2-004` 均已关闭；合规 Node.js 24.14.0 下 lint、生产构建、两层域验证以及项目自带 Chrome/CDP React 浏览器门全部通过。首次/二次跳过及刷新后的全局队列顺序、免打扰结束后延迟恢复、通知权限简体中文文案、稳定会话随机秩、回退历史、异常项隔离/已知内容恢复、键盘焦点、320/390/1440px 溢出与浏览器控制台清洁度均获得源码或自动化证据。静态复审没有发现新增的高置信度安全、性能、架构越界或数据真实性问题。

但 `CR-P1-001` 仍只能判定为**部分解决并保持 Major 打开**。普通、薄弱或已掌握记录的非法/缺失到期数据已经可以逐项隔离、保留原始快照并生成一条当前恢复任务；暂停态记录的到期数据损坏却会被转换为没有 `dataException.previous` 的异常项，随后恢复函数明确返回 `item-unavailable`，现有域测试也把该不可恢复结果固定为预期。界面统一提示“异常项可在队列中恢复”，实际又因 `recoveryAvailable === false` 不提供恢复动作。与此同时，整体 JSON 损坏或未知版本仍只有原值保留与全局写入锁定，没有原始导出和二次确认安全重建 UI。健康记录不再被单个普通坏项拖死，风险已显著收敛，但“逐项隔离恢复完成”以及原 CR-P1-001 的完整恢复边界尚未成立。

| 严重级别 | 当前打开 | 本轮关闭 | 门禁影响 |
| --- | ---: | ---: | --- |
| Blocker | 0 | 0 | 无 P0 |
| Major | 1 | 2 | `CR-P1-001` 部分打开，阻断进入 QA |
| Minor | 0 | 4 | 原 4 项均关闭 |
| 建议 | 2 | 0 | 原建议继续保留，不单独阻断 |

### 原问题处置

| 编号 | 复审状态 | 证据与判断 |
| --- | --- | --- |
| `CR-P1-001` | 部分解决 / Major 打开 | `spacedRecall.ts:1810-1834` 只为 ordinary/weak/mastered 构造恢复快照；暂停态异常的 `previous` 为 `undefined`，`1144-1152` 因而拒绝恢复。`verify-spaced-recall.mjs:841-870,954-976` 明确断言该结果。`Word.tsx:280-281,1847-1850` 的总提示与实际可恢复能力不一致。`spacedRecall.ts:1847-1852` 与 `Word.tsx:271-275,2131-2133` 仍只有整体原值保留/全局锁定，没有导出和二次确认重建 UI。普通单项异常隔离、CAS 归一化与可恢复路径通过。 |
| `CR-P1-002` | 已关闭 | 新增持久化 `queueTailAfterByDay`，全局队列排序、活动题、关闭后重新开始与刷新恢复共用队尾语义；域测试和 Chrome/CDP 门覆盖首次与二次跳过。 |
| `CR-P1-003` | 已关闭 | `npm test` 已纳入 React 浏览器集成门；浏览器门真实覆盖异常项隔离/已知内容恢复、跳过、刷新、开始与作答结算、拒绝通知文案、焦点返回、320/390/1440px 响应式及控制台错误。免打扰迟到恢复、四态权限域逻辑与修订冲突由确定性域测试补齐。 |
| `CR-P2-001` | 已关闭 | 提醒评估保留待释放学习日，免打扰结束后的首次可见恢复仍可幂等请求，不再依赖结束时刻的单一分钟。 |
| `CR-P2-002` | 已关闭 | 权限状态先于外部通道模式分支，`default`、`denied`、`unsupported`、`granted` 均有简体中文真实性文案；不声称通知已送达。 |
| `CR-P2-003` | 已关闭 | 最终平局使用 itemId 与 sessionId 生成稳定随机秩，同会话刷新幂等、跨会话可变，保留原业务优先级。 |
| `CR-P2-004` | 已关闭 | 弱证据回退与重置事件在变更前记录 `fromStatus/fromStage` 和 `toStatus/toStage`，历史可追溯。 |

### 仍需处理的 Major

#### CR-P1-001-R1：暂停态到期数据损坏被隔离后无法逐项恢复

- 位置：`frontend/src/utils/spacedRecall.ts:1144-1152,1810-1834`；`frontend/scripts/verify-spaced-recall.mjs:841-870,954-976`；`frontend/src/pages/Word.tsx:280-281,1847-1850`
- 问题：隔离逻辑只为 ordinary/weak/mastered 生成 `RestorableItemState`。暂停态记录的当前到期日或 `pause.previous` 到期日损坏时，隔离会删除 pause 并留下 `previous: undefined`；恢复函数因此永久拒绝。测试将“恢复被拒绝”当成成功条件，而页面总提示仍声称异常项可在队列中恢复。
- 影响：健康项可继续，但受影响的学习项无法在产品内恢复或重建；用户看到的是“需要恢复的记录”，却没有可执行动作。该行为不满足本复审批次声称的逐项恢复闭环。
- 建议：从原始暂停快照中构造可验证的安全恢复候选，或为不可安全推断的项目提供逐项原始导出与二次确认重建；同时让状态文案准确区分“可恢复”与“仅隔离、待导出/重建”。补充真实浏览器断言，不能只断言拒绝。
- 已知同类边界：整体 JSON 损坏/未知版本的原始导出与二次确认安全重建 UI 仍未实现，必须继续明确登记，不能把“原值保留”写成“已恢复”。

### 安全、性能、无障碍、简体中文与真实性复核

- 未发现新增的 `dangerouslySetInnerHTML`、直接 `innerHTML`、`eval`、`new Function`、任意网络业务提交、凭证写入或未校验外部导航；React 文本节点保持默认转义。
- 本地复习数据仍明确限定为当前浏览器/当前设备；通知只记录“已请求”而不是“已送达”；离线不结算，后端、短信、邮件和跨设备同步未被伪装成已接入。
- 主构建产物约为 JS `383.72 kB`（gzip `118.61 kB`）、CSS `63.52 kB`（gzip `13.93 kB`），无块大小告警；相对原审查没有发现足以单独阻断的性能回归。
- Chrome/CDP 门在 1440、390、320px 下通过，控制台错误/警告为 0，并覆盖对话框 Escape 关闭和焦点返回。变更状态、空态、错误态及权限文案均为完整简体中文。
- 按收口约束不再为额外 Playwright 二次核验启动受限本机监听或申请系统提升权限；该限制非阻断，因为项目自带 Chrome/CDP 门已经以真实浏览器独立通过。
- 未运行联网 `npm audit`，因此不声明第三方依赖无已知漏洞；本轮静态检查未发现直接高危用法。

### 复审验证记录

| 检查 | 结果 |
| --- | --- |
| `git diff f0cd4672... a6ae859a -- frontend design-qa.md workflow project.yaml` | 复审输入范围已锁定；路由提交不改变实现 |
| 输入 SHA-256 对照 `artifact-spaced-recall-frontend-fix-001` | 7/7 一致 |
| Node.js | `24.14.0`，满足 `>=22.12.0` |
| `npm run lint` | 通过 |
| `npm run build` | 通过；无块大小告警 |
| `npm run test:spaced-recall` | 通过 |
| `npm run test:cloze` | 通过；1,200 组随机提示用例 |
| `npm run test:browser` | 通过；Chrome/CDP，1440/390/320px，控制台清洁 |
| 暂停态损坏逐项恢复复核 | 失败：隔离后 `previous` 为空，恢复返回 `item-unavailable` |
| 整体 JSON/未知版本恢复 UI | 明确遗留：仅原值保留与全局锁定，无导出/二次确认重建 |
| `npm audit` | 未执行；不作无漏洞结论 |

### 复审停止门与下一步

- 当前停止门：`code-rereview-conclusion-review`
- 当前决策：等待超级无敌帅超超总审核 `artifact-spaced-recall-code-rereview-001`
- 推荐审批选项：
  1. `通过`：批准本复审结论，并仅授权固定 `06 前端工程师`处理 `CR-P1-001-R1` 及已明确的整体存储恢复 UI 遗留；完成后回固定 `09 代码审查员`再次复审。
  2. `修改`：调整复审结论或范围，本角色修订后重新交付。
  3. `打回`：本复审产物退回。
- 固定 `02 项目经理`的后端/联调任务拆解保持独立并行，未被读取、修改、暂存或扩权。
- 本次交付不自动进入 QA、后端、部署或生产发布。

---

## 存储恢复复审更新（2026-08-14）

### 复审元数据

- change_id: `rereview-20260814-spaced-recall-storage-recovery-fix-002`
- authorization: `approval-20260814-spaced-recall-storage-recovery-code-rereview-entry`
- input_artifact: `artifact-spaced-recall-storage-recovery-frontend-fix-002`
- source_commit: `e56f49cb8990a7d529e4aa2b311036aa08235c10`
- diff_base: `b55ffe422639e3eac99dd0d73b50b41f32e01a64`
- routing_commit: `f5fa9e20075e6d52e4a48a7e7b6d62a1782cbb94`
- original_rereview: `artifact-spaced-recall-code-rereview-001`
- original_rereview_sha256: `4f7e854a339e933b01fac29afa0d80bdd3e2531fb2f5abb38c53a831257321b5`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- rereviewed_at: `2026-08-14T16:52:49+08:00`
- scope: 只读复审 `CR-P1-001` 完整处置、既有 6 项关闭问题回归、简体中文、无障碍、真实性、存储安全与跨平台 Chrome 门禁
- excluded: 代修代码、QA、后端、PRD v1.4 新增实现、部署以及其他项目并发现场

### 复审结论

**结论：请求继续修改，不建议进入 QA。**

本批已经关闭上一轮 `CR-P1-001-R1` 的暂停态到期数据恢复缺口，并补齐整体 JSON/未知版本的 exact-raw 备份下载、显式二次确认、重建后的可用状态、缺题库内容真实性提示、旧版异常逐项迁移、修订冲突前置检查、简体中文和键盘焦点。`CR-P1-002`、`CR-P1-003` 与 `CR-P2-001`～`CR-P2-004` 未发现回归。Node.js 24.19.0 下 lint、生产构建、域验证、1,200 组填空随机验证和项目自带 Chrome/CDP 浏览器门均通过；真实浏览器覆盖 1440/390/320px、exact-raw 下载、取消重建、来源已变化时零写入、刷新后重新导出与确认重建、焦点恢复以及重建后继续作答。不过该浏览器门实际把两份测试备份写入系统默认 Downloads，违反测试隔离，本轮新增 1 项 Minor 并已停止继续运行下载型门禁。

但 `CR-P1-001` 仍保持 **Major 打开**：`rebuildSpacedRecallStorage` 的所谓 CAS 是两个独立的 Web Storage 调用——先比较 `getItem`，再执行 `setItem`。在两者之间若另一标签写入更新值，当前标签仍返回 `rebuilt` 并覆盖该更新。项目浏览器测试只覆盖“确认前已经变化”的情形，没有覆盖“比较后、写入前”的竞态。WHATWG HTML Standard 对 `localStorage` 的并发边界明确要求作者假设不存在跨窗口锁，因此这不是可由平台保证消除的理论窗口。只读竞态存储复现结果为 `{"result":"rebuilt","newerValueSurvived":false,"finalStorageVersion":1}`。

| 严重级别 | 当前打开 | 本轮关闭 | 门禁影响 |
| --- | ---: | ---: | --- |
| Blocker | 0 | 0 | 无 P0 |
| Major | 1 | 1 个既有恢复分支 | `CR-P1-001` 仍未完整关闭，阻断进入 QA |
| Minor | 1 | 0 | 新增浏览器门污染用户 Downloads 的测试隔离问题 |
| 既有建议 | 2 | 0 | 继续保留，不单独阻断 |

### 问题处置与回归

| 编号 | 复审状态 | 证据与判断 |
| --- | --- | --- |
| `CR-P1-001` | 部分解决 / Major 打开 | 暂停态、旧版 data-exception、缺失/非法 due、已完成维护周期、missing-content 返回后的安全恢复均通过；整体损坏/未知版本可逐字导出，未导出/未确认/来源预先变化时均零写入。但 `spacedRecall.ts:2141-2157` 是非原子的 compare-then-set，无法保证跨标签真正 CAS，仍可能覆盖比较后到写入前出现的新值。 |
| `CR-P1-002` | 已关闭且无回归 | 本批未改动跳过排序核心；域与 Chrome 门继续通过首次移队尾、刷新保持、二次次日抑制和所有队列消费者一致性。 |
| `CR-P1-003` | 已关闭且无回归 | React/Chrome 门扩展到存储恢复全流程，并继续覆盖队列、恢复、响应式、焦点及控制台清洁度；未退化为纯域测试。 |
| `CR-P2-001` | 已关闭且无回归 | 免打扰迟到释放域测试继续通过。 |
| `CR-P2-002` | 已关闭且无回归 | 四态通知权限简体中文分支保持可达，且不声称送达。 |
| `CR-P2-003` | 已关闭且无回归 | 稳定会话随机秩与刷新幂等测试继续通过。 |
| `CR-P2-004` | 已关闭且无回归 | 弱证据回退与重置历史的前后状态字段保持完整。 |

### 新增 Minor

#### CR-P2-005：Chrome/CDP 门调用真实下载，污染用户默认 Downloads

- 【级别】Minor
- 【位置】`frontend/scripts/verify-recall-browser.mjs:301,330-342,380-402,668,740,819-824`
- 【问题】测试虽然用临时 `--user-data-dir` 启动 Chrome，并覆盖 anchor click 以捕获文件名和 Blob 内容，但覆盖函数最后仍执行 `clickAnchor.call(this)`。脚本没有设置 CDP 下载策略或临时下载目录，因此系统按默认下载配置把 `ai-english-learning-recall-backup-*.json` 写入用户 Downloads；一次门禁会真实点击两次导出。
- 【影响】自动化验证在项目目录外产生未声明副作用，连续运行会持续污染用户文件夹，也使“测试只使用临时 profile/临时目录”的隔离声明不完整。用户发现时系统 Downloads 中已有 22 个同名前缀 JSON，最后一个时间为 16:51:57；本角色未删除这些文件，后续精确清理由固定 `00 包工头`按用户授权移入废纸篓。
- 【建议】首选在测试替身中只捕获 exact-raw、文件名和 Blob URL，不调用原始 anchor click；若必须验证落盘，则使用 CDP `Browser.setDownloadBehavior` 将 `downloadPath` 指向本轮 `mkdtemp` 目录，并只在 `finally` 清理该精确目录。未修复前不得继续运行会点击导出的真实浏览器门。

### 仍需处理的 Major

#### CR-P1-001-R2：重建使用非原子 compare-then-set，无法保证跨标签零覆盖

- 【级别】Major
- 【位置】`frontend/src/utils/spacedRecall.ts:2141-2157`；`frontend/scripts/verify-spaced-recall.mjs:935-970`；`frontend/scripts/verify-recall-browser.mjs:702-722`
- 【问题】函数先读取并比较 `expectedRaw`，随后单独调用 `setItem`。Web Storage 没有提供跨标签事务或 compare-and-set；另一标签可在两个调用之间写入，当前标签仍会覆盖它。现有测试把来源变化安排在调用之前，只证明前置比较有效，不能证明比较与写入之间互斥。
- 【只读复现】构造一个在 `getItem` 返回旧值后立即注入较新值的 `StorageLike`，函数返回 `rebuilt`，最终 `newerValueSurvived=false`。这精确复现了 compare 后、set 前的并发插入窗口。
- 【影响】这是用户明确确认的破坏性重建动作；竞态会丢失另一标签的较新复习记录，与“跨标签冲突锁定”“零覆盖”和 `CR-P1-001` 的数据保护目标相反。
- 【建议】把重建放入真正的跨上下文独占区，例如在目标 Chrome 能力范围内使用 Web Locks API，并在锁内再次读取 exact-raw、写入、回读验证；不支持可靠锁时保持恢复锁定或迁移到支持事务的 IndexedDB。增加两标签真实浏览器竞态门禁，不能只用单进程存储 mock 在调用前改值。
- 【标准依据】[WHATWG HTML Standard：Web Storage](https://html.spec.whatwg.org/dev/webstorage.html) 明确提示作者应假设共享 `localStorage` 不存在锁机制。

### 已通过的恢复、真实性与可访问性边界

- 暂停态 due、pause.previous due、resumeDay 与旧版 data-exception 包装均能在保留原始快照后形成一个当前恢复任务；完全缺失或结构损坏的 pause 只隔离并如实标记不可安全恢复，健康兄弟项继续工作。
- exact-raw 备份 Blob 直接来自加载时 `rawSnapshot`，未知版本使用 `.json`、非 JSON 损坏使用 `.txt`；界面只声称“生成下载”，不伪称用户已保存、可自动导入或已云端备份。
- 未导出、未二次确认、状态不合法、写入失败或确认前来源已经变化时，域函数均不覆盖原始值；来源变化后 UI 保持统计与队列锁定并要求刷新重新导出。
- missing-content 项不会伪恢复；题库内容重新出现后，恢复前用当前权威题库覆盖 answer/meaning，并可继续结算。已完成当前维护周期的 mastered 项不会被错误重新入队。
- 存储异常时不展示临时零统计，队列和结算操作禁用；重建确认使用 `alertdialog`、Escape 取消、Tab 焦点约束和焦点返回，320px 下无横向溢出。
- 数据仍只在当前浏览器/设备；备份是本地下载生成，后端、跨设备同步、PRD v1.4 新增范围和生产部署均未被声称已实现。
- 本批未修改依赖清单；未运行联网 `npm audit`，因此不声明第三方依赖无已知漏洞。静态检查未发现新增 XSS、动态代码执行、凭证写入或任意业务网络提交。

### 复审验证记录

| 检查 | 结果 |
| --- | --- |
| `git diff b55ffe4...e56f49c -- projects/ai-english-learning` | 6 个前端/测试文件与 3 个 English workflow 文件；输入范围锁定 |
| 输入 SHA-256 对照 `artifact-spaced-recall-storage-recovery-frontend-fix-002` | 6/6 一致 |
| Node.js | `24.19.0`，满足 `>=22.12.0` |
| `npm run lint` | 通过 |
| `npm run build` | 通过；JS `394.22 kB`（gzip `121.38 kB`），CSS `64.61 kB`（gzip `14.17 kB`），无块大小告警 |
| `npm run test:spaced-recall` | 通过 |
| `npm run test:cloze` | 通过；1,200 组随机提示用例 |
| `npm run test:browser` | 功能断言通过，但产生系统 Downloads 文件；已停止再次运行并登记 `CR-P2-005` |
| compare 后 / set 前竞态只读复现 | 失败：返回 `rebuilt`，较新标签值被覆盖 |
| 安全危险模式静态检查 | 未发现新增高置信度 XSS、动态执行、凭证或业务外发 |
| `npm audit` | 未执行；依赖未改，不作无漏洞结论 |

### 复审停止门与下一步

- 当前产物：`artifact-spaced-recall-storage-recovery-code-rereview-002`
- 当前停止门：`code-rereview-conclusion-review`
- 当前决策：等待超级无敌帅超超总审核本复审结论
- 推荐审批选项：
  1. `通过`：批准本复审结论，并仅一跳授权固定 `06 前端工程师`修复 `CR-P1-001-R2` 的跨标签原子重建问题与 `CR-P2-005` 的下载型测试隔离问题；修复交付后再次回固定 `09 代码审查员`复审。
  2. `修改`：调整问题严重度、结论或范围，本角色修订后重新交付。
  3. `打回`：本复审产物退回。
- 本次交付不自动进入 QA、后端、PRD v1.4 新增实现、部署或生产发布；一次“通过”不得继续消费到再下一站。

## 存储安全复审更新（2026-08-15）

### 复审元数据

- change_id: `rereview-20260815-spaced-recall-storage-safety-fix-003`
- authorization: `approval-20260815-spaced-recall-storage-safety-code-rereview-entry`
- input_artifact: `artifact-spaced-recall-storage-safety-frontend-fix-003`
- source_commit: `94c958d096357bbead86c7a16fbfe5674d2c2919`
- diff_base: `cf14a6b1b54fe8a3c8334e277291a8c31d48b248`
- original_rereview: `artifact-spaced-recall-storage-recovery-code-rereview-002`
- original_rereview_sha256: `5a4284217860d4598f7432aa6aeb2b0cb63e846f307d53ba0516e0bbea5758c6`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- rereviewed_at: `2026-08-15T22:56:16+08:00`
- scope: 只读复审 `CR-P1-001-R2`、`CR-P2-005`、全部生产存储写路径、真实双标签竞态、ABA、防下载污染、简体中文、无障碍和既有回归
- excluded: 代修业务代码、QA、后端、PRD v1.4 新增实现、部署、生产发布以及其他项目现场

### 复审结论

**结论：请求继续修改，不建议进入 QA。**

`CR-P1-001-R2` 的原始 compare-then-set 竞态主体已经关闭：重建、普通写入和加载隔离归一化均使用同一个 origin 级 Web Lock，比较、写入、逐字回读都在独占回调内完成；锁忙、能力缺失、无效出站状态、写入失败和回读不确定均 fail-closed，没有无锁回退。真实双标签 Chrome 门证明生产普通写与重建共享锁，较新标签写入不会被覆盖。`CR-P2-005` 也已关闭：浏览器替身对下载链接直接返回，不再调用原生 `anchor.click()`；Chrome profile 使用仓外 `mkdtemp`，`finally` 只清理本轮精确目录。固定 09 在 Node.js 24.19.0 与 22.12.0 下独立运行 lint、typecheck/build、领域测试、1,200 组 cloze 和真实 Chrome/CDP 门均通过，两轮前后临时 profile 与该前缀 Downloads 文件均为 0。

但交付声称的“exact raw + revision + generation 防 ABA”没有完整实现，因此 `CR-P1-001` 仍保持 **Major 打开为 `CR-P1-001-R3`**。持久化状态只有 `revision`，没有独立、重建时必换且普通写必须匹配的 generation；重建还可以把存储写回与旧标签快照完全相同的 raw。此时旧标签的 `expectedRaw` 和 revision 都再次匹配，后续生产写会返回 `saved`。现有域测试所谓 ABA 用例实际构造的是“revision 相同、raw 不同”，真实浏览器门的重建 raw 也与旧标签 raw 不同，只验证了普通 stale-CAS，不覆盖同值 ABA。固定 09 使用真实导出函数只读复现得到 `{"rebuild":"rebuilt","returnedToSameBytes":true,"staleWrite":"saved","staleItemPersisted":"stale-tab-write","storedRevision":2}`。

| 严重级别 | 当前打开 | 本轮关闭 | 门禁影响 |
| --- | ---: | ---: | --- |
| Blocker | 0 | 0 | 无 P0 |
| Major | 1 | `CR-P1-001-R2` 原子竞态主体 | `CR-P1-001-R3` 阻断进入 QA |
| Minor | 0 | `CR-P2-005` | 无打开 P2 |
| 既有建议 | 2 | 0 | 继续保留，不单独阻断 |

### 问题处置与回归

| 编号 | 复审状态 | 证据与判断 |
| --- | --- | --- |
| `CR-P1-001-R2` | 主体关闭 / 形成 `CR-P1-001-R3` | `spacedRecall.ts:2175-2225,2278-2349` 中重建、归一化与普通保存共用 `SPACED_RECALL_STORAGE_WRITE_LOCK`，在锁内比较、写入和回读；`Word.tsx:685-845,2361-2453` 的生产路径没有无锁回退。真实双标签 Chrome 门通过。但存储 envelope 仅有 `revision`（`spacedRecall.ts:159-175`），重建没有生成独立 generation，同值 ABA 仍接受旧标签写入。 |
| `CR-P2-005` | 已关闭 | `verify-recall-browser.mjs:444-455` 捕获 Blob/文件名后直接返回，不调用原生下载；`332,1435-1457` 使用本轮 `mkdtemp` profile 并在停止 Chrome/Vite 后删除精确目录。固定 09 两次真实 Chrome 门前后仓外临时目录和匹配 Downloads 计数均为 0。 |
| `CR-P1-002`、`CR-P1-003`、`CR-P2-001..004` | 已关闭且无回归 | 两套 Node 的领域、cloze、React/Chrome 门全绿；队列、恢复、提醒、中文状态、键盘焦点、320/390/1440px 与 console clean 均未见本批回归。 |

### 仍需处理的 Major

#### CR-P1-001-R3：没有独立存储 generation，重建回同一 raw 后旧标签可越过 ABA 门

- 【级别】Major
- 【位置】`frontend/src/utils/spacedRecall.ts:159-175,2175-2269,2330-2349`；`frontend/scripts/verify-spaced-recall.mjs:1134-1152`；`frontend/scripts/verify-recall-browser.mjs:1352-1377`
- 【问题】当前 CAS token 只有 exact raw 与 revision。重建可以把当前题库状态序列化成与某个重建前标签所持快照逐字相同的值；由于 envelope 没有每次重建必换的 generation，存储经历 A→未知/损坏 B→重建 A 后，旧标签的 expectedRaw=A、expectedRevision 仍再次成立。Web Lock 只保证操作串行，不能识别值已跨过一次破坏性世代边界。
- 【只读复现】先保存合法状态 A，让旧标签派生待写状态；再把存储改成未知版本 B，并在共享锁内用 A 重建。确认 `returnedToSameBytes=true` 后，用旧标签的 raw/revision 调用生产 `saveSpacedRecallStateWithLock`，返回 `saved`，旧标签新增项进入重建后的记录。
- 【测试缺口】域测试第 1134～1152 行明确使用与重建结果不同的 `staleGenerationRaw`，所以只证明 exact-raw 能拒绝不同快照；浏览器测试也只断言当前特定 fixture 的 rebuilt raw 与旧 raw 不同。两者都没有构造 A→B→A，也没有断言 generation token 在重建时变化。
- 【影响】破坏性重建本应成为旧标签必须刷新的世代边界；当前旧页面在同值回环时仍可把重建前的交互写入新世代。发生条件窄于原 R2 的任意跨标签竞态，但它直接违反本批明确登记的 ABA 安全契约和“重建后旧标签 fail-closed”门禁，因此继续按 Major 阻断 QA。
- 【修复要求】在持久化 envelope 增加不可回退的 `generation`/epoch token；初始化生成，普通域写继承且 CAS 同时匹配，破坏性重建必须生成新 token。若兼容旧记录，需要在共享锁内完成一次可追溯迁移。领域门必须覆盖 A→B→A，同一真实浏览器门必须让重建后的业务 raw 除 generation 外可与旧状态相同，并断言旧标签写入冲突且新 generation 保持不变。

### 已通过的存储、安全、真实性与可访问性边界

- 所有 `SPACED_RECALL_STORAGE_KEY` 生产写路径均收口到共享 Web Lock；`sessionStorage` 的页面会话记录不属于该持久化域，未发现绕过锁直接写复习主记录的路径。
- 普通写、归一化和重建均校验出站状态并逐字回读；`lock-busy`、`lock-unavailable`、`revision-conflict`、`write-unverified` 与存储错误都有简体中文、不会假称成功的状态，关键写入期间按钮禁用并提供 `aria-busy`/live status。
- 未发现本批新增 `dangerouslySetInnerHTML`、动态代码执行、凭证写入或业务网络外发；新增 `fetch`/WebSocket 只存在于本地 Chrome/CDP 测试控制面。本批未改依赖清单，未运行联网 `npm audit`，因此不声明第三方依赖无已知漏洞。
- 备份仍只表示在当前浏览器生成本地下载，不声称已保存、可自动导入或云同步；后端、跨设备同步、PRD v1.4 新功能和生产部署均未被本批实现或声称完成。

### 独立验证记录

| 检查 | 结果 |
| --- | --- |
| `git diff cf14a6b...94c958d -- projects/ai-english-learning/frontend` | 6 个前端/测试文件；输入范围锁定 |
| 输入 SHA-256 对照 `artifact-spaced-recall-storage-safety-frontend-fix-003` | 6/6 一致 |
| Node.js 24.19.0：lint / typecheck+build / cloze / domain / Chrome | 全部通过；1,200 组 cloze，真实双标签 1440/390/320px，console clean |
| Node.js 22.12.0：lint / typecheck+build / cloze / domain / Chrome | 全部通过；1,200 组 cloze，真实双标签 1440/390/320px，console clean |
| 构建产物 | JS `405.80 kB`（gzip `124.36 kB`）；CSS `65.03 kB`（gzip `14.27 kB`）；无块大小告警 |
| 下载/临时目录隔离 | 两轮 Chrome 门前后 `english-recall-cdp-*` 与匹配 Downloads 文件计数均为 0 |
| 同值 ABA 只读复现 | 失败：A→B→A 后旧标签生产写返回 `saved`；`CR-P1-001-R3` 打开 |
| `git diff --check` / 危险模式静态检查 | 通过；未发现新增高置信度安全问题 |
| 首次 Node 24 启动 | npm 子进程误继承 Node 18.12.1，lint 启动前即拒绝；修正 PATH 后完整重跑通过，不计为业务验证 |
| `npm audit` | 未执行；依赖未改，不作无漏洞结论 |

### 复审停止门与下一步

- 当前产物：`artifact-spaced-recall-storage-safety-code-rereview-003`
- 当前停止门：`code-rereview-conclusion-review`
- 当前决策：等待超级无敌帅超超总审核本复审结论
- 推荐审批：若通过本结论，仅授权固定 `06 前端工程师`处理 `CR-P1-001-R3` 的独立 generation 与同值 ABA 双层门禁；修复交付后再次回固定 `09 代码审查员`复审。
- 本次交付不自动进入 QA、后端、PRD v1.4 新增实现、部署或生产发布；一次“通过”不得继续消费到再下一站。

---

## generation ABA 复审更新（2026-08-16）

### 复审元数据

- change_id: `rereview-20260816-spaced-recall-storage-generation-aba-fix-004`
- authorization: `approval-20260816-spaced-recall-storage-generation-aba-code-rereview-entry`
- input_artifact: `artifact-spaced-recall-storage-generation-aba-frontend-fix-004`
- source_commit: `d3277734804745fa092803c84419861443f0cdc1`
- diff_base: `a5d0d1f30c6635f293a20938a19ad4087bc5a2b3`
- routing_commit: `522075150a0f3d53acc4c48776e7e243313b99e1`
- original_rereview: `artifact-spaced-recall-storage-safety-code-rereview-003`
- original_rereview_sha256: `65c39620c1bd5b27aeac4be757f710f27a4c9fbbb5678eb2a547d66acf98c488`
- reviewer: 固定 `09 代码审查员`（`role-code-reviewer`）
- rereviewed_at: `2026-08-16T15:05:27+08:00`
- scope: 只读复审 `CR-P1-001-R3` 的 generation/epoch envelope、旧 v1 锁内迁移、普通写代次继承与校验、破坏性重建换代、Word 状态同步、领域与真实双标签 A→B→A 回归，以及既有存储安全、下载隔离、简体中文、键盘/读屏和多视口回归
- excluded: 代修业务代码、QA、后端、PRD v1.4 其他新增功能、服务管理、部署、生产发布以及并行 UI/其他项目现场

### 复审结论

**结论：通过。`CR-P1-001-R3` 已关闭，P0/P1/P2 = 0/0/0。**

本批为持久化 envelope 增加独立、不可伪造为业务修订号的 `generation`；初始数据和破坏性重建均使用安全随机源生成代次，普通域写只继承当前代次，并在共享 Web Lock 内同时校验 exact raw、revision 与 generation。旧 v1 无 generation 数据不会在读取阶段无锁写回，而是携带 exact-raw 迁移令牌进入既有归一化写路径，只允许一个标签在共享锁内完成迁移；竞争标签必须冲突后刷新。重建成功会把换代后的 state/raw 同步回 `Word` 的 React state、ref 和 CAS raw，避免页面继续持有旧代。

独立领域门构造了 A→B→A 业务等值回环，证明剔除 generation 后业务 envelope 完全相等，但最终 raw 和三次 generation 均不同，旧标签写返回 `revision-conflict`。真实 Chrome/CDP 门使用两个真实标签和生产 React 提醒设置写路径复现同一边界：旧代写在共享锁内 fail-closed、刷新到新代且没有覆盖，新代重试成功保存；两标签最终读取一致且锁没有残留。Node.js 24.19.0 与最低支持版本 22.12.0 下 lint、独立 typecheck、生产构建、领域测试、1,200 组 cloze 及 Chrome 门全部通过。两轮浏览器门前后匹配下载和临时 profile 均为 0，未向用户 Downloads 落盘。

| 严重级别 | 当前打开 | 本轮关闭 | 门禁影响 |
| --- | ---: | ---: | --- |
| Blocker | 0 | 0 | 无 P0 |
| Major | 0 | `CR-P1-001-R3` | 原 generation ABA 阻断已关闭 |
| Minor | 0 | 0 | 无打开 P2 |
| 既有建议 | 2 | 0 | `CR-S-001/002` 继续保留，不阻断本结论 |

### 问题处置与证据

| 编号 | 复审状态 | 独立证据与判断 |
| --- | --- | --- |
| `CR-P1-001-R3` | 已关闭 | `spacedRecall.ts:161-162,298-318,398-415,1784-1790,2106-2194,2208-2277,2281-2416` 完成 generation 生成、校验、旧 v1 锁内迁移、重建换代和全部保存路径代次校验；`Word.tsx:290-383,680-845,2362-2407` 保持 state/ref/raw 同步。领域 A→B→A 与真实双标签 React 旧代拒绝/新代保存均独立通过。 |
| `CR-P1-001-R2`、`CR-P2-005` | 已关闭且无回归 | 比较、写入和逐字回读继续处于同一 origin 级 Web Lock；无锁、锁忙、写入/回读异常均 fail-closed。下载锚点继续拦截原生点击，Chrome 仅使用并清理本轮精确 `mkdtemp` profile。 |
| `CR-P1-002`、`CR-P1-003`、`CR-P2-001..004` | 已关闭且无回归 | 领域、cloze 和真实浏览器回归继续覆盖队列/恢复/提醒主路径、完整简体中文、键盘焦点、读屏状态、1440/390/320px 与 console clean；本批没有修改对应产品或 UI 语义。 |

### 安全、性能、真实性与架构边界

- generation 使用 `crypto.randomUUID()`，兼容分支使用 `crypto.getRandomValues()`；安全随机能力缺失时拒绝创建代次，不降级为时间戳或可预测随机数。持久化校验拒绝缺失、格式非法或跨代的当前 envelope。
- 全部复习主存储生产写继续收口到共享 Web Lock；未发现绕过锁直接写 `SPACED_RECALL_STORAGE_KEY` 的业务路径。旧版迁移依赖 exact source bytes，普通写不能冒充迁移覆盖旧数据。
- 未发现新增 `dangerouslySetInnerHTML`、直接 `innerHTML`、动态代码执行、凭证写入、任意业务网络外发或依赖变更。未运行联网 `npm audit`，因此不声明第三方依赖无已知漏洞。
- 构建产物为 JS `407.18 kB`（gzip `124.84 kB`）、CSS `65.03 kB`（gzip `14.27 kB`），无块大小告警；相对上一复审未见足以形成 P2 的性能回归。
- 数据真实性边界不变：复习状态仍只保存在当前浏览器/当前设备；备份只表示生成本地下载，不代表云备份、自动导入或跨设备同步。后端、PRD v1.4 其他功能、服务管理和生产部署均未实现或获权。
- 本次只审查 storage generation 修复；并行 `EL-UI-002` 设计分支及其他项目未作为输入、未修改、未暂存。

### 独立验证记录

| 检查 | 结果 |
| --- | --- |
| `git diff a5d0d1f...d327773 -- frontend` | 4 个前端/测试文件；输入范围锁定，source commit 为当前主线祖先 |
| 输入 SHA-256 对照 `artifact-spaced-recall-storage-generation-aba-frontend-fix-004` | 4/4 一致 |
| Node.js 24.19.0：lint / typecheck / cloze / domain / Chrome / build | 全部通过；1,200 组 cloze，真实双标签 1440/390/320px，console clean |
| Node.js 22.12.0：lint / typecheck / cloze / domain / Chrome / build | 全部通过；最低支持运行时完整通过 |
| 领域 A→B→A 等值 ABA | 通过：业务值等价、generation 每代不同、旧代写冲突且未落盘 |
| 真实双标签 React ABA | 通过：旧代 fail-closed 并刷新，新代重试保存，两标签一致、锁无残留 |
| 下载与临时目录隔离 | 两轮均为匹配 Downloads `0→0`、`english-recall-cdp-*` `0→0` |
| 生产构建 | 通过；JS `407.18 kB`（gzip `124.84 kB`），CSS `65.03 kB`（gzip `14.27 kB`） |
| `git diff --check` / 主存储写入口静态检查 | 通过；未发现绕过共享锁的生产写路径 |
| `npm audit` | 未执行；依赖未改，不作无漏洞结论 |

### 复审停止门

- 当前产物：`artifact-spaced-recall-storage-generation-aba-code-rereview-004`
- 当前结论：`passed`，P0/P1/P2 = `0/0/0`
- 当前停止门：`code-rereview-conclusion-review`
- 当前状态：复审产物已形成，等待结论审核；本角色不自动路由下一站。
- 本次交付不进入 QA、后端、PRD v1.4 其他实现、服务管理、部署或生产发布，也不构成对任何未来产物的预审批。
