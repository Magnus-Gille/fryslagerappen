# M5 backend

Fryslagerappen uses a self-hosted PocketBase instance on the M5 for email and
password authentication, Home membership and authorization, inventory storage, and
realtime updates. PocketBase is an open-source binary; app users do not need a
PocketBase account.

Photo and voice captures are transient. The custom extraction route forwards
audio to the M5's existing `whisper-server` and structured multimodal requests
to `llama-swap`. Neither raw media nor transcripts are stored in PocketBase.
The inference URLs are configurable so the Orin Nano can later replace either
worker without changing the app.

## Layout

- `pb_migrations/`: versioned schema and collection authorization rules
- `pb_hooks/`: authenticated Home, member, storage-place, inventory, invitation, and extraction
  routes
- `systemd/`: hardened user service for the M5
- `VERSION`: pinned PocketBase release used by validation and deployment

The service listens only on `127.0.0.1:8090`. Tailscale Serve terminates HTTPS
and makes it available only inside Magnus's tailnet. Tailscale Funnel must not
be enabled for this service.

The public API uses `Home` terminology. PocketBase collection and relation
names retain the original `household` wording as an internal compatibility
detail so existing installations can migrate without rewriting identifiers.

## Validate locally

Download the pinned PocketBase binary from its official GitHub release, verify
it against the release checksum, and run:

```bash
./pocketbase migrate up \
  --dir /tmp/iceage-pb-data \
  --migrationsDir "$PWD/backend/pb_migrations" \
  --hooksDir "$PWD/backend/pb_hooks" \
  --automigrate=false
```

Use `scripts/deploy-m5.sh` from the repository root for a versioned M5 deploy.
It creates local-only backend secrets on first deploy and never copies them
back to the laptop or repository.

## Sign in with Apple

Native iOS login uses Apple's system authorization sheet. The M5 exchanges the
one-time authorization code and PocketBase validates Apple's signed identity
token before creating or linking the user. Enable the App ID's Sign in with
Apple capability, then add these values to `~/.config/iceage/backend.env` on the
M5:

```dotenv
ICEAGE_APPLE_CLIENT_ID=ai.gille.fryslagerappen
ICEAGE_APPLE_CLIENT_SECRET=<signed Apple client-secret JWT>
```

The secret is generated from a Sign in with Apple key and expires after at most
six months. Renew it in the M5 environment and restart `iceage-pocketbase` before
it expires. Never commit the key or generated secret.
