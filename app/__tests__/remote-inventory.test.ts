import { describe, expect, it } from '@jest/globals';

import { eventFromRow, itemFromRow, locationFromRow } from '@/features/inventory/remote-inventory';

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
        bestBefore: '2026-07-28',
        useBy: '',
        openedOn: '',
        estimatedDate: '',
        dateSource: 'label',
        barcode: '',
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
      bestBefore: '2026-07-28',
    });
  });

  it('maps a location row', () => {
    expect(
      locationFromRow({
        id: 'location-1',
        name: 'Hyllan i ateljén',
        description: 'Torrvaror',
        storageType: 'dry',
      }),
    ).toEqual({
      id: 'location-1',
      name: 'Hyllan i ateljén',
      description: 'Torrvaror',
      storageType: 'dry',
    });
  });

  it('maps rich history with actor, source, quantities, places, and comment', () => {
    expect(
      eventFromRow({
        id: 'event-1',
        item: 'item-1',
        eventType: 'quantityChanged',
        created: '2026-07-23T08:30:00.000Z',
        quantityDelta: -2,
        quantityBefore: 5,
        quantityAfter: 3,
        comment: 'Två till middagen',
        source: 'voice',
        fromLocation: 'freezer-1',
        toLocation: '',
        expand: {
          actor: { displayName: 'Sara' },
          fromLocation: { name: 'Frysen i källaren' },
        },
      }),
    ).toEqual({
      id: 'event-1',
      itemId: 'item-1',
      type: 'quantityChanged',
      occurredAt: '2026-07-23T08:30:00.000Z',
      quantityDelta: -2,
      quantityBefore: 5,
      quantityAfter: 3,
      comment: 'Två till middagen',
      source: 'voice',
      actorName: 'Sara',
      fromLocationId: 'freezer-1',
      fromLocationName: 'Frysen i källaren',
      toLocationId: undefined,
      toLocationName: undefined,
    });
  });
});
