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
  location_id: string;
  frozen_on: string | null;
  eat_before: string | null;
  date_source: FreezerItem['dateSource'];
  note: string | null;
  status: FreezerItem['status'];
  created_at: string;
  updated_at: string;
  version: number;
};

export type EventRow = {
  id: string;
  item_id: string;
  event_type: InventoryEvent['type'];
  occurred_at: string;
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
    locationId: row.location_id,
    frozenOn: row.frozen_on ?? undefined,
    eatBefore: row.eat_before ?? undefined,
    dateSource: row.date_source,
    note: row.note ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    ...itemVisual(row.category),
  };
}

export function eventFromRow(row: EventRow): InventoryEvent {
  return {
    id: row.id,
    itemId: row.item_id,
    type: row.event_type,
    occurredAt: row.occurred_at,
  };
}
