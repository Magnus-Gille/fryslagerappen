import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStoredValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStoredValues.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStoredValues.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockStoredValues.delete(key);
    return Promise.resolve();
  }),
}));

import { secureSessionStorage } from '@/lib/secure-session-storage';

describe('secure session storage', () => {
  beforeEach(() => mockStoredValues.clear());

  it('round-trips sessions larger than a single Keychain-safe chunk', async () => {
    const session = 'x'.repeat(3500);
    await secureSessionStorage.setItem('session', session);

    expect(await secureSessionStorage.getItem('session')).toBe(session);
    expect(mockStoredValues.has('session')).toBe(false);
    expect(mockStoredValues.has('session.chunks')).toBe(true);
  });

  it('atomically replaces and removes chunk generations', async () => {
    await secureSessionStorage.setItem('session', 'old'.repeat(1200));
    const oldKeys = [...mockStoredValues.keys()].filter((key) => key !== 'session.chunks');

    await secureSessionStorage.setItem('session', 'new session');
    expect(await secureSessionStorage.getItem('session')).toBe('new session');
    expect(oldKeys.every((key) => !mockStoredValues.has(key))).toBe(true);

    await secureSessionStorage.removeItem('session');
    expect(await secureSessionStorage.getItem('session')).toBeNull();
    expect(mockStoredValues.size).toBe(0);
  });
});
