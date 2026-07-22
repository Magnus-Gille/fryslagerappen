import * as AppleAuthentication from 'expo-apple-authentication';

import {
  diagnosticError,
  reportTelemetry,
  type TelemetryReporter,
} from '@/lib/telemetry';

type AppleCredential = {
  authorizationCode: string | null;
  email?: string | null;
  fullName?: {
    givenName?: string | null;
    middleName?: string | null;
    familyName?: string | null;
  } | null;
};

type AppleAuthApi = {
  isAvailableAsync: () => Promise<boolean>;
  signInAsync: (options: { requestedScopes: number[] }) => Promise<AppleCredential>;
  AppleAuthenticationScope: { FULL_NAME: number; EMAIL: number };
};

type AppleAuthService = {
  listAuthMethods: () => Promise<{ oauth2?: { providers?: { name: string }[] } }>;
  authWithOAuth2Code: (
    provider: string,
    code: string,
    codeVerifier: string,
    redirectUrl: string,
    createData: Record<string, unknown>,
  ) => Promise<unknown>;
};

type AppleAuthClient = {
  collection: (name: string) => AppleAuthService;
};

function displayName(credential: Awaited<ReturnType<AppleAuthApi['signInAsync']>>) {
  const parts = [
    credential.fullName?.givenName,
    credential.fullName?.middleName,
    credential.fullName?.familyName,
  ].filter((part): part is string => Boolean(part?.trim()));

  if (parts.length) return parts.join(' ').slice(0, 80);
  if (credential.email) return credential.email.split('@')[0].slice(0, 80);
  return 'Apple-användare';
}

function isCancellation(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_REQUEST_CANCELED',
  );
}

export async function authenticateWithApple(
  client: AppleAuthClient,
  apple: AppleAuthApi = AppleAuthentication,
  report: TelemetryReporter = reportTelemetry,
): Promise<boolean> {
  let stage = 'availability';
  void report('auth_apple_started');
  try {
    if (!(await apple.isAvailableAsync())) {
      void report('auth_apple_unavailable', { stage });
      throw new Error('Apple-inloggning stöds inte på den här enheten.');
    }

    stage = 'provider_config';
    const authMethods = await client.collection('users').listAuthMethods();
    const hasApple = authMethods.oauth2?.providers?.some((provider) => provider.name === 'apple');
    if (!hasApple) {
      void report('auth_apple_provider_missing', { stage });
      throw new Error('Apple-inloggning är inte aktiverad på M5-servern.');
    }

    stage = 'apple_sheet';
    void report('auth_apple_sheet_opened', { stage });
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.authorizationCode) {
      throw new Error('Apple skickade ingen giltig inloggningskod. Försök igen.');
    }
    void report('auth_apple_code_received', { stage });

    stage = 'exchange';
    void report('auth_apple_exchange_started', { stage });
    await client.collection('users').authWithOAuth2Code(
      'apple',
      credential.authorizationCode,
      '',
      '',
      { displayName: displayName(credential) },
    );
    void report('auth_apple_succeeded', { stage });
    return true;
  } catch (error) {
    if (isCancellation(error)) {
      void report('auth_apple_cancelled', { stage });
      return false;
    }
    void report('auth_apple_failed', { stage, ...diagnosticError(error) });
    throw error;
  }
}
