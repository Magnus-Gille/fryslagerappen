import { describe, expect, it, jest } from '@jest/globals';

import { createTelemetryClient, diagnosticError } from '@/lib/telemetry';

describe('phone test telemetry', () => {
  it('sends only allowlisted diagnostics and never arbitrary sensitive fields', async () => {
    const fetcher = jest.fn<() => Promise<{ ok: boolean }>>().mockResolvedValue({ ok: true });
    const telemetry = createTelemetryClient({
      backendUrl: 'https://iceage.example.invalid',
      fetcher,
      metadata: {
        appVersion: '1.2.3',
        buildNumber: '45',
        platform: 'ios',
        osVersion: '26.0',
        deviceModel: 'iPhone',
      },
      sessionId: 'test-session',
    });

    await telemetry.report('auth_apple_failed', {
      stage: 'exchange',
      status: 400,
      errorCode: 'oauth2_exchange_failed',
      errorMessage: 'Only superusers can perform this action for magnus@example.com Bearer secret-token',
      durationMs: 4_200,
      serverDurationMs: 3_900,
      transcriptionMs: 1_100,
      inferenceMs: 2_700,
      email: 'must-not-leave-the-phone@example.com',
      authorizationCode: 'must-not-leave-the-phone',
    } as never);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, request] = fetcher.mock.calls[0] as unknown as [string, { body: string; headers: object }];
    const body = JSON.parse(request.body);
    expect(body).toEqual({
      event: 'auth_apple_failed',
      sessionId: 'test-session',
      sequence: 1,
      appVersion: '1.2.3',
      buildNumber: '45',
      platform: 'ios',
      osVersion: '26.0',
      deviceModel: 'iPhone',
      stage: 'exchange',
      status: 400,
      errorCode: 'oauth2_exchange_failed',
      errorMessage: 'Only superusers can perform this action for [email] [credential]',
      durationMs: 4_200,
      serverDurationMs: 3_900,
      transcriptionMs: 1_100,
      inferenceMs: 2_700,
    });
    expect(request.body).not.toContain('must-not-leave-the-phone');
    expect(request.headers).not.toHaveProperty('authorization');
  });

  it('is fire-and-forget safe when the backend is absent or unreachable', async () => {
    const fetcher = jest.fn<() => Promise<{ ok: boolean }>>().mockRejectedValue(new Error('offline'));
    const withoutBackend = createTelemetryClient({
      backendUrl: undefined,
      fetcher,
      metadata: {},
      sessionId: 'offline-session',
    });
    const unreachable = createTelemetryClient({
      backendUrl: 'https://iceage.example.invalid',
      fetcher,
      metadata: {},
      sessionId: 'offline-session',
    });

    await expect(withoutBackend.report('app_started')).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(unreachable.report('backend_probe_failed', { stage: 'health' })).resolves.toBe(false);
  });

  it('extracts bounded, redacted diagnostics from unknown errors', () => {
    const error = Object.assign(
      new Error('Login failed for sara@example.com with token=very-secret-value'),
      { code: 'ERR_AUTH', status: 403 },
    );

    expect(diagnosticError(error)).toEqual({
      errorCode: 'ERR_AUTH',
      status: 403,
      errorMessage: 'Login failed for [email] with token=[credential]',
    });
  });

  it('redacts a bare token-like value even when an SDK omits its label', () => {
    expect(
      diagnosticError(new Error('Exchange failed: abcdefghijklmnopqrstuvwxyz0123456789')).errorMessage,
    ).toBe('Exchange failed: [credential]');
  });
});
