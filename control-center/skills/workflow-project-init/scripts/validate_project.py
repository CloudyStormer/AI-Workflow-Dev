#!/usr/bin/env python3
"""Validate the common AIWorkFlow project governance envelope."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

REQUIRED_DIRS = ("docs", "workflow", "skills", "scripts", "tests", "output")
REQUIRED_FILES = (
    "AGENTS.md",
    "README.md",
    "project.yaml",
    "workflow/state.yaml",
    "workflow/approvals.yaml",
    "workflow/artifacts.yaml",
    "workflow/events.jsonl",
    "workflow/skill-lock.yaml",
)
PROFILE_DIRS = {
    "split-web": ("frontend", "backend", "docker"),
    "sites-fullstack": ("app", "db", "worker", "public"),
    "service": ("backend",),
    "custom": (),
}


def parse_manifest_scalar(text: str, key: str) -> str | None:
    match = re.search(rf"^\s*{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
    if not match:
        return None
    raw = match.group(1)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw.strip("'\"")


def parse_entrypoints(text: str) -> dict[str, tuple[str, str]]:
    result = {}
    for name in ("dev", "build", "test", "lint"):
        pattern = (
            rf"^\s{{2}}{name}:\s*$"
            rf".*?^\s{{4}}cwd:\s*(.+?)\s*$"
            rf".*?^\s{{4}}command:\s*(.+?)\s*$"
        )
        match = re.search(pattern, text, re.MULTILINE | re.DOTALL)
        if not match:
            continue
        values = []
        for raw in match.groups():
            try:
                values.append(json.loads(raw))
            except json.JSONDecodeError:
                values.append(raw.strip("'\""))
        result[name] = (values[0], values[1])
    return result


def parse_modules(text: str) -> list[tuple[str, str]]:
    modules: list[tuple[str, str]] = []
    current_name: str | None = None
    in_modules = False
    for line in text.splitlines():
        if line == "modules: []":
            return []
        if line == "modules:":
            in_modules = True
            continue
        if not in_modules:
            continue
        if line and not line.startswith(" "):
            break
        name_match = re.match(r"^  - name:\s*(.+?)\s*$", line)
        if name_match:
            current_name = parse_scalar(name_match.group(1))
            continue
        path_match = re.match(r"^    path:\s*(.+?)\s*$", line)
        if path_match and current_name is not None:
            modules.append((current_name, parse_scalar(path_match.group(1))))
            current_name = None
    return modules


def parse_scalar(raw: str) -> str:
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = raw.strip("'\"")
    return str(value)


def parse_policy_scalar(raw: str) -> str | bool | int | None:
    value = raw.strip()
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value.strip("'\"")


def parse_workflow_policy(text: str) -> dict[str, object]:
    """Parse the small, fixed workflow_policy mapping without accepting comment decoys."""
    policy: dict[str, object] = {}
    current_section: str | None = None
    in_policy = False

    for original in text.splitlines():
        line = original.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        stripped = line.strip()

        if not in_policy:
            if indent == 0 and stripped == "workflow_policy:":
                in_policy = True
            continue
        if indent == 0:
            break

        if indent == 2:
            key, separator, raw = stripped.partition(":")
            if not separator:
                continue
            if not raw.strip():
                current_section = key
                policy[current_section] = {}
            else:
                current_section = None
                policy[key] = parse_policy_scalar(raw)
            continue

        if indent == 4 and current_section:
            key, separator, raw = stripped.partition(":")
            section = policy.get(current_section)
            if separator and isinstance(section, dict):
                section[key] = parse_policy_scalar(raw)

    return policy


def parse_artifact_paths(path: Path) -> list[str]:
    paths = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s{4}path:\s*(.+?)\s*$", line)
        if match:
            paths.append(parse_scalar(match.group(1)))
    return paths


def parse_skill_lock(path: Path) -> dict[str, tuple[str, str]]:
    result = {}
    current = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("- name:"):
            if current:
                result[current["name"]] = (current["path"], current["sha256"])
            current = {"name": json.loads(stripped.split(":", 1)[1].strip())}
        elif stripped.startswith("path:") and current:
            current["path"] = json.loads(stripped.split(":", 1)[1].strip())
        elif stripped.startswith("sha256:") and current:
            current["sha256"] = json.loads(stripped.split(":", 1)[1].strip())
    if current:
        result[current["name"]] = (current["path"], current["sha256"])
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir")
    args = parser.parse_args()
    root = Path(args.project_dir).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []

    if not root.is_dir():
        print(f"ERROR Project directory does not exist: {root}")
        return 1

    for name in REQUIRED_DIRS:
        if not (root / name).is_dir():
            errors.append(f"missing directory: {name}/")
        elif not any((root / name).iterdir()):
            warnings.append(f"empty directory may not survive a Git clone: {name}/")
    for name in REQUIRED_FILES:
        if not (root / name).is_file():
            errors.append(f"missing file: {name}")

    manifest_path = root / "project.yaml"
    project_id = None
    if manifest_path.is_file():
        manifest = manifest_path.read_text(encoding="utf-8")
        for section in ("project:", "governance:", "entrypoints:", "modules:"):
            if section not in manifest:
                errors.append(f"project.yaml missing section: {section}")
        project_id = parse_manifest_scalar(manifest, "id")
        profile = parse_manifest_scalar(manifest, "profile")
        if not project_id:
            errors.append("project.yaml missing project id")
        if profile not in {"split-web", "sites-fullstack", "service", "custom"}:
            errors.append(f"project.yaml has unsupported profile: {profile}")
        else:
            for directory in PROFILE_DIRS[profile]:
                if not (root / directory).is_dir():
                    errors.append(f"{profile} Profile directory does not exist: {directory}")
        modules = parse_modules(manifest)
        if profile != "custom" and not modules:
            errors.append(f"project.yaml has no modules for Profile: {profile}")
        for module_name, module_path in modules:
            if not (root / module_path).exists():
                errors.append(f"module path does not exist: {module_name} -> {module_path}")
        entrypoints = parse_entrypoints(manifest)
        for name in ("dev", "build", "test", "lint"):
            if name not in entrypoints:
                errors.append(f"project.yaml missing {name} entrypoint")
                continue
            cwd, command = entrypoints[name]
            if command and not (root / cwd).is_dir():
                errors.append(f"{name} entrypoint cwd does not exist: {cwd}")
            if not command:
                warnings.append(f"{name} command is not defined")

    declared_project_skills = sorted((root / "skills").glob("project-*/SKILL.md"))
    if len(declared_project_skills) != 1:
        errors.append(
            f"expected exactly one project-level Skill, found {len(declared_project_skills)}"
        )

    if project_id:
        expected_project_skill_path = f"skills/project-{project_id}/SKILL.md"
        declared_project_skill_path = (
            parse_manifest_scalar(manifest, "project_skill") if manifest_path.is_file() else None
        )
        if declared_project_skill_path != expected_project_skill_path:
            errors.append(
                "project.yaml governance.project_skill does not match project id: "
                f"{declared_project_skill_path}"
            )
        project_skill = root / expected_project_skill_path
        if not project_skill.is_file():
            errors.append(f"missing project-level Skill: {project_skill.relative_to(root)}")
        else:
            body = project_skill.read_text(encoding="utf-8")
            if f"name: project-{project_id}" not in body:
                errors.append("project-level Skill frontmatter name does not match project id")
            if "超级无敌帅超超总" not in body:
                errors.append("project-level Skill does not contain the 超级无敌帅超超总 address rule")
            if "下游变更回退门（强制）" not in body:
                errors.append("project-level Skill does not contain the downstream change rollback gate")
            if "固定角色 Agent 池（强制）" not in body:
                errors.append("project-level Skill does not contain the fixed global role-agent pool rule")
            if "通过即授权唯一下一站" not in body:
                errors.append("project-level Skill does not contain the pass-auto-continue rule")
            required_project_skill_phrases = (
                "无需再等“继续”",
                "自动续行只覆盖下一站一个交付单元",
                "生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送",
                "`00 包工头`",
                "`01` 至 `11`",
            )
            for phrase in required_project_skill_phrases:
                if phrase not in body:
                    errors.append(
                        f"project-level Skill missing required pass-policy semantics: {phrase}"
                    )
        project_metadata = project_skill.parent / "agents" / "openai.yaml"
        if not project_metadata.is_file():
            errors.append(
                f"missing project Skill metadata: {project_metadata.relative_to(root)}"
            )
        else:
            metadata = project_metadata.read_text(encoding="utf-8")
            for field in ("interface:", "display_name:", "short_description:", "default_prompt:"):
                if field not in metadata:
                    errors.append(
                        f"project Skill metadata missing {field.rstrip(':')}: "
                        f"{project_metadata.relative_to(root)}"
                    )

        state_path = root / "workflow" / "state.yaml"
        if state_path.is_file():
            state = state_path.read_text(encoding="utf-8")
            state_project_id = parse_manifest_scalar(state, "project_id")
            if state_project_id != project_id:
                errors.append(
                    f"workflow/state.yaml project_id is {state_project_id!r}, expected {project_id!r}"
                )
            policy = parse_workflow_policy(state)
            required_policy_scalars = {
                "pass_semantics": "approve-current-and-authorize-unique-next",
                "max_auto_advance_steps": 1,
                "next_delivery_requires_review": True,
            }
            for key, expected in required_policy_scalars.items():
                if policy.get(key) != expected:
                    errors.append(
                        f"workflow/state.yaml workflow_policy.{key} must be {expected!r}"
                    )

            required_sections = {
                "next_stage_requirements": {
                    "unique": True,
                    "input_ready": True,
                    "non_high_risk": True,
                },
                "high_risk_actions_require_separate_authorization": {
                    "production_release": True,
                    "destructive_or_irreversible": True,
                    "paid_purchase_or_expansion": True,
                    "account_or_credentials": True,
                    "privacy_or_real_user_data": True,
                    "external_message_or_publication": True,
                },
            }
            for section_name, required_values in required_sections.items():
                section = policy.get(section_name)
                if not isinstance(section, dict):
                    errors.append(
                        f"workflow/state.yaml workflow_policy.{section_name} must be a mapping"
                    )
                    continue
                for key, expected in required_values.items():
                    if section.get(key) != expected:
                        errors.append(
                            "workflow/state.yaml "
                            f"workflow_policy.{section_name}.{key} must be {expected!r}"
                        )

    agents_path = root / "AGENTS.md"
    if agents_path.is_file():
        agents = agents_path.read_text(encoding="utf-8")
        if "project.yaml" not in agents or "SKILL.md" not in agents:
            errors.append("AGENTS.md does not route to the manifest and project Skill")
        if "超级无敌帅超超总" not in agents:
            errors.append("AGENTS.md does not contain the 超级无敌帅超超总 address rule")
        if "产品独立交付并审核 → UI/UX 独立交付并审核 → 开发重新获批" not in agents:
            errors.append("AGENTS.md does not contain the downstream change rollback sequence")
        if "全局角色 Agent 池永久固定" not in agents:
            errors.append("AGENTS.md does not contain the fixed global role-agent pool rule")
        if "通过即授权唯一下一站" not in agents:
            errors.append("AGENTS.md does not contain the pass-auto-continue rule")
        required_agents_phrases = (
            "无需再等“继续”",
            "一次最多前进一步",
            "全局角色 Agent 池永久固定为现有 `00 包工头` 与 `01` 至 `11`",
            "生产发布、删除或不可逆覆盖、强制 Git、付费采购、账号权限、隐私数据和对外发送",
        )
        for phrase in required_agents_phrases:
            if phrase not in agents:
                errors.append(f"AGENTS.md missing required pass-policy semantics: {phrase}")

    events_path = root / "workflow" / "events.jsonl"
    if events_path.is_file():
        for number, line in enumerate(events_path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.strip():
                continue
            try:
                json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"events.jsonl line {number} is invalid JSON: {exc}")

    artifacts_path = root / "workflow" / "artifacts.yaml"
    if artifacts_path.is_file():
        for artifact_path in parse_artifact_paths(artifacts_path):
            if not (root / artifact_path).exists():
                errors.append(f"artifact path does not exist: {artifact_path}")

    lock_path = root / "workflow" / "skill-lock.yaml"
    if lock_path.is_file():
        try:
            locked = parse_skill_lock(lock_path)
        except Exception as exc:
            errors.append(f"cannot parse skill lock: {exc}")
            locked = {}
        actual = {}
        for skill_file in sorted((root / "skills").glob("*/SKILL.md")):
            actual[skill_file.parent.name] = (
                skill_file.relative_to(root).as_posix(),
                hashlib.sha256(skill_file.read_bytes()).hexdigest(),
            )
        for name, value in actual.items():
            if locked.get(name) != value:
                errors.append(f"Skill lock mismatch: {name}")
        for name in locked:
            if name not in actual:
                errors.append(f"Skill lock references missing Skill: {name}")

    for skill_file in sorted((root / "skills").glob("*/SKILL.md")):
        text = skill_file.read_text(encoding="utf-8")
        if not text.startswith("---\n") or "\n---\n" not in text[4:]:
            errors.append(f"invalid Skill frontmatter fence: {skill_file.relative_to(root)}")
        if "name:" not in text.split("---", 2)[1] or "description:" not in text.split("---", 2)[1]:
            errors.append(f"Skill missing name/description: {skill_file.relative_to(root)}")
        skill_name = skill_file.parent.name
        if (
            skill_name == "ai-dev-workflow"
            or skill_name == "workflow-project-init"
            or skill_name.startswith("role-")
            or skill_name.startswith("project-")
        ) and "下游变更回退门（强制）" not in text:
            errors.append(
                f"Skill missing downstream change rollback gate: {skill_file.relative_to(root)}"
            )
        if (
            skill_name == "ai-dev-workflow"
            or skill_name == "workflow-project-init"
            or skill_name.startswith("role-")
            or skill_name.startswith("project-")
        ) and "固定角色 Agent 池（强制）" not in text:
            errors.append(
                f"Skill missing fixed global role-agent pool rule: {skill_file.relative_to(root)}"
            )
        if (
            skill_name == "ai-dev-workflow"
            or skill_name == "workflow-project-init"
            or skill_name.startswith("role-")
            or skill_name.startswith("project-")
        ) and "通过即授权唯一下一站" not in text:
            errors.append(
                f"Skill missing pass-auto-continue rule: {skill_file.relative_to(root)}"
            )
        if skill_name.startswith("role-"):
            for phrase in ("无需再等“继续”", "自动续行"):
                if phrase not in text:
                    errors.append(
                        f"role Skill missing pass-policy semantics ({phrase}): "
                        f"{skill_file.relative_to(root)}"
                    )

    for warning in warnings:
        print(f"WARN  {warning}")
    for error in errors:
        print(f"ERROR {error}")
    if errors:
        print(f"Project structure validation failed: {len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    print(f"Project structure validation passed: {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
