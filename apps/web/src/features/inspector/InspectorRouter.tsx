import type { InferenceJobSummary, PredictionSummary } from '@visionflow/contracts';
import { DatasetInspector, InspectorShell, JobInspector, MediaInspector } from './index';
import { ActionHint } from '../../shared/ui/ActionHint';
import type { MediaInspectorData } from './inspector.types';

type SectionId =
  | 'overview'
  | 'media'
  | 'datasets'
  | 'annotate'
  | 'pipeline'
  | 'jobs'
  | 'timeline'
  | 'diff';

type JobUiState = InferenceJobSummary & {
  logs: string[];
  source: 'loading' | 'api' | 'fallback';
  error: string | null;
};

export type InspectorRouterProps = {
  active: SectionId;
  job: JobUiState;
  predictions: PredictionSummary[];
  mediaInspectorData: MediaInspectorData;
  datasetInspectorData: {
    selectedVersionId: string | null;
    selectedVersionLabel: string | null;
    selectedVersionStatus: 'DRAFT' | 'LOCKED' | null;
    selectedVersionAssetCount: number;
    splitSummary: { train: number; valid: number; test: number; unassigned: number };
    canMutate: boolean;
  };
  projectName: string;
};

export function InspectorRouter({
  active,
  job,
  predictions,
  mediaInspectorData,
  datasetInspectorData,
  projectName,
}: InspectorRouterProps) {
  if (active === 'media') {
    return <MediaInspector data={mediaInspectorData} />;
  }

  if (active === 'datasets') {
    return <DatasetInspector data={datasetInspectorData} />;
  }

  if (active === 'annotate') {
    return (
      <InspectorShell title="Inspector" section="annotate">
        <div className="p-4">
          <ActionHint
            label="Embedded"
            description="Annotation controls are handled inside the Annotation workspace panel."
            tone="neutral"
          />
        </div>
      </InspectorShell>
    );
  }

  if (active === 'pipeline') {
    return (
      <InspectorShell title="Inspector" section="pipeline">
        <div className="p-4">
          <ActionHint
            label="Embedded"
            description="Pipeline node inspector is handled inside the Pipeline workspace panel."
            tone="neutral"
          />
        </div>
      </InspectorShell>
    );
  }

  if (active === 'jobs') {
    return (
      <JobInspector
        job={job}
        jobError={job.error}
        jobLogs={job.logs}
        hasPredictions={predictions.length > 0}
        hasEvaluationReport={false}
        canRunInference={job.status !== 'RUNNING' && job.status !== 'QUEUED'}
        canRunInferenceReason={
          job.status === 'RUNNING'
            ? 'Inference already running.'
            : job.status === 'QUEUED'
              ? 'Inference already queued.'
              : null
        }
      />
    );
  }

  return (
    <InspectorShell title="Inspector" section={active}>
      <div className="divide-y divide-graphite-200">
        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Project
          </span>
          <span className="truncate text-neutral-200">{projectName}</span>
        </div>
        <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
            Job
          </span>
          <span className="truncate text-neutral-200">
            {job.status} {job.progress}%
          </span>
        </div>
        {job.error ? (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-red-300">Error</p>
            <p className="mt-1 text-xs text-red-200/80">{job.error}</p>
          </div>
        ) : null}
      </div>
    </InspectorShell>
  );
}
