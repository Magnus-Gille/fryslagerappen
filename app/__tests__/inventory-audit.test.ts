import { describe, expect, it } from '@jest/globals';

import {
  buildAuditRequest,
  createAuditDraft,
  updateAuditQuantity,
} from '@/features/inventory/inventory-audit';
import { createInventoryState } from '@/features/inventory/inventory-state';

describe('storage-place audit', () => {
  it('starts with the expected active stock and only submits changes', () => {
    const state = createInventoryState();
    const locationId = 'upstairs';
    const expected = state.items.filter(
      (item) => item.locationId === locationId && item.status === 'active',
    );
    const draft = createAuditDraft(expected);
    const changed = updateAuditQuantity(draft, expected[0].id, 0);

    expect(buildAuditRequest(locationId, expected, changed, [])).toEqual({
      rows: [
        {
          itemId: expected[0].id,
          expectedVersion: expected[0].version,
          observedQuantity: 0,
        },
      ],
      extras: [],
    });
  });

  it('includes an extra finding with its storage location decided by the audit', () => {
    const state = createInventoryState();
    expect(
      buildAuditRequest('studio-shelf', [], {}, [
        {
          name: 'Havregryn',
          category: 'Torrvaror',
          quantity: 2,
          unit: 'paket',
          note: 'Hittades bakom mjölet',
        },
      ]),
    ).toEqual({
      rows: [],
      extras: [
        {
          name: 'Havregryn',
          category: 'Torrvaror',
          quantity: 2,
          unit: 'paket',
          note: 'Hittades bakom mjölet',
        },
      ],
    });
  });
});
