# Project status

## Phase

Authenticated shared household-inventory prototype with private M5 inference
and storage for freezer and dry goods.
The repository is public under MIT; app data and backend credentials remain on
the private tailnet infrastructure.

## Current system

- The Expo iPhone/web client supports email/password login, household creation,
  owner-only one-time invitations, realtime inventory, optimistic conflict
  detection, history, and explicit confirmation before capture-derived changes.
- New households receive four ordered storage locations: the freezer upstairs,
  freezer in the basement, shelf upstairs, and shelf in the studio. Existing
  households are upgraded without deleting or orphaning inventory.
- Manual and inferred entries support dry-goods categories, and all visible app
  copy and filters use storage-neutral language.
- Photo-only, voice-only, and photo-plus-voice capture are handled by an
  authenticated PocketBase route. Raw media and transcripts are transient and
  are not stored.
- PocketBase 0.39.8 runs as a hardened user service on M5, bound only to
  loopback. It uses the existing M5 Whisper and llama-swap workers; their URLs
  remain configurable so Orin Nano can take over either workload later.
- The public GitHub Pages app is intentionally built without a private backend
  URL and remains a local demo. Authenticated mode is enabled only in private
  native builds on devices connected to the tailnet.

## Verified

- Fresh PocketBase migrations and the automated signup → four locations → item
  → mutation → invitation → cross-household authorization → photo/voice
  extraction → quota integration test pass.
- A synthetic freezer-label image was extracted on M5 as two bags of salmon
  fillet with the printed freeze date; a synthetic Swedish voice clip was
  transcribed and interpreted as removing one bag from the upstairs freezer.
- A two-account SSE test delivered a new item to the second household member in
  under five seconds, while an outsider saw zero items and a member could not
  issue invitations.
- All synthetic accounts, households, items, events, invitations, and quotas
  were removed after the remote tests.
- Expo Doctor 20/20, ESLint, TypeScript, 7 Jest suites / 24 tests, static web
  export, a native iOS simulator build, migration validation, Bash syntax, Git
  whitespace checks, and secret scanning pass. The simulator login screen was
  visually inspected after launch; its disabled action state was corrected.
- The four storage filters and a dry-goods item on the studio shelf were
  visually verified at iPhone width in the native simulator.
- Migration `1784736000_add_household_storage_locations.js` is applied on M5;
  the service is active and healthy, and no disposable household data remains.
- `npm audit --omit=dev` reports 11 moderate Expo-toolchain advisories and no
  high or critical findings. The proposed forced fix is an incompatible Expo
  downgrade and remains deferred.

## Remaining handoffs

- Tailscale Serve needs its one-time tailnet approval before the loopback-only
  M5 backend gains its private HTTPS endpoint. Funnel must remain disabled.
- Physical iPhone installation and the two-person contextual usability tests
  still require the devices/participants; their outcomes must not be inferred
  from automated or simulator checks.

## Next step

Approve Tailscale Serve, set `EXPO_PUBLIC_ICEAGE_API_URL` to the resulting
private HTTPS endpoint in the ignored native app environment, then install the
development build on the iPhone and run the two-person contextual tests.
