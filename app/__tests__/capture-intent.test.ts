import { describe, expect, it } from '@jest/globals';

import { captureIntentSchema, findLocationId, toAddItemInput } from '@/features/capture/capture-intent';

describe('capture intent', () => {
  it('accepts an add intent and maps a spoken location name', () => {
    const intent = captureIntentSchema.parse({
      action: 'add',
      name: 'Blåbärssylt',
      category: 'Frukt & bär',
      quantity: 2,
      unit: 'burkar',
      locationName: 'Hyllan i ateljén',
      frozenOn: '2026-07-22',
      eatBefore: null,
      dateSource: 'label',
      note: 'Två burkar blåbärssylt',
      confidence: 0.91,
      uncertainFields: [],
    });

    expect(
      toAddItemInput(intent, [
        { id: 'upstairs', name: 'Frysen på övervåningen', description: '', storageType: 'freezer' },
        { id: 'studio-shelf', name: 'Hyllan i ateljén', description: '', storageType: 'dry' },
      ]),
    ).toMatchObject({
      name: 'Blåbärssylt',
      locationId: 'studio-shelf',
      quantity: 2,
    });
  });

  it('rejects unsafe quantities and invalid confidence values', () => {
    const invalid = {
      action: 'remove',
      name: 'Lax',
      quantity: -1,
      confidence: 2,
      uncertainFields: [],
    };

    expect(captureIntentSchema.safeParse(invalid).success).toBe(false);
  });

  it('falls back to the first location when the spoken location is unknown', () => {
    const intent = captureIntentSchema.parse({
      action: 'add',
      name: 'Äppelmos',
      category: 'Frukt & bär',
      quantity: 1,
      unit: 'burk',
      locationName: 'Garaget',
      frozenOn: null,
      eatBefore: null,
      dateSource: 'none',
      note: null,
      confidence: 0.6,
      uncertainFields: ['locationName'],
    });

    expect(
      toAddItemInput(intent, [{ id: 'upstairs', name: 'Frysen på övervåningen', description: '', storageType: 'freezer' }]).locationId,
    ).toBe('upstairs');
  });

  it('does not silently resolve an unknown move destination', () => {
    expect(
      findLocationId('Skafferiet', [
        { id: 'upstairs', name: 'Frysen på övervåningen', description: '', storageType: 'freezer' },
        { id: 'downstairs', name: 'Frysen i källaren', description: '', storageType: 'freezer' },
      ]),
    ).toBeUndefined();
  });
});
