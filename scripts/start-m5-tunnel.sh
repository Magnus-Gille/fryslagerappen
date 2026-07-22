#!/usr/bin/env bash
set -euo pipefail

local_port="${ICEAGE_TUNNEL_PORT:-18090}"
remote_host="${ICEAGE_M5_HOST:-m5}"

if [[ ! "$local_port" =~ ^[0-9]+$ ]] || (( local_port < 1024 || local_port > 65535 )); then
  printf 'ICEAGE_TUNNEL_PORT must be a number between 1024 and 65535.\n' >&2
  exit 2
fi

health_url="http://127.0.0.1:${local_port}/api/iceage/health"
if curl -fsS --max-time 1 "$health_url" >/dev/null 2>&1; then
  printf 'Iceage M5 tunnel is already healthy at http://127.0.0.1:%s\n' "$local_port"
  exit 0
fi

printf 'Opening Iceage M5 tunnel at http://127.0.0.1:%s (Ctrl-C to stop).\n' "$local_port"
printf 'This forwards only the app API; it does not open the PocketBase admin page.\n'
exec ssh -N \
  -o ExitOnForwardFailure=yes \
  -L "127.0.0.1:${local_port}:127.0.0.1:8090" \
  "$remote_host"
