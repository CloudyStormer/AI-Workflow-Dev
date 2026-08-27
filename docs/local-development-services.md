# 四项目本地服务托管

本机四个 Web 入口，以及 AI Model Radar 与 Frontend Career Radar 的两个真实本地 API，由 macOS 用户级 `launchd` 持续托管，不依赖 Codex 单次终端会话。该方案仅用于本地开发，不是生产部署。

## 服务地址

| 服务 | 本地地址 | 工作目录 | 端口 |
|---|---|---|---:|
| AI English Learning | `http://127.0.0.1:4173/word` | `projects/ai-english-learning/frontend` | 4173 |
| AI Model Radar | `http://127.0.0.1:4174/today` | `projects/ai-model-radar/frontend` | 4174 |
| AI Workflow Control Center | `http://127.0.0.1:4175/?view=overview` | `control-center` | 4175 |
| Frontend Career Radar | `http://127.0.0.1:4177/directions` | `projects/market-analysis-dev/frontend` | 4177 |

| 本地 API | 健康地址 | 工作目录 | 端口 |
|---|---|---|---:|
| AI Model Radar API | `http://127.0.0.1:4317/health/ready?capability=query` | `projects/ai-model-radar/backend` | 4317 |
| Frontend Career Radar API | `http://127.0.0.1:4318/health/ready` | `projects/market-analysis-dev/backend` | 4318 |

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
scripts/local-services.sh restart radar-stack
scripts/local-services.sh restart career-stack
scripts/local-services.sh status radar-stack
scripts/local-services.sh health career-stack
```

不带 target 的命令管理全部服务；`radar-stack` 只管理 `radar-api + radar`，`career-stack` 只管理 `career-api + career`。也可以使用 `radar-api`、`career-api`、`radar` 或 `career` 精确管理单个进程。因此 4173 被其他项目占用时，不需要也不允许通过全量重启干扰它。

`start` 和 `restart` 会先使用以下目录置于 `PATH` 首位，然后只对目标服务执行 `npm run build`：

```text
/Users/qichao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin
```

只有目标构建全部成功后，脚本才会替换对应托管进程。Web 健康检查要求 HTTP 200 且 HTML 根元素包含 `lang="zh-CN"`；API 健康检查要求 HTTP 200 且 readiness 为 `ready`。Web 静态响应统一使用 `Cache-Control: no-cache`，两个 API 使用其业务代码定义的 `private, no-store`。

## launchd 与登录恢复

Web `start` 会把目标 `dist/` 复制到用户级 Application Support 发布目录，并保留其他 Web 的当前快照；API 直接从对应后端工作目录读取已构建代码和既有 Git 忽略数据。当前 macOS 用户使用以下六个 LaunchAgent：

```text
com.cloudystormer.aiworkflow.local.english
com.cloudystormer.aiworkflow.local.radar
com.cloudystormer.aiworkflow.local.radar-api
com.cloudystormer.aiworkflow.local.control-center
com.cloudystormer.aiworkflow.local.career
com.cloudystormer.aiworkflow.local.career-api
```

plist 安装在 `~/Library/LaunchAgents/`，使用 `RunAtLoad` 和 `KeepAlive`。执行 `start` 后，服务会在 Codex 回合结束后继续运行，并在用户下次登录时自动恢复。执行不带 target 的 `stop` 会禁用并卸载六个任务；指定 stack 或 service 时只处理对应任务。再次执行 `start` 或 `restart` 会重新启用。

Web LaunchAgent 使用固定 Node 路径和 Application Support 中的构建产物副本。API LaunchAgent 使用同一固定 Node，并由 Application Support 中的专用 runner 启动工作区后端；runner 只注入固定 loopback/CORS/数据目录配置。Career 加密密钥只在运行时从权限为 `0600` 的 `backend/var/.material-key` 读取，不写入 plist、日志或 Git。每次 Web `start` 或 `restart` 都会切换到新的本地发布目录；上一个发布目录通过 `previous` 链接保留为恢复点。

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

启动前脚本只卸载目标 LaunchAgent。若目标端口仍被占用，只会在监听进程的当前目录精确等于对应项目目录、且命令属于 Node/Vite/Vinext/npm 时终止该 PID。任何未知进程都会导致启动停止并报告 PID、当前目录和命令；脚本不使用 `killall`，也不会终止其他项目进程。精确重启 `radar-stack` 或 `career-stack` 不会查询、停止或覆盖 4173。

## 数据与发布边界

- 所有服务均为本地开发服务，不代表生产发布。
- AI Model Radar 前端固定访问 `127.0.0.1:4317`，读取项目 SQLite 中已发布的真实快照；来源抓取仍服从项目批准的公开来源和合规边界。
- Frontend Career Radar 前端固定访问 `127.0.0.1:4318`，读取和写入既有加密本地 SQLite；重启不重置数据库或密钥。
- English 与 Control Center 的真实后端边界不因本次 Radar/Career 常驻托管而改变；Control Center 的演示数据仍不得声称为实时。
- 业务页面、PRD、UI、架构、后端及各项目审核门不因本地托管而改变。
