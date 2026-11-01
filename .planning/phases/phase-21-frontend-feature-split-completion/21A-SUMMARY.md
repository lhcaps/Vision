# Phase 21A Summary — App Composition Boundary Cleanup

**Phase:** 21A
**Date:** 2026-05-05
**Commit (extraction):** `86416bf`
**Commit (cleanup round 1):** `27d78bb`
**Commit (cleanup round 2 — this fix):** `2f3a1c4`

## Files Changed

### Extraction (Commit 86416bf)

- `apps/web/src/App.tsx` — reduced from 799 to 638 lines
- `apps/web/src/app/AppRoutes.tsx` — created (route rendering)
- `apps/web/src/app/OverviewPanel.tsx` — extracted
- `apps/web/src/app/MediaPanel.tsx` — extracted
- `apps/web/src/app/DatasetPanel.tsx` — extracted
- `apps/web/src/app/PipelinePanel.tsx` — extracted
- `apps/web/src/app/JobsPanel.tsx` — extracted
- `apps/web/src/app/ui/Panel.tsx` — extracted
- `apps/web/src/app/ui/VisionPreview.tsx` — extracted
- `apps/web/src/app/ui/StateRow.tsx` — extracted
- `apps/web/src/app/ui/OverviewStateRow.tsx` — extracted

### Cleanup Round 1 (Commit 27d78bb)

- `apps/web/src/App.tsx` — reduced from 638 to 548 lines
- `apps/web/src/app/AppRoutes.tsx` — import cleanup

**Audit finding:** Commit 27d78bb left residual unused imports (see below).

### Cleanup Round 2 — Leftovers Fix (Commit 2f3a1c4)

- `apps/web/src/App.tsx` — reduced from 548 to 529 lines; removed 9 more unused imports
- `apps/web/src/app/AppRoutes.tsx` — removed 2 unused type imports

## Line Counts

| File            | Before Phase 21A | After Extraction (86416bf) | After Cleanup R1 (27d78bb) | After Cleanup R2 (2f3a1c4) |
| --------------- | ---------------- | -------------------------- | -------------------------- | -------------------------- |
| `App.tsx`       | 799              | 638                        | 548                        | **529**                    |
| `AppRoutes.tsx` | N/A              | 206                        | 209                        | 210                        |

## What Changed (Cleanup Pass — All Rounds)

### Import Cleanup in `App.tsx` — Round 1 (27d78bb)

**Removed unused icon imports (11):**
`ArrowsLeftRightIcon`, `BoundingBoxIcon`, `GitBranchIcon`, `GraphIcon`, `ImageSquareIcon`, `PlayCircleIcon`, `SlidersHorizontalIcon`, `TerminalWindowIcon`, `TimerIcon`, `UploadSimpleIcon`

**Removed unused type imports (8):**
`DatasetSplit`, `DatasetSummary`, `InferenceJobStatus`, `MediaUploadStatus`, `PipelineNode`, `PipelineSummary`, `PipelineValidationIssue`, `CSSProperties`, `ElementType`

**Removed unused value imports (40+):**
`Panel`, `OverviewPanel`, `MediaPanel`, `DatasetPanel`, `PipelinePanel`, `JobsPanel`, `VisionPreview`, `StateRow`, `buildDatasetInspectorData`, `buildMediaInspectorData`, `AnnotationEnginePanel`, `AnnotationInspector`, `DatasetInspector`, `InspectorRouter`, `JobInspector`, `MediaInspector`, `PipelineInspector`, `EmptyState`, `EvaluationEmptyState`, `MediaEmptyState`, `DatasetEmptyState`, `PredictionsEmptyState`, `ErrorState`, `FailedJobErrorState`, `ActionHint`, `Background`, `Controls`, `Edge as FlowEdge`, `MarkerType`, `Node as FlowNode`, `Position`, `ReactFlow`, `AnimatePresence`, `motion`, `useReducedMotion`, `motionTokens`, `createEmptySplitSummary`, `SplitSummary`, `summarizeDatasetSplits`, `validateMediaMime`, `EvaluationMetricsPanel`, `PredictionOverlayCanvas`, `TimelineReplayPanel`, `DatasetVersionDiff`, `PipelineExecutionFlow`, `assignDatasetVersionAssets`, `createDataset`, `createDatasetVersion`, `lockDatasetVersion`, `checksumFile`, `uploadMediaFile`, `updateProjectPipeline`, `validateProjectPipeline`, `canShowPredictionOverlay`, `datasetSplits`, `DatasetActionState`, `DatasetSourceState`, `PipelineSourceState`

**Removed dead derived values (2):**

- `visibleMediaRows` — duplicated; `AppRoutes.tsx` computes it independently
- `showPipelineExecution` — computed but never consumed

**Removed unused hook (1):**

- `useRef`

### Import Cleanup in `App.tsx` — Round 2 (2f3a1c4) — Leftovers Found by Audit

**Removed 9 more unused imports:**
`ActivityIcon`, `CheckCircleIcon`, `DatabaseIcon`, `PlayIcon`, `StackIcon`, `WarningCircleIcon`, `StatusPill`, `ReadinessStrip`, `createProjectPipeline`

These were not used in the App component's JSX render or helper functions.

### Import Cleanup in `AppRoutes.tsx` — Round 1 (27d78bb)

- Replaced inline `import('../features/media').MediaUploadRow[]` with clean type import
- Added necessary imports for route rendering

### Import Cleanup in `AppRoutes.tsx` — Round 2 (2f3a1c4) — Leftovers Found by Audit

**Removed 2 more unused type imports:**
`MediaInspectorData`, `DatasetInspectorData` — type-only imports, not referenced in AppRoutes

## Verification Results

| Command                                          | Result           | Notes                                                                                                        |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter @visionflow/web typecheck`        | **PASS**         |                                                                                                              |
| `pnpm --filter @visionflow/web test`             | **PASS**         | 63/63                                                                                                        |
| `pnpm --filter @visionflow/web lint`             | **PASS**         |                                                                                                              |
| `pnpm --filter @visionflow/web build`            | **PASS**         |                                                                                                              |
| `pnpm --filter @visionflow/web prettier --check` | **PASS**         | Touched files only                                                                                           |
| `pnpm typecheck` (root)                          | **PASS**         |                                                                                                              |
| `pnpm test` (root)                               | **PARTIAL FAIL** | 1 pre-existing flaky API test in `inference.service.test.ts` — CV_WORKER_URL timeout, unrelated to Phase 21A |
| `pnpm lint` (root)                               | **PASS**         |                                                                                                              |
| `pnpm format:check` (root)                       | **FAIL**         | 17 pre-existing formatting failures in unrelated files                                                       |
| Browser smoke                                    | Not run          | Verification limited to typecheck/test/build/lint                                                            |

### Pre-existing Failures (Not From Phase 21A)

- **Root `pnpm test`:** 1 flaky API test (`CvWorkerClient — ONNX mode > throws when CV_WORKER_URL is not configured`) in `inference.service.test.ts` — network-dependent timeout, pre-existing before Phase 21A
- **Root `pnpm format:check`:** 17 files with pre-existing Prettier formatting issues unrelated to Phase 21A (`.planning/` files, panel components, README, harness scripts)
- Touched files (`App.tsx`, `AppRoutes.tsx`) pass Prettier check

## Boundary Review

| Direction                               | Status                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/` imports `features/`              | Clean — `AppRoutes.tsx` imports from `features/annotations`, `features/timeline`, `features/inspector`, `features/media`, `features/inference` |
| `features/` imports `app/`              | Clean — no `features/*` files import from `app/`                                                                                               |
| `shared/` imports `app/` or `features/` | Clean — no `shared/*` files import from `app/` or `features/`                                                                                  |
| Circular dependencies                   | None detected                                                                                                                                  |

## Remaining Limitations

- `App.tsx` still owns orchestration effects (dataset loading, job SSE/polling, evaluation fetching) until Phase 21B
- `AppRoutes` prop surface is intentionally large (20+ props) until controller hooks are extracted in Phase 21B
- No new state library introduced — existing architecture maintained
- Browser smoke not run

## Next

- **Phase 21B:** Extract `useInferenceJobController`, `useEvaluationController`, `useDatasetsController`
- **Phase 21C:** Line count polish — target `App.tsx` under 400 lines
- **Phase 21D:** Final circular dependency resolution
