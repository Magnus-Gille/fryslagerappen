import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { diagnosticError, reportTelemetry } from '@/lib/telemetry';

import {
  captureAnalysisReducer,
  initialCaptureAnalysisState,
  type CaptureAnalysisState,
} from './capture-analysis-state';
import {
  extractInventoryIntent,
  type CapturePhoto,
  useCaptureHomeId,
} from './capture-service';

type CaptureAnalysisInput = {
  photo?: CapturePhoto;
  audioUri?: string;
};

type CaptureAnalysisContextValue = {
  state: CaptureAnalysisState;
  startCapture: (input: CaptureAnalysisInput) => boolean;
  clearCapture: () => void;
};

const CaptureAnalysisContext = createContext<CaptureAnalysisContextValue | null>(null);

export function CaptureAnalysisProvider({ children }: PropsWithChildren) {
  const homeId = useCaptureHomeId();
  const [state, dispatch] = useReducer(captureAnalysisReducer, initialCaptureAnalysisState);
  const nextJobId = useRef(0);
  const activeJobId = useRef<number | undefined>(undefined);

  const startCapture = useCallback(
    (input: CaptureAnalysisInput) => {
      if (!homeId || activeJobId.current !== undefined || (!input.photo && !input.audioUri)) {
        return false;
      }

      const jobId = ++nextJobId.current;
      const startedAt = Date.now();
      const mode = input.photo ? 'photo' : 'voice';
      const stage = input.photo && input.audioUri ? 'photo_voice' : mode;
      activeJobId.current = jobId;
      dispatch({ type: 'started', jobId, mode, startedAt });
      void reportTelemetry('capture_extraction_started', { stage });

      void extractInventoryIntent({ homeId, photo: input.photo, audioUri: input.audioUri })
        .then(({ intent, timing }) => {
          const completedAt = Date.now();
          if (activeJobId.current === jobId) activeJobId.current = undefined;
          dispatch({ type: 'succeeded', jobId, completedAt, intent, timing });
          void reportTelemetry('capture_extraction_succeeded', {
            stage,
            durationMs: completedAt - startedAt,
            serverDurationMs: timing?.totalMs,
            transcriptionMs: timing?.transcriptionMs,
            inferenceMs: timing?.inferenceMs,
          });
        })
        .catch((error) => {
          const completedAt = Date.now();
          if (activeJobId.current === jobId) activeJobId.current = undefined;
          dispatch({
            type: 'failed',
            jobId,
            completedAt,
            message: error instanceof Error ? error.message : 'Tolkningen misslyckades. Försök igen.',
          });
          void reportTelemetry('capture_extraction_failed', {
            stage,
            durationMs: completedAt - startedAt,
            ...diagnosticError(error),
          });
        });
      return true;
    },
    [homeId],
  );

  const clearCapture = useCallback(() => {
    if (activeJobId.current !== undefined) return;
    dispatch({ type: 'cleared' });
  }, []);

  const value = useMemo(
    () => ({ state, startCapture, clearCapture }),
    [clearCapture, startCapture, state],
  );

  return (
    <CaptureAnalysisContext.Provider value={value}>
      {children}
    </CaptureAnalysisContext.Provider>
  );
}

export function useCaptureAnalysis() {
  const value = useContext(CaptureAnalysisContext);
  if (!value) throw new Error('useCaptureAnalysis must be used within CaptureAnalysisProvider');
  return value;
}
