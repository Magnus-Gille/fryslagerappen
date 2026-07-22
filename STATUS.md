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
  the M5. Activation still requires the correct Apple Developer App ID/key and
  a renewable client-secret JWT in the M5 environment; no Apple secret is kept
  in the repository or app bundle.
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
- PocketBase 0.39.8 runs as a hardened user service on M5, bound only to
  loopback and is exposed to enrolled devices through private Tailscale Serve
  HTTPS; Funnel remains disabled. It uses the existing M5 Whisper and
  llama-swap workers; their URLs remain configurable so Orin Nano can take over
  either workload later.
- The public GitHub Pages app is intentionally built without a private backend
  URL and remains a local demo. Authenticated mode is enabled only in private
  native builds on devices connected to the tailnet.

## Verified

- Fresh PocketBase migrations and the automated signup → five typed locations
  → owner configuration → item → mutation → invitation → member list/removal →
  cross-Home authorization → photo/voice extraction → quota integration test pass.
- A synthetic freezer-label image was extracted on M5 as two bags of salmon
  fillet with the printed freeze date; a synthetic Swedish voice clip was
  transcribed and interpreted as removing one bag from the upstairs freezer.
- A two-account SSE test delivered a new item to the second household member in
  under five seconds, while an outsider saw zero items and a member could not
  issue invitations.
- All synthetic accounts, households, items, events, invitations, and quotas
  were removed after the remote tests.
- Expo Doctor 20/20, ESLint, TypeScript, 9 Jest suites / 35 tests, static web
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
- `npm audit --omit=dev` reports 11 moderate Expo-toolchain advisories and no
  high or critical findings. The proposed forced fix is an incompatible Expo
  downgrade and remains deferred.

## Remaining handoffs

- Apple login cannot be exercised end-to-end or installed on the paired phone
  until the `ai.gille.fryslagerappen` App ID is enabled for Sign in with Apple
  and the matching team/key/client secret is configured on M5. Two existing
  `.p8` files were found locally but were not used because their owning team and
  authorized capability have not been verified.
- The planned SQLite persistence and sync queue are not implemented yet. The
  authenticated prototype currently depends on PocketBase being reachable;
  local demo data resets when the app process restarts.
- The two-person contextual usability tests still require Magnus and Sara;
  their outcomes must not be inferred from automated or simulator checks.

## Next step

Confirm the Apple Developer team/key for `ai.gille.fryslagerappen`, enable the
capability, generate the client secret directly into the M5 environment, then
deploy and exercise Apple login on the paired iPhone. After that, run the
documented two-minute demo and the two-person contextual tests with Magnus and
Sara.
