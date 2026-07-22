const { describe, expect, it } = require('@jest/globals');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.join(__dirname, '../../supabase/migrations/20260722133000_household_inventory.sql'),
  'utf8',
);

describe('Supabase security contract', () => {
  it('enables RLS on every household and media-adjacent data table', () => {
    for (const table of [
      'households',
      'household_members',
      'locations',
      'items',
      'inventory_events',
      'household_invitations',
      'extraction_quotas',
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
    }
  });

  it('keeps invite and quota functions authenticated and server-enforced', () => {
    expect(migration).toContain('grant execute on function public.create_household_invite(uuid) to authenticated;');
    expect(migration).toContain('grant execute on function public.consume_extraction_quota() to authenticated;');
    expect(migration).toContain("raise exception 'an item cannot change household';");
  });
});
