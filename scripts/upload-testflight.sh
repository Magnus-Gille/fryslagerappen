#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_dir="$repo_root/app"
team_id="${ICEAGE_APPLE_TEAM_ID:-7C6WF6GFZ4}"
build_number="${EXPO_IOS_BUILD_NUMBER:-$(date -u +%y%m%d%H%M%S)}"
archive_path="${TMPDIR:-/tmp}/Fryslagerappen-${build_number}.xcarchive"
export_path="${TMPDIR:-/tmp}/Fryslagerappen-${build_number}-upload"
export_options="$(mktemp "${TMPDIR:-/tmp}/fryslagerappen-export.XXXXXX.plist")"

cleanup() {
  rm -f "$export_options"
}
trap cleanup EXIT

if [[ -n "${EXPO_PUBLIC_ICEAGE_API_URL:-}" ]] &&
  [[ ! "$EXPO_PUBLIC_ICEAGE_API_URL" =~ ^https://[^[:space:]]+$ ]]; then
  echo "EXPO_PUBLIC_ICEAGE_API_URL must be a private HTTPS URL." >&2
  exit 1
fi

if [[ -z "${EXPO_PUBLIC_ICEAGE_API_URL:-}" ]] &&
  ! grep -Eq '^EXPO_PUBLIC_ICEAGE_API_URL=https://[^[:space:]]+$' "$app_dir/.env.local" 2>/dev/null; then
  echo "Missing the private HTTPS backend URL in EXPO_PUBLIC_ICEAGE_API_URL or app/.env.local." >&2
  exit 1
fi

cat >"$export_options" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>destination</key>
  <string>upload</string>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
  <key>method</key>
  <string>app-store-connect</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>teamID</key>
  <string>${team_id}</string>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
PLIST

echo "Preparing TestFlight build ${build_number}..."
(
  cd "$app_dir"
  EXPO_IOS_BUILD_NUMBER="$build_number" npx expo prebuild --platform ios

  if [[ ! -d ios/Fryslagerappen.xcworkspace ]]; then
    echo "Expo prebuild did not create the expected Xcode workspace." >&2
    exit 1
  fi

  xcodebuild \
    -workspace ios/Fryslagerappen.xcworkspace \
    -scheme Fryslagerappen \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$archive_path" \
    -allowProvisioningUpdates \
    DEVELOPMENT_TEAM="$team_id" \
    CODE_SIGN_STYLE=Automatic \
    clean archive

  xcodebuild \
    -exportArchive \
    -archivePath "$archive_path" \
    -exportPath "$export_path" \
    -exportOptionsPlist "$export_options" \
    -allowProvisioningUpdates
)

echo "Uploaded build ${build_number} to App Store Connect."
echo "Processing can take several minutes before the build appears in TestFlight."
