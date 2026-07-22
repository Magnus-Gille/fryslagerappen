const backendUrl = process.env.EXPO_PUBLIC_ICEAGE_API_URL?.trim().replace(/\/$/, '');

export const runtimeConfig = {
  backendUrl,
  hasBackend: Boolean(backendUrl),
} as const;
