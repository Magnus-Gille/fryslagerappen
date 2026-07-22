import { createContext, type PropsWithChildren, useContext, useMemo, useReducer } from 'react';

import {
  createInventoryState,
  inventoryReducer,
  selectActiveItems,
  selectArchivedItems,
  selectEatSoonItems,
} from './inventory-state';
import type { AddItemInput, InventoryState } from './types';

type InventoryContextValue = {
  state: InventoryState;
  activeItems: InventoryState['items'];
  eatSoonItems: InventoryState['items'];
  archivedItems: InventoryState['items'];
  addItem: (input: AddItemInput) => void;
  takeOne: (itemId: string) => void;
  moveItem: (itemId: string, locationId: string) => void;
  consumeItem: (itemId: string) => void;
  restoreItem: (itemId: string) => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(inventoryReducer, undefined, createInventoryState);

  const value = useMemo<InventoryContextValue>(
    () => ({
      state,
      activeItems: selectActiveItems(state, ''),
      eatSoonItems: selectEatSoonItems(state),
      archivedItems: selectArchivedItems(state),
      addItem: (payload) => dispatch({ type: 'itemAdded', payload }),
      takeOne: (itemId) => dispatch({ type: 'quantityDecremented', itemId }),
      moveItem: (itemId, locationId) => dispatch({ type: 'itemMoved', itemId, locationId }),
      consumeItem: (itemId) => dispatch({ type: 'itemConsumed', itemId }),
      restoreItem: (itemId) => dispatch({ type: 'itemRestored', itemId }),
    }),
    [state],
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
