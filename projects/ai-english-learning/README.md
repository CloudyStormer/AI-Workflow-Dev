# AI English Learning

AIWorkFlow 的首个实践样本，用于走通多角色 AI 软件工程工作流并观察真实交付结果。项目产物以后可以继续使用，但它首先是工作流实验样本，不代表整条流程已经完成。

## 统一结构

本项目已由 `workflow-project-init` 收编，统一治理入口为：

- `project.yaml`：项目身份、Profile、模块和真实命令
- `skills/project-ai-english-learning/SKILL.md`：项目级 Skill
- `skills/`：项目 Skill 调用的共享专业子 Skill
- `workflow/`：状态、审批、产物、事件和 Skill 锁
- `docs/`：项目计划、PRD、架构和任务文档
- `ui/`：UI/UX 提示词索引、设计参考、原型和后续生成界面
- `scripts/`、`tests/`、`output/`：脚本、测试与输出边界

实现采用 `split-web` Profile，因此保留 `frontend/`、`backend/` 和 `docker/`。这与 control-center 的 Sites 根目录实现不同，但治理外壳相同。

## 当前实现

- 可运行代码：`frontend/`
- UI 参考：`ui/`
- 视觉 QA：`design-qa/`、`design-qa.md`
- 后端、正式系统测试、Docker 部署：尚未证明完整实现

## 启动与验证

需要 Node.js 22.12.0 或更高版本。

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run build
```

当前没有独立自动化测试命令。不能把 Lint 或构建等同于系统测试。

## 工作边界

开始任务前读取 `AGENTS.md`、`project.yaml`、项目级 Skill 和 `workflow/`。专业角色由单独批准或上一站“通过”的唯一下一站授权入场；一次“通过”最多自动前进一步，下一站交付后重新停门。涉及 UI 时仍必须先审提示词、再审设计、最后实现。
