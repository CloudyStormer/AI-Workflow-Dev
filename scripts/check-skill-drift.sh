#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
canonical_dir="$repo_root/skill"
global_dir="${AI_WORKFLOW_GLOBAL_SKILLS:-$HOME/.agents/skills}"
project_skill_dirs=(
  "$repo_root/projects/ai-english-learning/skills"
  "$repo_root/projects/ai-model-radar/skills"
  "$repo_root/control-center/skills"
)
drift_count=0

check_target() {
  local source_file="$1"
  local target_file="$2"
  local label="$3"

  if [[ ! -f "$target_file" ]]; then
    echo "MISSING [$label] $target_file"
    drift_count=$((drift_count + 1))
    return
  fi

  if ! cmp -s "$source_file" "$target_file"; then
    echo "DRIFT   [$label] $target_file"
    drift_count=$((drift_count + 1))
  fi
}

check_skill_tree() {
  local source_dir="$1"
  local target_base="$2"
  local label="$3"
  local skill_name
  skill_name="$(basename "$source_dir")"
  local target_dir="$target_base/$skill_name"

  if [[ ! -d "$target_dir" ]]; then
    echo "MISSING [$label] $target_dir/"
    drift_count=$((drift_count + 1))
    return
  fi

  while IFS= read -r source_asset; do
    relative_asset="${source_asset#"$source_dir/"}"
    check_target "$source_asset" "$target_dir/$relative_asset" "$label"
  done < <(find "$source_dir" -type f ! -name .DS_Store ! -path '*/__pycache__/*' | sort)

  while IFS= read -r target_asset; do
    relative_asset="${target_asset#"$target_dir/"}"
    if [[ ! -f "$source_dir/$relative_asset" ]]; then
      echo "EXTRA   [$label] $target_asset"
      drift_count=$((drift_count + 1))
    fi
  done < <(find "$target_dir" -type f ! -name .DS_Store ! -path '*/__pycache__/*' | sort)
}

while IFS= read -r source_file; do
  source_skill_dir="$(dirname "$source_file")"
  for project_skill_dir in "${project_skill_dirs[@]}"; do
    project_name="$(basename "$(dirname "$project_skill_dir")")"
    check_skill_tree "$source_skill_dir" "$project_skill_dir" "project:$project_name"
  done
  check_skill_tree "$source_skill_dir" "$global_dir" "global"
done < <(find "$canonical_dir" -mindepth 2 -maxdepth 2 -name SKILL.md -type f | sort)

if [[ "$drift_count" -ne 0 ]]; then
  echo "Skill drift check failed: $drift_count issue(s)."
  exit 1
fi

echo "Skill drift check passed: canonical, all project snapshots, and global copies match."
