import { z } from 'zod';

import type { AddItemInput, FreezerLocation } from '@/features/inventory/types';

export const captureIntentSchema = z.object({
  action: z.enum(['add', 'remove', 'consume', 'move']),
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80).default('Övrigt'),
  quantity: z.number().finite().positive().max(1000).default(1),
  unit: z.string().trim().min(1).max(40).default('st'),
  locationName: z.string().trim().max(120).nullable().default(null),
  destinationName: z.string().trim().max(120).nullable().default(null),
  frozenOn: z.iso.date().nullable().default(null),
  eatBefore: z.iso.date().nullable().default(null),
  dateSource: z.enum(['manual', 'label', 'estimated', 'none']).default('none'),
  note: z.string().trim().max(500).nullable().default(null),
  transcript: z.string().trim().max(1000).nullable().default(null),
  confidence: z.number().finite().min(0).max(1),
  uncertainFields: z.array(z.string().max(80)).max(20),
});

export type CaptureIntent = z.infer<typeof captureIntentSchema>;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('sv-SE');
}

export function findLocationId(locationName: string | null, locations: FreezerLocation[]) {
  if (!locationName) return undefined;
  const wanted = normalize(locationName);
  return (
    locations.find((location) => normalize(location.name) === wanted)?.id ??
    locations.find(
      (location) => normalize(location.name).includes(wanted) || wanted.includes(normalize(location.name)),
    )?.id
  );
}

export function matchLocationId(locationName: string | null, locations: FreezerLocation[]) {
  return findLocationId(locationName, locations) ?? locations[0]?.id;
}

export function toAddItemInput(intent: CaptureIntent, locations: FreezerLocation[]): AddItemInput {
  const locationId = matchLocationId(intent.locationName, locations);
  if (!locationId) {
    throw new Error('Hushållet saknar en aktiv förvaringsplats.');
  }

  return {
    name: intent.name,
    category: intent.category,
    quantity: intent.quantity,
    unit: intent.unit,
    locationId,
    frozenOn: intent.frozenOn ?? undefined,
    eatBefore: intent.eatBefore ?? undefined,
    dateSource: intent.dateSource,
    note: intent.note ?? intent.transcript ?? undefined,
  };
}
