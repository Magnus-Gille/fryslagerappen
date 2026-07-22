#!/usr/bin/env bash
set -euo pipefail

limit="${1:-30}"
if [[ ! "$limit" =~ ^[0-9]+$ ]] || (( limit < 1 || limit > 200 )); then
  printf 'Usage: %s [1-200]\n' "$0" >&2
  exit 2
fi

ssh m5 bash -s -- "$limit" <<'REMOTE'
set -euo pipefail
limit="$1"
set -a
source "$HOME/.config/iceage/backend.env"
set +a

auth="$(jq -cn --arg identity "$ICEAGE_ADMIN_EMAIL" --arg password "$ICEAGE_ADMIN_PASSWORD" \
    '{identity:$identity,password:$password}' | \
  curl -fsS -X POST http://127.0.0.1:8090/api/collections/_superusers/auth-with-password \
  -H 'content-type: application/json' \
  --data-binary @-)"
token="$(printf '%s' "$auth" | jq -r .token)"
logs="$(printf 'header = "authorization: Bearer %s"\n' "$token" | \
  curl -fsS -K - --get http://127.0.0.1:8090/api/logs \
  --data-urlencode 'filter=message="client.telemetry"' \
  --data-urlencode "perPage=$limit" \
  --data-urlencode 'sort=-created')"

printf '%s' "$logs" | jq -r '
  ["TIME", "EVENT", "STAGE", "STATUS", "ERROR", "SESSION"],
  (.items[] | [
    .created,
    .data.event,
    (if (.data.stage // "") == "" then "-" else .data.stage end),
    (if (.data.status // 0) == 0 then "-" else (.data.status | tostring) end),
    (if (.data.errorMessage // "") == "" then "-" else .data.errorMessage end),
    .data.sessionId
  ]) | @tsv
'
REMOTE
