import {
  ActivityIcon as Activity,
  CheckCircleIcon as CheckCircle,
  DatabaseIcon as Database,
  PlayIcon as Play,
  WarningCircleIcon as WarningCircle,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import type {
  AnnotationSummary,
  EvaluationReport,
  InferenceJobStatus,
  PipelineDefinition,
  PipelineNode,
  PredictionSummary,
} from '@visionflow/contracts';
import { motionTokens } from '@visionflow/motion';
import { demoSnapshot } from '../data/demo';
import { EvaluationMetricsPanel, PredictionOverlayCanvas } from '../features/evaluation';
import type { JobSourceState, JobUiState } from '../features/inference';
import { PipelineExecutionFlow } from '../features/timeline';
import { ActionHint } from '../shared/ui/ActionHint';
import { FailedJobErrorState } from '../shared/ui/ErrorState';
import { StatusPill } from './StatusPill';
import { Panel } from './ui/Panel';
import { StateRow } from './ui/StateRow';
import { VisionPreview } from './ui/VisionPreview';

function JobsPanel({
  job,
  onRun,
  evaluationReport,
  isEvaluating,
  evaluationError,
  predictions,
  groundTruth,
  onRunEvaluation,
  evaluationEligibility,
  inferenceEligibility,
  onOpenVersions,
}: {
  job: JobUiState;
  onRun: () => void;
  evaluationReport: EvaluationReport | null;
  isEvaluating: boolean;
  evaluationError: string | null;
  predictions: PredictionSummary[];
  groundTruth: AnnotationSummary[];
  onRunEvaluation: () => void;
  evaluationEligibility: { ok: boolean; reason: string | null };
  inferenceEligibility: { ok: boolean; reason: string | null };
  onOpenVersions: () => void;
}) {
  const [threshold, setThreshold] = useState(62);
  const jobFailed = job.status === 'FAILED';
  const jobRunning = job.status === 'RUNNING';
  const showPipelineExecution = job.status === 'RUNNING' || job.status === 'SUCCEEDED';
  const isRunDisabled = !inferenceEligibility.ok || jobRunning || job.status === 'QUEUED';

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel>
        <div className="divider flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-neutral-100">Inference job</h2>
            <p className="mt-1 truncate font-mono text-xs text-neutral-500">{job.id}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <JobSourcePill source={job.source} />
            <button
              type="button"
              title={
                isRunDisabled && inferenceEligibility.reason
                  ? inferenceEligibility.reason
                  : jobFailed && job.error
                    ? job.error
                    : 'Queue inference job'
              }
              aria-label="Queue inference job"
              onClick={onRun}
              disabled={isRunDisabled}
              className="version-header-action version-header-action-lock"
            >
              <Play size={16} weight="fill" />
              Run
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <StatusPill status={job.status} />
            <span className="font-mono text-sm text-neutral-300">{job.progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-signal-300"
              initial={false}
              animate={{ width: `${job.progress}%` }}
              transition={motionTokens.springSoft}
            />
          </div>
          {jobFailed && job.error ? (
            <FailedJobErrorState
              reason={job.error}
              onRetry={onRun}
              onOpenVersions={onOpenVersions}
            />
          ) : job.error ? (
            <p className="version-action-message version-action-message-error mt-4">{job.error}</p>
          ) : null}
          <div className="inner-border-subtle mt-5 rounded-md bg-graphite-950 p-3 font-mono text-xs text-neutral-400">
            {job.logs.length > 0 ? (
              job.logs.map((line, index) => (
                <motion.p
                  key={`${line}-${index}`}
                  className="py-1"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionTokens.durationFast }}
                >
                  {line}
                </motion.p>
              ))
            ) : (
              <p className="py-1 text-neutral-500">No worker logs yet.</p>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <JobStageStep label="Queued" active={job.progress >= 0} complete={job.progress > 8} />
            <JobStageStep label="Worker" active={job.progress >= 8} complete={job.progress >= 84} />
            <JobStageStep
              label="Complete"
              active={job.progress === 100}
              complete={job.status === 'SUCCEEDED'}
            />
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="divider px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-100">Prediction overlay</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {jobFailed
              ? 'Overlay hidden — inference failed.'
              : jobRunning
                ? 'Running inference...'
                : `Ground truth and detector boxes at threshold ${(threshold / 100).toFixed(2)}.`}
          </p>
        </div>
        <PredictionOverlayCanvas
          groundTruth={jobFailed || jobRunning ? [] : groundTruth}
          predictions={jobFailed || jobRunning ? [] : predictions}
          isLoading={jobRunning}
          error={jobFailed ? (job.error ?? 'Inference failed.') : null}
        />
      </Panel>

      <Panel className="overflow-hidden">
        <div className="divider px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-100">Evaluation</h2>
          <p className="mt-1 font-mono text-xs text-neutral-500">
            {evaluationReport
              ? `Precision ${evaluationReport.precision.toFixed(3)} / Recall ${evaluationReport.recall.toFixed(3)}`
              : 'No evaluation run yet'}
          </p>
        </div>
        <div className="p-4">
          {!evaluationEligibility.ok && evaluationEligibility.reason && (
            <div className="mb-3">
              <ActionHint
                label="Evaluation disabled"
                description={evaluationEligibility.reason}
                tone="amber"
              />
            </div>
          )}
          <EvaluationMetricsPanel
            report={evaluationReport}
            isLoading={false}
            error={evaluationError}
            onRunEvaluation={evaluationEligibility.ok ? onRunEvaluation : () => {}}
            isEvaluating={isEvaluating}
          />
        </div>
      </Panel>

      {/* PipelineExecutionFlow: only shown when running or succeeded — NOT when failed */}
      {showPipelineExecution && (
        <Panel className="overflow-hidden">
          <PipelineExecutionFlow />
        </Panel>
      )}
    </div>
  );
}

function JobSourcePill({ source }: { source: JobSourceState }) {
  const tone = source === 'api' ? 'pill-signal' : source === 'loading' ? 'pill-scan' : 'pill-amber';

  return <span className={`pill-base ${tone}`}>{source}</span>;
}

function JobStageStep({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={[complete ? 'step-complete' : active ? 'step-active' : 'step-inactive'].join(' ')}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.14em]">{label}</p>
    </div>
  );
}

function thresholdRangeStyle(value: number, min = 40, max = 95): CSSProperties {
  return {
    '--threshold-progress': `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
  } as CSSProperties;
}

function SplitPill({ split }: { split: string }) {
  return <span className="split-pill">{split}</span>;
}

function DiffMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="inner-border-subtle rounded-md bg-white/[0.03] p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className={`mt-3 font-mono text-3xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: typeof Activity;
  active: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-md transition active:translate-y-px',
        active
          ? 'bg-[oklch(0.8_0.13_152/0.1)] text-[oklch(0.8_0.13_152)] shadow-[inset_0_0_0_1px_oklch(80%_0.13_152/0.24),inset_0_1px_0_oklch(98%_0.006_180/0.06)]'
          : 'text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-200',
      ].join(' ')}
    >
      <Icon size={17} />
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-4 py-3 text-sm">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </span>
      <span className="truncate text-neutral-200">{value}</span>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-neutral-500">
        {label}
      </span>
      <span className="font-mono text-sm text-neutral-100">{value}</span>
    </div>
  );
}

function pipelineNode(
  item: PipelineNode,
  index: number,
  compact: boolean,
  state: { selected: boolean; hasIssue: boolean }
) {
  const position = compact ? { x: 0, y: index * 124 } : { x: index * 220, y: index % 2 ? 36 : 92 };
  const orientation = compact ? 'vertical' : 'horizontal';
  const tone = pipelineNodeTone(item, state.hasIssue);
  const color =
    tone === 'signal'
      ? 'oklch(80% 0.13 152)'
      : tone === 'scan'
        ? 'oklch(78% 0.12 205)'
        : tone === 'amber'
          ? 'oklch(82% 0.13 88)'
          : 'oklch(72% 0.006 180)';

  return {
    id: item.id,
    position,
    sourcePosition: orientation === 'vertical' ? 'bottom' : 'right',
    targetPosition: orientation === 'vertical' ? 'top' : 'left',
    data: {
      label: (
        <div
          className={[
            'pipeline-node-card min-w-[156px] rounded-md bg-graphite-900 px-3 py-2',
            state.selected ? 'pipeline-node-card-selected' : '',
            state.hasIssue ? 'pipeline-node-card-issue' : '',
          ].join(' ')}
        >
          <p className="text-sm font-semibold text-neutral-100">{nodeLabel(item)}</p>
          <p className="mt-1 font-mono text-[11px] text-neutral-500">{nodeCaption(item)}</p>
          <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: color }} />
        </div>
      ),
    },
    style: {
      background: 'transparent',
      border: 'none',
      padding: 0,
      color: 'inherit',
    },
  };
}

function pipelineEdge(
  id: string,
  source: string,
  target: string,
  animated = false,
  hasIssue = false
) {
  const stroke = hasIssue
    ? 'oklch(82% 0.13 88)'
    : animated
      ? 'oklch(78% 0.12 205)'
      : 'oklch(72% 0.006 180 / 0.52)';

  return {
    id,
    source,
    target,
    animated: animated && !hasIssue,
    markerEnd: {
      type: 'arrowclosed',
      color: stroke,
    },
    style: {
      stroke,
      strokeWidth: animated || hasIssue ? 2 : 1.4,
    },
  };
}

function pipelineNodeTone(
  node: PipelineNode,
  hasIssue: boolean
): 'signal' | 'scan' | 'neutral' | 'amber' {
  if (hasIssue) {
    return 'amber';
  }

  if (node.type === 'input' || node.type === 'output') {
    return 'signal';
  }

  if (node.type === 'yolo_onnx') {
    return 'scan';
  }

  return 'neutral';
}

function nodeLabel(node: PipelineNode): string {
  const labels: Record<PipelineNode['type'], string> = {
    input: 'Input',
    resize: 'Resize',
    hsv_filter: 'HSV filter',
    yolo_onnx: 'Detector',
    nms: 'NMS',
    output: 'Output',
  };

  return labels[node.type];
}

function nodeCaption(node: PipelineNode): string {
  if (node.type === 'resize') {
    return `${node.params.width}px width`;
  }

  if (node.type === 'hsv_filter') {
    return `H ${node.params.hMin}-${node.params.hMax}`;
  }

  if (node.type === 'yolo_onnx') {
    return node.params.modelId ?? 'model unbound';
  }

  if (node.type === 'nms') {
    return `IoU ${node.params.iouThreshold.toFixed(2)}`;
  }

  if (node.type === 'input') {
    return 'MediaAsset stream';
  }

  return 'Predictions';
}

function isDetectorPath(edge: { source: string; target: string }, definition: PipelineDefinition) {
  const source = definition.nodes.find((node) => node.id === edge.source);
  const target = definition.nodes.find((node) => node.id === edge.target);

  return source?.type === 'yolo_onnx' || target?.type === 'yolo_onnx';
}

export { JobsPanel, JobSourcePill };
