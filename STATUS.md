# Project status

## Phase

Authenticated shared Home-inventory prototype with private M5 inference and
configurable storage for freezer, fridge, and dry goods.
The repository is public under MIT; app data and backend credentials remain on
the private tailnet infrastructure.

## Current system

- The Expo iPhone/web client supports email/password login, Home creation and
  renaming, owner-only one-time invitations and member removal, realtime
  inventory, optimistic conflict detection, history, and explicit confirmation
  before capture-derived changes.
- The iPhone client includes the native Apple-provided **Sign in with Apple**
  button and exchanges its one-time authorization code through PocketBase on
  the M5. The explicit App ID, company-team entitlement, Apple provider, and
  renewable client-secret JWT are active; no Apple secret is kept in the
  repository or app bundle.
- Private native builds send allowlisted, redacted test diagnostics for launch,
  backend health, authentication, Home/inventory/realtime failures, mutations,
  and capture timing. PocketBase stores them only on M5, and
  `scripts/show-phone-telemetry.sh` retrieves the latest safe fields without
  exposing the local superuser token.
- A Home has one or more members and owner-configured storage places. Owners can
  add, edit, type, and archive any number of freezers, fridges, and dry-storage
  places; occupied places and the final active place cannot be archived.
- New Homes receive five ordered storage locations: two freezers, two dry
  shelves, and one fridge. Existing installations are upgraded without deleting
  or orphaning inventory.
- Manual and inferred entries support dry-goods and dairy categories. Storage
  type is visible in filters, cards, the add flow, and the explicit move picker.
- Photo-only, voice-only, and photo-plus-voice capture are handled by an
  authenticated PocketBase route. Raw media and transcripts are transient and
  are not stored.
- The inventory screen now exposes one-tap **Foto** and **Röst** actions. Photo
  capture also accepts an existing library image, so the real M5 path is
  demonstrable in iOS Simulator without pretending that its camera works.
- Photo and voice analysis now continues in the background after capture, so
  the capture sheet closes immediately and the inventory stays usable. A
  compact status card exposes elapsed time, review-on-ready, retry, and dismiss;
  the inventory is changed only after explicit confirmation.
- Voice capture starts recording as soon as the explicitly selected voice flow
  opens, removing one extra tap.
- PocketBase 0.39.8 runs as a hardened user service on M5, bound only to
  loopback and is exposed to enrolled devices through private Tailscale Serve
  HTTPS; Funnel remains disabled. It uses the existing M5 Whisper worker and a
  dedicated loopback-only llama-server that keeps Gemma 4 warm for interactive
  captures; their URLs remain configurable so Orin Nano can take over either
  workload later.
- The public GitHub Pages app is intentionally built without a private backend
  URL and remains a local demo. Authenticated mode is enabled only in private
  native builds on devices connected to the tailnet.
- App Store Connect now has the Fryslagerappen record and an automatically
  distributed internal TestFlight group named `Familjen`. A checked-in upload
  script creates monotonically versioned, company-team-signed releases without
  storing Apple credentials or the private backend URL in Git.

## Verified

- Fresh PocketBase migrations and the automated signup → five typed locations
  → owner configuration → item → mutation → invitation → member list/removal →
  cross-Home authorization → photo/voice extraction → quota integration test pass.
- A synthetic freezer-label image was extracted on M5 as two bags of salmon
  fillet with the printed freeze date; a synthetic Swedish voice clip was
  transcribed and interpreted as removing one bag from the upstairs freezer.
- The warm extraction service produced the same structured synthetic-label
  result in 2.3 seconds on first request and 1.1 seconds warm, versus roughly
  53 seconds observed on the previous phone path when llama-swap first had to
  replace another loaded model. Reasoning is disabled for this structured task.
- A two-account SSE test delivered a new item to the second household member in
  under five seconds, while an outsider saw zero items and a member could not
  issue invitations.
- All synthetic accounts, households, items, events, invitations, and quotas
  were removed after the remote tests.
- Expo Doctor 20/20, ESLint, TypeScript, 11 Jest suites / 46 tests, static web
  export, a native iOS simulator build, migration validation, Bash syntax, Git
  whitespace checks, and secret scanning pass. The simulator login screen was
  visually inspected after launch; its disabled action state was corrected.
- The five typed storage filters, Home settings, creation of a second fridge,
  and the multi-destination move picker were visually verified at iPhone width
  in the native simulator.
- The authenticated iOS Simulator was visually verified with all five typed
  places, a healthy shared-inventory state, the new one-tap actions, direct
  photo launch, and the native photo-library picker. Through the documented
  loopback SSH tunnel, M5 extracted a synthetic label as two bags of salmon
  fillet in the basement freezer with the printed freeze date and no uncertain
  fields.
- Migration `1784740000_model_homes_and_storage_types.js` is applied on M5; the
  service is active and healthy, and no disposable Home or inventory data remains.
- A company-team-signed Release build with the branded icon and private M5
  endpoint was installed on Magnus's paired iPhone 17 Pro. CoreDevice verified
  version 1.0.0 and bundle ID `ai.gille.fryslagerappen`; foreground launch was
  deferred only because the phone was locked.
- The Apple login UI was visually verified in a self-contained Release build on
  the iPhone 16e simulator. The generated native project contains the Sign in
  with Apple capability and the Expo Apple authentication module compiles.
- OAuth-only user creation is enabled on M5 while direct and spoofed REST user
  creation remain blocked. The live security probe returned 400 for both direct
  and context-spoofed creation and created no user records.
- Phone telemetry ingestion, redaction, unknown-event rejection, the 8 KiB body
  limit, and the 120-events/minute source-IP limit pass the PocketBase integration
  suite. M5 release `20260723090753` and its dedicated extractor service are
  healthy, and a real simulator launch produced correlated `app_started` and
  `backend_probe_succeeded` events.
- The telemetry-enabled company-team Release build is installed on the paired
  iPhone as version 1.0.0 (bundle version 1). CoreDevice verified the installed
  app; automatic foreground launch was denied only because the phone was locked.
- Version 1.0.0 build 2607222256 was archived with the company team, accepted by
  App Store Connect, processed successfully, and attached to the internal
  `Familjen` group. Magnus is invited as the first internal tester.
- Version 1.0.0 build 260723094432, containing the background capture flow and
  warm M5 extractor integration, was archived with the company team and accepted
  by App Store Connect for TestFlight processing.
- The TestFlight-ready configuration was verified by Expo Doctor 20/20, ESLint,
  TypeScript, 10 Jest suites / 43 tests, a static web export, a signed device
  archive, and a native Release build launched and visually inspected in the
  iPhone 16e simulator.
- The background capture status states were visually verified in a native
  Release build on the iPhone 16e simulator.
- `npm audit --omit=dev` reports 11 moderate Expo-toolchain advisories and no
  high or critical findings. The proposed forced fix is an incompatible Expo
  downgrade and remains deferred.

## Remaining handoffs

- Sara has joined App Store Connect/TestFlight, installed the app, joined the
  private Tailscale tailnet, signed in with Apple, and joined Magnus's Home.
  Magnus and Sara are now the active two-person pilot.
- The planned SQLite persistence and sync queue are not implemented yet. The
  authenticated prototype currently depends on PocketBase being reachable;
  local demo data resets when the app process restarts.
- The two-person pilot still needs deliberate weak-network, unusual-label, and
  longer-voice-phrase tests; keep using the low-friction telemetry reader to
  ground follow-up changes in phone-observed timings.

## Next step

Wait for build 260723094432 to finish TestFlight processing and appear in the
automatically distributed `Familjen` group. Then have Magnus and Sara update
and try photo-only, voice-only, and photo-plus-voice captures in ordinary
kitchen use, and inspect `./scripts/show-phone-telemetry.sh` for device, server,
transcription, and model timings.
