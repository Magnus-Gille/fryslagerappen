const forceDemo = process.env.EXPO_PUBLIC_ICEAGE_FORCE_DEMO === '1';
const backendUrl = forceDemo
  ? undefined
  : process.env.EXPO_PUBLIC_ICEAGE_API_URL?.trim().replace(/\/$/, '');

export const runtimeConfig = {
  backendUrl,
  hasBackend: Boolean(backendUrl),
} as const;
