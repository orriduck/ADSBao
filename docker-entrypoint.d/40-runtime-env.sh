#!/bin/sh
set -eu

json_escape() {
  # Runtime settings are emitted into JavaScript, so quote defensively even
  # though the current New Relic values are identifier-like public values.
  printf '%s' "$1" | tr '\r\n' '  ' | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g'
}

printf '%s\n' \
  'window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, {' \
  "  \"VITE_NEW_RELIC_ACCOUNT_ID\": \"$(json_escape "${VITE_NEW_RELIC_ACCOUNT_ID:-}")\"," \
  "  \"VITE_NEW_RELIC_BROWSER_APP_ID\": \"$(json_escape "${VITE_NEW_RELIC_BROWSER_APP_ID:-}")\"," \
  "  \"VITE_NEW_RELIC_BROWSER_LICENSE_KEY\": \"$(json_escape "${VITE_NEW_RELIC_BROWSER_LICENSE_KEY:-}")\"" \
  '});' \
  > /usr/share/nginx/html/runtime-env.js
