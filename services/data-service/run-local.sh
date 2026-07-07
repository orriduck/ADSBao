#!/usr/bin/env bash
# Start the Go data-service for local dev with the full env it needs, sourced
# from the gitignored repo-root .env.local (OPENAIP_API_KEY, DATABASE_URL,
# ADSBAO_REALTIME_AUTH_SECRET, optional FlightAware secret-service wiring).
#
# Why: the service reads os.Getenv directly (no dotenv). Without OPENAIP_API_KEY
# airport endpoints 503; without DATABASE_URL runway geometry falls back to the
# OpenAIP center-projection inference (overlapping parallels / phantom runways /
# "black star"), and spotter/photo data is empty. This script keeps both set so
# a fresh start "just works" with real OurAirports runway endpoints.
#
# Usage:  ./services/data-service/run-local.sh        (foreground)
#         ./services/data-service/run-local.sh &      (background)
set -euo pipefail

# arm64 Homebrew toolchain (x86_64 /usr/local binaries fail with "Bad CPU type").
export PATH="/opt/homebrew/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "warning: $ENV_FILE not found — OPENAIP_API_KEY / DATABASE_URL may be unset" >&2
fi

PORT="${PORT:-8081}"

# Free the port if a previous instance is still listening (convenient restart).
if existing="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null)"; then
  [ -n "$existing" ] && { echo "stopping existing data-service on :$PORT (pid $existing)"; kill "$existing" 2>/dev/null || true; sleep 1; }
fi

# Presence checks (never print secret values).
for var in OPENAIP_API_KEY DATABASE_URL; do
  if [ -z "${!var:-}" ]; then
    echo "warning: $var is empty — runway geometry / airport data may degrade" >&2
  fi
done

echo "starting adsbao-data-service on :$PORT (OPENAIP=$([ -n "${OPENAIP_API_KEY:-}" ] && echo set || echo MISSING), DB=$([ -n "${DATABASE_URL:-}" ] && echo set || echo MISSING))"

# Only default INTERNAL_ACCESS_ENABLED on when a FlightAware secret-service URL
# is actually configured. Defaulting it to true unconditionally used to make
# /api/feature-flags report flightAwareEnabled: true with no secret service
# behind it — the Go layer degrades gracefully (no crash), but the frontend
# believes a path is available that structurally isn't. An explicit
# INTERNAL_ACCESS_ENABLED / FLIGHTAWARE_ACCESS_ENABLED in .env.local still wins.
DEFAULT_INTERNAL_ACCESS_ENABLED="false"
[ -n "${FLIGHTAWARE_SERVICE_BASE_URL:-}" ] && DEFAULT_INTERNAL_ACCESS_ENABLED="true"

cd "$SCRIPT_DIR"
PORT="$PORT" \
INTERNAL_ACCESS_ENABLED="${INTERNAL_ACCESS_ENABLED:-${FLIGHTAWARE_ACCESS_ENABLED:-$DEFAULT_INTERNAL_ACCESS_ENABLED}}" \
ADSBAO_REALTIME_AUTH_SECRET="${ADSBAO_REALTIME_AUTH_SECRET:-local-dev-secret}" \
  exec go run ./cmd/adsbao-data-service
