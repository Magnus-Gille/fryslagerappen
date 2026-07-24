const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Dependency-free encoder so the web audio path never relies on btoa. */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += base64Alphabet[first >> 2];
    result += base64Alphabet[((first & 0b11) << 4) | ((second ?? 0) >> 4)];
    result += second === undefined ? '=' : base64Alphabet[((second & 0b1111) << 2) | ((third ?? 0) >> 6)];
    result += third === undefined ? '=' : base64Alphabet[third & 0b111111];
  }
  return result;
}

export function audioMimeTypeForUri(uri: string): 'audio/webm' | 'audio/m4a' {
  return /\.webm(\?|#|$)/i.test(uri) ? 'audio/webm' : 'audio/m4a';
}

const genericFailure = 'Tolkningen misslyckades. Försök igen.';
const sdkFallbackMessage = 'Something went wrong.';

/**
 * Turns transport-layer failures into actionable Swedish guidance. Backend
 * errors already arrive with Swedish messages and pass through untouched.
 */
export function captureFailureMessage(error: unknown): string {
  const candidate = error as { status?: unknown; message?: unknown } | null;
  const status = typeof candidate?.status === 'number' ? candidate.status : undefined;
  const message =
    typeof candidate?.message === 'string' && candidate.message.trim() !== ''
      ? candidate.message
      : undefined;

  if (status === 0 || message === sdkFallbackMessage) {
    return 'Tolkningen kunde inte skickas till servern. Kontrollera anslutningen och tryck på Försök igen – fotot och rösten finns kvar.';
  }
  if (status === 401 || status === 403) {
    return 'Logga in igen innan tolkningen kan köras.';
  }
  if (status !== undefined && status >= 500) {
    return 'Servern kunde inte tolka just nu. Försök igen om en liten stund.';
  }
  return message ?? genericFailure;
}
