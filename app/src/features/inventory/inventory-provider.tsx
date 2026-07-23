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
import { useHome } from '@/features/home/home-provider';
import { pocketbase } from '@/lib/pocketbase';
import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import {
  createInventoryState,
  inventoryReducer,
  selectActiveItems,
  selectArchivedItems,
  selectEatSoonItems,
} from './inventory-state';
import { selectRotationItems, type RotationItem } from './rotation';
import { eventFromRow, type EventRow, itemFromRow, type ItemRow, locationFromRow, type LocationRow } from './remote-inventory';
import type {
  AddItemInput,
  ChangeSource,
  InventoryAuditInput,
  InventoryState,
  StoragePlaceInput,
} from './types';

type InventoryContextValue = {
  state: InventoryState;
  activeItems: InventoryState['items'];
  eatSoonItems: InventoryState['items'];
  rotationItems: RotationItem[];
  archivedItems: InventoryState['items'];
  syncStatus: 'local' | 'loading' | 'synced' | 'saving' | 'error';
  addItem: (input: AddItemInput) => Promise<void>;
  takeOne: (itemId: string, comment?: string, source?: ChangeSource) => Promise<void>;
  removeQuantity: (itemId: string, quantity: number, comment?: string, source?: ChangeSource) => Promise<void>;
  moveItem: (itemId: string, locationId: string, comment?: string, source?: ChangeSource) => Promise<void>;
  consumeItem: (itemId: string, comment?: string, source?: ChangeSource) => Promise<void>;
  restoreItem: (itemId: string) => Promise<void>;
  createStoragePlace: (input: StoragePlaceInput) => Promise<void>;
  updateStoragePlace: (locationId: string, input: StoragePlaceInput) => Promise<void>;
  archiveStoragePlace: (locationId: string) => Promise<void>;
  submitAudit: (locationId: string, input: InventoryAuditInput) => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { home } = useHome();
  const [state, dispatch] = useReducer(inventoryReducer, undefined, createInventoryState);
  const latestLoad = useRef(0);
  const isRemote = Boolean(pocketbase && user && home);
  const [syncStatus, setSyncStatus] = useState<InventoryContextValue['syncStatus']>(
    isRemote ? 'loading' : 'local',
  );

  const loadRemote = useCallback(async () => {
    if (!pocketbase || !home) return;
    const loadNumber = ++latestLoad.current;
    const [locations, items, events] = await Promise.all([
      pocketbase.collection('locations').getFullList({ filter: 'archivedAt = ""', sort: 'position' }),
      pocketbase.collection('items').getFullList({ sort: '-updated' }),
      pocketbase.collection('inventory_events').getList(1, 100, {
        sort: '-created',
        expand: 'actor,fromLocation,toLocation',
      }),
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
  }, [home]);

  useEffect(() => {
    if (!isRemote || !home || !pocketbase) return;
    let active = true;
    void loadRemote().catch((error) => {
      if (!active) return;
      void reportTelemetry('inventory_load_failed', {
        stage: 'initial_load',
        ...diagnosticError(error),
      });
      setSyncStatus('error');
    });
    const reloadFromRealtime = () => {
      void loadRemote().catch((error) => {
        if (!active) return;
        void reportTelemetry('inventory_load_failed', {
          stage: 'realtime_reload',
          ...diagnosticError(error),
        });
        setSyncStatus('error');
      });
    };
    const subscriptions = Promise.all([
      pocketbase.collection('items').subscribe('*', reloadFromRealtime),
      pocketbase.collection('locations').subscribe('*', reloadFromRealtime),
      pocketbase.collection('inventory_events').subscribe('*', reloadFromRealtime),
    ]);
    void subscriptions.catch((error) => {
      if (!active) return;
      void reportTelemetry('inventory_realtime_failed', {
        stage: 'subscribe',
        ...diagnosticError(error),
      });
      setSyncStatus('error');
    });
    return () => {
      active = false;
      void subscriptions.then((unsubscribe) => unsubscribe.forEach((stop) => void stop()));
    };
  }, [home, isRemote, loadRemote]);

  const runRemote = useCallback(
    async (
      optimisticAction: Parameters<typeof inventoryReducer>[1],
      operation: () => Promise<unknown>,
      stage: string,
    ) => {
      dispatch(optimisticAction);
      if (!isRemote) return;
      setSyncStatus('saving');
      try {
        await operation();
        setSyncStatus('synced');
      } catch (error) {
        void reportTelemetry('inventory_mutation_failed', {
          stage,
          ...diagnosticError(error),
        });
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
      rotationItems: selectRotationItems(state.items),
      archivedItems: selectArchivedItems(state),
      syncStatus,
      addItem: async (payload) => {
        if (!isRemote || !pocketbase || !home || !user) {
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
          void reportTelemetry('inventory_mutation_failed', {
            stage: 'add',
            ...diagnosticError(error),
          });
          setSyncStatus('error');
          throw error;
        }
      },
      takeOne: async (itemId, comment, source = 'manual') => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'quantityDecremented', itemId },
          () => mutate(itemId, {
            action: 'remove',
            quantity: 1,
            expectedVersion: item.version,
            comment,
            changeSource: source,
          }),
          'take_one',
        );
      },
      removeQuantity: async (itemId, quantity, comment, source = 'manual') => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        const amount = Math.max(0, quantity);
        await runRemote(
          { type: 'quantityRemoved', itemId, quantity: amount },
          () => mutate(itemId, {
            action: 'remove',
            quantity: amount,
            expectedVersion: item.version,
            comment,
            changeSource: source,
          }),
          'remove_quantity',
        );
      },
      moveItem: async (itemId, locationId, comment, source = 'manual') => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemMoved', itemId, locationId },
          () => mutate(itemId, {
            action: 'move',
            locationId,
            expectedVersion: item.version,
            comment,
            changeSource: source,
          }),
          'move',
        );
      },
      consumeItem: async (itemId, comment, source = 'manual') => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemConsumed', itemId },
          () => mutate(itemId, {
            action: 'consume',
            expectedVersion: item.version,
            comment,
            changeSource: source,
          }),
          'consume',
        );
      },
      restoreItem: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemRestored', itemId },
          () => mutate(itemId, { action: 'restore', expectedVersion: item.version }),
          'restore',
        );
      },
      createStoragePlace: async (input) => {
        if (!isRemote || !pocketbase || !home) {
          dispatch({
            type: 'locationAdded',
            payload: { id: `location-${Date.now()}`, ...input },
          });
          return;
        }
        await pocketbase.send(`/api/iceage/homes/${home.id}/locations`, {
          method: 'POST',
          body: input,
        });
        await loadRemote();
      },
      updateStoragePlace: async (locationId, input) => {
        if (!isRemote || !pocketbase || !home) {
          dispatch({ type: 'locationUpdated', locationId, payload: input });
          return;
        }
        await pocketbase.send(`/api/iceage/homes/${home.id}/locations/${locationId}`, {
          method: 'PATCH',
          body: input,
        });
        await loadRemote();
      },
      archiveStoragePlace: async (locationId) => {
        if (state.locations.length <= 1) throw new Error('Hemmet måste ha minst en aktiv förvaringsplats.');
        if (state.items.some((item) => item.locationId === locationId && item.status === 'active')) {
          throw new Error('Flytta eller förbruka varorna på platsen först.');
        }
        if (!isRemote || !pocketbase || !home) {
          dispatch({ type: 'locationArchived', locationId });
          return;
        }
        await pocketbase.send(`/api/iceage/homes/${home.id}/locations/${locationId}`, {
          method: 'DELETE',
        });
        await loadRemote();
      },
      submitAudit: async (locationId, input) => {
        if (!isRemote || !pocketbase) {
          for (const row of input.rows) {
            const item = state.items.find((entry) => entry.id === row.itemId);
            if (!item) continue;
            dispatch({
              type: 'quantityAudited',
              itemId: row.itemId,
              quantity: row.observedQuantity,
            });
          }
          for (const extra of input.extras) {
            dispatch({
              type: 'itemAdded',
              payload: {
                ...extra,
                locationId,
                dateSource: 'none',
                changeSource: 'audit',
              },
            });
          }
          return;
        }
        setSyncStatus('saving');
        try {
          await pocketbase.send(`/api/iceage/locations/${locationId}/audits`, {
            method: 'POST',
            body: input,
          });
          await loadRemote();
        } catch (error) {
          void reportTelemetry('inventory_audit_failed', {
            stage: 'submit',
            ...diagnosticError(error),
          });
          setSyncStatus('error');
          throw error;
        }
      },
    }),
    [home, isRemote, loadRemote, mutate, runRemote, state, syncStatus, user],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
}
