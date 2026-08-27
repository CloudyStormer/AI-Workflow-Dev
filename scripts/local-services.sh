#!/bin/zsh

emulate -LR zsh
set -euo pipefail
setopt pipefail

readonly ROOT_DIR="${0:A:h:h}"
readonly NODE_BIN_DIR="/Users/qichao/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
readonly LAUNCH_DOMAIN="gui/$(id -u)"
readonly LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
readonly RUNTIME_DIR="$HOME/Library/Application Support/AIWorkFlow/local-services"
readonly LOG_DIR="$HOME/Library/Logs/AIWorkFlow/local-services"
readonly LABEL_PREFIX="com.cloudystormer.aiworkflow.local"
readonly SERVER_SOURCE="$ROOT_DIR/scripts/local-service-server.mjs"
readonly SERVER_RUNTIME="$RUNTIME_DIR/bin/local-service-server.mjs"
readonly API_RUNNER_SOURCE="$ROOT_DIR/scripts/local-api-service-runner.mjs"
readonly API_RUNNER_RUNTIME="$RUNTIME_DIR/bin/local-api-service-runner.mjs"

typeset -a WEB_SERVICE_IDS=(english radar control-center career)
typeset -a API_SERVICE_IDS=(radar-api career-api)
typeset -a SERVICE_IDS=(english radar-api radar control-center career-api career)
typeset -A SERVICE_NAME SERVICE_CWD SERVICE_PORT SERVICE_URL SERVICE_KIND SERVICE_HEALTH

SERVICE_NAME[english]="AI English Learning"
SERVICE_CWD[english]="$ROOT_DIR/projects/ai-english-learning/frontend"
SERVICE_PORT[english]="4173"
SERVICE_URL[english]="http://127.0.0.1:4173/word"
SERVICE_KIND[english]="static"
SERVICE_HEALTH[english]="html"

SERVICE_NAME[radar]="AI Model Radar"
SERVICE_CWD[radar]="$ROOT_DIR/projects/ai-model-radar/frontend"
SERVICE_PORT[radar]="4174"
SERVICE_URL[radar]="http://127.0.0.1:4174/today"
SERVICE_KIND[radar]="static"
SERVICE_HEALTH[radar]="html"

SERVICE_NAME[radar-api]="AI Model Radar API"
SERVICE_CWD[radar-api]="$ROOT_DIR/projects/ai-model-radar/backend"
SERVICE_PORT[radar-api]="4317"
SERVICE_URL[radar-api]="http://127.0.0.1:4317/health/ready?capability=query"
SERVICE_KIND[radar-api]="api"
SERVICE_HEALTH[radar-api]="json"

SERVICE_NAME[control-center]="AI Workflow Control Center"
SERVICE_CWD[control-center]="$ROOT_DIR/control-center"
SERVICE_PORT[control-center]="4175"
SERVICE_URL[control-center]="http://127.0.0.1:4175/?view=overview"
SERVICE_KIND[control-center]="vinext"
SERVICE_HEALTH[control-center]="html"

SERVICE_NAME[career]="Frontend Career Radar"
SERVICE_CWD[career]="$ROOT_DIR/projects/market-analysis-dev/frontend"
SERVICE_PORT[career]="4177"
SERVICE_URL[career]="http://127.0.0.1:4177/directions"
SERVICE_KIND[career]="static"
SERVICE_HEALTH[career]="html"

SERVICE_NAME[career-api]="Frontend Career Radar API"
SERVICE_CWD[career-api]="$ROOT_DIR/projects/market-analysis-dev/backend"
SERVICE_PORT[career-api]="4318"
SERVICE_URL[career-api]="http://127.0.0.1:4318/health/ready"
SERVICE_KIND[career-api]="api"
SERVICE_HEALTH[career-api]="json"

export PATH="$NODE_BIN_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export NO_UPDATE_NOTIFIER=1
export BROWSER=none

info() {
  print -r -- "[local-services] $*"
}

fail() {
  print -ru2 -- "[local-services] ERROR: $*"
  return 1
}

usage() {
  cat <<'EOF'
Usage: scripts/local-services.sh <command> [target]

Commands:
  start [target]        Build and start all services or one exact target
  stop [target]         Stop all services or one exact target
  restart [target]      Rebuild and replace all services or one exact target
  status [target]       Show launchd, listener, and HTTP state
  health [target]       Require HTML zh-CN or JSON readiness for the target
  logs [service] [n]    Show the last n lines (default 80) for all or one service
Service IDs: english, radar, radar-api, control-center, career, career-api
Stack targets: radar-stack, career-stack
EOF
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

validate_service_id() {
  local service_id="$1"
  [[ -n "${SERVICE_NAME[$service_id]-}" ]] || fail "Unknown service ID: $service_id"
}

target_services() {
  local target="${1:-all}"
  case "$target" in
    all) print -rl -- $SERVICE_IDS ;;
    radar-stack) print -rl -- radar-api radar ;;
    career-stack) print -rl -- career-api career ;;
    *)
      validate_service_id "$target"
      print -r -- "$target"
      ;;
  esac
}

is_web_service() {
  [[ "${SERVICE_KIND[$1]}" != "api" ]]
}

label_for() {
  print -r -- "$LABEL_PREFIX.$1"
}

plist_for() {
  print -r -- "$LAUNCH_AGENTS_DIR/$(label_for "$1").plist"
}

stdout_log_for() {
  print -r -- "$LOG_DIR/$1.stdout.log"
}

stderr_log_for() {
  print -r -- "$LOG_DIR/$1.stderr.log"
}

canonical_dir() {
  (cd "$1" && pwd -P)
}

xml_escape() {
  local value="$1"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  value="${value//\"/&quot;}"
  value="${value//\'/&apos;}"
  print -r -- "$value"
}

write_plist() {
  local service_id="$1"
  local label plist cwd stdout_log stderr_log argument
  local -a program_arguments
  label="$(label_for "$service_id")"
  plist="$(plist_for "$service_id")"
  stdout_log="$(stdout_log_for "$service_id")"
  stderr_log="$(stderr_log_for "$service_id")"

  if is_web_service "$service_id"; then
    cwd="$RUNTIME_DIR/current/$service_id"
    program_arguments=(
      "$NODE_BIN_DIR/node"
      "$SERVER_RUNTIME"
      --service "$service_id"
      --mode "${SERVICE_KIND[$service_id]}"
      --root "$cwd"
      --host 127.0.0.1
      --port "${SERVICE_PORT[$service_id]}"
    )
  else
    cwd="${SERVICE_CWD[$service_id]}"
    program_arguments=(
      "$NODE_BIN_DIR/node"
      "$API_RUNNER_RUNTIME"
      --service "$service_id"
      --root "$cwd"
    )
  fi

  mkdir -p "$LAUNCH_AGENTS_DIR" "$RUNTIME_DIR" "$LOG_DIR"
  {
    print -r -- '<?xml version="1.0" encoding="UTF-8"?>'
    print -r -- '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'
    print -r -- '<plist version="1.0">'
    print -r -- '<dict>'
    print -r -- '  <key>Label</key>'
    print -r -- "  <string>$label</string>"
    print -r -- '  <key>ProgramArguments</key>'
    print -r -- '  <array>'
    for argument in $program_arguments; do
      print -r -- "    <string>$(xml_escape "$argument")</string>"
    done
    print -r -- '  </array>'
    print -r -- '  <key>WorkingDirectory</key>'
    print -r -- "  <string>$(xml_escape "$cwd")</string>"
    print -r -- '  <key>EnvironmentVariables</key>'
    print -r -- '  <dict>'
    print -r -- '    <key>PATH</key>'
    print -r -- "    <string>$(xml_escape "$PATH")</string>"
    print -r -- '    <key>NO_UPDATE_NOTIFIER</key>'
    print -r -- '    <string>1</string>'
    print -r -- '    <key>BROWSER</key>'
    print -r -- '    <string>none</string>'
    print -r -- '  </dict>'
    print -r -- '  <key>RunAtLoad</key>'
    print -r -- '  <true/>'
    print -r -- '  <key>KeepAlive</key>'
    print -r -- '  <true/>'
    print -r -- '  <key>ThrottleInterval</key>'
    print -r -- '  <integer>5</integer>'
    print -r -- '  <key>StandardOutPath</key>'
    print -r -- "  <string>$(xml_escape "$stdout_log")</string>"
    print -r -- '  <key>StandardErrorPath</key>'
    print -r -- "  <string>$(xml_escape "$stderr_log")</string>"
    print -r -- '</dict>'
    print -r -- '</plist>'
  } >| "$plist"
  chmod 600 "$plist"
  plutil -lint "$plist" >/dev/null
}

job_loaded() {
  local label
  label="$(label_for "$1")"
  launchctl print "$LAUNCH_DOMAIN/$label" >/dev/null 2>&1
}

listener_pids() {
  local port="$1"
  lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u || true
}

pid_cwd() {
  local pid="$1"
  lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | sed -n '1p'
}

pid_command() {
  ps -p "$1" -o command= 2>/dev/null || true
}

is_exact_service_listener() {
  local service_id="$1"
  local pid="$2"
  local expected_cwd process_cwd process_command
  expected_cwd="$(canonical_dir "${SERVICE_CWD[$service_id]}")"
  process_cwd="$(pid_cwd "$pid")"
  process_command="$(pid_command "$pid")"

  if [[ -n "$process_cwd" && "$process_cwd" == "$expected_cwd" ]]; then
    [[ "$process_command" == *node* || "$process_command" == *vite* || "$process_command" == *vinext* || "$process_command" == *npm* ]] && return 0
  fi
  [[ "$process_command" == *"$SERVER_RUNTIME"* && "$process_command" == *"--service $service_id"* ]]
}

wait_for_port_free() {
  local port="$1"
  local attempt
  for attempt in {1..20}; do
    [[ -z "$(listener_pids "$port")" ]] && return 0
    sleep 0.25
  done
  return 1
}

stop_exact_legacy_listener() {
  local service_id="$1"
  local port="${SERVICE_PORT[$service_id]}"
  local pids pid
  pids="$(listener_pids "$port")"
  [[ -z "$pids" ]] && return 0

  for pid in ${(f)pids}; do
    if ! is_exact_service_listener "$service_id" "$pid"; then
      fail "Port $port is owned by an unknown process; refusing to stop PID $pid (cwd=$(pid_cwd "$pid"), command=$(pid_command "$pid"))"
      return 1
    fi
  done

  for pid in ${(f)pids}; do
    info "Stopping exact legacy listener for ${SERVICE_NAME[$service_id]}: PID $pid on port $port"
    kill -TERM "$pid"
  done

  if wait_for_port_free "$port"; then
    return 0
  fi

  pids="$(listener_pids "$port")"
  for pid in ${(f)pids}; do
    if is_exact_service_listener "$service_id" "$pid"; then
      info "Legacy listener did not exit after TERM; stopping exact PID $pid"
      kill -KILL "$pid"
    else
      fail "Port $port changed ownership while stopping; refusing to stop PID $pid"
      return 1
    fi
  done
  wait_for_port_free "$port" || fail "Port $port did not become free"
}

bootout_service() {
  local service_id="$1"
  local label
  label="$(label_for "$service_id")"
  if job_loaded "$service_id"; then
    launchctl bootout "$LAUNCH_DOMAIN/$label"
  fi
}

build_service() {
  local service_id="$1"
  local cwd="${SERVICE_CWD[$service_id]}"
  [[ -d "$cwd" ]] || fail "Missing service directory: $cwd"
  [[ -f "$cwd/package.json" ]] || fail "Missing package.json: $cwd/package.json"
  info "Building ${SERVICE_NAME[$service_id]} in $cwd"
  (cd "$cwd" && npm run build)
}

build_targets() {
  local service_id
  local -a services=("$@")
  require_command node
  require_command npm
  [[ "$(command -v node)" == "$NODE_BIN_DIR/node" ]] || fail "Bundled Node is not first on PATH: $(command -v node)"
  info "Using Node $(node --version) from $(command -v node)"
  for service_id in $services; do
    build_service "$service_id"
  done
}

install_runtime_helpers() {
  mkdir -p "$RUNTIME_DIR/bin"
  [[ -f "$SERVER_SOURCE" ]] || fail "Missing local service server: $SERVER_SOURCE"
  [[ -f "$API_RUNNER_SOURCE" ]] || fail "Missing local API service runner: $API_RUNNER_SOURCE"
  ditto "$SERVER_SOURCE" "$SERVER_RUNTIME"
  ditto "$API_RUNNER_SOURCE" "$API_RUNNER_RUNTIME"
  chmod 700 "$SERVER_RUNTIME" "$API_RUNNER_RUNTIME"
}

stage_web_release() {
  local release_id release_root previous_target service_id source_dist target_dist next_link current_source
  local -a selected_services=("$@")
  release_id="$(date '+%Y%m%dT%H%M%S')-$$"
  release_root="$RUNTIME_DIR/releases/$release_id"
  mkdir -p "$release_root"
  install_runtime_helpers

  for service_id in $WEB_SERVICE_IDS; do
    source_dist="${SERVICE_CWD[$service_id]}/dist"
    target_dist="$release_root/$service_id"
    current_source="$RUNTIME_DIR/current/$service_id"
    if (( ${selected_services[(Ie)$service_id]} )); then
      [[ -d "$source_dist" ]] || fail "Build output missing for $service_id: $source_dist"
      ditto "$source_dist" "$target_dist"
    elif [[ -d "$current_source" ]]; then
      ditto "$current_source" "$target_dist"
    else
      [[ -d "$source_dist" ]] || fail "No current release or build output for $service_id"
      ditto "$source_dist" "$target_dist"
    fi
  done

  if [[ -L "$RUNTIME_DIR/current" ]]; then
    previous_target="$(readlink "$RUNTIME_DIR/current")"
    ln -sfn "$previous_target" "$RUNTIME_DIR/previous"
  fi
  next_link="$RUNTIME_DIR/current.next"
  ln -sfn "$release_root" "$next_link"
  mv -fh "$next_link" "$RUNTIME_DIR/current"
  info "Staged local runtime release: $release_root"
}

health_result() {
  local service_id="$1"
  local url="${SERVICE_URL[$service_id]}"
  local body http_code health_status
  body="$(mktemp -t aiworkflow-health.XXXXXX)"
  http_code="$(curl --noproxy '*' --location --silent --show-error --connect-timeout 2 --max-time 8 --output "$body" --write-out '%{http_code}' "$url" 2>/dev/null || true)"
  if [[ "${SERVICE_HEALTH[$service_id]}" == "html" ]] && grep -Eiq '<html[^>]*lang="zh-CN"' "$body"; then
    health_status="zh-CN"
  elif [[ "${SERVICE_HEALTH[$service_id]}" == "json" ]] && grep -Eq '"(readiness|truth)"[[:space:]]*:[[:space:]]*"ready"|"ready"[[:space:]]*:[[:space:]]*true' "$body"; then
    health_status="ready"
  else
    health_status="not-ready"
  fi
  rm -f "$body"
  print -r -- "$http_code $health_status"
}

service_healthy() {
  local service_id="$1"
  local result
  result="$(health_result "$service_id")"
  [[ "$result" == "200 zh-CN" || "$result" == "200 ready" ]]
}

wait_for_service_health() {
  local service_id="$1"
  local attempt
  for attempt in {1..60}; do
    service_healthy "$service_id" && return 0
    sleep 1
  done
  return 1
}

start_service() {
  local service_id="$1"
  local label plist port
  label="$(label_for "$service_id")"
  plist="$(plist_for "$service_id")"
  port="${SERVICE_PORT[$service_id]}"

  bootout_service "$service_id"
  wait_for_port_free "$port" || stop_exact_legacy_listener "$service_id"
  write_plist "$service_id"
  launchctl enable "$LAUNCH_DOMAIN/$label"
  launchctl bootstrap "$LAUNCH_DOMAIN" "$plist"
  launchctl kickstart -k "$LAUNCH_DOMAIN/$label"

  if ! wait_for_service_health "$service_id"; then
    fail "${SERVICE_NAME[$service_id]} failed health verification; inspect $(stderr_log_for "$service_id")"
    return 1
  fi
  info "Healthy: ${SERVICE_NAME[$service_id]} -> ${SERVICE_URL[$service_id]}"
}

start_targets() {
  local target="${1:-all}"
  local service_id
  local -a services web_services
  services=("${(@f)$(target_services "$target")}")
  web_services=()
  require_command launchctl
  require_command lsof
  require_command curl
  require_command plutil
  require_command ditto
  build_targets $services
  install_runtime_helpers
  for service_id in $services; do
    if is_web_service "$service_id"; then
      web_services+=("$service_id")
    fi
  done
  if (( ${#web_services} > 0 )); then
    stage_web_release $web_services
  fi
  for service_id in $services; do
    start_service "$service_id"
  done
  health_targets "$target"
}

stop_service() {
  local service_id="$1"
  local label port
  label="$(label_for "$service_id")"
  port="${SERVICE_PORT[$service_id]}"
  launchctl disable "$LAUNCH_DOMAIN/$label" 2>/dev/null || true
  bootout_service "$service_id"
  if ! wait_for_port_free "$port"; then
    stop_exact_legacy_listener "$service_id"
  fi
  info "Stopped: ${SERVICE_NAME[$service_id]}"
}

stop_targets() {
  local target="${1:-all}"
  local service_id
  local -a services
  services=("${(@f)$(target_services "$target")}")
  require_command launchctl
  require_command lsof
  for service_id in $services; do
    stop_service "$service_id"
  done
}

status_service() {
  local service_id="$1"
  local label launch_state launch_pid listeners result http_code health_status
  label="$(label_for "$service_id")"
  launch_state="unloaded"
  launch_pid="-"
  if job_loaded "$service_id"; then
    local job
    job="$(launchctl print "$LAUNCH_DOMAIN/$label")"
    launch_state="$(print -r -- "$job" | sed -n 's/^[[:space:]]*state = //p' | sed -n '1p')"
    launch_pid="$(print -r -- "$job" | sed -n 's/^[[:space:]]*pid = //p' | sed -n '1p')"
    [[ -n "$launch_state" ]] || launch_state="loaded"
    [[ -n "$launch_pid" ]] || launch_pid="-"
  fi
  listeners="$(listener_pids "${SERVICE_PORT[$service_id]}")"
  [[ -n "$listeners" ]] || listeners="-"
  result="$(health_result "$service_id")"
  http_code="${result%% *}"
  health_status="${result#* }"
  printf '%-16s launchd=%-9s job_pid=%-7s listener_pid=%-9s http=%-3s health=%s\n' \
    "$service_id" "$launch_state" "$launch_pid" "${listeners//$'\n'/,}" "$http_code" "$health_status"
}

status_targets() {
  local target="${1:-all}"
  local service_id
  local -a services
  services=("${(@f)$(target_services "$target")}")
  require_command launchctl
  require_command lsof
  require_command curl
  for service_id in $services; do
    status_service "$service_id"
  done
}

health_service() {
  local service_id="$1"
  local result
  result="$(health_result "$service_id")"
  if [[ "$result" == "200 zh-CN" || "$result" == "200 ready" ]]; then
    print -r -- "PASS  $service_id  ${SERVICE_URL[$service_id]}  HTTP 200  health=${result#* }"
  else
    print -ru2 -- "FAIL  $service_id  ${SERVICE_URL[$service_id]}  HTTP ${result%% *}  health=${result#* }"
    return 1
  fi
}

health_targets() {
  local target="${1:-all}"
  local service_id failed=0
  local -a services
  services=("${(@f)$(target_services "$target")}")
  require_command curl
  for service_id in $services; do
    health_service "$service_id" || failed=1
  done
  return "$failed"
}

show_logs() {
  local requested="${1:-all}"
  local lines="${2:-80}"
  local service_id
  local -a services
  [[ "$lines" == <-> ]] || fail "Log line count must be a positive integer"
  services=("${(@f)$(target_services "$requested")}")
  for service_id in $services; do
    print -r -- "===== ${SERVICE_NAME[$service_id]} ($service_id) ====="
    for log_file in "$(stdout_log_for "$service_id")" "$(stderr_log_for "$service_id")"; do
      print -r -- "--- $log_file ---"
      if [[ -f "$log_file" ]]; then
        tail -n "$lines" "$log_file"
      else
        print -r -- "(no log file yet)"
      fi
    done
  done
}

main() {
  local command="${1:-}"
  local target="${2:-all}"
  case "$command" in
    start)
      [[ $# -le 2 ]] || fail "start accepts at most one target"
      start_targets "$target"
      ;;
    stop)
      [[ $# -le 2 ]] || fail "stop accepts at most one target"
      stop_targets "$target"
      ;;
    restart)
      [[ $# -le 2 ]] || fail "restart accepts at most one target"
      start_targets "$target"
      ;;
    status)
      [[ $# -le 2 ]] || fail "status accepts at most one target"
      status_targets "$target"
      ;;
    health)
      [[ $# -le 2 ]] || fail "health accepts at most one target"
      health_targets "$target"
      ;;
    logs)
      show_logs "${2:-all}" "${3:-80}"
      ;;
    help|-h|--help|'')
      usage
      ;;
    *)
      usage >&2
      fail "Unknown command: $command"
      ;;
  esac
}

main "$@"
