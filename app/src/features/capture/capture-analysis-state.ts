import type { CaptureIntent } from './capture-intent';
import type { CapturePhoto, CaptureTiming } from './capture-service';

export type CaptureAnalysisMode = 'photo' | 'voice';

export type CaptureAnalysisInput = {
  photo?: CapturePhoto;
  audioUri?: string;
};

export type CaptureJob = {
  jobId: number;
  mode: CaptureAnalysisMode;
  startedAt: number;
  input: CaptureAnalysisInput;
} & (
  | { status: 'analyzing' }
  | { status: 'ready'; completedAt: number; intent: CaptureIntent; timing?: CaptureTiming }
  | { status: 'error'; completedAt: number; message: string }
);

export type CaptureAnalysisState = { jobs: CaptureJob[] };

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
  | { type: 'removed'; jobId: number };

export const initialCaptureAnalysisState: CaptureAnalysisState = { jobs: [] };

export function captureAnalysisReducer(
  state: CaptureAnalysisState,
  action: CaptureAnalysisAction,
): CaptureAnalysisState {
  if (action.type === 'started') {
    return {
      jobs: [
        ...state.jobs,
        {
          status: 'analyzing',
          jobId: action.jobId,
          mode: action.mode,
          startedAt: action.startedAt,
          input: action.input,
        },
      ],
    };
  }

  if (action.type === 'removed') {
    if (!state.jobs.some((job) => job.jobId === action.jobId)) return state;
    return { jobs: state.jobs.filter((job) => job.jobId !== action.jobId) };
  }

  const job = state.jobs.find((candidate) => candidate.jobId === action.jobId);
  if (!job || job.status !== 'analyzing') return state;

  if (action.type === 'succeeded') {
    return {
      jobs: state.jobs.map((candidate) =>
        candidate.jobId === action.jobId
          ? {
              status: 'ready',
              jobId: job.jobId,
              mode: job.mode,
              startedAt: job.startedAt,
              input: job.input,
              completedAt: action.completedAt,
              intent: action.intent,
              timing: action.timing,
            }
          : candidate,
      ),
    };
  }

  return {
    jobs: state.jobs.map((candidate) =>
      candidate.jobId === action.jobId
        ? {
            status: 'error',
            jobId: job.jobId,
            mode: job.mode,
            startedAt: job.startedAt,
            input: job.input,
            completedAt: action.completedAt,
            message: action.message,
          }
        : candidate,
    ),
  };
}
