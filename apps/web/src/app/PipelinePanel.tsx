import {
  ActivityIcon as Activity,
  CheckCircleIcon as CheckCircle,
  DatabaseIcon as Database,
  WarningCircleIcon as WarningCircle,
} from '@phosphor-icons/react';
import {
  Background,
  Controls,
  Edge as FlowEdge,
  MarkerType,
  Node as FlowNode,
  Position,
  ReactFlow,
} from '@xyflow/react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { demoSnapshot } from '../data/demo';
import { PipelineInspector } from '../features/inspector';
import {
  createProjectPipeline,
  listProjectPipelines,
  updateProjectPipeline,
  validateProjectPipeline,
} from '../lib/pipelines';
import type {
  PipelineDefinition,
  PipelineNode,
  PipelineSummary,
  PipelineValidationIssue,
  PipelineValidationResult,
} from '@visionflow/contracts';
import { validatePipelineDefinition } from '@visionflow/contracts';
import { Panel } from './ui/Panel';
import { StateRow } from './ui/StateRow';
import { VisionPreview } from './ui/VisionPreview';
import type { DatasetActionState, PipelineSourceState } from './section.types';

export function PipelinePanel({
  selectedNodeId: externalSelectedNodeId,
  onSelectNode,
  definition: externalDefinition,
  onDefinitionChange,
  validation: externalValidation,
  onValidationChange,
}: {
  selectedNodeId?: string;
  onSelectNode?: (id: string) => void;
  definition?: PipelineDefinition;
  onDefinitionChange?: (d: PipelineDefinition) => void;
  validation?: PipelineValidationResult;
  onValidationChange?: (v: PipelineValidationResult) => void;
}) {
  const projectId = demoSnapshot.project.id;
  const shouldReduceMotion = useReducedMotion();
  const compactPipeline = useCompactPipelineLayout();
  const [sourceState, setSourceState] = useState<PipelineSourceState>('loading');
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [definition, _setDefinition] = useState(externalDefinition ?? demoSnapshot.pipeline);

  const setDefinition = (
    d: PipelineDefinition | ((prev: PipelineDefinition) => PipelineDefinition)
  ) => {
    if (typeof d === 'function') {
      _setDefinition((prev) => {
        const next = d(prev);
        onDefinitionChange?.(next);
        return next;
      });
    } else {
      _setDefinition(d);
      onDefinitionChange?.(d);
    }
  };

  const [validation, _setValidation] = useState<PipelineValidationResult>(
    externalValidation ?? validatePipelineDefinition(demoSnapshot.pipeline)
  );

  const setValidation = (v: PipelineValidationResult) => {
    _setValidation(v);
    onValidationChange?.(v);
  };

  const [selectedNodeId, _setSelectedNodeId] = useState(externalSelectedNodeId ?? 'detector');

  const setSelectedNodeId = (id: string) => {
    _setSelectedNodeId(id);
    onSelectNode?.(id);
  };
  const [actionState, setActionState] = useState<DatasetActionState>({
    busy: false,
    message: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPipelines() {
      setSourceState('loading');

      try {
        const response = await listProjectPipelines(projectId);

        if (cancelled) {
          return;
        }

        const persistedPipeline = response.pipelines[0] ?? null;

        if (!persistedPipeline) {
          setSourceState('api');
          setActionState({
            busy: false,
            message: 'API ready for first persisted graph.',
            error: null,
          });
          return;
        }

        setPipeline(persistedPipeline);
        setDefinition(persistedPipeline.definition);
        setValidation(persistedPipeline.validation);
        setSourceState('api');
        setActionState({
          busy: false,
          message: 'Pipeline API synchronized.',
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSourceState('fallback');
        setPipeline(null);
        setDefinition(demoSnapshot.pipeline);
        setValidation(validatePipelineDefinition(demoSnapshot.pipeline));
        setActionState({
          busy: false,
          message: null,
          error: error instanceof Error ? error.message : 'Pipeline API unavailable.',
        });
      }
    }

    void loadPipelines();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setValidation(validatePipelineDefinition(definition));
  }, [definition]);

  const selectedNode =
    definition.nodes.find((item) => item.id === selectedNodeId) ?? definition.nodes[0] ?? null;
  const nodes = useMemo<FlowNode[]>(
    () =>
      definition.nodes.map((item, index) =>
        pipelineNode(item, index, compactPipeline, {
          selected: item.id === selectedNode?.id,
          hasIssue: validation.issues.some((issue) => issue.nodeId === item.id),
        })
      ),
    [compactPipeline, definition.nodes, selectedNode?.id, validation.issues]
  );

  const edges = useMemo<FlowEdge[]>(
    () =>
      definition.edges.map((item) =>
        pipelineEdge(
          item.id,
          item.source,
          item.target,
          isDetectorPath(item, definition),
          validation.issues.some((issue) => issue.edgeId === item.id)
        )
      ),
    [definition, validation.issues]
  );
  const canSave = validation.ok && !actionState.busy && sourceState !== 'loading';

  const updateNode = (nodeId: string, updater: (node: PipelineNode) => PipelineNode) => {
    setDefinition((current) => ({
      ...current,
      nodes: current.nodes.map((item) => (item.id === nodeId ? updater(item) : item)),
    }));
    setActionState({ busy: false, message: 'Graph draft changed.', error: null });
  };

  const handleValidateGraph = async () => {
    setActionState({ busy: true, message: null, error: null });

    try {
      const nextValidation =
        sourceState === 'api'
          ? (await validateProjectPipeline(projectId, { definition })).validation
          : validatePipelineDefinition(definition);

      setValidation(nextValidation);
      setActionState({
        busy: false,
        message: nextValidation.ok
          ? 'Backend validation passed.'
          : `${nextValidation.errors.length} graph blocker${
              nextValidation.errors.length === 1 ? '' : 's'
            } found.`,
        error: null,
      });
    } catch (error) {
      setActionState({
        busy: false,
        message: null,
        error: error instanceof Error ? error.message : 'Pipeline validation failed.',
      });
    }
  };

  const handleSaveGraph = async () => {
    setActionState({ busy: true, message: null, error: null });

    try {
      const nextValidation =
        sourceState === 'api'
          ? (await validateProjectPipeline(projectId, { definition })).validation
          : validatePipelineDefinition(definition);

      setValidation(nextValidation);

      if (!nextValidation.ok) {
        setActionState({
          busy: false,
          message: null,
          error: 'Resolve graph blockers before saving.',
        });
        return;
      }

      if (sourceState === 'api') {
        const saved = pipeline
          ? await updateProjectPipeline(projectId, pipeline.id, {
              name: pipeline.name,
              definition,
            })
          : await createProjectPipeline(projectId, {
              name: 'Parking detector pipeline',
              definition,
            });

        setPipeline(saved);
        setDefinition(saved.definition);
        setValidation(saved.validation);
        setActionState({ busy: false, message: 'Pipeline persisted.', error: null });
        return;
      }

      const now = new Date().toISOString();
      setPipeline({
        id: pipeline?.id ?? 'pipeline_local_parking_detector',
        projectId,
        name: pipeline?.name ?? 'Parking detector pipeline',
        definition,
        validation: nextValidation,
        createdAt: pipeline?.createdAt ?? now,
        updatedAt: now,
      });
      setActionState({
        busy: false,
        message: 'Local graph saved in fallback state.',
        error: null,
      });
    } catch (error) {
      setActionState({
        busy: false,
        message: null,
        error: error instanceof Error ? error.message : 'Pipeline save failed.',
      });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
      <Panel className="pipeline-panel overflow-hidden">
        <div className="divider flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Visual pipeline</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {pipeline?.name ?? 'Parking detector pipeline'} / {validation.summary.nodeCount} nodes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PipelineSourcePill state={sourceState} />
            <button
              type="button"
              title="Validate graph"
              aria-label="Validate graph"
              onClick={handleValidateGraph}
              disabled={actionState.busy || sourceState === 'loading'}
              className="version-header-action version-header-action-muted"
            >
              <CheckCircle size={16} />
              Validate
            </button>
            <button
              type="button"
              title="Save pipeline"
              aria-label="Save pipeline"
              onClick={handleSaveGraph}
              disabled={!canSave}
              className="version-header-action version-header-action-lock"
            >
              <Database size={16} weight="duotone" />
              Save
            </button>
          </div>
        </div>
        <div className="divider px-4 py-3">
          <PipelineSourceNotice state={sourceState} error={actionState.error} />
        </div>
        <div className="pipeline-canvas h-[560px] bg-graphite-950">
          <ReactFlow
            key={compactPipeline ? 'pipeline-compact' : 'pipeline-wide'}
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, item) => setSelectedNodeId(item.id)}
            fitView
            fitViewOptions={{ padding: compactPipeline ? 0.12 : 0.08 }}
            minZoom={0.2}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background color="rgba(255,255,255,0.08)" gap={22} size={1} />
            <Controls position="bottom-right" />
          </ReactFlow>
        </div>
      </Panel>

      {/* Contextual PipelineInspector — shows selected node params and graph checks */}
      <PipelineInspector
        selectedNode={selectedNode}
        validation={validation}
        onValidate={handleValidateGraph}
        onSave={canSave ? handleSaveGraph : undefined}
        onClearModel={
          selectedNode?.type === 'yolo_onnx'
            ? () =>
                updateNode(selectedNode.id, (node) =>
                  node.type === 'yolo_onnx'
                    ? { ...node, params: { ...node.params, modelId: null } }
                    : node
                )
            : undefined
        }
      />
    </div>
  );
}

function PipelineSourcePill({ state }: { state: PipelineSourceState }) {
  const tone = state === 'api' ? 'pill-signal' : state === 'loading' ? 'pill-scan' : 'pill-amber';

  return <span className={`pill-base ${tone}`}>{state === 'api' ? 'api' : state}</span>;
}

function PipelineSourceNotice({
  state,
  error,
}: {
  state: PipelineSourceState;
  error: string | null;
}) {
  const Icon = state === 'api' ? CheckCircle : state === 'loading' ? Activity : WarningCircle;
  const tone =
    state === 'api' ? 'text-signal-300' : state === 'loading' ? 'text-scan-300' : 'text-amber-300';
  const text =
    state === 'api'
      ? 'API-backed pipeline definitions'
      : state === 'loading'
        ? 'Syncing pipeline definitions'
        : error
          ? `Local demo fallback: ${error}`
          : 'Local demo fallback';

  return (
    <div className="flex items-start gap-2">
      <Icon className={tone} size={17} weight="duotone" />
      <p className="min-w-0 text-sm text-neutral-400">{text}</p>
    </div>
  );
}

function PipelineMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'signal' | 'scan' | 'amber';
}) {
  const toneClass =
    tone === 'signal' ? 'text-signal-300' : tone === 'scan' ? 'text-scan-300' : 'text-amber-300';

  return (
    <div className="inner-border-subtle rounded-md bg-white/[0.03] p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">{label}</p>
      <p className={`mt-2 font-mono text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PipelineIssueRow({ issue }: { issue: PipelineValidationIssue }) {
  return (
    <StateRow
      label={issue.severity === 'error' ? 'Blocker' : 'Warning'}
      value={issue.message}
      tone={issue.severity === 'error' ? 'amber' : 'neutral'}
      icon={issue.severity === 'error' ? WarningCircle : Activity}
    />
  );
}

function PipelineNodeInspector({
  node,
  shouldReduceMotion,
  onResizeWidthChange,
  onDetectorThresholdChange,
  onDetectorModelChange,
  onNmsThresholdChange,
}: {
  node: PipelineNode | null;
  shouldReduceMotion: boolean;
  onResizeWidthChange: (width: number) => void;
  onDetectorThresholdChange: (threshold: number) => void;
  onDetectorModelChange: (modelId: string | null) => void;
  onNmsThresholdChange: (iouThreshold: number) => void;
}) {
  if (!node) {
    return <p className="p-4 text-sm text-neutral-500">No node selected.</p>;
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-100">{nodeLabel(node)}</h3>
          <p className="mt-1 font-mono text-xs text-neutral-500">{node.id}</p>
        </div>
        <span className="inner-border-subtle rounded-md bg-white/[0.035] px-2 py-1 font-mono text-xs uppercase text-neutral-400">
          {node.type}
        </span>
      </div>

      {node.type === 'resize' && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[640, 960, 1280].map((width) => (
            <button
              key={width}
              type="button"
              aria-pressed={node.params.width === width}
              onClick={() => onResizeWidthChange(width)}
              className={[
                'version-split-option',
                node.params.width === width ? 'version-split-option-selected' : '',
              ].join(' ')}
            >
              {width}
            </button>
          ))}
        </div>
      )}

      {node.type === 'yolo_onnx' && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-neutral-200">Confidence</span>
              <span className="font-mono text-xs text-signal-300">
                {node.params.threshold.toFixed(2)}
              </span>
            </div>
            <input
              aria-label="Detector confidence"
              type="range"
              min="25"
              max="95"
              value={Math.round(node.params.threshold * 100)}
              onChange={(event) => onDetectorThresholdChange(Number(event.target.value) / 100)}
              style={thresholdRangeStyle(Math.round(node.params.threshold * 100), 25, 95)}
              className="threshold-range"
            />
          </div>
          <button
            type="button"
            onClick={() => onDetectorModelChange(node.params.modelId ? null : 'model_onnx_parking')}
            className="version-header-action version-header-action-muted w-full justify-center"
          >
            <Database size={16} />
            {node.params.modelId ? 'Clear model' : 'Bind ONNX model'}
          </button>
        </div>
      )}

      {node.type === 'nms' && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-neutral-200">IoU threshold</span>
            <span className="font-mono text-xs text-scan-300">
              {node.params.iouThreshold.toFixed(2)}
            </span>
          </div>
          <input
            aria-label="NMS IoU threshold"
            type="range"
            min="20"
            max="80"
            value={Math.round(node.params.iouThreshold * 100)}
            onChange={(event) => onNmsThresholdChange(Number(event.target.value) / 100)}
            style={thresholdRangeStyle(Math.round(node.params.iouThreshold * 100), 20, 80)}
            className="threshold-range"
          />
        </div>
      )}

      {node.type === 'input' || node.type === 'output' || node.type === 'hsv_filter' ? (
        <p className="mt-4 text-sm leading-6 text-neutral-500">{nodeCaption(node)}</p>
      ) : null}

      {shouldReduceMotion && (
        <p className="inner-border-subtle mt-4 rounded-md bg-white/[0.025] px-3 py-2 text-sm text-neutral-500">
          Reduced motion is active.
        </p>
      )}
    </div>
  );
}

function useCompactPipelineLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  return compact;
}

function pipelineNode(
  item: PipelineNode,
  index: number,
  compact: boolean,
  state: { selected: boolean; hasIssue: boolean }
): FlowNode {
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
    sourcePosition: orientation === 'vertical' ? Position.Bottom : Position.Right,
    targetPosition: orientation === 'vertical' ? Position.Top : Position.Left,
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
): FlowEdge {
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
      type: MarkerType.ArrowClosed,
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

function thresholdRangeStyle(value: number, min = 40, max = 95): React.CSSProperties {
  return {
    '--threshold-progress': `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
  } as React.CSSProperties;
}

// Re-export for backwards compatibility
export { PipelineMetric, PipelineIssueRow, PipelineNodeInspector };
