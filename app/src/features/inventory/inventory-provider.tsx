import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { useHousehold } from '@/features/household/household-provider';
import { pocketbase } from '@/lib/pocketbase';

import {
  createInventoryState,
  inventoryReducer,
  selectActiveItems,
  selectArchivedItems,
  selectEatSoonItems,
} from './inventory-state';
import { eventFromRow, type EventRow, itemFromRow, type ItemRow, locationFromRow, type LocationRow } from './remote-inventory';
import type { AddItemInput, InventoryState } from './types';

type InventoryContextValue = {
  state: InventoryState;
  activeItems: InventoryState['items'];
  eatSoonItems: InventoryState['items'];
  archivedItems: InventoryState['items'];
  syncStatus: 'local' | 'loading' | 'synced' | 'saving' | 'error';
  addItem: (input: AddItemInput) => Promise<void>;
  takeOne: (itemId: string) => Promise<void>;
  removeQuantity: (itemId: string, quantity: number) => Promise<void>;
  moveItem: (itemId: string, locationId: string) => Promise<void>;
  consumeItem: (itemId: string) => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [state, dispatch] = useReducer(inventoryReducer, undefined, createInventoryState);
  const latestLoad = useRef(0);
  const isRemote = Boolean(pocketbase && user && household);
  const [syncStatus, setSyncStatus] = useState<InventoryContextValue['syncStatus']>(
    isRemote ? 'loading' : 'local',
  );

  const loadRemote = useCallback(async () => {
    if (!pocketbase || !household) return;
    const loadNumber = ++latestLoad.current;
    const [locations, items, events] = await Promise.all([
      pocketbase.collection('locations').getFullList({ filter: 'archivedAt = ""', sort: 'position' }),
      pocketbase.collection('items').getFullList({ sort: '-updated' }),
      pocketbase.collection('inventory_events').getList(1, 100, { sort: '-created' }),
    ]);
    if (loadNumber !== latestLoad.current) return;
    dispatch({
      type: 'stateReplaced',
      payload: {
        locations: locations.map((row) => locationFromRow(row as unknown as LocationRow)),
        items: items.map((row) => itemFromRow(row as unknown as ItemRow)),
        events: events.items.map((row) => eventFromRow(row as unknown as EventRow)),
      },
    });
    setSyncStatus('synced');
  }, [household]);

  useEffect(() => {
    if (!isRemote || !household || !pocketbase) return;
    let active = true;
    void loadRemote().catch(() => active && setSyncStatus('error'));
    const subscriptions = Promise.all([
      pocketbase.collection('items').subscribe('*', () => void loadRemote()),
      pocketbase.collection('locations').subscribe('*', () => void loadRemote()),
      pocketbase.collection('inventory_events').subscribe('*', () => void loadRemote()),
    ]);
    void subscriptions.catch(() => active && setSyncStatus('error'));
    return () => {
      active = false;
      void subscriptions.then((unsubscribe) => unsubscribe.forEach((stop) => void stop()));
    };
  }, [household, isRemote, loadRemote]);

  const runRemote = useCallback(
    async (optimisticAction: Parameters<typeof inventoryReducer>[1], operation: () => Promise<unknown>) => {
      dispatch(optimisticAction);
      if (!isRemote) return;
      setSyncStatus('saving');
      try {
        await operation();
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        await loadRemote();
        throw error;
      }
    },
    [isRemote, loadRemote],
  );

  const mutate = useCallback(
    (itemId: string, body: Record<string, unknown>) => {
      if (!pocketbase) return Promise.resolve();
      return pocketbase.send(`/api/iceage/items/${itemId}/mutate`, { method: 'POST', body });
    },
    [],
  );

  const value = useMemo<InventoryContextValue>(
    () => ({
      state,
      activeItems: selectActiveItems(state, ''),
      eatSoonItems: selectEatSoonItems(state),
      archivedItems: selectArchivedItems(state),
      syncStatus,
      addItem: async (payload) => {
        if (!isRemote || !pocketbase || !household || !user) {
          dispatch({ type: 'itemAdded', payload });
          return;
        }
        setSyncStatus('saving');
        try {
          await pocketbase.send('/api/iceage/items', {
            method: 'POST',
            body: payload,
          });
          await loadRemote();
        } catch (error) {
          setSyncStatus('error');
          throw error;
        }
      },
      takeOne: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'quantityDecremented', itemId },
          () => mutate(itemId, { action: 'remove', quantity: 1, expectedVersion: item.version }),
        );
      },
      removeQuantity: async (itemId, quantity) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        const amount = Math.max(0, quantity);
        await runRemote(
          { type: 'quantityRemoved', itemId, quantity: amount },
          () => mutate(itemId, { action: 'remove', quantity: amount, expectedVersion: item.version }),
        );
      },
      moveItem: async (itemId, locationId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemMoved', itemId, locationId },
          () => mutate(itemId, { action: 'move', locationId, expectedVersion: item.version }),
        );
      },
      consumeItem: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemConsumed', itemId },
          () => mutate(itemId, { action: 'consume', expectedVersion: item.version }),
        );
      },
      restoreItem: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemRestored', itemId },
          () => mutate(itemId, { action: 'restore', expectedVersion: item.version }),
        );
      },
    }),
    [household, isRemote, loadRemote, mutate, runRemote, state, syncStatus, user],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
}
