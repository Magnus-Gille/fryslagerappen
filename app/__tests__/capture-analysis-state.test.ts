import { describe, expect, it } from '@jest/globals';

import {
  captureAnalysisReducer,
  initialCaptureAnalysisState,
  type CaptureAnalysisInput,
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

const voiceInput: CaptureAnalysisInput = { audioUri: 'file:///caches/recording-1.m4a' };
const photoInput: CaptureAnalysisInput = {
  photo: { base64: 'aGVq', mimeType: 'image/jpeg', uri: 'file:///caches/photo-1.jpg' },
  audioUri: 'file:///caches/recording-2.m4a',
};

describe('capture analysis state', () => {
  it('keeps analysis alive as a background job until the result is reviewed', () => {
    const analyzing = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 7,
      mode: 'voice',
      startedAt: 1_000,
      input: voiceInput,
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
      input: photoInput,
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

  it('keeps the captured input on failure so a retry needs no new photo or clip', () => {
    const analyzing = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 3,
      mode: 'photo',
      startedAt: 1_000,
      input: photoInput,
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
      input: photoInput,
    });
  });

  it('drops the retained input when the job is dismissed', () => {
    const failed = captureAnalysisReducer(
      captureAnalysisReducer(initialCaptureAnalysisState, {
        type: 'started',
        jobId: 4,
        mode: 'voice',
        startedAt: 1_000,
        input: voiceInput,
      }),
      { type: 'failed', jobId: 4, completedAt: 2_000, message: 'Nätfel.' },
    );

    expect(captureAnalysisReducer(failed, { type: 'cleared' })).toEqual(
      initialCaptureAnalysisState,
    );
  });
});
