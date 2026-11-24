#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

if [ -z "${SUPABASE_SECRET_KEY:-}" ]; then
  STATUS=$(cd "$BACKEND_ROOT" && pnpm exec supabase status -o env 2>/dev/null) || {
    echo "Local Supabase is not running: start it before importing the catalog." >&2
    exit 1
  }
  SUPABASE_SECRET_KEY=$(printf '%s\n' "$STATUS" | sed -n 's/^SECRET_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | head -n 1)
  if [ -z "$SUPABASE_SECRET_KEY" ]; then
    SUPABASE_SECRET_KEY=$(printf '%s\n' "$STATUS" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' | head -n 1)
  fi
  if [ -z "$SUPABASE_SECRET_KEY" ]; then
    echo "No SECRET_KEY or SERVICE_ROLE_KEY in 'supabase status -o env'." >&2
    exit 1
  fi
  export SUPABASE_SECRET_KEY
fi

exec "$@"
