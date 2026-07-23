import { describe, expect, it } from '@jest/globals';

import {
  captureAnalysisReducer,
  initialCaptureAnalysisState,
} from '@/features/capture/capture-analysis-state';
import type { CaptureIntent } from '@/features/capture/capture-intent';

const intent: CaptureIntent = {
  action: 'add',
  name: 'Pasta',
  category: 'Torrvaror',
  quantity: 2,
  unit: 'paket',
  locationName: 'Hyllan i ateljén',
  destinationName: null,
  frozenOn: null,
  eatBefore: null,
  dateSource: 'none',
  note: null,
  transcript: 'Två paket pasta på hyllan i ateljén.',
  confidence: 0.96,
  uncertainFields: [],
};

describe('capture analysis state', () => {
  it('keeps analysis alive as a background job until the result is reviewed', () => {
    const analyzing = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 7,
      mode: 'voice',
      startedAt: 1_000,
    });
    const ready = captureAnalysisReducer(analyzing, {
      type: 'succeeded',
      jobId: 7,
      completedAt: 4_000,
      intent,
      timing: { transcriptionMs: 800, inferenceMs: 1_900, totalMs: 2_700 },
    });

    expect(analyzing).toMatchObject({
      status: 'analyzing',
      jobId: 7,
      mode: 'voice',
    });
    expect(ready).toMatchObject({
      status: 'ready',
      jobId: 7,
      mode: 'voice',
      intent,
      timing: { totalMs: 2_700 },
    });
    expect(captureAnalysisReducer(ready, { type: 'cleared' })).toEqual(
      initialCaptureAnalysisState,
    );
  });

  it('ignores a late response from an older job', () => {
    const current = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 9,
      mode: 'photo',
      startedAt: 2_000,
    });

    expect(
      captureAnalysisReducer(current, {
        type: 'succeeded',
        jobId: 8,
        completedAt: 3_000,
        intent,
      }),
    ).toBe(current);
  });

  it('keeps a failed job retryable without retaining raw media', () => {
    const analyzing = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 3,
      mode: 'photo',
      startedAt: 1_000,
    });
    const failed = captureAnalysisReducer(analyzing, {
      type: 'failed',
      jobId: 3,
      completedAt: 5_000,
      message: 'Tolkningen misslyckades.',
    });

    expect(failed).toEqual({
      status: 'error',
      jobId: 3,
      mode: 'photo',
      startedAt: 1_000,
      completedAt: 5_000,
      message: 'Tolkningen misslyckades.',
    });
    expect(failed).not.toHaveProperty('photo');
    expect(failed).not.toHaveProperty('audioUri');
  });
});
