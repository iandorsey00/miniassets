#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/miniassets/app}"
BRANCH="${BRANCH:-main}"
NODE_BIN_DIR="${NODE_BIN_DIR:-/usr/bin}"
SERVICE_NAME="${SERVICE_NAME:-miniassets}"
ENV_FILE="${ENV_FILE:-/var/www/miniassets/.env.production}"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$APP_DIR/.env.deploy}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"

if [[ -f "$DEPLOY_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$DEPLOY_ENV_FILE"
  set +a
fi

export PATH="$NODE_BIN_DIR:$PATH"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

echo "Deploying MiniAssets from branch: $BRANCH"
cd "$APP_DIR"

if git diff --quiet -- package-lock.json; then
  :
else
  echo "Restoring server-local package-lock.json changes before pull"
  git restore package-lock.json
fi

git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run db:apply
npm run build

sudo systemctl restart "$SERVICE_NAME"
sudo systemctl --no-pager --full status "$SERVICE_NAME"

if [[ -n "$HEALTHCHECK_URL" ]]; then
  curl --fail --silent --show-error "$HEALTHCHECK_URL"
  echo
fi
