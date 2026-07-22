export type ItemStatus = 'active' | 'consumed' | 'discarded';
export type DateSource = 'manual' | 'label' | 'estimated' | 'none';

export type StorageType = 'freezer' | 'fridge' | 'dry';

export type StoragePlace = {
  id: string;
  name: string;
  description: string;
  storageType: StorageType;
};

export type FreezerItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  locationId: string;
  frozenOn?: string;
  eatBefore?: string;
  dateSource: DateSource;
  note?: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  color: string;
  emoji: string;
};

export type InventoryEventType =
  | 'created'
  | 'quantityChanged'
  | 'moved'
  | 'consumed'
  | 'restored';

export type InventoryEvent = {
  id: string;
  itemId: string;
  type: InventoryEventType;
  occurredAt: string;
};

export type InventoryState = {
  locations: StoragePlace[];
  items: FreezerItem[];
  events: InventoryEvent[];
};

export type AddItemInput = Pick<
  FreezerItem,
  | 'name'
  | 'category'
  | 'quantity'
  | 'unit'
  | 'locationId'
  | 'frozenOn'
  | 'eatBefore'
  | 'dateSource'
  | 'note'
>;

export type InventoryAction =
  | { type: 'stateReplaced'; payload: InventoryState }
  | { type: 'itemAdded'; payload: AddItemInput }
  | { type: 'quantityDecremented'; itemId: string }
  | { type: 'quantityRemoved'; itemId: string; quantity: number }
  | { type: 'itemMoved'; itemId: string; locationId: string }
  | { type: 'itemConsumed'; itemId: string }
  | { type: 'itemRestored'; itemId: string }
  | { type: 'locationAdded'; payload: StoragePlace }
  | { type: 'locationUpdated'; locationId: string; payload: Omit<StoragePlace, 'id'> }
  | { type: 'locationArchived'; locationId: string };

export type StoragePlaceInput = Omit<StoragePlace, 'id'>;
