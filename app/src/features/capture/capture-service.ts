import { Platform } from 'react-native';

import { useHome } from '@/features/home/home-provider';
import { pocketbase } from '@/lib/pocketbase';

import { captureIntentSchema, type CaptureIntent } from './capture-intent';

export type CapturePhoto = { base64: string; mimeType: 'image/jpeg'; uri: string };
export type CaptureTiming = {
  transcriptionMs: number;
  inferenceMs: number;
  totalMs: number;
};
export type CaptureExtractionResult = {
  intent: CaptureIntent;
  timing?: CaptureTiming;
};

export async function extractInventoryIntent(input: {
  homeId: string;
  photo?: CapturePhoto;
  audioUri?: string;
}): Promise<CaptureExtractionResult> {
  if (!pocketbase) throw new Error('Anslut appen till M5-servern för riktig foto- och rösttolkning.');
  if (!input.audioUri) {
    const result = await pocketbase.send<{ intent: unknown; timing?: unknown }>('/api/iceage/extract', {
      method: 'POST',
      body: {
        homeId: input.homeId,
        photoBase64: input.photo?.base64,
        photoMimeType: input.photo?.mimeType,
      },
    });
    return {
      intent: captureIntentSchema.parse(result.intent),
      timing: captureTiming(result.timing),
    };
  }
  const body = new FormData();
  body.append('homeId', input.homeId);
  if (input.photo) {
    body.append('photoBase64', input.photo.base64);
    body.append('photoMimeType', input.photo.mimeType);
  }
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
  const result = await pocketbase.send<{ intent: unknown; timing?: unknown }>('/api/iceage/extract', {
    method: 'POST',
    body,
  });
  return {
    intent: captureIntentSchema.parse(result.intent),
    timing: captureTiming(result.timing),
  };
}

export function useCaptureHomeId() {
  return useHome().home?.id;
}

function captureTiming(value: unknown): CaptureTiming | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const timing = value as Record<string, unknown>;
  const transcriptionMs = boundedDuration(timing.transcriptionMs);
  const inferenceMs = boundedDuration(timing.inferenceMs);
  const totalMs = boundedDuration(timing.totalMs);
  if (transcriptionMs === undefined || inferenceMs === undefined || totalMs === undefined) {
    return undefined;
  }
  return { transcriptionMs, inferenceMs, totalMs };
}

function boundedDuration(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 300_000
    ? value
    : undefined;
}
