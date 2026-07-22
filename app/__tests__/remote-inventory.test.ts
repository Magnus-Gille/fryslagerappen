import { describe, expect, it } from '@jest/globals';

import { itemFromRow, locationFromRow } from '@/features/inventory/remote-inventory';

describe('remote inventory mapping', () => {
  it('maps database rows without trusting server-side presentation fields', () => {
    expect(
      itemFromRow({
        id: 'item-1',
        name: 'Laxfilé',
        category: 'Fisk',
        quantity: 4,
        unit: 'bitar',
        location: 'location-1',
        frozenOn: '2026-02-02',
        eatBefore: '2026-07-28',
        dateSource: 'label',
        note: '',
        status: 'active',
        created: '2026-02-02T17:45:00.000Z',
        updated: '2026-07-20T14:08:00.000Z',
        version: 3,
      }),
    ).toMatchObject({
      id: 'item-1',
      locationId: 'location-1',
      color: '#EFA987',
      emoji: '🐟',
    });
  });

  it('maps a location row', () => {
    expect(
      locationFromRow({ id: 'location-1', name: 'Hyllan i ateljén', description: 'Torrvaror' }),
    ).toEqual({ id: 'location-1', name: 'Hyllan i ateljén', description: 'Torrvaror' });
  });
});
