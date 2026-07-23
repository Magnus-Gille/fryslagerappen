import type { CaptureIntent } from './capture-intent';
import type { CaptureTiming } from './capture-service';

export type CaptureAnalysisMode = 'photo' | 'voice';

export type CaptureAnalysisState =
  | { status: 'idle' }
  | {
      status: 'analyzing';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
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
    };

export type CaptureAnalysisAction =
  | {
      type: 'started';
      jobId: number;
      mode: CaptureAnalysisMode;
      startedAt: number;
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
  };
}
