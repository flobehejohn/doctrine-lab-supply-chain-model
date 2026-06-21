#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-plan}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

TEMPLATE="$HERE/docker-compose.template.yml"
RENDERED="$HERE/docker-compose.yml"

log() {
  printf '[gitlab-local-lab] %s\n' "$1"
}

assert_no_secret_echo() {
  if [[ -n "${GITLAB_RUNNER_REGISTRATION_TOKEN:-}" ]]; then
    log "Runner registration token detected in environment: ***REDACTED***"
  else
    log "Runner registration token not set. This is OK for planning/modeling mode."
  fi
}

assert_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker CLI not found. Install Docker Desktop or Docker Engine." >&2
    exit 1
  fi
}

render_compose() {
  if [[ ! -f "$TEMPLATE" ]]; then
    echo "Missing template: $TEMPLATE" >&2
    exit 1
  fi

  cp "$TEMPLATE" "$RENDERED"
  log "Rendered docker-compose.yml from docker-compose.template.yml"
}

assert_no_secret_echo

case "$MODE" in
  plan)
    log "Plan only. No container will be started."
    log "GitLab URL: http://localhost:8080"
    log "Registry URL: http://localhost:5050"
    log "SSH port: 2222"
    log "Sample project: sample-project/"
    log "Evidence model: evidence/evidence-pack.gitlab-local.json"
    log "Runbook: RUNBOOK.md"
    log "Security model: SECURITY_MODEL.md"
    ;;

  render)
    render_compose
    ;;

  up)
    assert_docker
    render_compose
    docker compose -f "$RENDERED" up -d
    log "GitLab local lab starting."
    log "Wait for GitLab healthcheck before creating/importing projects."
    ;;

  down)
    assert_docker
    if [[ -f "$RENDERED" ]]; then
      docker compose -f "$RENDERED" down
    else
      log "No rendered docker-compose.yml found."
    fi
    ;;

  status)
    assert_docker
    if [[ -f "$RENDERED" ]]; then
      docker compose -f "$RENDERED" ps
    else
      log "No rendered docker-compose.yml found."
    fi
    ;;

  *)
    echo "Usage: bash bootstrap-gitlab-lab.sh [plan|render|up|down|status]" >&2
    exit 2
    ;;
esac
