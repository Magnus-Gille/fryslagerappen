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
  it('queues a new capture instead of dropping an unreviewed ready suggestion', () => {
    const job1Analyzing = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 1,
      mode: 'voice',
      startedAt: 1_000,
      input: voiceInput,
    });
    const job1Ready = captureAnalysisReducer(job1Analyzing, {
      type: 'succeeded',
      jobId: 1,
      completedAt: 2_000,
      intent,
      timing: { transcriptionMs: 800, inferenceMs: 900, totalMs: 1_700 },
    });
    const bothJobs = captureAnalysisReducer(job1Ready, {
      type: 'started',
      jobId: 2,
      mode: 'photo',
      startedAt: 3_000,
      input: photoInput,
    });

    expect(bothJobs.jobs).toHaveLength(2);
    expect(bothJobs.jobs[0]).toMatchObject({
      jobId: 1,
      status: 'ready',
      mode: 'voice',
      intent,
    });
    expect(bothJobs.jobs[1]).toMatchObject({
      jobId: 2,
      status: 'analyzing',
      mode: 'photo',
    });
  });

  it('queues three sequential captures into three ready suggestions', () => {
    let state = initialCaptureAnalysisState;
    for (const jobId of [1, 2, 3]) {
      state = captureAnalysisReducer(state, {
        type: 'started',
        jobId,
        mode: 'voice',
        startedAt: jobId * 1_000,
        input: voiceInput,
      });
      state = captureAnalysisReducer(state, {
        type: 'succeeded',
        jobId,
        completedAt: jobId * 1_000 + 500,
        intent,
      });
    }

    expect(state.jobs).toHaveLength(3);
    expect(state.jobs.every((job) => job.status === 'ready')).toBe(true);
    expect(state.jobs.map((job) => job.jobId)).toEqual([1, 2, 3]);
  });

  it('ignores a late response for an unknown or already-resolved job', () => {
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

    expect(failed.jobs).toEqual([
      {
        status: 'error',
        jobId: 3,
        mode: 'photo',
        startedAt: 1_000,
        completedAt: 5_000,
        message: 'Tolkningen misslyckades.',
        input: photoInput,
      },
    ]);

    const removed = captureAnalysisReducer(failed, { type: 'removed', jobId: 3 });
    expect(removed.jobs).toEqual([]);
  });

  it('removes exactly the targeted job and leaves the rest of the queue intact', () => {
    let state = initialCaptureAnalysisState;
    for (const jobId of [1, 2, 3]) {
      state = captureAnalysisReducer(state, {
        type: 'started',
        jobId,
        mode: 'voice',
        startedAt: jobId * 1_000,
        input: voiceInput,
      });
    }

    const withOneRemoved = captureAnalysisReducer(state, { type: 'removed', jobId: 2 });
    expect(withOneRemoved.jobs.map((job) => job.jobId)).toEqual([1, 3]);
  });

  it('leaves state unchanged when removing an unknown jobId', () => {
    const started = captureAnalysisReducer(initialCaptureAnalysisState, {
      type: 'started',
      jobId: 4,
      mode: 'voice',
      startedAt: 1_000,
      input: voiceInput,
    });

    expect(captureAnalysisReducer(started, { type: 'removed', jobId: 999 })).toBe(started);
  });
});
