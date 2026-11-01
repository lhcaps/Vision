/**
 * WorkbenchRuntimeState — a single, authoritative source of truth for the frontend workbench.
 *
 * Rules:
 * - API state and demo/fallback state MUST NOT be mixed in the same panel.
 * - If the API says no locked dataset exists, the inspector must NOT display
 *   "v1.3 locked / 20 assets" from the demo snapshot as if it were real.
 * - Runtime mode is explicitly labeled: loading | api | fallback | mock | degraded.
 * - Job status drives: pipeline execution, prediction overlay, evaluation eligibility.
 */

export type RuntimeMode = 'loading' | 'api' | 'fallback' | 'mock' | 'degraded';

export type JobStatus = 'NONE' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export type HealthStatus =
  | 'loading'
  | 'connected'
  | 'unavailable'
  | 'unknown'
  | 'fallback'
  | 'mock';

export type WorkbenchRuntimeState = {
  /** How the runtime was bootstrapped */
  mode: RuntimeMode;

  /** Active project */
  projectId: string;

  /** Dataset state */
  selectedDatasetVersionId: string | null;
  selectedDatasetVersionLabel: string | null;
  lockedDatasetWithAssets: boolean;

  /** Inference job state */
  latestJobId: string | null;
  latestJobStatus: JobStatus;
  latestJobError: string | null;

  /** Results */
  hasPredictions: boolean;
  hasEvaluationReport: boolean;

  /** Dependency health */
  health: {
    api: HealthStatus;
    database: HealthStatus;
    queue: HealthStatus;
    worker: HealthStatus;
  };
};

/** Derive an initial "loading" state */
export function createInitialRuntimeState(projectId: string): WorkbenchRuntimeState {
  return {
    mode: 'loading',
    projectId,
    selectedDatasetVersionId: null,
    selectedDatasetVersionLabel: null,
    lockedDatasetWithAssets: false,
    latestJobId: null,
    latestJobStatus: 'NONE',
    latestJobError: null,
    hasPredictions: false,
    hasEvaluationReport: false,
    health: {
      api: 'loading',
      database: 'loading',
      queue: 'loading',
      worker: 'loading',
    },
  };
}

/** Human-readable label for runtime mode */
export function runtimeModeLabel(mode: RuntimeMode): string {
  switch (mode) {
    case 'loading':
      return 'Syncing';
    case 'api':
      return 'API';
    case 'fallback':
      return 'Demo fallback';
    case 'mock':
      return 'Mock mode';
    case 'degraded':
      return 'Degraded';
  }
}
