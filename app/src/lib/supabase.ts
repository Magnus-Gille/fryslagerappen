import 'react-native-url-polyfill/auto';

import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

import { runtimeConfig } from './runtime-config';

const secureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const secureChunkSize = 1000;

type StoredChunks = { generation: string; count: number };

function parseStoredChunks(value: string | null): StoredChunks | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredChunks>;
    if (
      typeof parsed.generation !== 'string' ||
      !/^[a-z0-9-]+$/.test(parsed.generation) ||
      !Number.isInteger(parsed.count) ||
      !parsed.count ||
      parsed.count < 1 ||
      parsed.count > 128
    ) {
      return null;
    }
    return parsed as StoredChunks;
  } catch {
    return null;
  }
}

function chunkKey(key: string, generation: string, index: number) {
  return `${key}.${generation}.${index}`;
}

export const secureSessionStorage = {
  getItem: async (key: string) => {
    const metadata = parseStoredChunks(await SecureStore.getItemAsync(`${key}.chunks`));
    if (!metadata) return SecureStore.getItemAsync(key);
    const chunks = await Promise.all(
      Array.from({ length: metadata.count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, metadata.generation, index)),
      ),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },
  setItem: async (key: string, value: string) => {
    const metadataKey = `${key}.chunks`;
    const previous = parseStoredChunks(await SecureStore.getItemAsync(metadataKey));
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const chunks = Array.from(
      { length: Math.max(1, Math.ceil(value.length / secureChunkSize)) },
      (_, index) => value.slice(index * secureChunkSize, (index + 1) * secureChunkSize),
    );
    if (chunks.length > 128) throw new Error('Auth session is too large to store securely.');
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(key, generation, index), chunk, secureStoreOptions),
      ),
    );
    await SecureStore.setItemAsync(
      metadataKey,
      JSON.stringify({ generation, count: chunks.length }),
      secureStoreOptions,
    );
    await SecureStore.deleteItemAsync(key);
    if (previous) {
      await Promise.all(
        Array.from({ length: previous.count }, (_, index) =>
          SecureStore.deleteItemAsync(chunkKey(key, previous.generation, index)),
        ),
      );
    }
  },
  removeItem: async (key: string) => {
    const metadataKey = `${key}.chunks`;
    const metadata = parseStoredChunks(await SecureStore.getItemAsync(metadataKey));
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      SecureStore.deleteItemAsync(metadataKey),
      ...(metadata
        ? Array.from({ length: metadata.count }, (_, index) =>
            SecureStore.deleteItemAsync(chunkKey(key, metadata.generation, index)),
          )
        : []),
    ]);
  },
};

export const supabase = runtimeConfig.hasSupabase
  ? createClient(runtimeConfig.supabaseUrl!, runtimeConfig.supabasePublishableKey!, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: secureSessionStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
