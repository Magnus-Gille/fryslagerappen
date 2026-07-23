import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { runtimeConfig } from './runtime-config';

export type TelemetryEvent =
  | 'app_started'
  | 'backend_probe_succeeded'
  | 'backend_probe_failed'
  | 'auth_refresh_failed'
  | 'auth_password_failed'
  | 'auth_signup_failed'
  | 'auth_apple_started'
  | 'auth_apple_unavailable'
  | 'auth_apple_provider_missing'
  | 'auth_apple_sheet_opened'
  | 'auth_apple_code_received'
  | 'auth_apple_exchange_started'
  | 'auth_apple_succeeded'
  | 'auth_apple_cancelled'
  | 'auth_apple_failed'
  | 'home_load_failed'
  | 'inventory_load_failed'
  | 'inventory_realtime_failed'
  | 'inventory_mutation_failed'
  | 'capture_extraction_started'
  | 'capture_extraction_succeeded'
  | 'capture_extraction_failed'
  | 'feedback_opened'
  | 'feedback_succeeded'
  | 'feedback_failed';

export type TelemetryDetails = {
  stage?: string;
  status?: number;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  serverDurationMs?: number;
  transcriptionMs?: number;
  inferenceMs?: number;
  reachable?: boolean;
};

export type TelemetryReporter = (
  event: TelemetryEvent,
  details?: TelemetryDetails,
) => Promise<boolean>;

type Fetcher = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean }>;

type TelemetryMetadata = {
  appVersion?: string | null;
  buildNumber?: string | null;
  platform?: string | null;
  osVersion?: string | null;
  deviceModel?: string | null;
};

type TelemetryClientOptions = {
  backendUrl: string | undefined;
  fetcher: Fetcher;
  metadata: TelemetryMetadata;
  sessionId: string;
};

const maxTextLength = 240;

function boundedText(value: unknown, max = maxTextLength) {
  if (typeof value !== 'string') return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

function redact(value: unknown) {
  const text = boundedText(value);
  if (!text) return undefined;
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/Bearer\s+[^\s]+/gi, '[credential]')
    .replace(/\b(token|code|secret|password)=([^\s&]+)/gi, '$1=[credential]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[credential]');
}

function boundedNumber(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : undefined;
}

export function diagnosticError(error: unknown): TelemetryDetails {
  if (!(error && typeof error === 'object')) {
    return { errorMessage: redact(String(error)) };
  }

  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  return {
    errorCode: boundedText(candidate.code, 80),
    status: boundedNumber(candidate.status, 100, 599),
    errorMessage: redact(candidate.message),
  };
}

export function createTelemetryClient(options: TelemetryClientOptions) {
  let sequence = 0;

  const report: TelemetryReporter = async (event, details = {}) => {
    if (!options.backendUrl) return false;
    sequence += 1;
    const payload = {
      event,
      sessionId: options.sessionId,
      sequence,
      appVersion: boundedText(options.metadata.appVersion, 32),
      buildNumber: boundedText(options.metadata.buildNumber, 32),
      platform: boundedText(options.metadata.platform, 24),
      osVersion: boundedText(options.metadata.osVersion, 48),
      deviceModel: boundedText(options.metadata.deviceModel, 80),
      stage: boundedText(details.stage, 48),
      status: boundedNumber(details.status, 100, 599),
      errorCode: boundedText(details.errorCode, 80),
      errorMessage: redact(details.errorMessage),
      durationMs: boundedNumber(details.durationMs, 0, 300_000),
      serverDurationMs: boundedNumber(details.serverDurationMs, 0, 300_000),
      transcriptionMs: boundedNumber(details.transcriptionMs, 0, 300_000),
      inferenceMs: boundedNumber(details.inferenceMs, 0, 300_000),
      reachable: typeof details.reachable === 'boolean' ? details.reachable : undefined,
    };
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    const controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), 4_000) : undefined;

    try {
      const response = await options.fetcher(`${options.backendUrl}/api/iceage/telemetry`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cleanPayload),
        signal: controller?.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  return { report };
}

export const telemetrySessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const client = createTelemetryClient({
  backendUrl: runtimeConfig.backendUrl,
  fetcher: globalThis.fetch,
  sessionId: telemetrySessionId,
  metadata: {
    appVersion: Constants.expoConfig?.version,
    buildNumber: Constants.expoConfig?.ios?.buildNumber,
    platform: Platform.OS,
    osVersion: Device.osVersion,
    deviceModel: Device.modelName,
  },
});

export const reportTelemetry = client.report;

let started = false;

export function startPhoneTelemetry() {
  if (started) return;
  started = true;
  void reportTelemetry('app_started');
  if (!runtimeConfig.backendUrl) return;

  const startedAt = Date.now();
  void globalThis
    .fetch(`${runtimeConfig.backendUrl}/api/iceage/health`)
    .then((response) =>
      reportTelemetry(response.ok ? 'backend_probe_succeeded' : 'backend_probe_failed', {
        stage: 'health',
        status: response.status,
        reachable: true,
        durationMs: Date.now() - startedAt,
      }),
    )
    .catch((error) =>
      reportTelemetry('backend_probe_failed', {
        stage: 'health',
        reachable: false,
        durationMs: Date.now() - startedAt,
        ...diagnosticError(error),
      }),
    );
}
