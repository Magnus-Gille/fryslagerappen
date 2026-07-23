import { seedItems, seedLocations } from './seed';
import type {
  FreezerItem,
  InventoryAction,
  InventoryEvent,
  InventoryEventType,
  InventoryState,
} from './types';
import { selectRotationItems } from './rotation';

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

function createEvent(
  itemId: string,
  type: InventoryEventType,
  occurredAt: string,
  details: Partial<InventoryEvent> = {},
): InventoryEvent {
  return {
    id: `event-${itemId}-${type}-${occurredAt}`,
    itemId,
    type,
    occurredAt,
    source: 'manual',
    ...details,
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
  if (category === 'Mejeri') {
    return { color: '#E9DFC4', emoji: '🧈' };
  }
  return { color: '#8DB8A4', emoji: '🥘' };
}

function updateItem(
  state: InventoryState,
  itemId: string,
  type: InventoryEventType,
  update: (item: FreezerItem) => FreezerItem,
  eventDetails: Partial<InventoryEvent> = {},
): InventoryState {
  const occurredAt = new Date().toISOString();
  let changed = false;
  let previousItem: FreezerItem | undefined;
  let nextItem: FreezerItem | undefined;
  const items = state.items.map((item) => {
    if (item.id !== itemId) return item;
    changed = true;
    previousItem = item;
    nextItem = {
      ...update(item),
      updatedAt: occurredAt,
      version: item.version + 1,
    };
    return nextItem;
  });

  if (!changed) return state;
  return {
    ...state,
    items,
    events: [
      createEvent(itemId, type, occurredAt, {
        quantityBefore: previousItem?.quantity,
        quantityAfter: nextItem?.quantity,
        quantityDelta:
          previousItem && nextItem ? nextItem.quantity - previousItem.quantity : undefined,
        fromLocationId: previousItem?.locationId,
        toLocationId: nextItem?.locationId,
        ...eventDetails,
      }),
      ...state.events,
    ],
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
        events: [
          createEvent(item.id, 'created', occurredAt, {
            quantityBefore: 0,
            quantityAfter: item.quantity,
            quantityDelta: item.quantity,
            toLocationId: item.locationId,
            source: action.payload.changeSource ?? 'manual',
          }),
          ...state.events,
        ],
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
    case 'quantityAudited':
      return updateItem(
        state,
        action.itemId,
        'audited',
        (item) => ({
          ...item,
          quantity: Math.max(0, action.quantity),
          status: action.quantity <= 0 ? 'consumed' : 'active',
        }),
        { source: 'audit' },
      );
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
    case 'locationAdded':
      return { ...state, locations: [...state.locations, action.payload] };
    case 'locationUpdated':
      return {
        ...state,
        locations: state.locations.map((location) =>
          location.id === action.locationId ? { id: location.id, ...action.payload } : location,
        ),
      };
    case 'locationArchived':
      return {
        ...state,
        locations: state.locations.filter((location) => location.id !== action.locationId),
      };
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
  return selectRotationItems(state.items, referenceDate).map(({ item }) => item);
}

export function selectArchivedItems(state: InventoryState) {
  return state.items
    .filter((item) => item.status !== 'active')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
