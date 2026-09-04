#!/usr/bin/env python3
"""Discover AIWorkFlow projects and resolve their safe local runtime targets."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
RUNTIME_TARGETS = {
    "workflow-control-center": {
        "target": "control-center",
        "services": ["control-center"],
        "urls": ["http://127.0.0.1:4175/?view=overview"],
    },
    "ai-english-learning": {
        "target": "english",
        "services": ["english"],
        "urls": ["http://127.0.0.1:4173/word"],
    },
    "ai-model-radar": {
        "target": "radar-stack",
        "services": ["radar-api", "radar"],
        "urls": [
            "http://127.0.0.1:4174/today",
            "http://127.0.0.1:4317/health/ready?capability=query",
        ],
    },
    "market-analysis-dev": {
        "target": "career-stack",
        "services": ["career-api", "career"],
        "urls": [
            "http://127.0.0.1:4177/directions",
            "http://127.0.0.1:4318/health/ready",
        ],
    },
}


def scalar(raw: str) -> str:
    raw = raw.strip()
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = raw.strip("'\"")
    return str(value)


def project_identity(manifest: Path) -> tuple[str, str]:
    text = manifest.read_text(encoding="utf-8")
    section = re.search(
        r"^project:\s*$\n(?P<body>(?:^[ ]{2}.*(?:\n|$))+)", text, re.MULTILINE
    )
    if not section:
        raise ValueError(f"missing project section: {manifest}")
    body = section.group("body")
    values: dict[str, str] = {}
    for key in ("id", "name"):
        match = re.search(rf"^[ ]{{2}}{key}:\s*(.+?)\s*$", body, re.MULTILINE)
        if not match:
            raise ValueError(f"missing project.{key}: {manifest}")
        values[key] = scalar(match.group(1))
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", values["id"]):
        raise ValueError(f"unsafe project id {values['id']!r}: {manifest}")
    return values["id"], values["name"]


def manifests() -> list[Path]:
    candidates = [ROOT / "control-center" / "project.yaml"]
    projects_root = ROOT / "projects"
    if projects_root.is_dir():
        candidates.extend(sorted(projects_root.glob("*/project.yaml")))
    return [path for path in candidates if path.is_file() and not path.is_symlink()]


def discover() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    seen: set[str] = set()
    for manifest in manifests():
        resolved = manifest.resolve()
        if ROOT.resolve() not in resolved.parents:
            raise ValueError(f"manifest escapes AIWorkFlow root: {manifest}")
        project_id, name = project_identity(manifest)
        if project_id in seen:
            raise ValueError(f"duplicate project id: {project_id}")
        seen.add(project_id)
        runtime = RUNTIME_TARGETS.get(project_id)
        records.append(
            {
                "id": project_id,
                "name": name,
                "path": str(manifest.parent.relative_to(ROOT)),
                "configured": runtime is not None,
                "target": runtime["target"] if runtime else None,
                "services": runtime["services"] if runtime else [],
                "urls": runtime["urls"] if runtime else [],
            }
        )
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    list_parser = subparsers.add_parser("list")
    list_parser.add_argument("--format", choices=("json", "text"), default="json")
    resolve_parser = subparsers.add_parser("resolve")
    resolve_parser.add_argument("--project-id", required=True)
    args = parser.parse_args()

    try:
        records = discover()
    except (OSError, ValueError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1

    if args.command == "list":
        if args.format == "json":
            print(json.dumps(records, ensure_ascii=False, indent=2))
        else:
            for record in records:
                marker = "ready" if record["configured"] else "runtime-unconfigured"
                print(f"{record['id']}\t{record['name']}\t{marker}")
        return 0

    record = next((item for item in records if item["id"] == args.project_id), None)
    if record is None:
        print(json.dumps({"error": "unknown project id"}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(record, ensure_ascii=False, indent=2))
    return 0 if record["configured"] else 3


if __name__ == "__main__":
    raise SystemExit(main())
