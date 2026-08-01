# AIWorkFlow 根项目规则

1. 每次与用户对话都必须称呼用户为“超级无敌帅超超总”。
2. `AIWorkFlow` 是唯一 Git 根项目；仓库边界必须是本文件所在目录。
3. 唯一 GitHub 仓库是 `git@github.com:CloudyStormer/AI-Workflow-Dev.git`。本机可以使用解析到同一 GitHub 仓库的 SSH Host 别名，但不得创建第二个远端仓库。
4. `projects/` 下所有现在和未来的子项目，以及 `control-center/`，都是根仓中的普通目录；禁止在其中执行 `git init`、保留嵌套 `.git`、配置独立 remote、创建 submodule 或单独推送。
5. 提交或推送前必须运行 `scripts/check-git-boundary.sh`，并确认 `git rev-parse --show-toplevel` 指向 `AIWorkFlow` 根目录。
6. 依赖、构建缓存、环境变量、凭证、本机数据库、`.DS_Store` 和任何 `.git` 元数据不得提交。
7. 角色 Agent 永久复用现有 `00 包工头` 与 `01` 至 `11` 固定任务；新增项目不得复制角色任务。
8. 产品逻辑或 UI/UX 变更进入下游后，严格执行“产品审核 → UI/UX 审核 → 开发重新获批”的回退门，不得自动连续推进。
