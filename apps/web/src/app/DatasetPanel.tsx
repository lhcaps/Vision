import {
  ActivityIcon as Activity,
  CheckCircleIcon as CheckCircle,
  GitBranchIcon as GitBranch,
  StackIcon as Stack,
  WarningCircleIcon as WarningCircle,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { DatasetSplit, DatasetSummary, DatasetVersionSummary } from '@visionflow/contracts';
import {
  createEmptySplitSummary,
  SplitSummary,
  summarizeDatasetSplits,
} from '@visionflow/contracts';
import { motionTokens } from '@visionflow/motion';
import { demoSnapshot } from '../data/demo';
import {
  assignDatasetVersionAssets,
  createDataset,
  createDatasetVersion,
  listDatasetVersions,
  listProjectDatasets,
  lockDatasetVersion,
} from '../lib/datasets';
import type { MediaUploadRow } from '../features/media';
import { datasetSplits, type DatasetActionState, type DatasetSourceState } from './section.types';
import { MediaStatusPill } from './MediaPanel';
import { Panel } from './ui/Panel';

function DatasetPanel({
  mediaRows,
  selectedVersionId: externalSelectedVersionId,
  onSelectVersion,
  versions: externalVersions,
  onVersionsChange,
  sourceState: externalSourceState,
  onSourceStateChange,
}: {
  mediaRows: MediaUploadRow[];
  selectedVersionId?: string | null;
  onSelectVersion?: (id: string | null) => void;
  versions?: DatasetVersionSummary[];
  onVersionsChange?: (v: DatasetVersionSummary[]) => void;
  sourceState?: 'loading' | 'api' | 'fallback';
  onSourceStateChange?: (s: 'loading' | 'api' | 'fallback') => void;
}) {
  const projectId = demoSnapshot.project.id;
  const shouldReduceMotion = useReducedMotion();
  const fallbackDatasetId = createFallbackDatasetId(projectId);
  const fallbackDatasets = useMemo(
    () => createFallbackDatasets(projectId, fallbackDatasetId, mediaRows),
    [fallbackDatasetId, mediaRows, projectId]
  );
  const fallbackVersions = useMemo(
    () => createFallbackVersions(fallbackDatasetId, mediaRows),
    [fallbackDatasetId, mediaRows]
  );
  const [sourceState, _setSourceState] = useState<'loading' | 'api' | 'fallback'>(
    externalSourceState ?? 'loading'
  );
  const setSourceState = (s: 'loading' | 'api' | 'fallback') => {
    _setSourceState(s);
    onSourceStateChange?.(s);
  };
  const [datasets, setDatasets] = useState<DatasetSummary[]>(fallbackDatasets);
  const [versions, _setVersions] = useState<DatasetVersionSummary[]>(
    externalVersions ?? fallbackVersions
  );
  const setVersions = (
    v: DatasetVersionSummary[] | ((prev: DatasetVersionSummary[]) => DatasetVersionSummary[])
  ) => {
    if (typeof v === 'function') {
      _setVersions((prev) => {
        const next = v(prev);
        onVersionsChange?.(next);
        return next;
      });
    } else {
      _setVersions(v);
      onVersionsChange?.(v);
    }
  };
  const [selectedDatasetId, setSelectedDatasetId] = useState(fallbackDatasetId);
  const [selectedVersionId, _setSelectedVersionId] = useState(
    externalSelectedVersionId ?? fallbackVersions[0]?.id ?? ''
  );

  const setSelectedVersionId = (id: string) => {
    _setSelectedVersionId(id);
    onSelectVersion?.(id);
  };
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    mediaRows.slice(0, 2).map((row) => row.id)
  );
  const [targetSplit, setTargetSplit] = useState<DatasetSplit>('TRAIN');
  const [localAssignments, setLocalAssignments] = useState<Record<string, string[]>>({});
  const [actionState, setActionState] = useState<DatasetActionState>({
    busy: false,
    message: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDatasets() {
      setSourceState('loading');

      try {
        const datasetResponse = await listProjectDatasets(projectId);

        if (cancelled) {
          return;
        }

        if (datasetResponse.datasets.length === 0) {
          setSourceState('fallback');
          setDatasets(fallbackDatasets);
          setVersions(fallbackVersions);
          return;
        }

        const dataset = datasetResponse.datasets[0];
        const versionResponse = await listDatasetVersions(projectId, dataset.id);

        if (cancelled) {
          return;
        }

        setDatasets(datasetResponse.datasets);
        setSelectedDatasetId(dataset.id);
        setVersions(versionResponse.versions);
        setSelectedVersionId(versionResponse.versions[0]?.id ?? '');
        setSourceState('api');
        setActionState({ busy: false, message: 'Dataset API synchronized.', error: null });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSourceState('fallback');
        setDatasets(fallbackDatasets);
        setSelectedDatasetId(fallbackDatasetId);
        setVersions(fallbackVersions);
        setSelectedVersionId(fallbackVersions[0]?.id ?? '');
        setActionState({
          busy: false,
          message: null,
          error: error instanceof Error ? error.message : 'Dataset API unavailable.',
        });
      }
    }

    void loadDatasets();

    return () => {
      cancelled = true;
    };
    // Initial API handshake only. Local fallback state remains interactive after load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions]
  );
  const selectedDataset =
    datasets.find((dataset) => dataset.id === selectedDatasetId) ?? datasets[0];
  const selectedVersion =
    sortedVersions.find((version) => version.id === selectedVersionId) ?? sortedVersions[0];
  const draftVersion =
    selectedVersion?.status === 'DRAFT'
      ? selectedVersion
      : sortedVersions.find((version) => version.status === 'DRAFT');
  const selectedAssetRows = mediaRows.filter((row) => selectedAssetIds.includes(row.id));
  const canAssign = Boolean(draftVersion) && selectedAssetRows.length > 0 && !actionState.busy;
  const canLock = selectedVersion?.status === 'DRAFT' && !actionState.busy;

  const replaceVersion = (version: DatasetVersionSummary) => {
    setVersions((current) => {
      const next = [version, ...current.filter((item) => item.id !== version.id)].sort(
        (a, b) => b.version - a.version
      );
      setDatasets((datasetState) =>
        datasetState.map((dataset) =>
          dataset.id === version.datasetId ? recalculateDatasetCounts(dataset, next) : dataset
        )
      );
      return next;
    });
    setSelectedVersionId(version.id);
  };

  const handleCreateDraft = async () => {
    setActionState({ busy: true, message: null, error: null });

    try {
      let dataset = selectedDataset;

      if (!dataset && sourceState === 'api') {
        dataset = await createDataset(projectId, {
          name: 'Parking Lot Dataset',
          description: 'Curated parking lot frames for detector evaluation.',
        });
        setDatasets([dataset]);
        setSelectedDatasetId(dataset.id);
      }

      if (!dataset) {
        throw new Error('No dataset target available.');
      }

      const parentVersionId = sortedVersions[0]?.id ?? null;
      const version =
        sourceState === 'api'
          ? await createDatasetVersion(projectId, dataset.id, { parentVersionId })
          : createLocalDraftVersion(dataset.id, sortedVersions);

      replaceVersion(version);
      setActionState({ busy: false, message: `${version.label} draft created.`, error: null });
    } catch (error) {
      setActionState({
        busy: false,
        message: null,
        error: error instanceof Error ? error.message : 'Draft creation failed.',
      });
    }
  };

  const handleAssignAssets = async () => {
    if (!draftVersion) {
      return;
    }

    setActionState({ busy: true, message: null, error: null });

    try {
      const assets = selectedAssetRows.map((row) => ({
        assetId: row.id,
        split: targetSplit,
      }));
      const version =
        sourceState === 'api'
          ? await assignDatasetVersionAssets(projectId, draftVersion.id, { assets })
          : assignLocalAssets(draftVersion, assets, localAssignments[draftVersion.id] ?? []);

      if (sourceState !== 'api') {
        setLocalAssignments((current) => ({
          ...current,
          [draftVersion.id]: [
            ...(current[draftVersion.id] ?? []),
            ...assets.map((asset) => asset.assetId),
          ],
        }));
      }

      replaceVersion(version);
      setActionState({
        busy: false,
        message: `${assets.length} asset${assets.length === 1 ? '' : 's'} assigned to ${version.label}.`,
        error: null,
      });
    } catch (error) {
      setActionState({
        busy: false,
        message: null,
        error: error instanceof Error ? error.message : 'Asset assignment failed.',
      });
    }
  };

  const handleLockVersion = async () => {
    if (!selectedVersion) {
      return;
    }

    setActionState({ busy: true, message: null, error: null });

    try {
      const version =
        sourceState === 'api'
          ? (await lockDatasetVersion(projectId, selectedVersion.id)).version
          : { ...selectedVersion, status: 'LOCKED' as const };

      replaceVersion(version);
      setActionState({ busy: false, message: `${version.label} locked.`, error: null });
    } catch (error) {
      setActionState({
        busy: false,
        message: null,
        error: error instanceof Error ? error.message : 'Version lock failed.',
      });
    }
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(380px,1.14fr)]">
      <Panel className="overflow-hidden">
        <div className="divider flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Dataset timeline</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {selectedDataset?.name ?? 'No dataset'} / {sortedVersions.length} versions
            </p>
          </div>
          <DatasetSourcePill state={sourceState} />
        </div>
        <div className="divider px-4 py-3">
          <DatasetSourceNotice state={sourceState} error={actionState.error} />
        </div>
        <div className="p-4">
          <div className="relative space-y-3 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-white/10">
            {sortedVersions.map((version, index) => {
              const selected = version.id === selectedVersion?.id;

              return (
                <motion.button
                  key={version.id}
                  type="button"
                  onClick={() => setSelectedVersionId(version.id)}
                  className={[
                    'version-card relative w-full rounded-md p-3 text-left transition focus-visible:outline-none active:translate-y-px',
                    selected ? 'version-card-selected' : '',
                  ].join(' ')}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.025, duration: motionTokens.durationFast }}
                >
                  <span
                    className={[
                      'absolute -left-[18px] top-4 h-3 w-3 rounded-full border bg-graphite-950',
                      version.status === 'DRAFT' ? 'border-amber-300' : 'border-signal-300',
                    ].join(' ')}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-neutral-100">
                      {version.label}
                    </span>
                    <DatasetStatusPill status={version.status} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-neutral-500">
                    {version.assetCount} assets / parent {version.parentVersionId ?? 'none'}
                  </p>
                  <div className="mt-3">
                    <SplitSummaryBars summary={version.splitSummary} compact />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Panel>

      <Panel className="version-builder-panel overflow-hidden">
        <div className="divider flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Version builder</h2>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {selectedVersion
                ? `${selectedVersion.label} / ${selectedVersion.status}`
                : 'No version'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              title="Create draft"
              aria-label="Create draft"
              onClick={handleCreateDraft}
              disabled={actionState.busy}
              className="version-header-action version-header-action-muted"
            >
              <GitBranch size={16} />
              New draft
            </button>
            <button
              type="button"
              title="Lock version"
              aria-label="Lock version"
              onClick={handleLockVersion}
              disabled={!canLock}
              className="version-header-action version-header-action-lock"
            >
              <CheckCircle size={16} weight="duotone" />
              Lock version
            </button>
          </div>
        </div>

        {selectedVersion ? (
          <>
            <div className="divider grid gap-3 p-4 md:grid-cols-4">
              <DatasetMetric label="assets" value={selectedVersion.assetCount} tone="signal" />
              <DatasetMetric
                label="train"
                value={selectedVersion.splitSummary.TRAIN}
                tone="signal"
              />
              <DatasetMetric label="valid" value={selectedVersion.splitSummary.VALID} tone="scan" />
              <DatasetMetric label="test" value={selectedVersion.splitSummary.TEST} tone="amber" />
            </div>
            <div className="divider p-4">
              <SplitSummaryBars summary={selectedVersion.splitSummary} />
            </div>
          </>
        ) : (
          <p className="divider p-4 text-sm text-neutral-500">No dataset version available.</p>
        )}

        <div className="version-builder-grid">
          <div className="version-assets-scroll">
            <table className="version-assets-table w-full border-collapse text-sm">
              <thead className="bg-white/[0.025] text-left font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                <tr>
                  <th className="version-select-cell px-4 py-3 font-medium">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Current split</th>
                  <th className="px-4 py-3 font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-200">
                {mediaRows.slice(0, 6).map((asset) => {
                  const selectedAsset = selectedAssetIds.includes(asset.id);

                  return (
                    <tr
                      key={asset.id}
                      className={[
                        'version-asset-row text-neutral-300',
                        selectedAsset ? 'version-asset-row-selected' : '',
                      ].join(' ')}
                    >
                      <td className="version-select-cell px-4 py-3">
                        <label className="asset-select-control">
                          <input
                            type="checkbox"
                            aria-label={`Select ${asset.name}`}
                            checked={selectedAsset}
                            onChange={() => toggleAsset(asset.id)}
                            className="sr-only"
                          />
                          <span
                            className={[
                              'asset-select-box',
                              selectedAsset ? 'asset-select-box-selected' : '',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-100">{asset.name}</p>
                        <p className="font-mono text-xs text-neutral-500">{asset.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <SplitPill split={asset.split} />
                      </td>
                      <td className="px-4 py-3">
                        <MediaStatusPill status={asset.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="version-builder-actions divider-top p-4">
            <h3 className="text-sm font-semibold text-neutral-100">Assign split</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {datasetSplits.map((split) => (
                <button
                  key={split}
                  type="button"
                  aria-pressed={targetSplit === split}
                  onClick={() => setTargetSplit(split)}
                  className={[
                    'version-split-option',
                    targetSplit === split ? 'version-split-option-selected' : '',
                  ].join(' ')}
                >
                  {split}
                </button>
              ))}
            </div>
            <button
              type="button"
              title="Assign to draft"
              aria-label="Assign to draft"
              onClick={handleAssignAssets}
              disabled={!canAssign}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal-300 px-3 py-2 text-sm font-semibold text-graphite-950 transition hover:bg-signal-400 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Stack size={16} weight="duotone" />
              Assign to draft
            </button>
            <p className="mt-3 font-mono text-xs text-neutral-500">
              Target {draftVersion?.label ?? 'none'} / {selectedAssetRows.length} selected
            </p>
            <AnimatePresence mode="popLayout">
              {actionState.message || actionState.error ? (
                <motion.p
                  key={actionState.message ?? actionState.error}
                  className={[
                    'version-action-message',
                    actionState.error
                      ? 'version-action-message-error'
                      : 'version-action-message-ok',
                  ].join(' ')}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: motionTokens.durationFast }}
                >
                  {actionState.error ?? actionState.message}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function DatasetSourcePill({ state }: { state: DatasetSourceState }) {
  const tone = state === 'api' ? 'pill-signal' : state === 'loading' ? 'pill-scan' : 'pill-amber';

  return <span className={`pill-base ${tone}`}>{state === 'api' ? 'api' : state}</span>;
}

function DatasetSourceNotice({
  state,
  error,
}: {
  state: DatasetSourceState;
  error: string | null;
}) {
  const Icon = state === 'api' ? CheckCircle : state === 'loading' ? Activity : WarningCircle;
  const tone =
    state === 'api' ? 'text-signal-300' : state === 'loading' ? 'text-scan-300' : 'text-amber-300';
  const text =
    state === 'api'
      ? 'API-backed dataset versions'
      : state === 'loading'
        ? 'Syncing dataset versions'
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

function DatasetStatusPill({ status }: { status: DatasetVersionSummary['status'] }) {
  const tone =
    status === 'LOCKED'
      ? 'dataset-version-pill-locked'
      : status === 'DRAFT'
        ? 'dataset-version-pill-draft'
        : 'dataset-version-pill-neutral';

  return <span className={`dataset-version-pill ${tone}`}>{status}</span>;
}

function DatasetMetric({
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
      <p className={`mt-2 font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function SplitSummaryBars({
  summary,
  compact = false,
}: {
  summary: SplitSummary;
  compact?: boolean;
}) {
  const total = Math.max(
    1,
    datasetSplits.reduce((sum, split) => sum + summary[split], 0)
  );
  const segments: Array<{ split: DatasetSplit; className: string; label: string }> = [
    { split: 'TRAIN', className: 'bg-signal-300', label: 'train' },
    { split: 'VALID', className: 'bg-scan-300', label: 'valid' },
    { split: 'TEST', className: 'bg-amber-300', label: 'test' },
    { split: 'UNASSIGNED', className: 'bg-neutral-500', label: 'open' },
  ];

  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
        {segments.map((segment) => {
          const count = summary[segment.split];

          return count > 0 ? (
            <span
              key={segment.split}
              className={segment.className}
              style={{ width: `${(count / total) * 100}%` }}
            />
          ) : null;
        })}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {segments.map((segment) => (
            <div key={segment.split} className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                {segment.label}
              </span>
              <span className="font-mono text-xs text-neutral-300">{summary[segment.split]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SplitPill({ split }: { split: string }) {
  const tone =
    split === 'TRAIN'
      ? 'pill-signal'
      : split === 'VALID'
        ? 'pill-scan'
        : split === 'TEST'
          ? 'pill-amber'
          : 'pill-neutral';

  return <span className={`pill-base ${tone}`}>{split}</span>;
}

function createFallbackDatasetId(projectId: string): string {
  return `dataset_${projectId.replace(/[^a-zA-Z0-9]+/g, '_')}_parking`;
}

function createFallbackDatasets(
  projectId: string,
  datasetId: string,
  mediaRows: MediaUploadRow[]
): DatasetSummary[] {
  const versions = createFallbackVersions(datasetId, mediaRows);

  return [
    recalculateDatasetCounts(
      {
        id: datasetId,
        projectId,
        name: 'Parking Lot Dataset',
        description: 'Curated media grouped into immutable detector evaluation snapshots.',
        versionCount: versions.length,
        draftVersionCount: 1,
        lockedVersionCount: 3,
        assetCount: mediaRows.length,
        createdAt: '2026-04-28T12:00:00.000Z',
      },
      versions
    ),
  ];
}

function createFallbackVersions(
  datasetId: string,
  mediaRows: MediaUploadRow[]
): DatasetVersionSummary[] {
  const indexableRows = mediaRows.filter((row) => row.status !== 'failed');
  const v1Rows = indexableRows.slice(0, 1);
  const v2Rows = indexableRows.slice(0, 2);
  const v3Rows = indexableRows.slice(0, 3);

  return [
    createVersionSummary(datasetId, 4, 'DRAFT', `${datasetId}_v3`, []),
    createVersionSummary(datasetId, 3, 'LOCKED', `${datasetId}_v2`, v3Rows),
    createVersionSummary(datasetId, 2, 'LOCKED', `${datasetId}_v1`, v2Rows),
    createVersionSummary(datasetId, 1, 'LOCKED', null, v1Rows),
  ];
}

function createVersionSummary(
  datasetId: string,
  version: number,
  status: DatasetVersionSummary['status'],
  parentVersionId: string | null,
  rows: MediaUploadRow[]
): DatasetVersionSummary {
  return {
    id: `${datasetId}_v${version}`,
    datasetId,
    version,
    label: `v${version}`,
    status,
    parentVersionId,
    assetCount: rows.length,
    splitSummary:
      rows.length > 0
        ? summarizeDatasetSplits(rows.map((row) => ({ split: normalizeDatasetSplit(row.split) })))
        : createEmptySplitSummary(),
    createdAt: new Date(2026, 3, 28, 12, version * 7).toISOString(),
  };
}

function createLocalDraftVersion(
  datasetId: string,
  versions: DatasetVersionSummary[]
): DatasetVersionSummary {
  const latest = versions.reduce((max, version) => Math.max(max, version.version), 0);

  return {
    id: `${datasetId}_v${latest + 1}_${Date.now()}`,
    datasetId,
    version: latest + 1,
    label: `v${latest + 1}`,
    status: 'DRAFT',
    parentVersionId: versions[0]?.id ?? null,
    assetCount: 0,
    splitSummary: createEmptySplitSummary(),
    createdAt: new Date().toISOString(),
  };
}

function assignLocalAssets(
  version: DatasetVersionSummary,
  assets: Array<{ assetId: string; split: DatasetSplit }>,
  existingAssetIds: string[]
): DatasetVersionSummary {
  if (version.status !== 'DRAFT') {
    throw new Error('Version is locked and cannot be modified.');
  }

  if (assets.some((asset) => existingAssetIds.includes(asset.assetId))) {
    throw new Error('Assets cannot be assigned twice to the same version.');
  }

  const splitSummary = { ...version.splitSummary };

  assets.forEach((asset) => {
    splitSummary[asset.split] += 1;
  });

  return {
    ...version,
    assetCount: version.assetCount + assets.length,
    splitSummary,
  };
}

function recalculateDatasetCounts(
  dataset: DatasetSummary,
  versions: DatasetVersionSummary[]
): DatasetSummary {
  const ownVersions = versions.filter((version) => version.datasetId === dataset.id);

  return {
    ...dataset,
    versionCount: ownVersions.length,
    draftVersionCount: ownVersions.filter((version) => version.status === 'DRAFT').length,
    lockedVersionCount: ownVersions.filter((version) => version.status === 'LOCKED').length,
    assetCount: ownVersions.reduce((max, version) => Math.max(max, version.assetCount), 0),
  };
}

function normalizeDatasetSplit(split: string): DatasetSplit {
  return datasetSplits.includes(split as DatasetSplit) ? (split as DatasetSplit) : 'UNASSIGNED';
}

export { DatasetPanel };
