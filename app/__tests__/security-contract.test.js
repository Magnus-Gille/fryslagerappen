const { describe, expect, it } = require('@jest/globals');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.join(__dirname, '../../backend/pb_migrations/1784728800_initial_iceage.js'),
  'utf8',
);
const hooks = fs.readFileSync(
  path.join(__dirname, '../../backend/pb_hooks/main.pb.js'),
  'utf8',
);
const helpers = fs.readFileSync(
  path.join(__dirname, '../../backend/pb_hooks/lib/iceage.js'),
  'utf8',
);
const captureService = fs.readFileSync(
  path.join(__dirname, '../src/features/capture/capture-service.ts'),
  'utf8',
);
const forwardMigration = migration.split('}, (app) => {')[0];
const pagesWorkflow = fs.readFileSync(
  path.join(__dirname, '../../.github/workflows/deploy-pages.yml'),
  'utf8',
);

describe('M5 backend security contract', () => {
  it('scopes every user-readable collection to the authenticated household', () => {
    for (const collection of ['households', 'locations', 'items', 'events']) {
      expect(migration).toContain(`${collection}.listRule =`);
      expect(migration).toContain(`${collection}.viewRule =`);
    }
    expect(migration).toContain('household = @request.auth.household');
    expect(migration).toContain('users.createRule = null');
    expect(forwardMigration).toContain('users.updateRule = null');
    expect(forwardMigration).toContain('users.deleteRule = null');
    for (const collection of ['households', 'locations', 'items', 'events', 'invitations', 'quotas']) {
      expect(forwardMigration).not.toContain(`${collection}.createRule =`);
      expect(forwardMigration).not.toContain(`${collection}.updateRule =`);
      expect(forwardMigration).not.toContain(`${collection}.deleteRule =`);
    }
  });

  it('keeps writes behind authenticated custom routes and owner-only invitations', () => {
    expect(hooks).toContain('$apis.requireAuth("users")');
    expect(helpers).toContain('e.auth.getString("householdRole") !== "owner"');
    expect(hooks).toContain('item.getInt("version") !== expectedVersion');
    expect(hooks).toContain('new ApiError(409');
  });

  it('models owner-configured homes, typed storage places, and members', () => {
    expect(hooks).toContain('"/api/iceage/homes"');
    expect(hooks).toContain('"/api/iceage/homes/{id}/members"');
    expect(hooks).toContain('"/api/iceage/homes/{id}/locations"');
    expect(hooks).toContain('"/api/iceage/homes/{id}/locations/{locationId}"');
    expect(hooks).toContain('lib.requireHomeOwner');
    expect(hooks).toContain('storageType');
  });

  it('keeps captures ephemeral, size-limited, and locally routed', () => {
    expect(hooks).toContain('$apis.bodyLimit(20 * 1024 * 1024)');
    expect(hooks).not.toContain('item.set("audio"');
    expect(hooks).not.toContain('item.set("photo"');
    expect(helpers).toContain('ICEAGE_WHISPER_URL');
    expect(helpers).toContain('ICEAGE_LLM_BASE_URL');
    expect(helpers).toContain('nextCount > 60');
  });

  it('allows camera-only JSON requests without requiring an audio upload', () => {
    expect(hooks).toContain('lib.uploadedFiles(e, "audio")');
    expect(helpers).toContain('function uploadedFiles(e, field)');
    expect(helpers).toContain('startsWith("multipart/form-data")');
    expect(helpers).not.toContain('http: no such file');
    expect(captureService).toContain('if (!input.audioUri)');
  });

  it('does not publish the private tailnet endpoint in the public web bundle', () => {
    expect(pagesWorkflow).not.toContain('EXPO_PUBLIC_ICEAGE_API_URL');
  });
});
