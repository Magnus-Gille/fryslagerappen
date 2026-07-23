import { describe, expect, it } from '@jest/globals';

import {
  normalizeBarcode,
  productProposalFromResponse,
} from '@/features/inventory/barcode-service';

describe('barcode quick path', () => {
  it('normalizes camera payloads but rejects arbitrary text', () => {
    expect(normalizeBarcode(' 07350001234567 ')).toBe('07350001234567');
    expect(normalizeBarcode('1234567')).toBeUndefined();
    expect(normalizeBarcode('735000123456x')).toBeUndefined();
  });

  it('maps a household or Open Food Facts response into an editable proposal', () => {
    expect(
      productProposalFromResponse({
        source: 'open_food_facts',
        product: {
          barcode: '07350001234567',
          name: 'Krossade tomater',
          category: 'Konserver',
          unit: 'burk',
          imageUrl: 'https://images.example/tomato.jpg',
        },
      }),
    ).toEqual({
      barcode: '07350001234567',
      name: 'Krossade tomater',
      category: 'Konserver',
      unit: 'burk',
      imageUrl: 'https://images.example/tomato.jpg',
      mappingSource: 'open_food_facts',
    });
  });
});
