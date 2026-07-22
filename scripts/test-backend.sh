#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pocketbase_bin="${POCKETBASE_BIN:-}"
test_port="${ICEAGE_TEST_PORT:-18091}"

if [[ -z "$pocketbase_bin" || ! -x "$pocketbase_bin" ]]; then
  printf 'Set POCKETBASE_BIN to an executable PocketBase binary.\n' >&2
  exit 2
fi
command -v curl >/dev/null
command -v jq >/dev/null

test_root="$(mktemp -d "${TMPDIR:-/tmp}/iceage-backend-test.XXXXXX")"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "$test_root"
}
trap cleanup EXIT

"$pocketbase_bin" migrate up \
  --dir "$test_root/data" \
  --migrationsDir "$repo_root/backend/pb_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >/dev/null

"$pocketbase_bin" serve \
  --http="127.0.0.1:$test_port" \
  --dir "$test_root/data" \
  --migrationsDir "$repo_root/backend/pb_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >"$test_root/server.log" 2>&1 &
server_pid=$!
base_url="http://127.0.0.1:$test_port"

for _ in $(seq 1 50); do
  if curl -fsS "$base_url/api/iceage/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
if ! curl -fsS "$base_url/api/iceage/health" >/dev/null; then
  tail -50 "$test_root/server.log" >&2
  exit 1
fi

password='CorrectHorseBatteryStaple!42'
signup() {
  local email="$1"
  curl -fsS -X POST "$base_url/api/iceage/signup" \
    -H 'content-type: application/json' \
    --data "{\"email\":\"$email\",\"password\":\"$password\"}"
}

owner="$(signup 'owner@example.invalid')"
owner_token="$(printf '%s' "$owner" | jq -r .token)"
household="$(curl -fsS -X POST "$base_url/api/iceage/households" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Testhushåll","displayName":"Owner"}')"
household_id="$(printf '%s' "$household" | jq -r .householdId)"
owner_token="$(curl -fsS -X POST "$base_url/api/collections/users/auth-refresh" \
  -H "authorization: Bearer $owner_token" | jq -r .token)"
location_id="$(curl -fsS "$base_url/api/collections/locations/records?sort=position" \
  -H "authorization: Bearer $owner_token" | jq -r .items[0].id)"

item_payload="$(jq -cn --arg location "$location_id" \
  '{name:"Testpåse",category:"Lagad mat",quantity:2,unit:"påsar",locationId:$location,dateSource:"none"}')"
item="$(curl -fsS -X POST "$base_url/api/iceage/items" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "$item_payload" | jq -c .item)"
item_id="$(printf '%s' "$item" | jq -r .id)"

mutated="$(curl -fsS -X POST "$base_url/api/iceage/items/$item_id/mutate" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"action":"remove","quantity":1,"expectedVersion":1}')"
test "$(printf '%s' "$mutated" | jq -r .item.version)" = '2'
conflict_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/items/$item_id/mutate" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"action":"remove","quantity":1,"expectedVersion":1}')"
test "$conflict_status" = '409'

member="$(signup 'member@example.invalid')"
member_token="$(printf '%s' "$member" | jq -r .token)"
invite="$(curl -fsS -X POST "$base_url/api/iceage/households/$household_id/invites" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{}' | jq -r .token)"
curl -fsS -X POST "$base_url/api/iceage/invites/accept" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data "{\"token\":\"$invite\",\"displayName\":\"Member\"}" >/dev/null
member_token="$(curl -fsS -X POST "$base_url/api/collections/users/auth-refresh" \
  -H "authorization: Bearer $member_token" | jq -r .token)"
member_items="$(curl -fsS "$base_url/api/collections/items/records" \
  -H "authorization: Bearer $member_token" | jq -r .totalItems)"
test "$member_items" = '1'
member_invite_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/households/$household_id/invites" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data '{}')"
test "$member_invite_status" = '403'

outsider="$(signup 'outsider@example.invalid')"
outsider_token="$(printf '%s' "$outsider" | jq -r .token)"
outsider_items="$(curl -fsS "$base_url/api/collections/items/records" \
  -H "authorization: Bearer $outsider_token" | jq -r .totalItems)"
test "$outsider_items" = '0'
owner_id="$(printf '%s' "$owner" | jq -r .record.id)"
update_status="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
  "$base_url/api/collections/users/records/$owner_id" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"householdRole":"member"}')"
test "$update_status" = '403'
delete_status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
  "$base_url/api/collections/users/records/$owner_id" \
  -H "authorization: Bearer $owner_token")"
test "$delete_status" = '403'

event_count="$(curl -fsS "$base_url/api/collections/inventory_events/records" \
  -H "authorization: Bearer $owner_token" | jq -r .totalItems)"
test "$event_count" = '2'
printf 'backend=ok itemVersion=2 conflict=409 memberItems=1 memberInvite=403 outsiderItems=0 userWrites=403 events=2\n'
