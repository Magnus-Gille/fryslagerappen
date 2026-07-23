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
feedback="$(printf 'header = "authorization: Bearer %s"\n' "$token" | \
  curl -fsS -K - --get http://127.0.0.1:8090/api/collections/user_feedback/records \
  --data-urlencode 'expand=user' \
  --data-urlencode "perPage=$limit" \
  --data-urlencode 'sort=-created')"

printf '%s' "$feedback" | jq -r '
  ["TIME", "KIND", "CONTEXT", "MESSAGE", "USER", "APP", "BUILD", "DEVICE", "SESSION"],
  (.items[] | [
    .created,
    .kind,
    ([.screen, .flow, .step] | map(select(. != "")) | join(" / ")),
    (.message | gsub("[\\r\\n\\t]+"; " ")),
    (if (.expand.user.displayName // "") == "" then "anonymous" else .expand.user.displayName end),
    (if .appVersion == "" then "-" else .appVersion end),
    (if .buildNumber == "" then "-" else .buildNumber end),
    (if .deviceModel == "" then "-" else .deviceModel end),
    (if .sessionId == "" then "-" else .sessionId end)
  ]) | @tsv
'
REMOTE
