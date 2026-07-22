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
import { supabase } from '@/lib/supabase';

import {
  createInventoryState,
  inventoryReducer,
  selectActiveItems,
  selectArchivedItems,
  selectEatSoonItems,
} from './inventory-state';
import { eventFromRow, itemFromRow, locationFromRow } from './remote-inventory';
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
  const isRemote = Boolean(supabase && user && household);
  const [syncStatus, setSyncStatus] = useState<InventoryContextValue['syncStatus']>(
    isRemote ? 'loading' : 'local',
  );

  const loadRemote = useCallback(async () => {
    if (!supabase || !household) return;
    const loadNumber = ++latestLoad.current;
    const [locationsResult, itemsResult, eventsResult] = await Promise.all([
      supabase.from('locations').select('id, name, description').eq('household_id', household.id).is('archived_at', null).order('position'),
      supabase.from('items').select('id, name, category, quantity, unit, location_id, frozen_on, eat_before, date_source, note, status, created_at, updated_at, version').eq('household_id', household.id).order('updated_at', { ascending: false }),
      supabase.from('inventory_events').select('id, item_id, event_type, occurred_at').eq('household_id', household.id).order('occurred_at', { ascending: false }).limit(100),
    ]);
    const error = locationsResult.error ?? itemsResult.error ?? eventsResult.error;
    if (error) throw error;
    if (loadNumber !== latestLoad.current) return;
    dispatch({
      type: 'stateReplaced',
      payload: {
        locations: (locationsResult.data ?? []).map(locationFromRow),
        items: (itemsResult.data ?? []).map(itemFromRow),
        events: (eventsResult.data ?? []).map(eventFromRow),
      },
    });
    setSyncStatus('synced');
  }, [household]);

  useEffect(() => {
    if (!isRemote || !household || !supabase) {
      return;
    }
    Promise.resolve()
      .then(() => {
        setSyncStatus('loading');
        return loadRemote();
      })
      .catch(() => setSyncStatus('error'));
    const channel = supabase
      .channel(`inventory:${household.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `household_id=eq.${household.id}` }, () => loadRemote())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations', filter: `household_id=eq.${household.id}` }, () => loadRemote())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_events', filter: `household_id=eq.${household.id}` }, () => loadRemote())
      .subscribe();
    return () => {
      supabase?.removeChannel(channel);
    };
  }, [household, isRemote, loadRemote]);

  const runRemote = useCallback(
    async (optimisticAction: Parameters<typeof inventoryReducer>[1], operation: () => PromiseLike<{ error: Error | null }>) => {
      dispatch(optimisticAction);
      if (!isRemote) return;
      setSyncStatus('saving');
      const { error } = await operation();
      if (error) {
        setSyncStatus('error');
        await loadRemote();
        throw error;
      }
      setSyncStatus('synced');
    },
    [isRemote, loadRemote],
  );

  const value = useMemo<InventoryContextValue>(
    () => ({
      state,
      activeItems: selectActiveItems(state, ''),
      eatSoonItems: selectEatSoonItems(state),
      archivedItems: selectArchivedItems(state),
      syncStatus,
      addItem: async (payload) => {
        if (!isRemote || !supabase || !household || !user) {
          dispatch({ type: 'itemAdded', payload });
          return;
        }
        setSyncStatus('saving');
        const { error } = await supabase
          .from('items')
          .insert({
            household_id: household.id,
            location_id: payload.locationId,
            name: payload.name,
            category: payload.category,
            quantity: payload.quantity,
            unit: payload.unit,
            frozen_on: payload.frozenOn || null,
            eat_before: payload.eatBefore || null,
            date_source: payload.dateSource,
            note: payload.note || null,
            created_by: user.id,
            updated_by: user.id,
          });
        if (error) {
          setSyncStatus('error');
          throw error;
        }
        await loadRemote();
      },
      takeOne: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'quantityDecremented', itemId },
          async () => {
            const { data, error } = await supabase!
              .from('items')
              .update({ quantity: Math.max(0, item.quantity - 1), status: item.quantity <= 1 ? 'consumed' : item.status, updated_by: user!.id })
              .eq('id', itemId)
              .eq('version', item.version)
              .select('id')
              .maybeSingle();
            return { error: error ?? (data ? null : new Error('Inventory changed on another device. Try again.')) };
          },
        );
      },
      removeQuantity: async (itemId, quantity) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        const amount = Math.max(0, quantity);
        await runRemote(
          { type: 'quantityRemoved', itemId, quantity: amount },
          async () => {
            const { data, error } = await supabase!
              .from('items')
              .update({ quantity: Math.max(0, item.quantity - amount), status: item.quantity <= amount ? 'consumed' : item.status, updated_by: user!.id })
              .eq('id', itemId)
              .eq('version', item.version)
              .select('id')
              .maybeSingle();
            return { error: error ?? (data ? null : new Error('Inventory changed on another device. Try again.')) };
          },
        );
      },
      moveItem: async (itemId, locationId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemMoved', itemId, locationId },
          async () => {
            const { data, error } = await supabase!.from('items').update({ location_id: locationId, updated_by: user!.id }).eq('id', itemId).eq('version', item.version).select('id').maybeSingle();
            return { error: error ?? (data ? null : new Error('Inventory changed on another device. Try again.')) };
          },
        );
      },
      consumeItem: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemConsumed', itemId },
          async () => {
            const { data, error } = await supabase!.from('items').update({ status: 'consumed', updated_by: user!.id }).eq('id', itemId).eq('version', item.version).select('id').maybeSingle();
            return { error: error ?? (data ? null : new Error('Inventory changed on another device. Try again.')) };
          },
        );
      },
      restoreItem: async (itemId) => {
        const item = state.items.find((entry) => entry.id === itemId);
        if (!item) return;
        await runRemote(
          { type: 'itemRestored', itemId },
          async () => {
            const { data, error } = await supabase!.from('items').update({ status: 'active', quantity: Math.max(1, item.quantity), updated_by: user!.id }).eq('id', itemId).eq('version', item.version).select('id').maybeSingle();
            return { error: error ?? (data ? null : new Error('Inventory changed on another device. Try again.')) };
          },
        );
      },
    }),
    [household, isRemote, loadRemote, runRemote, state, syncStatus, user],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
}
