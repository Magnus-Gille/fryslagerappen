import { describe, expect, it } from '@jest/globals';

import { assessRotation, selectRotationItems } from '@/features/inventory/rotation';
import type { FreezerItem } from '@/features/inventory/types';

function item(overrides: Partial<FreezerItem>): FreezerItem {
  return {
    id: 'item-1',
    name: 'Testvara',
    category: 'Torrvaror',
    quantity: 1,
    unit: 'st',
    locationId: 'shelf',
    dateSource: 'none',
    status: 'active',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    version: 1,
    color: '#fff',
    emoji: '🥫',
    ...overrides,
  };
}

describe('rotation guidance', () => {
  const today = new Date('2026-07-23T00:00:00.000Z');

  it('treats a passed use-by date as stricter than best-before', () => {
    const useBy = assessRotation(item({ useBy: '2026-07-22', dateSource: 'label' }), today);
    const bestBefore = assessRotation(
      item({ bestBefore: '2026-07-22', dateSource: 'label' }),
      today,
    );

    expect(useBy).toMatchObject({
      level: 'expired-use-by',
      confidence: 'confirmed',
      dateType: 'use_by',
    });
    expect(useBy.reason).toContain('Sista förbrukningsdag');
    expect(bestBefore).toMatchObject({
      level: 'use-now',
      confidence: 'confirmed',
      dateType: 'best_before',
    });
    expect(bestBefore.reason).toContain('bedöm');
  });

  it('keeps estimates visibly lower confidence and never turns an opened date into an expiry', () => {
    expect(
      assessRotation(item({ estimatedDate: '2026-07-25', dateSource: 'estimated' }), today),
    ).toMatchObject({
      level: 'soon',
      confidence: 'estimated',
      dateType: 'estimated',
    });

    expect(
      assessRotation(item({ openedOn: '2026-07-22', dateSource: 'manual' }), today),
    ).toMatchObject({
      level: 'use-now',
      dateType: 'opened',
      priorityDate: undefined,
    });
  });

  it('uses singular Swedish day wording', () => {
    expect(
      assessRotation(item({ useBy: '2026-07-24', dateSource: 'label' }), today).reason,
    ).toBe('Sista förbrukningsdag om 1 dag.');
  });

  it('orders urgent confirmed dates before lower-confidence planning dates', () => {
    const rows = [
      item({ id: 'estimated', name: 'Uppskattad', estimatedDate: '2026-07-24', dateSource: 'estimated' }),
      item({ id: 'use-by', name: 'Kyld', useBy: '2026-07-23', dateSource: 'label' }),
      item({ id: 'later', name: 'Senare', bestBefore: '2026-09-01', dateSource: 'label' }),
    ];

    expect(selectRotationItems(rows, today).map((entry) => entry.item.id)).toEqual([
      'use-by',
      'estimated',
    ]);
  });
});
