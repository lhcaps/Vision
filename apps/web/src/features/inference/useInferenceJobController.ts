import { useCallback, useEffect, useState } from 'react';
import {
  InferenceJobEventSchema,
  isTerminalJobStatus,
  type InferenceJobSummary,
  type InferenceJobEvent,
} from '@visionflow/contracts';
import { demoSnapshot } from '../../data/demo';
import {
  createInferenceJob,
  getInferenceJob,
  listInferenceJobs,
  openInferenceJobEvents,
  mergeJobEvent,
} from './inference.api';
import { listProjectDatasets, listDatasetVersions } from '../../lib/datasets';
import { listProjectPipelines } from '../../lib/pipelines';
import type { JobUiState, JobSourceState } from './inference.types';
import type { SectionId } from '../../app/section.types';

function seededJobSummary(): InferenceJobSummary {
  return {
    id: demoSnapshot.job.id,
    projectId: demoSnapshot.project.id,
    datasetVersionId: 'dataset_proj_parking_lot_parking_v3',
    pipelineId: 'pipeline_proj_parking_lot_parking_detector',
    modelId: null,
    status: demoSnapshot.job.status,
    progress: demoSnapshot.job.progress,
    createdAt: '2026-04-28T13:35:40.000Z',
    updatedAt: '2026-04-28T13:35:40.000Z',
    startedAt: demoSnapshot.job.startedAt ?? null,
    completedAt: null,
    errorMessage: null,
  };
}

const SEEDED_LOGS = ['Seeded initial job state.'];

function toJobUiState(
  summary: InferenceJobSummary,
  source: JobSourceState,
  jobLogs: string[]
): JobUiState {
  return {
    ...summary,
    source,
    error: summary.errorMessage,
    logs: jobLogs,
  };
}

function parseJobEvent(value: string): InferenceJobEvent | null {
  try {
    const parsed = InferenceJobEventSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function formatUiError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function resolveInferenceRunTarget(projectId: string): Promise<{
  datasetVersionId: string;
  datasetVersionLabel: string;
  pipelineId: string;
  pipelineName: string;
}> {
  const [datasetResponse, pipelineResponse] = await Promise.all([
    listProjectDatasets(projectId),
    listProjectPipelines(projectId),
  ]);
  const pipeline = pipelineResponse.pipelines.find((item) => item.validation.ok);

  if (!pipeline) {
    throw new Error('No valid persisted pipeline is available for inference.');
  }

  for (const dataset of datasetResponse.datasets) {
    const versions = await listDatasetVersions(projectId, dataset.id);
    const locked = versions.versions.find(
      (version) => version.status === 'LOCKED' && version.assetCount > 0
    );

    if (locked) {
      return {
        datasetVersionId: locked.id,
        datasetVersionLabel: `${dataset.name} ${locked.label}`,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
      };
    }
  }

  throw new Error('No locked dataset version with assets is available for inference.');
}

export interface UseInferenceJobControllerResult {
  job: JobUiState;
  startJob: () => void;
}

export function useInferenceJobController(): UseInferenceJobControllerResult {
  const [job, setJob] = useState<JobUiState>(() =>
    toJobUiState(seededJobSummary(), 'fallback', SEEDED_LOGS)
  );

  // Load initial job list
  useEffect(() => {
    let cancelled = false;

    setJob((current) => ({
      ...current,
      source: 'loading',
      error: null,
      logs: ['Syncing inference jobs from API.'],
    }));

    void listInferenceJobs(demoSnapshot.project.id)
      .then((response) => {
        if (cancelled) return;

        const latest = response.jobs[0];

        setJob(
          latest
            ? toJobUiState(latest, 'api', ['API returned the latest inference job snapshot.'])
            : {
                id: '',
                projectId: demoSnapshot.project.id,
                datasetVersionId: '',
                pipelineId: '',
                modelId: null,
                status: 'NONE',
                progress: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null,
                errorMessage: null,
                source: 'api' as const,
                logs: ['No inference jobs queued yet.'],
                error: null,
              }
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setJob((current) => ({
          ...current,
          source: 'fallback',
          error: formatUiError(error),
          logs: ['API unavailable. Job controls will not fake progress.'],
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // SSE effect
  useEffect(() => {
    if (job.source !== 'api' || !job.id || isTerminalJobStatus(job.status)) {
      return;
    }

    const source = openInferenceJobEvents(demoSnapshot.project.id, job.id);

    source.onmessage = (event) => {
      const parsed = parseJobEvent(event.data);
      if (!parsed || parsed.jobId !== job.id) return;

      setJob((current) =>
        current.id === parsed.jobId
          ? {
              ...mergeJobEvent(current, parsed),
              source: current.source,
              error: parsed.type === 'error' ? parsed.message : null,
              logs: [...current.logs, parsed.message].slice(-8),
            }
          : current
      );

      if (parsed.type === 'complete' || parsed.type === 'error') {
        source.close();
      }
    };

    source.onerror = () => {
      void getInferenceJob(demoSnapshot.project.id, job.id)
        .then((latest) => {
          setJob((current) =>
            current.id === latest.id
              ? toJobUiState(
                  latest,
                  'api',
                  [
                    ...current.logs,
                    isTerminalJobStatus(latest.status)
                      ? `Job resynced after stream close: ${latest.status}.`
                      : 'Progress stream disconnected. Resynced latest job snapshot.',
                  ].slice(-8)
                )
              : current
          );
        })
        .catch(() => {
          setJob((current) =>
            current.id === job.id && !isTerminalJobStatus(current.status)
              ? {
                  ...current,
                  error: 'Progress stream disconnected. Refresh the job list to resync.',
                  logs: [...current.logs, 'Progress stream disconnected.'].slice(-8),
                }
              : current
          );
        })
        .finally(() => source.close());
    };

    return () => source.close();
  }, [job.id, job.source, job.status]);

  // Polling fallback
  useEffect(() => {
    if (job.source !== 'api' || !job.id || isTerminalJobStatus(job.status)) {
      return;
    }

    const timer = window.setInterval(() => {
      void getInferenceJob(demoSnapshot.project.id, job.id)
        .then((latest) => {
          setJob((current) =>
            current.id === latest.id
              ? {
                  ...toJobUiState(latest, 'api', current.logs),
                  error: latest.errorMessage,
                }
              : current
          );
        })
        .catch(() => {
          // SSE already surfaces connection errors. Polling stays quiet.
        });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [job.id, job.source, job.status]);

  const startJob = useCallback(() => {
    void (async () => {
      setJob((current) => ({
        ...current,
        status: 'QUEUED',
        progress: 0,
        source: current.source === 'fallback' ? 'loading' : current.source,
        error: null,
        logs: ['Resolving locked dataset version and persisted pipeline.'],
      }));

      try {
        const target = await resolveInferenceRunTarget(demoSnapshot.project.id);
        const response = await createInferenceJob(demoSnapshot.project.id, {
          datasetVersionId: target.datasetVersionId,
          pipelineId: target.pipelineId,
          modelId: null,
        });

        setJob(
          toJobUiState(response.job, 'api', [
            'Queue accepted inference payload with IDs only.',
            `Dataset ${target.datasetVersionLabel} and pipeline ${target.pipelineName} selected.`,
          ])
        );
      } catch (error) {
        const message = formatUiError(error);
        setJob((current) => ({
          ...current,
          status: 'FAILED',
          progress: 100,
          source: 'fallback',
          error: message,
          logs: [`Run failed: ${message}`].slice(-8),
        }));
      }
    })();
  }, []);

  return { job, startJob };
}
