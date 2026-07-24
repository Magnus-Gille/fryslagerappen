import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { useHome } from '@/features/home/home-provider';
import { pocketbase } from '@/lib/pocketbase';

import { captureIntentSchema, type CaptureIntent } from './capture-intent';
import { audioMimeTypeForUri, bytesToBase64 } from './capture-upload';

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
  // Audio travels as base64 in the same JSON body as the photo. The earlier
  // multipart upload failed instantly on iOS (status 0 before any network
  // activity), so no FormData is involved anywhere in this path.
  const audio = input.audioUri ? await readAudioAsBase64(input.audioUri) : undefined;
  const result = await pocketbase.send<{ intent: unknown; timing?: unknown }>('/api/iceage/extract', {
    method: 'POST',
    body: {
      homeId: input.homeId,
      photoBase64: input.photo?.base64,
      photoMimeType: input.photo?.mimeType,
      audioBase64: audio?.base64,
      audioMimeType: audio?.mimeType,
    },
  });
  return {
    intent: captureIntentSchema.parse(result.intent),
    timing: captureTiming(result.timing),
  };
}

async function readAudioAsBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((response) => response.blob());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { base64: bytesToBase64(bytes), mimeType: blob.type || audioMimeTypeForUri(uri) };
  }
  return { base64: await new File(uri).base64(), mimeType: audioMimeTypeForUri(uri) };
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
