# Phase 21C Plan: AppRoutes Prop Surface & Feature Route Composition Cleanup

## Status

Planned — Phase 21A and 21B complete. No existing 21C plan file.

## Phase Objective

Reduce the `AppRoutes` prop surface and decouple feature-local state from the app composition root, while preserving Phase 21B runtime truth invariants.

## What Phase 21B Established (Do Not Regress)

- `useRuntimeStatus` is called exactly once in `App.tsx`
- `ReadinessStrip` receives `runtimeReadiness` as a prop from `App.tsx`
- `runtimeState.health` derives from `runtimeStatus.readiness` (backend truth)
- `runtime-selectors.ts` eligibility functions are unchanged
- `runtime-selectors.test.ts` regression tests pass

## Current Prop Count (Before 21C)

`AppRoutes` receives **23 individual props** from `App.tsx`:

| Category      | Props                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Cross-cutting | `section`, `runtimeReadiness`, `setSection`                                                                                       |
| Inference/job | `job`, `onRun`, `inferenceEligibility`, `evaluationEligibility`                                                                   |
| Annotation    | `annotationRows`, `setAnnotationRows`, `selectedAnnotation`, `setSelectedAnnotation`                                              |
| Threshold     | `threshold`, `setThreshold`                                                                                                       |
| Media         | `mediaUploads`, `setMediaUploads`, `selectedMediaAssetId`, `onSelectAsset`                                                        |
| Dataset       | `selectedDatasetVersionId`, `onSelectVersion`, `datasetVersions`, `onVersionsChange`, `datasetSourceState`, `onSourceStateChange` |
| Pipeline      | `pipelineSelectedNodeId`, `onSelectNode`, `pipelineDefinition`, `onDefinitionChange`, `pipelineValidation`, `onValidationChange`  |
| Evaluation    | `evaluationReport`, `isEvaluating`, `evaluationError`, `predictions`, `onRunEvaluation`                                           |

## Problem Analysis

### Problem 1: `threshold` prop is redundant

`threshold` is used only in `JobsPanel` and `AnnotationEnginePanel`. It does not need to live at the `App` level — it is a per-feature value. Moreover, `AnnotationEnginePanel` **already** has its own local threshold state for the annotation canvas. The `threshold`/`setThreshold` that flows through AppRoutes→JobsPanel is used only in `JobsPanel`. It should stay there.

### Problem 2: Annotation state is local to each feature

`annotationRows`, `selectedAnnotation`, `setSelectedAnnotation` are used only in the `annotate` section. `AnnotationEnginePanel` already manages its own `annotations` state via `useState`. The seed annotation summaries are computed at the App level but should be initialized inside the panel.

### Problem 3: `ShellHeader` gets fewer props than it should

`ShellHeader` already receives `job`, `inferenceEligibility`, `threshold` — but `threshold` is unused. The `onRun` callback is defined at App level but should remain there since it calls `setSection('jobs')` + `startJob()`. However, the `threshold` prop to ShellHeader is dead weight.

### Problem 4: Dataset state is duplicated

`selectedDatasetVersionId` is lifted to App level, but `DatasetPanel` already has its own internal state for version selection. The App-level `selectedDatasetVersionId` is used only for:

- Computing `runtimeState.selectedDatasetVersionId` (used in `runtime-selectors`)
- Passed to `AppRoutes` → `InspectorRouter` (unused — `InspectorRouter` uses `datasetInspectorData` which is already built from `buildDatasetInspectorData`)
- Passed to `DatasetPanel` as optional `externalSelectedVersionId`

The `runtimeState.selectedDatasetVersionId` is critical — `canRunInference` does not check it, but `canRunEvaluation` is the only selector that would benefit from it. Currently neither selector uses `selectedDatasetVersionId`. The dataset version selection for inference eligibility is implicit (the "locked dataset with assets" condition).

### Problem 5: Pipeline state is local to PipelinePanel

`PipelinePanel` already manages its own `definition`, `validation`, `selectedNodeId` via internal `useState`. The external props are optional and used as initial values. The pipeline state does not need to live at App level for any cross-cutting concern.

## Refactor Strategy

### Decision: Eliminate 4 prop groups from AppRoutes entirely

**Group A — Threshold (2 props):** Remove `threshold` and `setThreshold` from AppRoutes. `JobsPanel` will initialize `threshold` from its own `useState(62)`. Annotation canvas threshold stays local to `AnnotationEnginePanel`.

**Group B — Annotation state (4 props):** Remove `annotationRows`, `setAnnotationRows`, `selectedAnnotation`, `setSelectedAnnotation` from AppRoutes. `AnnotationEnginePanel` will initialize seed annotations internally. `OverviewPanel` currently does not need annotation data.

**Group C — Pipeline state (6 props):** Remove `pipelineSelectedNodeId`, `onSelectNode`, `pipelineDefinition`, `onDefinitionChange`, `pipelineValidation`, `onValidationChange` from AppRoutes. `PipelinePanel` manages all pipeline state internally. The `pipelineValidation` prop to `OverviewPanel` for the "Graph passes V1 validation" message will be removed (Overview will show static text).

**Group D — ShellHeader simplification:** `ShellHeader` already receives `job`, `inferenceEligibility`. Remove the unused `threshold` prop from `ShellHeader`.

### Props that stay at App level (11 remaining)

| Prop                                                                                    | Reason                                                                    |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `section`                                                                               | Drives conditional panel rendering, `NavRail` needs it                    |
| `setSection`                                                                            | Navigation action, used by JobsPanel to navigate to datasets              |
| `runtimeReadiness`                                                                      | Passed to `ReadinessStrip` and `ShellHeader` via AppRoutes                |
| `job`                                                                                   | Passed to `ReadinessStrip` (job status), `JobsPanel`, `InspectorRouter`   |
| `onRun`                                                                                 | Callback that sets section + starts job                                   |
| `inferenceEligibility`                                                                  | Passed to `ShellHeader`, `OverviewPanel`, `JobsPanel`                     |
| `evaluationEligibility`                                                                 | Passed to `JobsPanel`                                                     |
| `mediaUploads`, `setMediaUploads`                                                       | Used in MediaPanel AND DatasetPanel (media → dataset assignment flow)     |
| `selectedMediaAssetId`, `onSelectAsset`                                                 | Used in MediaPanel AND InspectorRouter (media inspector)                  |
| `datasetVersions`, `onVersionsChange`, `datasetSourceState`, `onSourceStateChange`      | Used in DatasetPanel AND `InspectorRouter` (datasetInspectorData builder) |
| `selectedDatasetVersionId`, `onSelectVersion`                                           | Passed to DatasetPanel (optional), used in `buildDatasetInspectorData`    |
| `evaluationReport`, `isEvaluating`, `evaluationError`, `predictions`, `onRunEvaluation` | Used only in JobsPanel                                                    |

### Props added back to AppRoutes (9 for JobsPanel)

JobsPanel needs: `job`, `threshold` (local), `onRun`, `inferenceEligibility`, `evaluationEligibility`, `evaluationReport`, `isEvaluating`, `evaluationError`, `predictions`, `onRunEvaluation`, `onOpenVersions` (→ `setSection`).

These are already on AppRoutes, but `threshold` needs to be passed to JobsPanel.

### Runtime truth guard (Phase 21B regression check)

After refactoring, verify:

1. `grep -n "useRuntimeStatus" apps/web/src/` — only `App.tsx`
2. `grep -n "runtimeReadiness\|runtimeStatus.readiness" apps/web/src/` — `App.tsx` passes it, `ReadinessStrip`/`ShellHeader` receive it
3. `runtime-selectors.test.ts` — all tests still pass

## Non-Goals

- No new feature modules
- No new state management library
- No visual/UI redesign
- No backend changes
- No routing library changes (no React Router)
- No moving `runtimeState` derivation — it stays in App.tsx
- No changing `canRunInference` or `canRunEvaluation` selectors

## File Map

### Files Changed

| File                                                     | Change                                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/App.tsx`                                   | Remove `threshold`/`setThreshold` state, remove annotation state, remove pipeline state, remove 19 prop pass-throughs from AppRoutes call |
| `apps/web/src/app/AppRoutes.tsx`                         | Remove 19 props, keep 4, add `threshold` prop for JobsPanel, update type                                                                  |
| `apps/web/src/app/ShellHeader.tsx`                       | Remove unused `threshold` prop                                                                                                            |
| `apps/web/src/app/JobsPanel.tsx`                         | Accept `threshold` as prop from AppRoutes                                                                                                 |
| `apps/web/src/app/OverviewPanel.tsx`                     | Remove `pipelineValidation` prop (static text instead)                                                                                    |
| `apps/web/src/features/annotations/AnnotationEngine.tsx` | Initialize seed annotations internally (remove external props)                                                                            |

### Files Unchanged (guarded)

- `useRuntimeStatus.ts` — no changes
- `runtime.types.ts` — no changes
- `runtime-selectors.ts` — no changes
- `runtime-selectors.test.ts` — no changes (regression proof)
- `ReadinessStrip.tsx` — no changes
- `InspectorRouter.tsx` — no changes
- `PipelinePanel.tsx` — no changes (already self-contained with optional external props)
- `DatasetPanel.tsx` — no changes (already has optional external props)
- `MediaPanel.tsx` — no changes

## Verification Plan

1. `pnpm --filter @visionflow/web typecheck` — must pass
2. `pnpm --filter @visionflow/web test` — all tests pass
3. `pnpm --filter @visionflow/web lint` — must pass
4. `pnpm --filter @visionflow/web build` — must pass
5. Runtime truth grep checks (see above)
6. Browser smoke if stack is running — check Overview, Media, Datasets, Annotate, Pipeline, Jobs tabs navigate correctly
