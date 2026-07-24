import { describe, expect, it } from '@jest/globals';

import {
  createInventoryState,
  inventoryReducer,
  selectActiveItems,
  selectEatSoonItems,
} from '../src/features/inventory/inventory-state';

describe('inventory state', () => {
  it('starts with typed freezer, fridge, and dry-storage places', () => {
    const state = createInventoryState();

    expect(state.locations.map(({ name, storageType }) => ({ name, storageType }))).toEqual([
      { name: 'Frysen på övervåningen', storageType: 'freezer' },
      { name: 'Frysen i källaren', storageType: 'freezer' },
      { name: 'Kylskåpet på övervåningen', storageType: 'fridge' },
      { name: 'Hyllan på övervåningen', storageType: 'dry' },
      { name: 'Hyllan i ateljén', storageType: 'dry' },
    ]);
    expect(state.items).toContainEqual(
      expect.objectContaining({
        name: 'Pasta',
        category: 'Torrvaror',
        locationId: 'studio-shelf',
      }),
    );
  });

  it('adds, edits, and archives configurable storage places locally', () => {
    const initial = createInventoryState();
    const added = inventoryReducer(initial, {
      type: 'locationAdded',
      payload: {
        id: 'garage-fridge',
        name: 'Extrakylen i garaget',
        description: 'Dryck',
        storageType: 'fridge',
      },
    });
    expect(added.locations.at(-1)).toMatchObject({
      id: 'garage-fridge',
      name: 'Extrakylen i garaget',
      storageType: 'fridge',
    });

    const edited = inventoryReducer(added, {
      type: 'locationUpdated',
      locationId: 'garage-fridge',
      payload: { name: 'Dryckeskylen', description: 'Garage', storageType: 'fridge' },
    });
    expect(edited.locations.at(-1)?.name).toBe('Dryckeskylen');

    const archived = inventoryReducer(edited, {
      type: 'locationArchived',
      locationId: 'garage-fridge',
    });
    expect(archived.locations).not.toContainEqual(expect.objectContaining({ id: 'garage-fridge' }));
  });

  it('searches active items across names and categories', () => {
    const state = createInventoryState();

    expect(selectActiveItems(state, '')).toHaveLength(state.items.length);
    expect(selectActiveItems(state, 'bär').map((item) => item.name)).toEqual([
      'Blåbär',
      'Hallon',
    ]);
    expect(selectActiveItems(state, 'fisk').map((item) => item.name)).toEqual(['Laxfilé']);
  });

  it('prioritizes active items whose planning date is near', () => {
    const state = createInventoryState();

    expect(
      selectEatSoonItems(state, new Date('2026-07-22T00:00:00.000Z')).map((item) => item.name),
    ).toEqual([
      'Kantarellsås',
      'Laxfilé',
      'Blåbär',
    ]);
  });

  it('adds a confirmed item with an event and selected freezer location', () => {
    const state = inventoryReducer(createInventoryState(), {
      type: 'itemAdded',
      payload: {
        name: 'Äppelmos',
        category: 'Frukt & bär',
        quantity: 2,
        unit: 'burkar',
        locationId: 'downstairs',
        frozenOn: '2026-07-22',
        eatBefore: '2027-01-22',
        dateSource: 'estimated',
        note: 'Simulerad rösttolkning',
      },
    });

    expect(state.items[0]).toMatchObject({
      name: 'Äppelmos',
      locationId: 'downstairs',
      status: 'active',
      version: 1,
    });
    expect(state.events[0]).toMatchObject({ type: 'created', itemId: state.items[0].id });
  });

  it('supports one-tap decrement, consume, move, and restore', () => {
    const initial = createInventoryState();
    const berries = initial.items.find((item) => item.name === 'Blåbär');
    expect(berries).toBeDefined();

    const decremented = inventoryReducer(initial, {
      type: 'quantityDecremented',
      itemId: berries!.id,
    });
    expect(decremented.items.find((item) => item.id === berries!.id)?.quantity).toBe(2);

    const moved = inventoryReducer(decremented, {
      type: 'itemMoved',
      itemId: berries!.id,
      locationId: 'upstairs',
    });
    expect(moved.items.find((item) => item.id === berries!.id)?.locationId).toBe('upstairs');

    const consumed = inventoryReducer(moved, { type: 'itemConsumed', itemId: berries!.id });
    expect(selectActiveItems(consumed, '')).not.toContainEqual(
      expect.objectContaining({ id: berries!.id }),
    );

    const restored = inventoryReducer(consumed, { type: 'itemRestored', itemId: berries!.id });
    expect(selectActiveItems(restored, '')).toContainEqual(
      expect.objectContaining({ id: berries!.id, status: 'active' }),
    );
  });

  it('archives the final portion and restores it with a usable quantity', () => {
    const initial = createInventoryState();
    const sauce = initial.items.find((item) => item.name === 'Kantarellsås');
    expect(sauce).toMatchObject({ quantity: 1, status: 'active' });

    const consumed = inventoryReducer(initial, {
      type: 'quantityDecremented',
      itemId: sauce!.id,
    });
    expect(consumed.items.find((item) => item.id === sauce!.id)).toMatchObject({
      quantity: 0,
      status: 'consumed',
    });

    const restored = inventoryReducer(consumed, { type: 'itemRestored', itemId: sauce!.id });
    expect(restored.items.find((item) => item.id === sauce!.id)).toMatchObject({
      quantity: 1,
      status: 'active',
    });
  });

  it('applies an audited quantity exactly, including newly found portions', () => {
    const initial = createInventoryState();
    const berries = initial.items.find((item) => item.name === 'Blåbär')!;

    const audited = inventoryReducer(initial, {
      type: 'quantityAudited',
      itemId: berries.id,
      quantity: berries.quantity + 2,
    });

    expect(audited.items.find((item) => item.id === berries.id)).toMatchObject({
      quantity: berries.quantity + 2,
      status: 'active',
      version: berries.version + 1,
    });
    expect(audited.events[0]).toMatchObject({
      type: 'audited',
      itemId: berries.id,
      quantityBefore: berries.quantity,
      quantityAfter: berries.quantity + 2,
      quantityDelta: 2,
      source: 'audit',
    });
  });
});
