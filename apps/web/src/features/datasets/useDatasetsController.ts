import { useEffect, useState } from 'react';
import type { DatasetVersionSummary } from '@visionflow/contracts';
import { listDatasetVersions, listProjectDatasets } from '../../lib/datasets';

const DEMO_PROJECT_ID = 'proj_parking_lot';

export type DatasetSourceState = 'loading' | 'api' | 'fallback';

export interface UseDatasetsControllerResult {
  datasetVersions: DatasetVersionSummary[];
  selectedDatasetVersionId: string | null;
  setSelectedDatasetVersionId: (id: string | null) => void;
  datasetSourceState: DatasetSourceState;
  setDatasetVersions: React.Dispatch<React.SetStateAction<DatasetVersionSummary[]>>;
  setDatasetSourceState: React.Dispatch<React.SetStateAction<DatasetSourceState>>;
}

export function useDatasetsController(): UseDatasetsControllerResult {
  const [selectedDatasetVersionId, setSelectedDatasetVersionId] = useState<string | null>(null);
  const [datasetVersions, setDatasetVersions] = useState<DatasetVersionSummary[]>([]);
  const [datasetSourceState, setDatasetSourceState] = useState<DatasetSourceState>('loading');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const datasetsResponse = await listProjectDatasets(DEMO_PROJECT_ID);

        if (cancelled) return;

        const versionResponses = await Promise.all(
          datasetsResponse.datasets.map((ds) => listDatasetVersions(DEMO_PROJECT_ID, ds.id))
        );

        if (cancelled) return;

        const allVersions: DatasetVersionSummary[] = versionResponses.flatMap((vr) => vr.versions);

        setDatasetVersions(allVersions);

        if (allVersions.length > 0) {
          const lockedWithAssets = allVersions.find(
            (v) => v.status === 'LOCKED' && v.assetCount > 0
          );
          if (lockedWithAssets) {
            setSelectedDatasetVersionId(lockedWithAssets.id);
          }
        }

        setDatasetSourceState('api');
      } catch {
        if (cancelled) return;
        setDatasetVersions([]);
        setDatasetSourceState('fallback');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    datasetVersions,
    selectedDatasetVersionId,
    setSelectedDatasetVersionId,
    datasetSourceState,
    setDatasetVersions,
    setDatasetSourceState,
  };
}
