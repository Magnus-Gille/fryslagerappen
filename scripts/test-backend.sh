#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pocketbase_bin="${POCKETBASE_BIN:-}"
test_port="${ICEAGE_TEST_PORT:-18091}"
inference_port="${ICEAGE_TEST_INFERENCE_PORT:-18092}"

if [[ -z "$pocketbase_bin" || ! -x "$pocketbase_bin" ]]; then
  printf 'Set POCKETBASE_BIN to an executable PocketBase binary.\n' >&2
  exit 2
fi
command -v curl >/dev/null
command -v jq >/dev/null
command -v node >/dev/null
command -v openssl >/dev/null

test_root="$(mktemp -d "${TMPDIR:-/tmp}/iceage-backend-test.XXXXXX")"
server_pid=""
inference_pid=""
cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [[ -n "$inference_pid" ]]; then
    kill "$inference_pid" 2>/dev/null || true
    wait "$inference_pid" 2>/dev/null || true
  fi
  rm -rf -- "$test_root"
}
trap cleanup EXIT

upgrade_migrations="$test_root/upgrade-migrations"
mkdir -p "$upgrade_migrations"
cp "$repo_root/backend/pb_migrations/1784728800_initial_iceage.js" "$upgrade_migrations/"
cp "$repo_root/backend/pb_migrations/1784731200_disable_direct_user_deletion.js" "$upgrade_migrations/"
cp "$repo_root/backend/pb_migrations/1784733000_disable_direct_user_updates.js" "$upgrade_migrations/"
cp "$repo_root/scripts/backend-test-migrations/1784735000_seed_legacy_household.js" "$upgrade_migrations/"
"$pocketbase_bin" migrate up \
  --dir "$test_root/upgrade-data" \
  --migrationsDir "$upgrade_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >/dev/null
cp "$repo_root/backend/pb_migrations/1784736000_add_household_storage_locations.js" "$upgrade_migrations/"
cp "$repo_root/scripts/backend-test-migrations/1784737000_verify_storage_upgrade.js" "$upgrade_migrations/"
"$pocketbase_bin" migrate up \
  --dir "$test_root/upgrade-data" \
  --migrationsDir "$upgrade_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >/dev/null
cp "$repo_root/backend/pb_migrations/1784740000_model_homes_and_storage_types.js" "$upgrade_migrations/"
cp "$repo_root/scripts/backend-test-migrations/1784741000_verify_home_model.js" "$upgrade_migrations/"
"$pocketbase_bin" migrate up \
  --dir "$test_root/upgrade-data" \
  --migrationsDir "$upgrade_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >/dev/null

ICEAGE_FAKE_INFERENCE_PORT="$inference_port" \
  node "$repo_root/scripts/fake-inference-server.mjs" >"$test_root/inference.log" 2>&1 &
inference_pid=$!
for _ in $(seq 1 50); do
  if curl -fsS "http://127.0.0.1:$inference_port/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done
if ! curl -fsS "http://127.0.0.1:$inference_port/health" >/dev/null; then
  tail -50 "$test_root/inference.log" >&2
  exit 1
fi

"$pocketbase_bin" migrate up \
  --dir "$test_root/data" \
  --migrationsDir "$repo_root/backend/pb_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false >/dev/null

# PocketBase opens a first-admin installer in the browser when a fresh database
# has no superuser. Seed a disposable one so automated checks stay headless.
test_admin_password="$(openssl rand -base64 24 | tr -d '\n')Aa1!"
"$pocketbase_bin" superuser upsert \
  --dir "$test_root/data" \
  --migrationsDir "$repo_root/backend/pb_migrations" \
  --hooksDir "$repo_root/backend/pb_hooks" \
  --automigrate=false \
  'test-admin@example.invalid' "$test_admin_password" >/dev/null

ICEAGE_WHISPER_URL="http://127.0.0.1:$inference_port/inference" \
ICEAGE_LLM_BASE_URL="http://127.0.0.1:$inference_port/v1" \
ICEAGE_EXTRACTION_MODEL='fake-inference' \
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

password="$(openssl rand -base64 24 | tr -d '\n')Aa1!"
signup() {
  local email="$1"
  curl -fsS -X POST "$base_url/api/iceage/signup" \
    -H 'content-type: application/json' \
    --data "{\"email\":\"$email\",\"password\":\"$password\"}"
}

owner="$(signup 'owner@example.invalid')"
owner_token="$(printf '%s' "$owner" | jq -r .token)"
household="$(curl -fsS -X POST "$base_url/api/iceage/homes" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Testhushåll","displayName":"Owner"}')"
household_id="$(printf '%s' "$household" | jq -r .homeId)"
owner_token="$(curl -fsS -X POST "$base_url/api/collections/users/auth-refresh" \
  -H "authorization: Bearer $owner_token" | jq -r .token)"
locations="$(curl -fsS "$base_url/api/collections/locations/records?sort=position" \
  -H "authorization: Bearer $owner_token")"
test "$(printf '%s' "$locations" | jq -r .totalItems)" = '5'
test "$(printf '%s' "$locations" | jq -c '[.items[] | {name,storageType}]')" = '[{"name":"Frysen på övervåningen","storageType":"freezer"},{"name":"Frysen i källaren","storageType":"freezer"},{"name":"Hyllan på övervåningen","storageType":"dry"},{"name":"Hyllan i ateljén","storageType":"dry"},{"name":"Kylskåpet på övervåningen","storageType":"fridge"}]'
location_id="$(printf '%s' "$locations" | jq -r .items[0].id)"

renamed_home="$(curl -fsS -X PATCH "$base_url/api/iceage/homes/$household_id" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Vårt hem"}')"
test "$(printf '%s' "$renamed_home" | jq -r .home.name)" = 'Vårt hem'

configured_location="$(curl -fsS -X POST "$base_url/api/iceage/homes/$household_id/locations" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Extrakylen i garaget","description":"Dryck","storageType":"fridge"}' | jq -c .location)"
configured_location_id="$(printf '%s' "$configured_location" | jq -r .id)"
test "$(printf '%s' "$configured_location" | jq -r .storageType)" = 'fridge'
updated_location="$(curl -fsS -X PATCH "$base_url/api/iceage/homes/$household_id/locations/$configured_location_id" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Dryckeskylen","description":"Garage","storageType":"fridge"}')"
test "$(printf '%s' "$updated_location" | jq -r .location.name)" = 'Dryckeskylen'
test "$(curl -fsS -X DELETE "$base_url/api/iceage/homes/$household_id/locations/$configured_location_id" \
  -H "authorization: Bearer $owner_token" | jq -r .archived)" = 'true'

item_payload="$(jq -cn --arg location "$location_id" \
  '{name:"Testpåse",category:"Lagad mat",quantity:2,unit:"påsar",locationId:$location,dateSource:"none"}')"
item="$(curl -fsS -X POST "$base_url/api/iceage/items" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "$item_payload" | jq -c .item)"
item_id="$(printf '%s' "$item" | jq -r .id)"
occupied_archive_status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
  "$base_url/api/iceage/homes/$household_id/locations/$location_id" \
  -H "authorization: Bearer $owner_token")"
test "$occupied_archive_status" = '400'

for collection in households locations items inventory_events household_invitations extraction_quotas; do
  direct_create_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "$base_url/api/collections/$collection/records" \
    -H "authorization: Bearer $owner_token" \
    -H 'content-type: application/json' \
    --data '{}')"
  test "$direct_create_status" = '403'
done
for target in "households/records/$household_id" "locations/records/$location_id" "items/records/$item_id"; do
  direct_update_status="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
    "$base_url/api/collections/$target" \
    -H "authorization: Bearer $owner_token" \
    -H 'content-type: application/json' \
    --data '{"name":"Bypass"}')"
  test "$direct_update_status" = '403'
  direct_delete_status="$(curl -sS -o /dev/null -w '%{http_code}' -X DELETE \
    "$base_url/api/collections/$target" \
    -H "authorization: Bearer $owner_token")"
  test "$direct_delete_status" = '403'
done

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
invite="$(curl -fsS -X POST "$base_url/api/iceage/homes/$household_id/invites" \
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
member_id="$(printf '%s' "$member" | jq -r .record.id)"
members="$(curl -fsS "$base_url/api/iceage/homes/$household_id/members" \
  -H "authorization: Bearer $member_token")"
test "$(printf '%s' "$members" | jq -r '.members | length')" = '2'
test "$(printf '%s' "$members" | jq -c '[.members[].role] | sort')" = '["member","owner"]'
member_invite_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/homes/$household_id/invites" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data '{}')"
test "$member_invite_status" = '403'
member_location_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/homes/$household_id/locations" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Otillåten plats","storageType":"dry"}')"
test "$member_location_status" = '403'
member_rename_status="$(curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
  "$base_url/api/iceage/homes/$household_id" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data '{"name":"Kapad"}')"
test "$member_rename_status" = '403'

outsider="$(signup 'outsider@example.invalid')"
outsider_token="$(printf '%s' "$outsider" | jq -r .token)"
outsider_items="$(curl -fsS "$base_url/api/collections/items/records" \
  -H "authorization: Bearer $outsider_token" | jq -r .totalItems)"
test "$outsider_items" = '0'

empty_extract_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/extract" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "{\"homeId\":\"$household_id\"}")"
test "$empty_extract_status" = '400'
wrong_household_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/extract" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"homeId":"different-home","photoBase64":"aGVq","photoMimeType":"image/png"}')"
test "$wrong_household_status" = '403'
photo_payload="$(jq -cn --arg home "$household_id" \
  '{homeId:$home,photoBase64:"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",photoMimeType:"image/png"}')"
printf 'synthetic audio bytes' >"$test_root/voice.aiff"
voice_transcript="$(curl -fsS -X POST "$base_url/api/iceage/extract" \
  -H "authorization: Bearer $owner_token" \
  -F "homeId=$household_id" \
  -F "audio=@$test_root/voice.aiff;type=audio/aiff" | jq -r .intent.transcript)"
test "$voice_transcript" = 'Jag tar ut en testpåse.'
for _ in $(seq 1 59); do
  extracted_name="$(curl -fsS -X POST "$base_url/api/iceage/extract" \
    -H "authorization: Bearer $owner_token" \
    -H 'content-type: application/json' \
    --data "$photo_payload" | jq -r .intent.name)"
  test "$extracted_name" = 'Testvara från foto'
done
quota_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/extract" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "$photo_payload")"
test "$quota_status" = '429'

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

test "$(curl -fsS -X DELETE "$base_url/api/iceage/homes/$household_id/members/$member_id" \
  -H "authorization: Bearer $owner_token" | jq -r .removed)" = 'true'
removed_member_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  "$base_url/api/iceage/homes/$household_id/members" \
  -H "authorization: Bearer $member_token")"
test "$removed_member_status" = '403'
remaining_members="$(curl -fsS "$base_url/api/iceage/homes/$household_id/members" \
  -H "authorization: Bearer $owner_token" | jq -r '.members | length')"
test "$remaining_members" = '1'

event_count="$(curl -fsS "$base_url/api/collections/inventory_events/records" \
  -H "authorization: Bearer $owner_token" | jq -r .totalItems)"
test "$event_count" = '2'
printf 'backend=ok homeModel=5 configurableLocations=ok members=ok legacyUpgrade=ok itemVersion=2 conflict=409 memberItems=1 memberInvite=403 outsiderItems=0 directWrites=403 photoVoiceExtraction=ok quota=429 userWrites=403 events=2\n'
