import { describe, expect, test } from '@jest/globals';

import { eatSoonSection } from '@/features/inventory/eat-soon-section';

describe('eatSoonSection', () => {
  test('shows an explanatory empty state when no item has a date', () => {
    const section = eatSoonSection({ query: '', itemCount: 0 });
    expect(section.kind).toBe('empty');
    if (section.kind === 'empty') {
      expect(section.title).toBe('Ät snart');
      expect(section.message).toContain('Bäst före');
    }
  });

  test('shows the list when there are items to prioritize', () => {
    expect(eatSoonSection({ query: '', itemCount: 3 })).toEqual({
      kind: 'list',
      title: 'Ät snart',
      subtitle: 'Planeringsstöd för de närmaste 30 dagarna',
    });
  });

  test('steps aside during search and place filtering', () => {
    expect(eatSoonSection({ query: 'lax', itemCount: 3 }).kind).toBe('hidden');
    expect(
      eatSoonSection({ query: '', activeLocationId: 'upstairs', itemCount: 0 }).kind,
    ).toBe('hidden');
  });
});
