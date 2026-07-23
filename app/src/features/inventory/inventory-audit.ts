import type {
  AuditExtraInput,
  FreezerItem,
  InventoryAuditInput,
} from './types';

export type AuditDraft = Record<string, number>;

export function createAuditDraft(items: FreezerItem[]): AuditDraft {
  return Object.fromEntries(items.map((item) => [item.id, item.quantity]));
}

export function updateAuditQuantity(
  draft: AuditDraft,
  itemId: string,
  quantity: number,
): AuditDraft {
  return { ...draft, [itemId]: Math.max(0, quantity) };
}

export function buildAuditRequest(
  _locationId: string,
  expectedItems: FreezerItem[],
  draft: AuditDraft,
  extras: AuditExtraInput[],
): InventoryAuditInput {
  return {
    rows: expectedItems.flatMap((item) => {
      const observedQuantity = draft[item.id] ?? item.quantity;
      if (observedQuantity === item.quantity) return [];
      return [{
        itemId: item.id,
        expectedVersion: item.version,
        observedQuantity,
      }];
    }),
    extras: extras
      .filter((extra) => extra.name.trim() && extra.quantity > 0)
      .map((extra) => ({ ...extra, name: extra.name.trim() })),
  };
}
