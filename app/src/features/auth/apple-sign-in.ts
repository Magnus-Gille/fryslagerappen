import * as AppleAuthentication from 'expo-apple-authentication';

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
): Promise<boolean> {
  if (!(await apple.isAvailableAsync())) {
    throw new Error('Apple-inloggning stöds inte på den här enheten.');
  }

  const authMethods = await client.collection('users').listAuthMethods();
  const hasApple = authMethods.oauth2?.providers?.some((provider) => provider.name === 'apple');
  if (!hasApple) throw new Error('Apple-inloggning är inte aktiverad på M5-servern.');

  try {
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.authorizationCode) {
      throw new Error('Apple skickade ingen giltig inloggningskod. Försök igen.');
    }

    await client.collection('users').authWithOAuth2Code(
      'apple',
      credential.authorizationCode,
      '',
      '',
      { displayName: displayName(credential) },
    );
    return true;
  } catch (error) {
    if (isCancellation(error)) return false;
    throw error;
  }
}
