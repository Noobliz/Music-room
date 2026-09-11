#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$BACKEND_ROOT/.." && pwd)

ENV_FILE="$REPOSITORY_ROOT/.env"
SUPABASE_CONFIG_FILE="$BACKEND_ROOT/supabase/config.toml"
BRUNO_COLLECTION_FILE="$BACKEND_ROOT/bruno/collection.bru"
BRUNO_LOCAL_ENV_FILE="$BACKEND_ROOT/bruno/environments/local.bru"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing .env file at repository root. Copy .env.example to .env first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

require_port() {
  name="$1"
  value="${2:-}"

  case "$value" in
    ''|*[!0-9]*)
      echo "$name must be a valid TCP port in .env." >&2
      exit 1
      ;;
  esac

  if [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
    echo "$name must be between 1 and 65535 in .env." >&2
    exit 1
  fi
}

require_port "API_PORT" "${API_PORT:-}"
require_port "SUPABASE_API_PORT" "${SUPABASE_API_PORT:-}"
require_port "SUPABASE_DB_PORT" "${SUPABASE_DB_PORT:-}"
require_port "SUPABASE_DB_SHADOW_PORT" "${SUPABASE_DB_SHADOW_PORT:-}"
require_port "SUPABASE_DB_POOLER_PORT" "${SUPABASE_DB_POOLER_PORT:-}"
require_port "SUPABASE_STUDIO_PORT" "${SUPABASE_STUDIO_PORT:-}"
require_port "SUPABASE_INBUCKET_PORT" "${SUPABASE_INBUCKET_PORT:-}"
require_port "SUPABASE_ANALYTICS_PORT" "${SUPABASE_ANALYTICS_PORT:-}"

update_toml_key() {
  section="$1"
  key="$2"
  value="$3"
  file="$4"
  tmp_file="${file}.tmp"

  awk -v section="$section" -v key="$key" -v value="$value" '
    $0 == "[" section "]" {
      in_section = 1
      print
      next
    }
    /^\[/ {
      in_section = 0
    }
    in_section && $1 == key {
      print key " = " value
      next
    }
    {
      print
    }
  ' "$file" > "$tmp_file"

  mv "$tmp_file" "$file"
}

update_bru_var() {
  key="$1"
  value="$2"
  file="$3"
  tmp_file="${file}.tmp"

  sed "s#^\([[:space:]]*${key}[[:space:]]*:[[:space:]]*\).*\$#\1${value}#" "$file" > "$tmp_file"
  mv "$tmp_file" "$file"
}

update_toml_key "api" "port" "$SUPABASE_API_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "db" "port" "$SUPABASE_DB_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "db" "shadow_port" "$SUPABASE_DB_SHADOW_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "db.pooler" "port" "$SUPABASE_DB_POOLER_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "studio" "port" "$SUPABASE_STUDIO_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "studio" "api_url" "\"http://127.0.0.1:${SUPABASE_API_PORT}\"" "$SUPABASE_CONFIG_FILE"
update_toml_key "local_smtp" "port" "$SUPABASE_INBUCKET_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "analytics" "port" "$SUPABASE_ANALYTICS_PORT" "$SUPABASE_CONFIG_FILE"
update_toml_key "auth" "site_url" "\"http://127.0.0.1:${API_PORT}\"" "$SUPABASE_CONFIG_FILE"
update_toml_key "auth" "additional_redirect_urls" "[\"http://127.0.0.1:${API_PORT}\"]" "$SUPABASE_CONFIG_FILE"

update_bru_var "API_PORT" "$API_PORT" "$BRUNO_COLLECTION_FILE"
update_bru_var "API_PORT" "$API_PORT" "$BRUNO_LOCAL_ENV_FILE"
