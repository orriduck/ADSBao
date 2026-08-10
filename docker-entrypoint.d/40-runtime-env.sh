#!/bin/sh
set -eu

printf '%s\n' \
  'window.__ADSBAO_ENV__ = Object.assign({}, window.__ADSBAO_ENV__, {' \
  '});' \
  > /usr/share/nginx/html/runtime-env.js
