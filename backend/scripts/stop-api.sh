#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$BACKEND_ROOT/.." && pwd)
ENV_FILE="$REPOSITORY_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "No .env file found, skipping API process stop."
  exit 0
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

if [ -z "${API_PORT:-}" ]; then
  echo "API_PORT is not defined; skipping API process stop."
  exit 0
fi

pids=$(lsof -tiTCP:"$API_PORT" -sTCP:LISTEN 2>/dev/null || true)

if [ -z "$pids" ]; then
  echo "No API process found on port $API_PORT."
  exit 0
fi

echo "Killing process(es) listening on port $API_PORT: $pids"
kill $pids 2>/dev/null || true
