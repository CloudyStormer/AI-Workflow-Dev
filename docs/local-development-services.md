# 四项目本地服务托管

本机四个 Web 入口由 macOS 用户级 `launchd` 持续托管，不依赖 Codex 单次终端会话。该方案仅用于本地开发和演示，不是生产部署，也不会连接或伪装真实后端服务。

## 服务地址

| 服务 | 本地地址 | 工作目录 | 端口 |
|---|---|---|---:|
| AI English Learning | `http://127.0.0.1:4173/word` | `projects/ai-english-learning/frontend` | 4173 |
| AI Model Radar | `http://127.0.0.1:4174/today` | `projects/ai-model-radar/frontend` | 4174 |
| AI Workflow Control Center | `http://127.0.0.1:4175/?view=overview` | `control-center` | 4175 |
| Frontend Career Radar | `http://127.0.0.1:4177/directions` | `projects/market-analysis-dev/frontend` | 4177 |

## 统一命令

在 AIWorkFlow 根目录执行：

```bash
scripts/local-services.sh start
scripts/local-services.sh stop
scripts/local-services.sh restart
scripts/local-services.sh status
scripts/local-services.sh health
scripts/local-services.sh logs
scripts/local-services.sh logs radar 120
```

`start` 和 `restart` 会先使用以下目录置于 `PATH` 首位，然后逐项目执行 `npm run build`：

```text
/Users/qichao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin
```

只有四个构建全部成功后，脚本才会替换现有托管进程。启动后会逐条要求目标 URL 返回 HTTP 200，且 HTML 根元素包含 `lang="zh-CN"`。

## launchd 与登录恢复

`start` 会把四个已经构建的 `dist/` 复制到用户级 Application Support 发布目录，再为当前 macOS 用户生成四个 LaunchAgent：

```text
com.cloudystormer.aiworkflow.local.english
com.cloudystormer.aiworkflow.local.radar
com.cloudystormer.aiworkflow.local.control-center
com.cloudystormer.aiworkflow.local.career
```

plist 安装在 `~/Library/LaunchAgents/`，使用 `RunAtLoad` 和 `KeepAlive`。执行 `start` 后，服务会在 Codex 回合结束后继续运行，并在用户下次登录时自动恢复。执行 `stop` 会禁用并卸载四个任务；再次执行 `start` 或 `restart` 会重新启用。

LaunchAgent 不直接读取 Desktop 工作区：它使用固定的 Node 路径和 Application Support 中的构建产物副本，避免 macOS 后台进程对 Desktop 的隐私访问限制。每次 `start` 或 `restart` 都会先重新构建并切换到新的本地发布目录；上一个发布目录通过 `previous` 链接保留为恢复点。

## 日志与运行状态

标准输出和错误日志保存在：

```text
~/Library/Logs/AIWorkFlow/local-services/
```

LaunchAgent 生成文件和其他本机运行状态保存在：

```text
~/Library/LaunchAgents/
~/Library/Application Support/AIWorkFlow/local-services/
```

这些文件不在 Git 仓库中。项目生成的 `dist/`、`.wrangler/`、依赖和日志也由根 `.gitignore` 排除。

## 端口冲突保护

启动前脚本先卸载同名 LaunchAgent。若端口仍被占用，只会在监听进程的当前目录精确等于对应项目目录、且命令属于 Node/Vite/Vinext/npm 时终止该 PID。任何未知进程都会导致启动停止并报告 PID、当前目录和命令；脚本不使用 `killall`，也不会终止其他项目进程。

## 数据与发布边界

- 四个服务均为本地开发服务，不代表生产发布。
- Control Center 和两个 Radar 当前页面包含静态、演示或待接入数据；托管不会把这些数据变成真实后端。
- 本方案不接入账号、凭证、隐私数据、数据库或外部 API。
- 业务页面、PRD、UI、架构、后端及各项目审核门不因本地托管而改变。
