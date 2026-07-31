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

COMMON_DIRS = ("docs", "workflow", "skills", "scripts", "tests", "output")
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
4. A role may enter only after 超级无敌帅超超总 explicitly approves that role and scope.
5. Do not move or rename the entrypoints declared in `project.yaml` without separate approval.
6. Keep `workflow/state.yaml`, approvals, artifacts, events, and the Skill lock aligned with real state.
7. Preserve unrelated and uncommitted user changes; never commit them with project-governance edits.
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
- 专业角色首次入场或重新进入新阶段前，必须得到超级无敌帅超超总对该角色和范围的明确批准。
- 本 Skill 只路由项目上下文，不代替市场、产品、UI、架构、开发、审查、测试或部署 Skill。

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
- 工作流事实：`workflow/`
- 共享角色规则：`skills/`
- 运行代码：以 `project.yaml` 的 modules 和 entrypoints 为准

## 角色路由

按任务调用对应子 Skill：市场调研、项目管理、产品、UI/UX、架构、前端、后端、数据、代码审查、QA 和 DevOps。上一角色通过不代表下一角色自动获准。

## 完成门

修改后运行项目声明的验证命令，更新工作流状态与产物登记，向超级无敌帅超超总报告真实结果并停在审核门。不得把未运行、演示数据或推断描述成已验证事实。
"""


def render_project_metadata(args: argparse.Namespace) -> str:
    short = f"{args.name} 的项目结构、入口、状态与专业角色路由"
    return f"""interface:
  display_name: {quoted(args.name + " 项目 Skill")}
  short_description: {quoted(short)}
  default_prompt: {quoted(f"Use $project-{args.id} to inspect this project's current state and route the next approved role.")}
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

    now = datetime.now(timezone.utc).isoformat()
    write_missing(
        project_dir / "workflow" / "state.yaml",
        f'schema_version: 1\nproject_id: {quoted(args.id)}\nstage: adoption\nstatus: needs-reconciliation\ncurrent_role: package-contractor\nupdated_at: {quoted(now)}\n',
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
