import { Platform } from 'react-native';

import { useHousehold } from '@/features/household/household-provider';
import { supabase } from '@/lib/supabase';

import { captureIntentSchema, type CaptureIntent } from './capture-intent';

export type CapturePhoto = { base64: string; mimeType: 'image/jpeg'; uri: string };

export async function extractInventoryIntent(input: {
  householdId: string;
  photo?: CapturePhoto;
  audioUri?: string;
}): Promise<CaptureIntent> {
  if (!supabase) throw new Error('Anslut appen till Supabase för riktig foto- och rösttolkning.');
  const body = new FormData();
  body.append('householdId', input.householdId);
  if (input.photo) {
    body.append('photoBase64', input.photo.base64);
    body.append('photoMimeType', input.photo.mimeType);
  }
  if (input.audioUri) {
    if (Platform.OS === 'web') {
      const blob = await fetch(input.audioUri).then((response) => response.blob());
      body.append('audio', blob, 'inventory.webm');
    } else {
      body.append('audio', {
        uri: input.audioUri,
        name: 'inventory.m4a',
        type: 'audio/m4a',
      } as unknown as Blob);
    }
  }
  const { data, error } = await supabase.functions.invoke('extract-inventory', { body });
  if (error) throw error;
  return captureIntentSchema.parse(data?.intent);
}

export function useCaptureHouseholdId() {
  return useHousehold().household?.id;
}
