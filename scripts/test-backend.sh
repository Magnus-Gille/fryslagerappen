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
  local status=$?
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if [[ -n "$inference_pid" ]]; then
    kill "$inference_pid" 2>/dev/null || true
    wait "$inference_pid" 2>/dev/null || true
  fi
  if [[ "$status" -ne 0 ]]; then
    printf 'Backend contract test failed (exit %s).\n' "$status" >&2
    [[ -f "$test_root/server.log" ]] && tail -80 "$test_root/server.log" >&2
    [[ -f "$test_root/inference.log" ]] && tail -40 "$test_root/inference.log" >&2
  fi
  rm -rf -- "$test_root"
  return "$status"
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
cp "$repo_root/backend/pb_migrations/1784742000_allow_oauth2_user_creation.js" "$upgrade_migrations/"
cp "$repo_root/backend/pb_migrations/1784743000_add_contextual_feedback.js" "$upgrade_migrations/"
cp "$repo_root/scripts/backend-test-migrations/1784744000_seed_legacy_inventory_item.js" "$upgrade_migrations/"
cp "$repo_root/backend/pb_migrations/1784745000_add_inventory_workflows.js" "$upgrade_migrations/"
cp "$repo_root/scripts/backend-test-migrations/1784746000_verify_inventory_workflows.js" "$upgrade_migrations/"
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
ICEAGE_PRODUCT_LOOKUP_URL="http://127.0.0.1:$inference_port/api/v2/product" \
ICEAGE_APPLE_CLIENT_ID='ai.gille.fryslagerappen' \
ICEAGE_APPLE_CLIENT_SECRET='test-only-client-secret' \
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

auth_methods="$(curl -fsS "$base_url/api/collections/users/auth-methods")"
test "$(printf '%s' "$auth_methods" | jq -r '.oauth2.providers[] | select(.name == "apple") | .name')" = 'apple'
test "$(printf '%s' "$auth_methods" | jq -r '.oauth2.providers[] | select(.name == "apple") | .codeVerifier')" = ''

admin_auth="$(curl -fsS -X POST "$base_url/api/collections/_superusers/auth-with-password" \
  -H 'content-type: application/json' \
  --data "{\"identity\":\"test-admin@example.invalid\",\"password\":\"$test_admin_password\"}")"
admin_token="$(printf '%s' "$admin_auth" | jq -r .token)"
anonymous_feedback_status="$(curl -sS -o "$test_root/feedback-response.json" -w '%{http_code}' -X POST \
  "$base_url/api/iceage/feedback" \
  -H 'content-type: application/json' \
  --data '{"message":"Svårt att hitta här för test@example.invalid token=secret-value","kind":"confusing","route":"/","screen":"authentication","flow":"sign-in","step":"credentials","sessionId":"feedback-test-session","appVersion":"1.0.0","buildNumber":"77","platform":"ios","deviceModel":"iPhone","inventory":["must-not-be-stored"],"screenshot":"must-not-be-stored"}')"
test "$anonymous_feedback_status" = '202'
anonymous_feedback_id="$(jq -r .id "$test_root/feedback-response.json")"
anonymous_feedback="$(curl -fsS "$base_url/api/collections/user_feedback/records/$anonymous_feedback_id" \
  -H "authorization: Bearer $admin_token")"
test "$(printf '%s' "$anonymous_feedback" | jq -r .message)" = 'Svårt att hitta här för [email] token=[credential]'
test "$(printf '%s' "$anonymous_feedback" | jq -r .screen)" = 'authentication'
test "$(printf '%s' "$anonymous_feedback" | jq -r '.user // ""')" = ''
test "$(printf '%s' "$anonymous_feedback" | jq -r '.inventory // ""')" = ''
test "$(printf '%s' "$anonymous_feedback" | jq -r '.screenshot // ""')" = ''
invalid_feedback_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/feedback" \
  -H 'content-type: application/json' \
  --data '{"message":"Test","kind":"arbitrary","route":"/","screen":"inventory"}')"
test "$invalid_feedback_status" = '400'
telemetry_status="$(curl -sS -o "$test_root/telemetry-response.json" -w '%{http_code}' -X POST \
  "$base_url/api/iceage/telemetry" \
  -H 'content-type: application/json' \
  --data '{"event":"auth_apple_failed","sessionId":"backend-test-session","sequence":7,"appVersion":"1.0.0","platform":"ios","stage":"exchange","status":400,"errorMessage":"Failed for test@example.invalid Bearer secret-token","email":"must-not-be-logged@example.invalid","authorizationCode":"must-not-be-logged"}')"
if [[ "$telemetry_status" != '202' ]]; then
  cat "$test_root/telemetry-response.json" >&2
  tail -50 "$test_root/server.log" >&2
  exit 1
fi
invalid_telemetry_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/telemetry" \
  -H 'content-type: application/json' \
  --data '{"event":"arbitrary_event","sessionId":"backend-test-session"}')"
test "$invalid_telemetry_status" = '400'
telemetry_log=''
for _ in $(seq 1 50); do
  telemetry_logs="$(curl -fsS --get "$base_url/api/logs" \
    -H "authorization: Bearer $admin_token" \
    --data-urlencode 'filter=message="client.telemetry"' \
    --data-urlencode 'perPage=50')"
  telemetry_log="$(printf '%s' "$telemetry_logs" | jq -c '.items[] | select(.data.sessionId == "backend-test-session")' | head -n 1)"
  if [[ -n "$telemetry_log" ]]; then break; fi
  sleep 0.1
done
test "$(printf '%s' "$telemetry_log" | jq -r .data.event)" = 'auth_apple_failed'
test "$(printf '%s' "$telemetry_log" | jq -r .data.errorMessage)" = 'Failed for [email] [credential]'
test "$(printf '%s' "$telemetry_log" | jq -r '.data.email // ""')" = ''
test "$(printf '%s' "$telemetry_log" | jq -r '.data.authorizationCode // ""')" = ''
for sequence in $(seq 3 120); do
  telemetry_loop_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "$base_url/api/iceage/telemetry" \
    -H 'content-type: application/json' \
    --data "{\"event\":\"app_started\",\"sessionId\":\"backend-rate-session\",\"sequence\":$sequence}")"
  test "$telemetry_loop_status" = '202'
done
telemetry_quota_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/telemetry" \
  -H 'content-type: application/json' \
  --data '{"event":"app_started","sessionId":"backend-rate-session","sequence":121}')"
test "$telemetry_quota_status" = '429'

users_collection="$(curl -fsS "$base_url/api/collections/users" \
  -H "authorization: Bearer $admin_token")"
test "$(printf '%s' "$users_collection" | jq -r .createRule)" = '@request.context = "oauth2" && @request.auth.id = ""'
direct_user_create_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/collections/users/records" \
  -H 'content-type: application/json' \
  --data '{"email":"bypass@example.invalid","password":"ValidDirectPassword123!","passwordConfirm":"ValidDirectPassword123!"}')"
test "$direct_user_create_status" = '400'
spoofed_oauth_context_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/collections/users/records?context=oauth2" \
  -H 'x-context: oauth2' \
  -H 'content-type: application/json' \
  --data '{"email":"bypass@example.invalid","password":"ValidDirectPassword123!","passwordConfirm":"ValidDirectPassword123!","context":"oauth2"}')"
test "$spoofed_oauth_context_status" = '400'
direct_user_count="$(curl -fsS "$base_url/api/collections/users/records?filter=email%3D%22bypass%40example.invalid%22" \
  -H "authorization: Bearer $admin_token" | jq -r .totalItems)"
test "$direct_user_count" = '0'

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
authenticated_feedback="$(curl -fsS -X POST "$base_url/api/iceage/feedback" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data '{"message":"Flyttvyn är svår","kind":"problem","route":"/","screen":"inventory","flow":"move-item","step":"choose-destination","sessionId":"feedback-owner-session"}')"
authenticated_feedback_id="$(printf '%s' "$authenticated_feedback" | jq -r .id)"
authenticated_feedback_record="$(curl -fsS "$base_url/api/collections/user_feedback/records/$authenticated_feedback_id" \
  -H "authorization: Bearer $admin_token")"
test "$(printf '%s' "$authenticated_feedback_record" | jq -r .user)" = "$(printf '%s' "$owner" | jq -r .record.id)"
test "$(printf '%s' "$authenticated_feedback_record" | jq -r .household)" = "$household_id"
feedback_list_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  "$base_url/api/collections/user_feedback/records" \
  -H "authorization: Bearer $owner_token")"
test "$feedback_list_status" = '403'
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

for collection in households locations items inventory_events household_invitations extraction_quotas user_feedback product_mappings inventory_audits; do
  direct_create_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "$base_url/api/collections/$collection/records" \
    -H "authorization: Bearer $owner_token" \
    -H 'content-type: application/json' \
    --data '{}')"
  test "$direct_create_status" = '403'
done

for feedback_sequence in $(seq 4 10); do
  feedback_loop_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "$base_url/api/iceage/feedback" \
    -H 'content-type: application/json' \
    --data "{\"message\":\"Rate test $feedback_sequence\",\"kind\":\"other\",\"route\":\"/\",\"screen\":\"inventory\",\"sessionId\":\"feedback-rate-session\"}")"
  test "$feedback_loop_status" = '202'
done
feedback_quota_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/feedback" \
  -H 'content-type: application/json' \
  --data '{"message":"One too many","kind":"other","route":"/","screen":"inventory","sessionId":"feedback-rate-session"}')"
test "$feedback_quota_status" = '429'
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

barcode_lookup="$(curl -fsS "$base_url/api/iceage/barcodes/07350001234567" \
  -H "authorization: Bearer $owner_token")"
test "$(printf '%s' "$barcode_lookup" | jq -r .source)" = 'open_food_facts'
test "$(printf '%s' "$barcode_lookup" | jq -r .product.name)" = 'Krossade tomater'
barcode_item_payload="$(jq -cn --arg location "$location_id" \
  '{name:"Krossade tomater",category:"Konserver",quantity:3,unit:"burkar",locationId:$location,dateSource:"label",bestBefore:"2028-02-01",barcode:"07350001234567",changeSource:"barcode"}')"
barcode_item="$(curl -fsS -X POST "$base_url/api/iceage/items" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "$barcode_item_payload" | jq -c .item)"
barcode_item_id="$(printf '%s' "$barcode_item" | jq -r .id)"
test "$(printf '%s' "$barcode_item" | jq -r .bestBefore)" = '2028-02-01'
cached_barcode_lookup="$(curl -fsS "$base_url/api/iceage/barcodes/07350001234567" \
  -H "authorization: Bearer $member_token")"
test "$(printf '%s' "$cached_barcode_lookup" | jq -r .source)" = 'home'

audit_payload="$(jq -cn --arg item "$barcode_item_id" \
  '{rows:[{itemId:$item,expectedVersion:1,observedQuantity:1,note:"Två burkar saknades"}],extras:[{name:"Havregryn",category:"Torrvaror",quantity:2,unit:"paket",note:"Hittades bakom tomaterna"}]}')"
audit_result="$(curl -fsS -X POST "$base_url/api/iceage/locations/$location_id/audits" \
  -H "authorization: Bearer $member_token" \
  -H 'content-type: application/json' \
  --data "$audit_payload")"
test "$(printf '%s' "$audit_result" | jq -r .audit.changeCount)" = '2'
test "$(curl -fsS "$base_url/api/collections/items/records/$barcode_item_id" \
  -H "authorization: Bearer $owner_token" | jq -r .quantity)" = '1'
rich_event="$(curl -fsS --get "$base_url/api/collections/inventory_events/records" \
  -H "authorization: Bearer $owner_token" \
  --data-urlencode "filter=item='$barcode_item_id' && source='audit'" \
  --data-urlencode 'sort=-created' | jq -c '.items[0]')"
test "$(printf '%s' "$rich_event" | jq -r .quantityDelta)" = '-2'
test "$(printf '%s' "$rich_event" | jq -r .quantityBefore)" = '3'
test "$(printf '%s' "$rich_event" | jq -r .quantityAfter)" = '1'
test "$(printf '%s' "$rich_event" | jq -r .comment)" = 'Två burkar saknades'

items_before_conflict="$(curl -fsS "$base_url/api/collections/items/records" \
  -H "authorization: Bearer $owner_token" | jq -r .totalItems)"
conflicting_audit_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/locations/$location_id/audits" \
  -H "authorization: Bearer $owner_token" \
  -H 'content-type: application/json' \
  --data "{\"rows\":[{\"itemId\":\"$barcode_item_id\",\"expectedVersion\":1,\"observedQuantity\":0}],\"extras\":[{\"name\":\"Får inte sparas\",\"category\":\"Torrvaror\",\"quantity\":1,\"unit\":\"st\"}]}")"
test "$conflicting_audit_status" = '409'
items_after_conflict="$(curl -fsS "$base_url/api/collections/items/records" \
  -H "authorization: Bearer $owner_token" | jq -r .totalItems)"
test "$items_after_conflict" = "$items_before_conflict"

outsider_audit_status="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$base_url/api/iceage/locations/$location_id/audits" \
  -H "authorization: Bearer $outsider_token" \
  -H 'content-type: application/json' \
  --data '{"rows":[],"extras":[] }')"
test "$outsider_audit_status" = '403'

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
voice_response="$(curl -fsS -X POST "$base_url/api/iceage/extract" \
  -H "authorization: Bearer $owner_token" \
  -F "homeId=$household_id" \
  -F "audio=@$test_root/voice.aiff;type=audio/aiff")"
test "$(printf '%s' "$voice_response" | jq -r .intent.transcript)" = 'Jag tar ut en testpåse.'
test "$(printf '%s' "$voice_response" | jq -r '.timing.transcriptionMs >= 0')" = 'true'
test "$(printf '%s' "$voice_response" | jq -r '.timing.inferenceMs >= 0')" = 'true'
test "$(printf '%s' "$voice_response" | jq -r '.timing.totalMs >= (.timing.transcriptionMs + .timing.inferenceMs)')" = 'true'
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
test "$event_count" -ge '5'
printf 'backend=ok telemetry=sanitized feedback=private feedbackQuota=429 homeModel=5 configurableLocations=ok members=ok legacyUpgrade=ok itemVersion=2 conflict=409 memberItems=1 memberInvite=403 outsiderItems=0 directWrites=403 barcode=home-cache audit=atomic richEvents=ok photoVoiceExtraction=ok quota=429 userWrites=403\n'
