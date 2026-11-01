import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuntimeStatusResponse } from '@visionflow/contracts';
import { fetchRuntimeStatus } from './runtime.api';
import type {
  ApiReadinessState,
  CvReadinessState,
  DatabaseReadinessState,
  QueueReadinessState,
  RuntimeReadiness,
} from './runtime.types';

const REFRESH_INTERVAL_MS = 8_000;

const LOADING_READINESS: RuntimeReadiness = {
  api: { kind: 'loading' },
  database: { kind: 'loading' },
  queue: { kind: 'loading' },
  cvWorker: { kind: 'loading' },
};

const UNAVAILABLE_READINESS: RuntimeReadiness = {
  api: { kind: 'unavailable' },
  database: { kind: 'unknown' },
  queue: { kind: 'unknown' },
  cvWorker: { kind: 'unknown' },
};

function deriveCvState(data: RuntimeStatusResponse['cvWorker']): CvReadinessState {
  if (!data.configured) {
    return { kind: 'mock-fallback', requestedMode: 'mock' };
  }
  if (!data.ok) {
    return { kind: 'worker-unavailable' };
  }
  if (data.requestedDetectorMode === 'onnx') {
    if (data.onnxAvailable === true) {
      return { kind: 'onnx-ready', modelVersion: data.modelVersion ?? 'unknown' };
    }
    return { kind: 'onnx-configured-unavailable', modelVersion: data.modelVersion ?? 'unknown' };
  }
  return { kind: 'mock-fallback', requestedMode: 'mock' };
}

function deriveQueueState(data: RuntimeStatusResponse['queue']): QueueReadinessState {
  switch (data.status) {
    case 'ready':
      return { kind: 'bullmq-ready' };
    case 'fallback':
      return { kind: 'memory-fallback' };
    case 'unavailable':
      return { kind: 'unavailable' };
    default:
      return { kind: 'unknown' };
  }
}

function deriveApiState(data: RuntimeStatusResponse['api']): ApiReadinessState {
  if (data.ok) {
    const mode = data.mode === 'database' || data.mode === 'memory' ? data.mode : 'unknown';
    return { kind: 'connected', mode };
  }
  return { kind: 'unavailable' };
}

function deriveDatabaseState(data: RuntimeStatusResponse['database']): DatabaseReadinessState {
  switch (data.status) {
    case 'ready':
      return { kind: 'ready' };
    case 'unavailable':
      return { kind: 'unavailable' };
    default:
      return { kind: 'unknown' };
  }
}

function toReadiness(data: RuntimeStatusResponse): RuntimeReadiness {
  return {
    api: deriveApiState(data.api),
    database: deriveDatabaseState(data.database),
    queue: deriveQueueState(data.queue),
    cvWorker: deriveCvState(data.cvWorker),
  };
}

export interface UseRuntimeStatusResult {
  readiness: RuntimeReadiness;
  raw: RuntimeStatusResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRuntimeStatus(): UseRuntimeStatusResult {
  const [raw, setRaw] = useState<RuntimeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    try {
      const data = await fetchRuntimeStatus(signal);

      if (signal.aborted) return;

      setRaw(data);
      setError(null);
    } catch (err) {
      if (signal.aborted) return;

      setRaw(null);
      setError(err instanceof Error ? err.message : 'Failed to fetch runtime status');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    void load(controller.signal);
  }, [load]);

  useEffect(() => {
    refresh();

    intervalRef.current = setInterval(() => {
      refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      controllerRef.current?.abort();

      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh]);

  const readiness: RuntimeReadiness = raw
    ? toReadiness(raw)
    : error
      ? UNAVAILABLE_READINESS
      : LOADING_READINESS;

  return {
    readiness,
    raw,
    loading,
    error,
    refresh,
  };
}
