#!/usr/bin/env python3
"""Create or adopt an AIWorkFlow project without moving existing entrypoints."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

COMMON_DIRS = ("docs", "ui", "workflow", "skills", "scripts", "tests", "output")
PROFILE_DIRS = {
    "split-web": ("frontend", "backend", "docker"),
    "sites-fullstack": ("app", "db", "worker", "public"),
    "service": ("backend",),
    "custom": (),
}
SKILL_NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def quoted(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def manifest_scalar(text: str, key: str) -> str | None:
    match = re.search(rf"^\s*{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
    if not match:
        return None
    raw = match.group(1)
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = raw.strip("'\"")
    return str(value)


def validate_existing_identity(project_dir: Path, args: argparse.Namespace) -> None:
    manifest = project_dir / "project.yaml"
    if not manifest.is_file():
        return
    text = manifest.read_text(encoding="utf-8")
    expected = {"id": args.id, "kind": args.kind, "profile": args.profile}
    for key, value in expected.items():
        actual = manifest_scalar(text, key)
        if actual != value:
            raise ValueError(
                f"Existing project.yaml {key} is {actual!r}, not {value!r}; "
                "refusing to create a conflicting project Skill or Profile"
            )


def write_missing(path: Path, content: str, dry_run: bool) -> bool:
    if path.exists():
        print(f"KEEP   {path}")
        return False
    print(f"CREATE {path}")
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return True


def ensure_dir(path: Path, dry_run: bool) -> None:
    if path.is_dir():
        print(f"KEEP   {path}/")
        return
    if path.exists():
        raise ValueError(f"Required directory path is occupied by a file: {path}")
    print(f"CREATE {path}/")
    if not dry_run:
        path.mkdir(parents=True, exist_ok=True)


def keep_empty_directory(path: Path, dry_run: bool) -> None:
    """Make an intentionally empty project directory survive a Git clone."""
    if path.is_dir() and any(path.iterdir()):
        return
    write_missing(path / ".gitkeep", "# Managed by workflow-project-init.\n", dry_run)


def render_manifest(args: argparse.Namespace, shared_source: str) -> str:
    profile_modules = {
        "split-web": [("frontend", "frontend"), ("backend", "backend"), ("deployment", "docker")],
        "sites-fullstack": [
            ("web", "app"),
            ("data", "db"),
            ("worker", "worker"),
            ("static", "public"),
        ],
        "service": [("service", "backend")],
        "custom": [],
    }[args.profile]
    profile_modules.append(("ui", "ui"))
    modules = "\n".join(
        f"  - name: {quoted(name)}\n    path: {quoted(path)}" for name, path in profile_modules
    )
    modules_section = f"modules:\n{modules}" if modules else "modules: []"

    return f"""schema_version: 1
project:
  id: {quoted(args.id)}
  name: {quoted(args.name)}
  kind: {quoted(args.kind)}
  profile: {quoted(args.profile)}
governance:
  project_skill: {quoted(f"skills/project-{args.id}/SKILL.md")}
  shared_skills_source: {quoted(shared_source)}
  workflow_state: "workflow/state.yaml"
  approvals: "workflow/approvals.yaml"
  artifacts: "workflow/artifacts.yaml"
  events: "workflow/events.jsonl"
entrypoints:
  dev:
    cwd: {quoted(args.dev_cwd)}
    command: {quoted(args.dev_command)}
  build:
    cwd: {quoted(args.build_cwd)}
    command: {quoted(args.build_command)}
  test:
    cwd: {quoted(args.test_cwd)}
    command: {quoted(args.test_command)}
  lint:
    cwd: {quoted(args.lint_cwd)}
    command: {quoted(args.lint_command)}
{modules_section}
"""


def render_agents(args: argparse.Namespace) -> str:
    return f"""# Project instructions: {args.name}

1. Before substantive work, read `project.yaml` and `skills/project-{args.id}/SKILL.md` completely.
2. Treat the project-level Skill as the project router and the other folders under `skills/` as professional sub Skills.
3. Every conversation with the user must address the user as “超级无敌帅超超总”.
4. A role may enter after a separate explicit approval, or after 超级无敌帅超超总 says “通过” to the current artifact when that role is the unique, input-ready, non-high-risk next step.
5. Do not move or rename the entrypoints declared in `project.yaml` without separate approval.
6. Keep `workflow/state.yaml`, approvals, artifacts, events, and the Skill lock aligned with real state.
7. Preserve unrelated and uncommitted user changes; never commit them with project-governance edits.
8. 下游收到产品逻辑或 UI/UX 变更时，当前角色立即冻结；不得由开发直接代改。
9. 固定回退链是“产品独立交付并审核 → UI/UX 独立交付并审核 → 开发重新获批”；每站使用已有固定角色任务，禁止开发越级代改。
10. 全局角色 Agent 池永久固定为现有 `00 包工头` 与 `01` 至 `11` 角色任务；无论项目多少都不得新增项目专属或重复角色任务。
11. 每个固定角色负责所有项目；项目上下文只通过本项目的 `project.yaml`、项目级 Skill、`docs/` 和 `workflow/` 隔离。
12. 通过即授权唯一下一站：超级无敌帅超超总对当前明确交付回复“通过”时，同时批准当前交付并授权唯一明确、输入完整且非高风险的下一站立即入场，无需再等“继续”；一次最多前进一步，下一站交付后重新停门。
13. 生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送等高风险动作不因普通“通过”自动实质执行，仍须单独明确授权。
14. 每次面向用户的回复第一行必须先写 `【{args.name} 项目】`，下一行再完整称呼“超级无敌帅超超总”；多项目分别成块，跨项目事项单列 `【AIWorkFlow 总体协调】`。
15. 阶段状态由对应固定角色本人报告：当前角色在自己的固定任务独立交付；获批路由后，下一角色在自己的固定任务宣布入场、范围和停止门；`00 包工头`只监督汇总，不代替角色报到或交付。
16. 每个项目必须保留 `ui/` 目录，专门承载 UI/UX 提示词、设计说明和后续生成的界面产物；不得把新的 UI 交付散落到未登记目录。
17. 超级无敌帅超超总在固定角色本人任务中明确项目、范围和动作时，视为该角色该工作单元的一次性入场或继续授权，无需 `00 包工头`转发，并具有内部最高业务调度优先级；但不得自动批准待审产物、解冻其他工作、授权下游或跳过原流程。执行前记录安全恢复点和返回点，完成后回原队列或审核门；高风险动作仍须本次具体授权。
"""


def render_project_skill(args: argparse.Namespace) -> str:
    description = (
        f"{args.name} 的项目级总控 Skill，负责解释项目定位、结构、真实入口、权威文档、"
        "工作流状态与专业角色路由。进入该项目、启动或构建项目、推进阶段、修改目录或判断交付边界时使用。"
    ).replace("'", "''")
    return f"""---
name: project-{args.id}
description: '{description}'
---

# Project Skill: {args.name}

## 用户称呼与审批

- 每次对话必须称呼用户为“超级无敌帅超超总”。
- 专业角色通过单独明确批准入场；若上一站交付已声明其为唯一明确、输入完整且非高风险的下一站，超级无敌帅超超总回复“通过”即同时批准该范围入场。
- 本 Skill 只路由项目上下文，不代替市场、产品、UI、架构、开发、审查、测试或部署 Skill。

## 用户直达固定角色的临时指令（强制）

- 超级无敌帅超超总在某个固定角色本人任务中明确本项目、范围和动作后，视为该角色该工作单元的一次性入场或继续授权，无需 `00 包工头`转发，并具有 AIWorkFlow 内部最高业务调度优先级。
- 直达指令不自动批准待审产物、不解冻其他工作、不授权下游、不产生级联；角色先登记原阶段、审核门、未提交现场、安全恢复点和返回点，完成后回到原队列或规定审核门。
- 指令跨角色、冲突冻结现场或属于下游产品/UI 变更时，接收角色直接路由正确固定角色并保留现场，不得越权代做或跳过回退链。
- 生产发布、不可逆操作、付费、账号权限、隐私数据和对外发送仍须本次具体动作的单独明确授权。

## 项目模块化汇报格式（强制）

- 每次面向用户的回复，第一行先写 `【{args.name} 项目】`，下一行再完整称呼“超级无敌帅超超总”。
- 多项目按项目分别成块；跨项目治理、根仓或角色协调事项单列 `【AIWorkFlow 总体协调】`。不得用角色名或阶段名代替项目标题。

## 角色本人报到与交付通知（强制）

- 当前角色完成后，必须在自己的固定角色任务中产生独立用户可见交付；`00 包工头`可以汇总，但不得代替对应角色交付。
- 当前产物获批并路由后，下一角色必须在自己的固定任务宣布已入场、获批范围、预期产物和停止门，再开始执行。
- 未获授权的角色不得提前报到；对应任务不可达或繁忙时，包工头只报告真实阻塞。

## UI 资产目录（强制）

- `ui/` 是本项目 UI/UX 提示词、设计说明、原型、生成界面和视觉审核产物的统一目录；新交付必须在 `workflow/artifacts.yaml` 登记路径、版本、状态与哈希。
- 已进入审核门的旧产物保持原路径至审批闭环，并在 `ui/README.md` 建立索引；不得为整理目录破坏审核链。
- 目录或文件存在不表示已经通过提示词、设计或实现审批。

## 项目身份

- Project ID：`{args.id}`
- 类型：`{args.kind}`
- Profile：`{args.profile}`
- 结构与入口的机器可读事实源：`project.yaml`

## 开始工作前

1. 读取 `project.yaml`。
2. 读取 `workflow/state.yaml`、`approvals.yaml`、`artifacts.yaml` 和最近事件。
3. 读取任务所需的 `docs/` 文档和对应专业子 Skill。
4. 检查 Git 状态，隔离其他任务的未提交改动。
5. 涉及 UI、Demo、原型、图表或界面实现时，先调用 UI/UX Skill 提交提示词给超级无敌帅超超总审核。

## 真实入口

- 开发：在 `{args.dev_cwd}` 执行 `{args.dev_command or "尚未定义"}`
- 构建：在 `{args.build_cwd}` 执行 `{args.build_command or "尚未定义"}`
- 测试：在 `{args.test_cwd}` 执行 `{args.test_command or "尚未定义"}`
- Lint：在 `{args.lint_cwd}` 执行 `{args.lint_command or "尚未定义"}`

不得为了目录外观改变这些入口。需要迁移时先提交迁移方案、回滚方案和前后验证结果，等待超级无敌帅超超总批准。

## 权威信息

- 项目说明：`README.md`
- 产品和工程文档：`docs/`
- UI/UX 提示词与生成界面：`ui/`
- 工作流事实：`workflow/`
- 共享角色规则：`skills/`
- 运行代码：以 `project.yaml` 的 modules 和 entrypoints 为准

## 角色路由

按任务调用对应子 Skill：市场调研、项目管理、产品、UI/UX、架构、前端、后端、数据、代码审查、QA 和 DevOps。

## 通过即授权唯一下一站（强制）

- 超级无敌帅超超总对当前明确交付回复“通过”时，同时批准当前产物，并授权唯一明确、输入完整且非高风险的下一站立即入场，无需再等“继续”。
- 自动续行只覆盖下一站一个交付单元；下一站交付后重新停在审核门。下一站不唯一时先拆分或请示，不能同时启动多个角色。
- 生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送等高风险动作只允许自动进入方案准备，实质执行仍须单独授权。

## 固定角色 Agent 池（强制）

- 无论创建多少项目，始终只使用现有 `00 包工头` 与 `01` 至 `11` 固定角色任务；不得创建项目专属、需求专属或重复角色 Agent/任务。
- 每个固定角色负责所有项目。本项目只通过 `project.yaml`、本项目 Skill、`docs/` 和 `workflow/` 提供上下文隔离。
- “对应角色的独立任务/对话”是指复用已有固定角色任务，例如产品工作统一交给 `03 产品经理`，不表示为本项目另建一次角色对话。

## 下游变更回退门（强制）

- 项目进入架构、开发、审查、测试或发布后，只要超级无敌帅超超总提出产品逻辑或 UI/UX 变更，当前角色立即冻结受影响工作并登记完成点、未提交改动、阻塞与恢复点；开发不得直接代改。
- 固定顺序是：产品经理在独立任务中交付并等待明确审核 → 产品“通过”自动授权 UI/UX 完成提示词交付 → 提示词“通过”自动授权同一 UI/UX 角色完成设计交付 → 设计“通过”自动授权唯一明确的开发恢复或架构评估。
- 每一站的任务、产物、审批、冻结和恢复事件都写入 `workflow/`；一次“通过”最多自动前进一步，下一站交付后再次停门，禁止自动跑完整链路。

## 完成门

修改后运行项目声明的验证命令，更新工作流状态与产物登记，向超级无敌帅超超总报告真实结果并停在审核门。若超级无敌帅超超总回复“通过”，立即路由唯一下一站一个交付单元，无需再等“继续”。不得把未运行、演示数据或推断描述成已验证事实。
"""


def render_project_metadata(args: argparse.Namespace) -> str:
    short = f"{args.name} 的项目结构、入口、状态与专业角色路由"
    return f"""interface:
  display_name: {quoted(args.name + " 项目 Skill")}
  short_description: {quoted(short)}
  default_prompt: {quoted(f"Use $project-{args.id} to inspect this project's current state and route the unique next role authorized by the current approval.")}
"""


def copy_shared_skills(
    source: Path,
    target: Path,
    sync: bool,
    dry_run: bool,
    project_skill_name: str,
) -> int:
    drift = 0
    for skill_file in sorted(source.glob("*/SKILL.md")):
        skill_dir = skill_file.parent
        if skill_dir.name == project_skill_name:
            continue
        for source_file in sorted(skill_dir.rglob("*")):
            if not source_file.is_file() or source_file.name == ".DS_Store" or "__pycache__" in source_file.parts:
                continue
            relative = source_file.relative_to(source)
            target_file = target / relative
            if not target_file.exists():
                print(f"COPY   {source_file} -> {target_file}")
                if not dry_run:
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, target_file)
                continue
            if source_file.read_bytes() == target_file.read_bytes():
                print(f"KEEP   {target_file}")
                continue
            drift += 1
            if sync:
                print(f"SYNC   {source_file} -> {target_file}")
                if not dry_run:
                    target_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, target_file)
            else:
                print(f"DRIFT  {target_file} (left unchanged; add --sync-shared-skills)")
    return drift


def write_skill_lock(project_dir: Path, dry_run: bool) -> None:
    entries = []
    for skill_file in sorted((project_dir / "skills").glob("*/SKILL.md")):
        digest = hashlib.sha256(skill_file.read_bytes()).hexdigest()
        entries.append((skill_file.parent.name, skill_file.relative_to(project_dir).as_posix(), digest))
    body = ["schema_version: 1", "algorithm: sha256", "skills:"]
    for name, path, digest in entries:
        body.extend(
            [
                f"  - name: {quoted(name)}",
                f"    path: {quoted(path)}",
                f"    sha256: {quoted(digest)}",
            ]
        )
    target = project_dir / "workflow" / "skill-lock.yaml"
    rendered = "\n".join(body) + "\n"
    if target.is_file() and target.read_text(encoding="utf-8") == rendered:
        print(f"KEEP   {target}")
    else:
        print(f"WRITE  {target}")
        if not dry_run:
            target.write_text(rendered, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    parser.add_argument("--id", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--kind", required=True, choices=("practice", "product", "governance"))
    parser.add_argument("--profile", required=True, choices=tuple(PROFILE_DIRS))
    parser.add_argument("--dev-cwd", default=".")
    parser.add_argument("--dev-command", default="")
    parser.add_argument("--build-cwd", default=".")
    parser.add_argument("--build-command", default="")
    parser.add_argument("--test-cwd", default=".")
    parser.add_argument("--test-command", default="")
    parser.add_argument("--lint-cwd", default=".")
    parser.add_argument("--lint-command", default="")
    parser.add_argument("--shared-skills-source")
    parser.add_argument("--include-shared-skills", action="store_true")
    parser.add_argument("--sync-shared-skills", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not SKILL_NAME_RE.fullmatch(args.id) or len(args.id) > 55:
        raise ValueError("Project id must be kebab-case and at most 55 characters")

    project_dir = Path(args.project_dir).expanduser().resolve()
    if project_dir == Path("/") or project_dir == Path.home():
        raise ValueError("Refusing to initialize a broad system or home directory")
    if not project_dir.exists():
        print(f"CREATE {project_dir}/")
        if not args.dry_run:
            project_dir.mkdir(parents=True)
    elif not project_dir.is_dir():
        raise ValueError(f"Project path is not a directory: {project_dir}")

    validate_existing_identity(project_dir, args)

    for name in COMMON_DIRS + PROFILE_DIRS[args.profile]:
        ensure_dir(project_dir / name, args.dry_run)

    shared_source = ""
    source_path = None
    if args.shared_skills_source:
        source_path = Path(args.shared_skills_source).expanduser().resolve()
        if not source_path.is_dir():
            raise ValueError(f"Shared Skills source does not exist: {source_path}")
        shared_source = Path(
            Path(source_path).relative_to(project_dir)
            if source_path.is_relative_to(project_dir)
            else Path(__import__("os").path.relpath(source_path, project_dir))
        ).as_posix()

    write_missing(project_dir / "project.yaml", render_manifest(args, shared_source), args.dry_run)
    write_missing(project_dir / "AGENTS.md", render_agents(args), args.dry_run)
    write_missing(
        project_dir / "README.md",
        f"# {args.name}\n\n项目结构、真实入口和工作流状态分别见 `project.yaml`、项目级 Skill 与 `workflow/`。\n",
        args.dry_run,
    )
    write_missing(
        project_dir / "ui" / "README.md",
        "# UI/UX 资产目录\n\n"
        "本目录统一存放本项目的 UI/UX 提示词、设计说明、原型、生成界面和视觉审核产物。\n\n"
        "- 新提示词与生成界面默认写入 `ui/`，并在 `workflow/artifacts.yaml` 登记权威路径与哈希。\n"
        "- 已进入审核门的历史产物在审核结束前保持原路径，通过索引引用，避免中途移动导致审批失效。\n"
        "- 设计产物通过后才可路由架构或开发；目录存在不代表 UI 已获批准。\n",
        args.dry_run,
    )

    now = datetime.now(timezone.utc).isoformat()
    write_missing(
        project_dir / "workflow" / "state.yaml",
        f'''schema_version: 1
project_id: {quoted(args.id)}
stage: adoption
status: needs-reconciliation
current_role: package-contractor
ui_assets:
  directory: ui
  index: ui/README.md
  new_deliveries: required
  preserve_active_legacy_paths: true
workflow_policy:
  pass_semantics: approve-current-and-authorize-unique-next
  direct_user_role_commands:
    explicit_scope_is_authorization: true
    package_contractor_relay_required: false
    highest_business_priority: true
    preserves_original_workflow: true
    implicit_artifact_approval: false
    implicit_unfreeze: false
    implicit_downstream_authorization: false
    implicit_cascade: false
    role_boundary_preserved: true
    safe_checkpoint_and_return_required: true
    high_risk_requires_separate_authorization: true
  role_reporting:
    current_role_reports_in_own_fixed_task: true
    next_role_announces_after_authorization: true
    package_contractor: supervise-and-summarize
  next_stage_requirements:
    unique: true
    input_ready: true
    non_high_risk: true
  max_auto_advance_steps: 1
  next_delivery_requires_review: true
  high_risk_actions_require_separate_authorization:
    production_release: true
    destructive_or_irreversible: true
    paid_purchase_or_expansion: true
    account_or_credentials: true
    privacy_or_real_user_data: true
    external_message_or_publication: true
updated_at: {quoted(now)}
''',
        args.dry_run,
    )
    write_missing(
        project_dir / "workflow" / "approvals.yaml",
        "schema_version: 1\napprovals: []\n",
        args.dry_run,
    )
    write_missing(
        project_dir / "workflow" / "artifacts.yaml",
        "schema_version: 1\nartifacts: []\n",
        args.dry_run,
    )
    write_missing(
        project_dir / "workflow" / "events.jsonl",
        json.dumps(
            {
                "event_id": f"event-{args.id}-adopted",
                "time": now,
                "actor": "workflow-project-init",
                "type": "project_adopted",
                "workflow_policy": "pass-auto-continue-one-hop",
                "direct_user_role_commands": "enabled-with-workflow-preservation",
                "max_auto_advance_steps": 1,
                "next_delivery_requires_review": True,
                "high_risk_actions_require_separate_authorization": True,
                "result": "governance-envelope-created",
            },
            ensure_ascii=False,
        )
        + "\n",
        args.dry_run,
    )

    project_skill_name = f"project-{args.id}"
    write_missing(
        project_dir / "skills" / project_skill_name / "SKILL.md",
        render_project_skill(args),
        args.dry_run,
    )
    write_missing(
        project_dir / "skills" / project_skill_name / "agents" / "openai.yaml",
        render_project_metadata(args),
        args.dry_run,
    )

    drift = 0
    if args.include_shared_skills:
        if not source_path:
            raise ValueError("--include-shared-skills requires --shared-skills-source")
        drift = copy_shared_skills(
            source_path,
            project_dir / "skills",
            args.sync_shared_skills,
            args.dry_run,
            project_skill_name,
        )

    for name in COMMON_DIRS + PROFILE_DIRS[args.profile]:
        keep_empty_directory(project_dir / name, args.dry_run)

    write_skill_lock(project_dir, args.dry_run)

    if drift and not args.sync_shared_skills:
        print(f"Completed with {drift} shared Skill drift issue(s).", file=sys.stderr)
        return 2
    print("Project governance envelope is ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
