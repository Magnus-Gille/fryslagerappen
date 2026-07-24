export type EatSoonSection =
  | { kind: 'hidden' }
  | { kind: 'empty'; title: string; message: string }
  | { kind: 'list'; title: string; subtitle: string };

/**
 * The section stays visible with an explanation when it has nothing to show,
 * so the feature is discoverable before any item has a date. It only leaves
 * the screen while the user is searching or filtering by place.
 */
export function eatSoonSection(input: {
  query: string;
  activeLocationId?: string;
  itemCount: number;
}): EatSoonSection {
  if (input.query || input.activeLocationId) return { kind: 'hidden' };
  if (input.itemCount === 0) {
    return {
      kind: 'empty',
      title: 'Ät snart',
      message:
        'Inget att prioritera ännu. Ange “Bäst före” när du lägger till eller ändrar en vara, så samlas det som bör användas inom 30 dagar här.',
    };
  }
  return {
    kind: 'list',
    title: 'Ät snart',
    subtitle: 'Planeringsstöd för de närmaste 30 dagarna',
  };
}
