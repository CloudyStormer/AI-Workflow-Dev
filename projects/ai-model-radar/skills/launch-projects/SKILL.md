---
name: launch-projects
description: '动态发现 AIWorkFlow 当前全部登记项目，并在用户说“项目启动”“启动项目”或要求打开本地项目时，先提供一个项目一个按钮的选择面板；用户选中后仅启动该项目的完整本地前端、后端及必要服务，并返回地址与健康状态。'
---

# Skill: 项目启动器

## 用户称呼与输出

- 每次回复先写 `【AIWorkFlow 总体协调】` 或选中项目的 `【{项目显示名称} 项目】`，下一行称呼“超级无敌帅超超总”。
- 项目名称、数量和路径必须来自本轮动态发现结果，禁止把“四个项目”写死。

## 两段式启动

### 只收到“项目启动”时

1. 在 AIWorkFlow 根目录运行：

   ```bash
   python3 skill/launch-projects/scripts/discover_projects.py list --format json
   ```

2. 展示全部发现的项目，一个项目一个可点击按钮。按钮只发送后续消息 `启动项目：{project_id}`，不得在按钮脚本里执行终端命令。
3. 优先使用对话内可视化按钮；每个按钮调用：

   ```javascript
   await window.openai.sendFollowUpMessage({
     prompt: "启动项目：{project_id}",
     title: "启动 {project_name}"
   })
   ```

4. 若当前对话不支持可视化按钮，清晰列出全部项目并要求用户回复项目名称或 `project_id`；不得擅自选择默认项目。
5. 本阶段只选择，不启动任何服务。

### 收到明确选择时

1. 用同一发现脚本校验 `project_id`：

   ```bash
   python3 skill/launch-projects/scripts/discover_projects.py resolve --project-id '{project_id}'
   ```

2. 只接受发现结果中的精确 ID。禁止把用户文字直接拼入 shell 命令。
3. 若 `configured=false`，停止并说明该项目尚未登记完整本地运行目标；不得猜测命令、端口或只启动前端冒充完整启动。
4. 若已配置，读取返回的 `target`，执行：

   ```bash
   scripts/local-services.sh start '{target}'
   scripts/local-services.sh health '{target}'
   scripts/local-services.sh status '{target}'
   ```

5. 只有构建、进程、HTTP 和健康检查都通过，才报告“启动成功”；按发现结果返回该项目全部 Web 与 API 地址。
6. 失败时保留现场，读取该目标相关日志并报告真实失败原因。不得改称 Demo 成功，也不得顺带启动其他项目。

## 动态发现与未来项目

- 权威项目集合只有 `control-center/project.yaml` 与 `projects/*/project.yaml`；目录或 `project.yaml` 缺失的内容不列入。
- 所有发现项目都必须显示，包括尚未配置本地运行目标的新项目。
- 当前运行映射由发现脚本中的 `RUNTIME_TARGETS` 维护。新增第五、第六个项目时，项目初始化或首次运行接入必须同时登记其完整服务 target；登记前仍显示按钮，但选择后 fail closed。
- 一个项目有前后端时必须映射到 stack target，不能只映射前端服务。

## 权限与边界

- “项目启动”只授权展示选择面板，不授权启动全部项目。
- 用户点击按钮或明确说“启动项目：{id}”，只授权该项目的本地、可恢复启动与健康检查。
- 不包含生产部署、域名、云服务器、数据删除、迁移、付费服务或其他项目的启动。
- 本 Skill 不创建新角色任务，不改变产品工作流审核状态，也不把运行成功等同于项目开发完成。
