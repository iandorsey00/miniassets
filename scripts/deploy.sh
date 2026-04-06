#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/miniassets/app}"
BRANCH="${BRANCH:-main}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/usr/bin}"
SERVICE_NAME="${SERVICE_NAME:-miniassets}"
ENV_FILE="${ENV_FILE:-/var/www/miniassets/.env.production}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$APP_DIR/.env.deploy}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"
SKIP_DB_APPLY="${SKIP_DB_APPLY:-false}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

restore_server_package_drift() {
  local files=(package.json package-lock.json)
  local file

  for file in "${files[@]}"; do
    if git diff --quiet -- "$file"; then
      continue
    fi

    log "Restoring server-local $file changes before pull"
    git restore "$file"
  done
}

if [[ -f "$DEPLOY_ENV_FILE" ]]; then
  log "Loading deploy env from $DEPLOY_ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$DEPLOY_ENV_FILE"
  set +a
fi

export PATH="$NODE_BIN_DIR:$PATH"

if [[ -f "$ENV_FILE" ]]; then
  log "Loading runtime env from $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

if [[ -z "$HEALTHCHECK_URL" && -n "${APP_URL:-}" ]]; then
  HEALTHCHECK_URL="${APP_URL%/}/api/health"
fi

require_command git
require_command npm
require_command sudo

log "Deploying MiniAssets from branch: $BRANCH"
cd "$APP_DIR"

restore_server_package_drift

log "Fetching latest git state"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

log "Installing exact dependencies"
npm ci

if [[ "$SKIP_DB_APPLY" != "true" ]]; then
  log "Applying schema"
  npm run db:apply
else
  log "Skipping schema apply because SKIP_DB_APPLY=true"
fi

log "Building app"
npm run build

log "Restarting systemd service: $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl --no-pager --full status "$SERVICE_NAME"

if [[ -n "$HEALTHCHECK_URL" ]]; then
  log "Running health check: $HEALTHCHECK_URL"
  curl --fail --silent --show-error "$HEALTHCHECK_URL"
  echo
fi

log "Deploy complete"
