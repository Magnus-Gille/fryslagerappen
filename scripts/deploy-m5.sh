#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(tr -d '[:space:]' < "$repo_root/backend/VERSION")"
release_id="$(date -u +%Y%m%d%H%M%S)"
remote_release=".local/opt/iceage/releases/$release_id"
archive="/tmp/iceage-backend-$release_id.tar.gz"
trap 'rm -f "$archive"' EXIT

COPYFILE_DISABLE=1 tar --no-xattrs -C "$repo_root/backend" -czf "$archive" pb_hooks pb_migrations VERSION
ssh m5 "mkdir -p '$remote_release' .local/share/iceage/pb_data .config/iceage .config/systemd/user"
scp "$archive" "m5:$remote_release/backend.tar.gz"
scp "$repo_root/backend/systemd/iceage-pocketbase.service" "m5:.config/systemd/user/iceage-pocketbase.service"

ssh m5 "set -euo pipefail
cd '$remote_release'
tar -xzf backend.tar.gz
curl -fsSLO 'https://github.com/pocketbase/pocketbase/releases/download/v$version/pocketbase_${version}_linux_amd64.zip'
curl -fsSLo checksums.txt 'https://github.com/pocketbase/pocketbase/releases/download/v$version/checksums.txt'
expected=\$(awk '/pocketbase_${version}_linux_amd64.zip/{print \$1}' checksums.txt)
actual=\$(sha256sum 'pocketbase_${version}_linux_amd64.zip' | awk '{print \$1}')
test -n \"\$expected\"
test \"\$expected\" = \"\$actual\"
busybox unzip -q 'pocketbase_${version}_linux_amd64.zip' pocketbase
chmod 0755 pocketbase
rm -f backend.tar.gz 'pocketbase_${version}_linux_amd64.zip' checksums.txt

if [[ ! -f \"\$HOME/.config/iceage/backend.env\" ]]; then
  umask 077
  encryption_key=\$(openssl rand -hex 16)
  admin_password=\$(openssl rand -base64 36 | tr -d '\\n')
  tailnet_ip=\$(tailscale ip -4 | head -n 1)
  test -n "\$tailnet_ip"
  printf 'ICEAGE_PB_ENCRYPTION_KEY=%s\\nICEAGE_ADMIN_EMAIL=%s\\nICEAGE_ADMIN_PASSWORD=%s\\nICEAGE_WHISPER_URL=%s\\nICEAGE_LLM_BASE_URL=%s\\nICEAGE_EXTRACTION_MODEL=%s\\n' \
    \"\$encryption_key\" 'admin@iceage.local' \"\$admin_password\" \
    "http://\$tailnet_ip:8092/inference" 'http://127.0.0.1:8091/v1' 'gemma4' \
    > \"\$HOME/.config/iceage/backend.env\"
fi

set -a
source \"\$HOME/.config/iceage/backend.env\"
set +a
./pocketbase migrate up \
  --dir \"\$HOME/.local/share/iceage/pb_data\" \
  --migrationsDir \"\$PWD/pb_migrations\" \
  --hooksDir \"\$PWD/pb_hooks\" \
  --automigrate=false \
  --encryptionEnv ICEAGE_PB_ENCRYPTION_KEY
./pocketbase superuser upsert \"\$ICEAGE_ADMIN_EMAIL\" \"\$ICEAGE_ADMIN_PASSWORD\" \
  --dir \"\$HOME/.local/share/iceage/pb_data\" \
  --encryptionEnv ICEAGE_PB_ENCRYPTION_KEY >/dev/null
ln -sfn \"releases/$release_id\" \"\$HOME/.local/opt/iceage/current\"
systemctl --user daemon-reload
systemctl --user enable --now iceage-pocketbase.service
systemctl --user restart iceage-pocketbase.service
healthy=0
for _ in \$(seq 1 20); do
  if curl -fsS http://127.0.0.1:8090/api/iceage/health >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 0.25
done
test "\$healthy" = 1
systemctl --user is-active --quiet iceage-pocketbase.service
if ! timeout 5 sudo -n tailscale serve --bg --https=443 http://127.0.0.1:8090; then
  printf 'Backend is active on M5 loopback, but Tailscale Serve still needs its one-time approval.\n' >&2
  exit 20
fi
"

printf 'Deployed Iceage backend %s to the M5 tailnet HTTPS endpoint.\n' "$release_id"
