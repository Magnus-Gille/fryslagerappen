# Project status

## Phase

Authenticated shared-inventory implementation. The local prototype remains the
safe fallback while the Supabase-backed realtime capture path is activated and
validated with two household accounts.

## Current work

- The local-data prototype supports Swedish search, location filters, “Ät
  snart”, manual capture, confirmation, quick quantity changes, moving,
  consuming, history, and restore.
- The new authenticated path adds email/password login, household ownership and
  one-time invitations, row-level authorization, ephemeral photo/Swedish voice
  extraction, optimistic concurrency, and Supabase Realtime
  updates. Every extracted mutation still requires explicit confirmation.
- Provider secrets stay in a Supabase Edge Function; audio is transcribed but
  not stored, and extraction is rate-limited per signed-in user.
- Six representative seed items cover both planned freezer locations and the
  date-source language required by the PRD.
- Inventory behavior has focused reducer/selector tests.
- Expo Doctor, lint, TypeScript, Jest, web export, Edge Function type checking,
  PostgreSQL syntax parsing, secret scanning, and an iPhone 17 Pro native
  development build are green.
- The static web prototype deploys from `main` to
  `https://magnus-gille.github.io/fryslagerappen/` through GitHub Pages.
- The add/search/consume/history/restore flow has been exercised in the iOS
  26.5 simulator with accessibility state inspected.

## Blockers

The realtime/auth path is not live yet: the repository has no linked Supabase
project and no deployment secrets for the Supabase URL/publishable key or the
server-side OpenAI key. GitHub Pages therefore continues to serve the local
demo fallback until those are configured and the migration and Edge Function
are deployed.

The Epic 0 contextual observation and Epic 2 moderated prototype test require
real household participants. Their validation results must not be inferred
from simulator verification.

`npm audit` reports 11 moderate upstream Expo toolchain advisories and no high
or critical advisories. The available forced remediation is a breaking Expo
downgrade, so this is documented and deferred rather than treated as a release
blocker.

## Next steps

1. Link a Supabase project, apply the migration, deploy `extract-inventory`, and
   configure the public client values plus the server-only OpenAI secret.
2. Verify signup, household invitation, camera, microphone, confirmation, and
   two-device realtime updates against that hosted project.
3. Run the contextual observation and moderated household test from
   `docs/ROADMAP.md`, recording time, errors, corrections, and capture mode.
