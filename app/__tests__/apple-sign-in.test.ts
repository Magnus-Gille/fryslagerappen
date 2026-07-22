import { describe, expect, it, jest } from '@jest/globals';

import { authenticateWithApple } from '@/features/auth/apple-sign-in';

type TelemetryReporter = (event: string, details?: Record<string, unknown>) => Promise<boolean>;

type FakeCredential = {
  authorizationCode: string | null;
  email?: string | null;
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
};

function authHarness(providers: { name: string }[] = [{ name: 'apple' }]) {
  const service = {
    listAuthMethods: jest.fn(async () => ({ oauth2: { providers } })),
    authWithOAuth2Code: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  };
  const client = { collection: jest.fn(() => service) };
  const apple = {
    isAvailableAsync: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    signInAsync: jest.fn<() => Promise<FakeCredential>>().mockResolvedValue({
      authorizationCode: 'one-time-code',
      fullName: { givenName: 'Magnus', familyName: 'Gille' },
    }),
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  };

  return { apple, client, service };
}

describe('native Apple sign-in', () => {
  it('exchanges the native one-time code with PocketBase and keeps the first-login name', async () => {
    const { apple, client, service } = authHarness();
    const report = jest.fn<TelemetryReporter>().mockResolvedValue(true);

    await expect(authenticateWithApple(client, apple, report)).resolves.toBe(true);

    expect(apple.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1] });
    expect(service.authWithOAuth2Code).toHaveBeenCalledWith(
      'apple',
      'one-time-code',
      '',
      '',
      { displayName: 'Magnus Gille' },
    );
    expect(report.mock.calls.map(([event]) => event)).toEqual([
      'auth_apple_started',
      'auth_apple_sheet_opened',
      'auth_apple_code_received',
      'auth_apple_exchange_started',
      'auth_apple_succeeded',
    ]);
  });

  it('checks backend configuration before opening the Apple sheet', async () => {
    const { apple, client } = authHarness([]);

    await expect(authenticateWithApple(client, apple)).rejects.toThrow(
      'Apple-inloggning är inte aktiverad på M5-servern.',
    );
    expect(apple.signInAsync).not.toHaveBeenCalled();
  });

  it('uses the Apple relay email name when Apple no longer returns the full name', async () => {
    const { apple, client, service } = authHarness();
    apple.signInAsync.mockResolvedValue({
      authorizationCode: 'later-login-code',
      email: 'magnus@privaterelay.appleid.com',
      fullName: null,
    });

    await authenticateWithApple(client, apple);

    expect(service.authWithOAuth2Code).toHaveBeenCalledWith(
      'apple',
      'later-login-code',
      '',
      '',
      { displayName: 'magnus' },
    );
  });

  it('treats a dismissed Apple sheet as cancellation instead of a login failure', async () => {
    const { apple, client } = authHarness();
    const report = jest.fn<TelemetryReporter>().mockResolvedValue(true);
    apple.signInAsync.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'ERR_REQUEST_CANCELED' }));

    await expect(authenticateWithApple(client, apple, report)).resolves.toBe(false);
    expect(report).toHaveBeenLastCalledWith('auth_apple_cancelled', { stage: 'apple_sheet' });
  });

  it('reports a sanitized backend exchange failure without leaking the Apple code', async () => {
    const { apple, client, service } = authHarness();
    const report = jest.fn<TelemetryReporter>().mockResolvedValue(true);
    service.authWithOAuth2Code.mockRejectedValue(
      Object.assign(new Error('Only superusers can perform this action'), { status: 400 }),
    );

    await expect(authenticateWithApple(client, apple, report)).rejects.toThrow('Only superusers');

    expect(report).toHaveBeenLastCalledWith('auth_apple_failed', {
      stage: 'exchange',
      status: 400,
      errorMessage: 'Only superusers can perform this action',
    });
    expect(JSON.stringify(report.mock.calls)).not.toContain('one-time-code');
  });
});
