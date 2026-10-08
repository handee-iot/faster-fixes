#!/bin/sh
set -eu

# Docker secrets: a VAR_FILE path loads the file's contents into VAR, so a
# compose deployment never needs secrets in the environment (port of
# ongrowww's entrypoint).
load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  eval "file_path=\${$file_variable_name:-}"

  if [ -n "$file_path" ]; then
    if [ ! -r "$file_path" ]; then
      printf 'Secret file is not readable: %s\n' "$file_path" >&2
      exit 1
    fi
    export "${variable_name}=$(cat "$file_path")"
    eval "unset $file_variable_name"
  fi
}

for variable_name in \
  DATABASE_URL \
  DATABASE_PASSWORD \
  BETTER_AUTH_SECRET \
  RESEND_API_KEY \
  SMTP_PASSWORD \
  R2_ACCESS_KEY_ID \
  R2_SECRET_ACCESS_KEY \
  GITHUB_PRIVATE_KEY \
  INNGEST_EVENT_KEY \
  INNGEST_SIGNING_KEY \
  SLACK_TOKEN_ENCRYPTION_KEY \
  LINEAR_TOKEN_ENCRYPTION_KEY \
  JIRA_TOKEN_ENCRYPTION_KEY
do
  load_secret "$variable_name"
done

# Compose-style deployments can provide the Postgres credentials piecemeal.
if [ -z "${DATABASE_URL:-}" ]; then
  : "${DATABASE_PASSWORD:?DATABASE_PASSWORD or DATABASE_URL is required}"
  DATABASE_URL="postgresql://${DATABASE_USER:-fasterfixes}:${DATABASE_PASSWORD}@${DATABASE_HOST:-postgres}:5432/${DATABASE_NAME:-fasterfixes}?schema=public"
  export DATABASE_URL
fi

# When the container starts as root, drop to the app user unless told not to.
if [ "$(id -u)" = "0" ] && [ -n "${RUN_AS_UID:-}" ] && [ -n "${RUN_AS_GID:-}" ]; then
  exec setpriv \
    --reuid="$RUN_AS_UID" \
    --regid="$RUN_AS_GID" \
    --clear-groups \
    -- "$@"
fi

exec "$@"
