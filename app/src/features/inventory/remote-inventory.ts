import type { FreezerItem, FreezerLocation, InventoryEvent } from './types';

export type LocationRow = {
  id: string;
  name: string;
  description: string | null;
};

export type ItemRow = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  frozenOn: string;
  eatBefore: string;
  dateSource: FreezerItem['dateSource'];
  note: string;
  status: FreezerItem['status'];
  created: string;
  updated: string;
  version: number;
};

export type EventRow = {
  id: string;
  item: string;
  eventType: InventoryEvent['type'];
  created: string;
};

export function itemVisual(category: string) {
  if (category.includes('bär') || category.includes('Frukt')) {
    return { color: '#7B77B9', emoji: '🫐' };
  }
  if (category === 'Fisk') {
    return { color: '#EFA987', emoji: '🐟' };
  }
  if (category.includes('Glass')) {
    return { color: '#F1D791', emoji: '🍨' };
  }
  return { color: '#8DB8A4', emoji: '🥘' };
}

export function locationFromRow(row: LocationRow): FreezerLocation {
  return { id: row.id, name: row.name, description: row.description ?? '' };
}

export function itemFromRow(row: ItemRow): FreezerItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    locationId: row.location,
    frozenOn: row.frozenOn || undefined,
    eatBefore: row.eatBefore || undefined,
    dateSource: row.dateSource,
    note: row.note || undefined,
    status: row.status,
    createdAt: row.created,
    updatedAt: row.updated,
    version: row.version,
    ...itemVisual(row.category),
  };
}

export function eventFromRow(row: EventRow): InventoryEvent {
  return {
    id: row.id,
    itemId: row.item,
    type: row.eventType,
    occurredAt: row.created,
  };
}
