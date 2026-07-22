import { seedItems, seedLocations } from './seed';
import type {
  FreezerItem,
  InventoryAction,
  InventoryEvent,
  InventoryEventType,
  InventoryState,
} from './types';

function cloneItems() {
  return seedItems.map((item) => ({ ...item }));
}

export function createInventoryState(): InventoryState {
  return {
    locations: seedLocations.map((location) => ({ ...location })),
    items: cloneItems(),
    events: [],
  };
}

function createEvent(itemId: string, type: InventoryEventType, occurredAt: string): InventoryEvent {
  return {
    id: `event-${itemId}-${type}-${occurredAt}`,
    itemId,
    type,
    occurredAt,
  };
}

function itemVisual(category: string) {
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
  return { color: '#8DB8A4', emoji: '🥘' };
}

function updateItem(
  state: InventoryState,
  itemId: string,
  type: InventoryEventType,
  update: (item: FreezerItem) => FreezerItem,
): InventoryState {
  const occurredAt = new Date().toISOString();
  let changed = false;
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    changed = true;
    return {
      ...update(item),
      updatedAt: occurredAt,
      version: item.version + 1,
    };
  });

  if (!changed) return state;
  return {
    ...state,
    items,
    events: [createEvent(itemId, type, occurredAt), ...state.events],
  };
}

export function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'stateReplaced':
      return action.payload;
    case 'itemAdded': {
      const occurredAt = new Date().toISOString();
      const visual = itemVisual(action.payload.category);
      const item: FreezerItem = {
        ...action.payload,
        id: `item-${occurredAt}-${state.items.length + 1}`,
        status: 'active',
        createdAt: occurredAt,
        updatedAt: occurredAt,
        version: 1,
        ...visual,
      };
      return {
        ...state,
        items: [item, ...state.items],
        events: [createEvent(item.id, 'created', occurredAt), ...state.events],
      };
    }
    case 'quantityDecremented':
      return updateItem(state, action.itemId, 'quantityChanged', (item) => ({
        ...item,
        quantity: Math.max(0, item.quantity - 1),
        status: item.quantity <= 1 ? 'consumed' : item.status,
      }));
    case 'quantityRemoved':
      return updateItem(state, action.itemId, 'quantityChanged', (item) => ({
        ...item,
        quantity: Math.max(0, item.quantity - action.quantity),
        status: item.quantity <= action.quantity ? 'consumed' : item.status,
      }));
    case 'itemMoved':
      return updateItem(state, action.itemId, 'moved', (item) => ({
        ...item,
        locationId: action.locationId,
      }));
    case 'itemConsumed':
      return updateItem(state, action.itemId, 'consumed', (item) => ({
        ...item,
        status: 'consumed',
      }));
    case 'itemRestored':
      return updateItem(state, action.itemId, 'restored', (item) => ({
        ...item,
        status: 'active',
        quantity: Math.max(1, item.quantity),
      }));
    default:
      return state;
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('sv-SE');
}

export function selectActiveItems(state: InventoryState, query: string, locationId?: string) {
  const normalizedQuery = normalize(query);
  return state.items.filter((item) => {
    if (item.status !== 'active') return false;
    if (locationId && item.locationId !== locationId) return false;
    if (!normalizedQuery) return true;
    return normalize(`${item.name} ${item.category} ${item.note ?? ''}`).includes(normalizedQuery);
  });
}

export function selectEatSoonItems(state: InventoryState, referenceDate = new Date()) {
  const horizon = new Date(referenceDate);
  horizon.setUTCDate(horizon.getUTCDate() + 30);

  return state.items
    .filter(
      (item) =>
        item.status === 'active' &&
        item.eatBefore !== undefined &&
        new Date(`${item.eatBefore}T00:00:00.000Z`) <= horizon,
    )
    .sort((left, right) => left.eatBefore!.localeCompare(right.eatBefore!));
}

export function selectArchivedItems(state: InventoryState) {
  return state.items
    .filter((item) => item.status !== 'active')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
