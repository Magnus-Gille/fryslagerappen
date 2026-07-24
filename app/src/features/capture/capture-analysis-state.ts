import type { CaptureIntent } from './capture-intent';
import type { CapturePhoto, CaptureTiming } from './capture-service';

export type CaptureAnalysisMode = 'photo' | 'voice';

export type CaptureAnalysisInput = {
  photo?: CapturePhoto;
  audioUri?: string;
};

export type CaptureAnalysisState =
  | { status: 'idle' }
  | {
      status: 'analyzing';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
      input: CaptureAnalysisInput;
    }
  | {
      status: 'ready';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
      completedAt: number;
      intent: CaptureIntent;
      timing?: CaptureTiming;
    }
  | {
      status: 'error';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
      completedAt: number;
      message: string;
      // Retained so a failed job can be retried without redoing the photo or
      // the voice clip.
      input: CaptureAnalysisInput;
    };

export type CaptureAnalysisAction =
  | {
      type: 'started';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
      input: CaptureAnalysisInput;
    }
  | {
      type: 'succeeded';
      jobId: number;
      completedAt: number;
      intent: CaptureIntent;
      timing?: CaptureTiming;
    }
  | {
      type: 'failed';
      jobId: number;
      completedAt: number;
      message: string;
    }
  | { type: 'cleared' };

export const initialCaptureAnalysisState: CaptureAnalysisState = { status: 'idle' };

export function captureAnalysisReducer(
  state: CaptureAnalysisState,
  action: CaptureAnalysisAction,
): CaptureAnalysisState {
  if (action.type === 'cleared') return initialCaptureAnalysisState;
  if (action.type === 'started') {
    return {
      status: 'analyzing',
      jobId: action.jobId,
      mode: action.mode,
      startedAt: action.startedAt,
      input: action.input,
    };
  }
  if (state.status !== 'analyzing' || state.jobId !== action.jobId) return state;
  if (action.type === 'succeeded') {
    return {
      status: 'ready',
      jobId: state.jobId,
      mode: state.mode,
      startedAt: state.startedAt,
      completedAt: action.completedAt,
      intent: action.intent,
      timing: action.timing,
    };
  }
  return {
    status: 'error',
    jobId: state.jobId,
    mode: state.mode,
    startedAt: state.startedAt,
    completedAt: action.completedAt,
    message: action.message,
    input: state.input,
  };
}
