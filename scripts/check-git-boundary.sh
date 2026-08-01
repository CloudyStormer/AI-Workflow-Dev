#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
actual_root="$(git -C "$repo_root" rev-parse --show-toplevel)"

if [[ "$actual_root" != "$repo_root" ]]; then
  echo "Git boundary mismatch: expected $repo_root, got $actual_root" >&2
  exit 1
fi

nested_git="$(find "$repo_root" -mindepth 2 -type d -name .git -prune -print)"
if [[ -n "$nested_git" ]]; then
  echo "Nested Git metadata is forbidden:" >&2
  echo "$nested_git" >&2
  exit 1
fi

remote_names="$(git -C "$repo_root" remote)"
if [[ "$remote_names" != "origin" ]]; then
  echo "Exactly one remote named origin is required; found: ${remote_names:-none}" >&2
  exit 1
fi

origin_url="$(git -C "$repo_root" remote get-url origin)"
case "$origin_url" in
  git@github.com:CloudyStormer/AI-Workflow-Dev.git|git@github.com-cloudystormer:CloudyStormer/AI-Workflow-Dev.git)
    ;;
  *)
    echo "Unexpected origin: $origin_url" >&2
    exit 1
    ;;
esac

gitlinks="$(git -C "$repo_root" ls-files --stage | awk '$1 == "160000" {print $4}')"
if [[ -n "$gitlinks" ]]; then
  echo "Gitlinks/submodules are forbidden:" >&2
  echo "$gitlinks" >&2
  exit 1
fi

echo "Git boundary check passed: one AIWorkFlow root, one origin, no nested repositories."
