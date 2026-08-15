# UI/UX 资产目录

本目录统一存放 Frontend Career Radar（前端职业成长雷达）的 UI/UX 提示词、设计说明、数据大屏/数据看板原型、生成界面和视觉审核产物。

## 当前产物

| 产物 | 版本 | 状态 | SHA256 | 用途 |
|---|---:|---|---|---|
| `09-release-completeness-ui-design-v1.4.md` | 1.4 | machine-passed-independent-review-pending | `371c4b1e703b5718853b304477b1507fe0de3a100ef0d2993dac4b245a4b04d2` | CR-UI-002 v1.4 设计说明；关闭第四轮 7 组 P1 + 1 组 P2，等待第五轮独立视觉审查 |
| `release-completeness-v1.4/resolved-manifest.json` | 1.4 | machine-passed-independent-review-pending | `02d11bc1ddb3a33a4d1fb5c448a70f4b54d2684e57410fa18244ce4f00e0fb38` | 49 张完整解析包：21 张 v1.4 修订 + 28 张按 SHA 复用 v1.3 resolved |
| `release-completeness-v1.4/review-manifest.json` | 1.4 | machine-passed-independent-review-pending | `22320c9e1e5531060542dcf8cfb347aab5df65e002ada045fac58ca4cf88966e` | 实际文字/容器几何、15 图表双向等价、真正 200% 和负向非零退出机器证据；独立审查 pending |
| `release-completeness-v1.4/png/` | 1.4 | overlay-ready-for-independent-review | 见 `overlay-manifest.json` | 21 张版本化修订 PNG；未变 28 张由 resolved manifest 按 SHA 引用 |
| `release-completeness-v1.4/assets/` | 1.4 | editable-overlay-source | 见 `overlay-manifest.json` | 与 21 张修订 PNG 一一对应的 SVG，不覆盖旧资产 |
| `08-release-completeness-ui-design-v1.3.md` | 1.3 | superseded-after-changes-requested | `2278c7ecee8826fe2f8afa90c94af28070b3295dc88020f8c29e7442ee3175ba` | 保留历史；第四轮独立审查发现 7 组 P1 + 1 组 P2，已由 v1.4 overlay 取代 |
| `release-completeness-v1.3/resolved-manifest.json` | 1.3 | superseded-after-changes-requested | `17d58597e46fa9390b379626d96fb4a4f01f5607ef902483593a116c9cd6bec8` | 保留 v1.3 的 49 张完整解析包，作为 v1.4 不可变解析基线 |
| `release-completeness-v1.3/review-manifest.json` | 1.3 | superseded-after-changes-requested | `63f5dc6d5748c12f60ee02b23a66ec57bbc050140ec9503c9e2447d06708e2cf` | 保留 v1.3 机器结果和第四轮审查依据，不作为当前通过结论 |
| `release-completeness-v1.3/png/` | 1.3 | overlay-ready-for-independent-review | 见 `overlay-manifest.json` | 39 张版本化修订 PNG；未变的 10 张由 resolved manifest 引用 v1.2 |
| `release-completeness-v1.3/assets/` | 1.3 | editable-overlay-source | 见 `overlay-manifest.json` | 与 39 张修订 PNG 一一对应的 SVG，不覆盖旧资产 |
| `07-release-completeness-ui-design-v1.2.md` | 1.2 | superseded-after-changes-requested | `768050aba1b7a959510b8f252a8d8628e25cc3b8f3be53bd04efb122630307cc` | 保留历史；第三轮独立审查发现 8 P1 + 3 P2，已由 v1.3 overlay 取代 |
| `release-completeness-v1.2/review-manifest.json` | 1.2 | superseded-after-changes-requested | `942bd955f74a1a7e567413153ee959bf60af3e174abdfbeb6156e67c6d0f5313` | 保留 v1.2 机器结果和第三轮审查依据，不作为当前通过结论 |
| `release-completeness-v1.2/png/` | 1.2 | immutable-base | 见 `review-manifest.json` | 49 张 v1.2 PNG 完整保留；v1.3 resolved bundle 只按 SHA 复用其中 10 张 |
| `release-completeness-v1.2/assets/` | 1.2 | immutable-base | 见 `review-manifest.json` | 49 张 v1.2 SVG 与 manifest 完整保留，不静默覆盖 |
| `06-release-completeness-ui-design-v1.1.md` | 1.1 | superseded-after-changes-requested | `f8377d001684a40d26513d4c02ccb1fa3fe1aea325300ee7357537c218b79aae` | 保留历史；二次独立审查发现 9 P1 + 3 P2，已由 v1.2 取代 |
| `release-completeness-v1.1/review-manifest.json` | 1.1 | superseded-after-changes-requested | `cb88099bbe7cbefa40cc8e9e2300676eb32405da3a019cdee135d77a5f5cbb9c` | 保留原文件和错误自动人工通过字段的审计证据，不作为当前通过依据 |
| `release-completeness-v1.1/png/` | 1.1 | superseded-after-changes-requested | 见 `review-manifest.json` | 28 张历史 PNG，完整保留 |
| `release-completeness-v1.1/assets/` | 1.1 | editable-source | 见 `review-manifest.json` | 与 28 张 PNG 一一对应的可编辑 SVG |
| `05-release-completeness-ui-design.md` | 1.0 | superseded-after-changes-requested | `ffc0251ac0c2bfc077e47a9b3352f1d6ccd30f584e6e352e160f07557afcfe3e` | 保留历史；独立审查发现实际画板覆盖不足，已由 v1.1 取代 |
| `career-release-01-overview-1440.png` | 1.0 | superseded-after-changes-requested | `09c1e1ca0bac4ec3ae366b1d0a40f621dc502342abbf63f41148a2b2b605475a` | v1.0 历史画板，保留原 SHA |
| `career-release-02-workbench-evidence-1440.png` | 1.0 | superseded-after-changes-requested | `d581c15fbdba22683860f1f593845cc4c3b61aadc40c6c7162fb5a4e87dd217f` | v1.0 历史画板，保留原 SHA |
| `career-release-03-rights-recovery-1024.png` | 1.0 | superseded-after-changes-requested | `59a98ad4f0690240a3853ba76808ebc5dda8bce85469111132c2feda8a25daca` | v1.0 历史画板，保留原 SHA |
| `career-release-04-mobile-390-320.png` | 1.0 | superseded-after-changes-requested | `b57df198b6d0a71b07bd79d724dcd22e9a158740c243792827c6b79656066001` | v1.0 历史画板，保留原 SHA |
| `career-release-05-system-states.png` | 1.0 | superseded-after-changes-requested | `70b00e52305512f7ea9390f3610c50a1ab25008283a88e221d96d4ba8d4737ad` | v1.0 历史画板，保留原 SHA |
| `04-release-completeness-ui-prompt.md` | 1.0 | approved | `983638cb6a802effe4148281233aa381802a7d542ce12e8c694640eee04f3900` | 发布完整性权威 Prompt：持续来源、公共／私有分域、个人证据、差距／路线／历史、账号同步与数据权利 |
| `03-ui-prompt.md` | 1.1 | ready-for-review | `fcc08310cfb92d970fe8dbb38c400bc5193c9e4707353ced12b1570b55894d29` | 继承完整职业雷达 UI，并新增只读研究快照服务的真实性状态 |

上一批准 Prompt v1.0 的 SHA256 为 `f75762b14b5cdcb536cdb58801cd77380ea4a3a276aa906515c137e129ad33b0`。超级无敌帅超超总已于 2026-08-04 放入 10 张生成界面并明确要求开始下一步；Prompt v1.0 与本批图片均登记为已批准历史输入。图片是 v1.0 视觉基线，不覆盖 v1.1 新增的健康／就绪、版本、新鲜度、降级、静态回退、错误和 F10 服务隔离，也不证明业务代码、真实招聘数据或个人成长数据已经存在。

## 用户批准视觉基线

| 文件 | 尺寸 | SHA256 |
|---|---:|---|
| `grok-005b4ddb-e276-47f2-a0fd-85d3c91353c7.jpg` | 1728×1152 | `1be67eff2e3637955aa6aace0e3c3eafd500cf6770c1c4d2cd5b0022b035ff00` |
| `grok-06889fa3-382b-4a87-9ebf-3b4f836724ca.jpg` | 1728×1152 | `fb22f72a5a8cdfc56299be7e76fa3203f67cd864d98e095e2bd8669007af41ca` |
| `grok-2fe219f3-15e7-4e2b-a6a7-253a6e2da913.jpg` | 1728×1152 | `b019875d407dfac87ba05b924080b05e6aabe89c1c2fed345176d7c5e2dec3c7` |
| `grok-30aeb4ea-53ea-4c2e-a16e-9d11101153e4.jpg` | 1728×1152 | `8add5eb10572f5497a87639a7a482f575fe18a00b3145f406c0dd492abde1919` |
| `grok-319f0ad0-b03a-4c38-8aec-e9d73228be30.jpg` | 1728×1152 | `edb0c63eebaed5f6f14a9d94a16acadf2c3b3546f085b178069c2497276b6115` |
| `grok-44740e77-d9c1-4606-879c-9fb8b5ee1e8f.jpg` | 1008×1792 | `d4f0a358969eb85cbde3711b51cbae26ffe2cfbeb829b78f7fd37e1df58e3186` |
| `grok-6c5fa9fb-5b35-451e-a510-1035aea32176.jpg` | 1728×1152 | `3789ef2a53818faaedcc261ab303791e9546e063a8e2549bb0320a8da2fb1365` |
| `grok-bbe86cc5-92d6-4571-95f1-922df203758b.jpg` | 1008×1792 | `7b341e9a6426c720edf39da679149e3f9b66fbe8035867c097e795503da5bc73` |
| `grok-db65d339-3eb2-494f-9372-b4f003942a45.jpg` | 1728×1152 | `46c726017092a2992028c1604391d5b378b652ee6667d83a7c0ca09c0cde6e29` |
| `grok-eb8b0476-0f04-42b3-afb0-df34e861f252.jpg` | 1728×1152 | `263610cbf127683647ffb6a9aed5dd92816cea09be2911ed4275bca3e77752b1` |

当前发布完整性权威顺序为：已批准 `docs/02-prd.md` v1.3 + 已批准来源 allowlist/registry v1.0 → 已批准 `ui/04-release-completeness-ui-prompt.md` v1.0 → CR-UI-002 v1.0、v1.1、v1.2、v1.3 四轮独立视觉审查均为 `changes-requested` → 固定 04 完成 `ui/09-release-completeness-ui-design-v1.4.md` 与 resolved 49 张设计包（21 张新 overlay + 28 张 v1.3 resolved SHA 复用），机器门通过，重新停在 `ui-design-review` 等待根协调第五轮独立视觉审查。v1.0–v1.3 说明、全部历史画板、旧 `ui/03-ui-prompt.md` v1.1 与 10 张早期图片全部保留，不覆盖或删除。

来源批准仅为研究证据：当前真实运行时来源、连接器和获批招聘实例均为 0；Greenhouse、Lever、Ashby 仍是缺公司／board／site 允许清单的条件模板。v1.4 继续保留 14 张移动稿与既有真相边界，并把 15 张图表的用户可见字段/状态统一为简体中文；`failed` 只允许用于真实请求执行失败，当前无账号/服务时使用 `not_ready / unavailable`。当前仅机器门通过，第五轮独立视觉审查尚未完成；不修改或解冻 `artifact-career-frontend-001` 与 `artifact-career-f10-input-ui-preview-001`，也不自动授权前端、架构、后端、连接器或部署。
