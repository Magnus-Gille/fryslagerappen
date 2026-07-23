import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { pocketbase } from '@/lib/pocketbase';
import { telemetrySessionId } from '@/lib/telemetry';

import {
  createFeedbackClient,
  type FeedbackInput,
} from './feedback-client';

export type { FeedbackKind } from './feedback-client';

const configuredPocketBase = pocketbase;
const feedbackClient = configuredPocketBase
  ? createFeedbackClient({
      sender: (path, request) => configuredPocketBase.send(path, request),
      sessionId: telemetrySessionId,
      metadata: {
        appVersion: Constants.expoConfig?.version,
        buildNumber: Constants.expoConfig?.ios?.buildNumber,
        platform: Platform.OS,
        osVersion: Device.osVersion,
        deviceModel: Device.modelName,
      },
    })
  : null;

export async function submitFeedback(input: FeedbackInput) {
  if (!feedbackClient) throw new Error('Feedback kräver anslutning till M5-servern.');
  return feedbackClient.submit(input);
}
