#!/usr/bin/env bash
set -euo pipefail

echo "Applying Prisma schema..."

if npx prisma db push; then
  npx prisma generate
  exit 0
fi

echo "prisma db push failed, falling back to SQLite diff apply"

DATABASE_URL_VALUE="${DATABASE_URL:-file:./data/miniassets.db}"
SQLITE_PATH="${DATABASE_URL_VALUE#file:}"

if [[ "$SQLITE_PATH" != /* ]]; then
  SQLITE_PATH="$(pwd)/${SQLITE_PATH#./}"
fi

mkdir -p "$(dirname "$SQLITE_PATH")"
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | sqlite3 "$SQLITE_PATH"
npx prisma generate
