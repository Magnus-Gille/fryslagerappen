# Project status

## Phase

Epic 2 core-loop prototype implementation. The product-shaped iPhone/web flow
is ready for moderated household validation before the offline data layer is
treated as the chosen direction.

## Current work

- The local-data prototype supports Swedish search, location filters, “Ät
  snart”, simulated photo/voice/manual capture, confirmation, quick quantity
  changes, moving, consuming, history, and restore.
- Six representative seed items cover both planned freezer locations and the
  date-source language required by the PRD.
- Inventory behavior has focused reducer/selector tests.
- Expo Doctor, lint, TypeScript, Jest, web export, and an iPhone 17 Pro native
  development build are green.
- The static web prototype deploys from `main` to
  `https://magnus-gille.github.io/fryslagerappen/` through GitHub Pages.
- The add/search/consume/history/restore flow has been exercised in the iOS
  26.5 simulator with accessibility state inspected.

## Blockers

No technical blocker.

The Epic 0 contextual observation and Epic 2 moderated prototype test require
real household participants. Their validation results must not be inferred
from simulator verification.

`npm audit` reports 11 moderate upstream Expo toolchain advisories and no high
or critical advisories. The available forced remediation is a breaking Expo
downgrade, so this is documented and deferred rather than treated as a release
blocker.

## Next steps

1. Run the contextual observation and moderated prototype tasks from
   `docs/ROADMAP.md`, then record task time, errors, corrections, and the chosen
   registration mode.
2. Start Epic 3 SQLite persistence once the core-loop decision is recorded.
3. Replace the placeholder `com.example.fryslagerappen` app identifiers before
   signed App Store or Play Store distribution.
