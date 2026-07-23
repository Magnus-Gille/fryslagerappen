import { describe, expect, it, jest } from '@jest/globals';

import {
  addItemFeedbackContext,
  appFeedbackContext,
  feedbackContextLabel,
} from '@/features/feedback/feedback-context';
import { createFeedbackClient } from '@/features/feedback/feedback-client';

describe('contextual feedback', () => {
  it('identifies the current app gate and tab without including inventory content', () => {
    expect(
      appFeedbackContext({
        backendEnabled: true,
        authLoading: false,
        authenticated: false,
        homeLoading: false,
        hasHome: false,
        pathname: '/',
      }),
    ).toEqual({
      route: '/',
      screen: 'authentication',
      flow: 'sign-in',
      step: 'credentials',
    });

    expect(
      appFeedbackContext({
        backendEnabled: true,
        authLoading: false,
        authenticated: true,
        homeLoading: false,
        hasHome: true,
        pathname: '/explore',
      }),
    ).toEqual({
      route: '/explore',
      screen: 'history',
      flow: 'inventory-history',
      step: 'overview',
    });
  });

  it('distinguishes each add-item window and produces a friendly visible label', () => {
    expect(addItemFeedbackContext(null, null)).toMatchObject({ step: 'method-picker' });
    expect(addItemFeedbackContext('photo', null)).toMatchObject({ step: 'photo-capture' });
    expect(addItemFeedbackContext('voice', null)).toMatchObject({ step: 'voice-capture' });
    expect(addItemFeedbackContext('manual', null)).toMatchObject({ step: 'manual-form' });
    expect(addItemFeedbackContext('photo', 'add')).toMatchObject({ step: 'review-add' });
    expect(addItemFeedbackContext('voice', 'move')).toMatchObject({ step: 'review-change' });
    expect(
      feedbackContextLabel(addItemFeedbackContext('photo', 'add')),
    ).toBe('Lägg till vara · Kontrollera förslag');
  });

  it('submits only bounded feedback and allowlisted context fields', async () => {
    const sender = jest.fn<() => Promise<{ accepted: boolean }>>().mockResolvedValue({
      accepted: true,
    });
    const feedback = createFeedbackClient({
      sender,
      metadata: {
        appVersion: '1.0.0',
        buildNumber: '77',
        platform: 'ios',
        osVersion: '26.0',
        deviceModel: 'iPhone',
      },
      sessionId: 'feedback-session',
    });

    await feedback.submit({
      message: `  Den här vyn är svår. Kontakta test@example.com token=secret-value  `,
      kind: 'confusing',
      context: {
        route: '/index?private=should-not-leave',
        screen: 'inventory',
        flow: 'add-item',
        step: 'review-add',
      },
      inventory: ['must not leave the phone'],
      screenshot: 'must not leave the phone',
    } as never);

    expect(sender).toHaveBeenCalledTimes(1);
    const [path, request] = sender.mock.calls[0] as unknown as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(path).toBe('/api/iceage/feedback');
    expect(request.body).toEqual({
      message: 'Den här vyn är svår. Kontakta [email] token=[credential]',
      kind: 'confusing',
      route: '/index',
      screen: 'inventory',
      flow: 'add-item',
      step: 'review-add',
      sessionId: 'feedback-session',
      appVersion: '1.0.0',
      buildNumber: '77',
      platform: 'ios',
      osVersion: '26.0',
      deviceModel: 'iPhone',
    });
    expect(request.body).not.toHaveProperty('inventory');
    expect(request.body).not.toHaveProperty('screenshot');
  });

  it('rejects empty feedback before making a request', async () => {
    const sender = jest.fn<() => Promise<{ accepted: boolean }>>();
    const feedback = createFeedbackClient({
      sender,
      metadata: {},
      sessionId: 'feedback-session',
    });

    await expect(
      feedback.submit({
        message: '   ',
        kind: 'other',
        context: { route: '/', screen: 'inventory' },
      }),
    ).rejects.toThrow('Skriv några ord');
    expect(sender).not.toHaveBeenCalled();
  });
});
