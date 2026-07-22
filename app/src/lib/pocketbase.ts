import PocketBase, { AsyncAuthStore } from 'pocketbase';
import EventSource from 'react-native-sse';
import { Platform } from 'react-native';

import { runtimeConfig } from './runtime-config';
import { secureSessionStorage } from './secure-session-storage';

const authStorageKey = 'iceage-pocketbase-auth';
const nativeInitialAuth =
  Platform.OS === 'web' ? Promise.resolve(null) : secureSessionStorage.getItem(authStorageKey);

if (Platform.OS !== 'web' && typeof globalThis.EventSource === 'undefined') {
  globalThis.EventSource = EventSource as unknown as typeof globalThis.EventSource;
}

const authStore =
  Platform.OS === 'web'
    ? undefined
    : new AsyncAuthStore({
        initial: nativeInitialAuth,
        save: (serialized) => secureSessionStorage.setItem(authStorageKey, serialized),
        clear: () => secureSessionStorage.removeItem(authStorageKey),
      });

export const pocketbase = runtimeConfig.hasBackend
  ? new PocketBase(runtimeConfig.backendUrl!, authStore)
  : null;

pocketbase?.autoCancellation(false);

export const pocketbaseAuthReady = nativeInitialAuth.then(() => undefined);
