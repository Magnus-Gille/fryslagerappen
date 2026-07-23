import type { FeedbackContext } from './feedback-context';

export type FeedbackKind = 'problem' | 'confusing' | 'idea' | 'other';

export type FeedbackInput = {
  message: string;
  kind: FeedbackKind;
  context: FeedbackContext;
};

type FeedbackMetadata = {
  appVersion?: string | null;
  buildNumber?: string | null;
  platform?: string | null;
  osVersion?: string | null;
  deviceModel?: string | null;
};

type FeedbackSender = (
  path: string,
  request: { method: 'POST'; body: Record<string, unknown> },
) => Promise<{ accepted?: boolean }>;

type FeedbackClientOptions = {
  sender: FeedbackSender;
  metadata: FeedbackMetadata;
  sessionId: string;
};

function boundedText(value: unknown, max: number) {
  if (typeof value !== 'string') return undefined;
  const result = value.trim().slice(0, max);
  return result || undefined;
}

function redact(value: unknown, max: number) {
  const text = boundedText(value, max);
  if (!text) return undefined;
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/Bearer\s+[^\s]+/gi, '[credential]')
    .replace(/\b(token|code|secret|password)=([^\s&]+)/gi, '$1=[credential]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[credential]');
}

function safeRoute(value: unknown) {
  const route = boundedText(value, 120)?.split(/[?#]/, 1)[0];
  return route?.startsWith('/') ? route : '/';
}

export function createFeedbackClient(options: FeedbackClientOptions) {
  return {
    submit: async (input: FeedbackInput) => {
      const message = redact(input.message, 1500);
      if (!message) throw new Error('Skriv några ord innan du skickar.');
      return options.sender('/api/iceage/feedback', {
        method: 'POST',
        body: {
          message,
          kind: input.kind,
          route: safeRoute(input.context.route),
          screen: boundedText(input.context.screen, 80),
          flow: boundedText(input.context.flow, 80),
          step: boundedText(input.context.step, 80),
          sessionId: boundedText(options.sessionId, 64),
          appVersion: boundedText(options.metadata.appVersion, 32),
          buildNumber: boundedText(options.metadata.buildNumber, 32),
          platform: boundedText(options.metadata.platform, 24),
          osVersion: boundedText(options.metadata.osVersion, 48),
          deviceModel: boundedText(options.metadata.deviceModel, 80),
        },
      });
    },
  };
}
