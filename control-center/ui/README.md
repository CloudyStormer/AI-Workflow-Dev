# UI/UX 资产目录

本目录统一存放 AI Workflow Control Center 的 UI/UX 提示词、设计说明、原型、生成界面和视觉审核产物。

## 当前索引

- `01-control-center-ui-design-prompt.md`：真实监管后端状态 UI Prompt v1.1 已由超级无敌帅超超总批准。
- 当前 Prompt 版本：v1.1。
- 当前 Prompt SHA256：`bf1614e5f8fe9d6e2d7a9457bcf8ce0c6aadecfff9ef770c067560ed37368b52`。
- 当前 Prompt 审批：`approval-20260810-control-center-backend-ui-prompt-v1-1`；下一步由超级无敌帅超超总使用专业 UI 设计模型生成新版资产并放入本目录，资产落盘后独立进入 `ui-design-review`。
- 被本版继承的 Prompt v1.0.1 已批准，历史 SHA256：`6b7335068417f2402c7672b9d233a4b739142116af4671b442b9ddf578c7650e`。
- 超级无敌帅超超总已于 2026-08-04 将 9 张生成界面放入本目录；本批是 v1.0.1 范围下获批的历史视觉基线，不覆盖 v1.1 的健康／就绪、真实根仓、静态回退、来源、新鲜度、错误与降级语义。
- 现有在线 v3 Demo 仍是演示数据版本，不等于本批新 UI 已经实现或部署。

## 用户批准视觉基线

| 文件 | 尺寸 | SHA256 |
|---|---:|---|
| `grok-29fd09f5-3ea7-4f6d-a674-dcd84d8817fa.jpg` | 1728×1152 | `f56856dc5adf4439b56fda1c2c679b7813ca674aa9e6f2ed587602a34d7fb3a5` |
| `grok-2ee1ea02-5590-4aa1-a1e9-ddf49d846bb5.jpg` | 1728×1152 | `5b9c3ecbe8cbf40e650f282367031d699f3154ed547c1f2a3f7da17126d1e73d` |
| `grok-47a2acfb-3a3e-4801-a8da-ee607db474c0.jpg` | 1728×1152 | `eb14329c4452ecba87e92a7e28a0c3cc41496ab9f39bdb52de1d06e1a73daeb9` |
| `grok-56ef1a49-10ac-412b-81c2-02fbc50b100d.jpg` | 1728×1152 | `6e9bfcc7b6baeae05957a513b4489aaf34d3ff1cf8628e2429857588dba9fef3` |
| `grok-57c76d46-07b4-41be-b456-c6da299c2bd2.jpg` | 1728×1152 | `964313509944d7b2fd1bd120236023cee2253a566c08375349b5ec6c856408ae` |
| `grok-a40f0801-bc2c-4e38-aea2-72db6a1b0139.jpg` | 1008×1792 | `a2813bc8862d7d1e5959ef832b7df07409e43eabacb81aacfe393bc888b9ec2a` |
| `grok-af2d6a2c-41e6-4c6a-9e16-9662229c3516.jpg` | 1728×1152 | `fbb8ff91682edd0936e0d7f9ef5d3d1a384d795be58db4cd8b4e4d8710aac260` |
| `grok-e4607bd9-e6d5-479e-9cb5-e53f08b57625.jpg` | 1792×1008 | `480c526066c46b9a384888680f1fa0f6cc6b3aa722dc4be46d2a805f6c95302a` |
| `grok-eea5ba37-569b-42c0-b733-992c153b7b80.jpg` | 1728×1152 | `6a1f6c86947a7b4273fa773d9a258d9b3eb00b2f749081dee68146c0a5b1d91e` |

当前增量的实现冲突按“已批准 PRD v1.0 → 已批准 Prompt v1.1 → 全局简体中文版规则 → 历史图片视觉参考”的顺序裁决。图片中的示例数据不得冒充实时事实，必须继续标注为演示数据或待接入；真实监管服务尚未实现。

固定 `04 UI/UX设计师` 的 Prompt 职责已在 v1.1 审批后结束；本角色不生成设计稿、原型或图片，不修改现有代码审查结论，也不启动架构或开发。新版资产尚未落盘，当前停在用户外部生成输入阶段；新资产必须登记路径、版本、状态和 SHA256，目录或文件存在不代表设计或实现已经完成。
