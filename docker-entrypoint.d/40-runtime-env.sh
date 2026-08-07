#!/bin/sh
set -eu

escape_js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

clerk_key="$(escape_js_string "${VITE_CLERK_PUBLISHABLE_KEY:-}")"

printf '%s\n' \
  'window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, {' \
  "  VITE_CLERK_PUBLISHABLE_KEY: \"${clerk_key}\"," \
  '});' \
  > /usr/share/nginx/html/runtime-env.js
