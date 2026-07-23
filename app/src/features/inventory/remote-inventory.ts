import type { FreezerItem, InventoryEvent, StoragePlace, StorageType } from './types';

export type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  storageType: StorageType;
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
  bestBefore: string;
  useBy: string;
  openedOn: string;
  estimatedDate: string;
  dateSource: FreezerItem['dateSource'];
  barcode: string;
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
  quantityDelta?: number;
  quantityBefore?: number;
  quantityAfter?: number;
  comment?: string;
  source?: InventoryEvent['source'];
  fromLocation?: string;
  toLocation?: string;
  expand?: {
    actor?: { displayName?: string };
    fromLocation?: { name?: string };
    toLocation?: { name?: string };
  };
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
  if (category === 'Torrvaror') {
    return { color: '#D8B980', emoji: '🍝' };
  }
  if (category === 'Konserver') {
    return { color: '#C7A27A', emoji: '🥫' };
  }
  if (category === 'Mejeri') {
    return { color: '#E9DFC4', emoji: '🧈' };
  }
  return { color: '#8DB8A4', emoji: '🥘' };
}

export function locationFromRow(row: LocationRow): StoragePlace {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    storageType: row.storageType,
  };
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
    bestBefore: row.bestBefore || undefined,
    useBy: row.useBy || undefined,
    openedOn: row.openedOn || undefined,
    estimatedDate: row.estimatedDate || undefined,
    dateSource: row.dateSource,
    barcode: row.barcode || undefined,
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
    quantityDelta: row.quantityDelta,
    quantityBefore: row.quantityBefore,
    quantityAfter: row.quantityAfter,
    comment: row.comment || undefined,
    source: row.source,
    actorName: row.expand?.actor?.displayName || undefined,
    fromLocationId: row.fromLocation || undefined,
    fromLocationName: row.expand?.fromLocation?.name || undefined,
    toLocationId: row.toLocation || undefined,
    toLocationName: row.expand?.toLocation?.name || undefined,
  };
}
