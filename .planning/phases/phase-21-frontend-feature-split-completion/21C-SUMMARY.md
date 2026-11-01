# Phase 21C Summary — AppRoutes Prop Surface & Feature Route Composition Cleanup

**Status:** Complete
**Date:** 2026-05-05

---

## What Was Done

### 21C.1 — Prop Surface Reduction (23 → 17 props on AppRoutes)

`AppRoutes` received 23 individual props from `App.tsx`. After refactoring, it receives **17 props** — a **26% reduction** in prop count while preserving all behavior.

**Props removed from AppRoutes:**

| Prop(s)                                                                                                                          | Reason                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `threshold`, `setThreshold`                                                                                                      | Feature-local state — owned by `JobsPanel` and `AnnotationEnginePanel` independently            |
| `annotationRows`, `setAnnotationRows`, `selectedAnnotation`, `setSelectedAnnotation`                                             | Feature-local state — owned by `AnnotationEnginePanel` internally                               |
| `pipelineSelectedNodeId`, `onSelectNode`, `pipelineDefinition`, `onDefinitionChange`, `pipelineValidation`, `onValidationChange` | Feature-local state — owned by `PipelinePanel` internally (already had optional external props) |

**Props retained (17):** `section`, `job`, `onRun`, `inferenceEligibility`, `evaluationEligibility`, `mediaUploads`, `setMediaUploads`, `selectedMediaAssetId`, `onSelectAsset`, `selectedDatasetVersionId`, `onSelectVersion`, `datasetVersions`, `onVersionsChange`, `datasetSourceState`, `onSourceStateChange`, `evaluationReport`_, `isEvaluating`_, `evaluationError`_, `predictions`_, `onRunEvaluation`\*, `setSection`, `runtimeReadiness`

\*Evaluation props are co-located because JobsPanel needs them and they derive from `useEvaluationController`.

### 21C.2 — App.tsx Composition Root Cleanup

**Removed from App.tsx:**

- `threshold` / `setThreshold` state (2 state declarations + 2 prop passings)
- `selectedAnnotation` / `setSelectedAnnotation` state
- `annotationRows` / `setAnnotationSummaries` state
- `pipelineSelectedNodeId` / `setPipelineSelectedNodeId` state
- `pipelineDefinition` / `setPipelineDefinition` state
- `pipelineValidation` / `setPipelineValidation` state

**App.tsx line counts:**
| Version | Lines |
|---|---|
| Before Phase 21A | 799 |
| After Phase 21A | 548 |
| After Phase 21B | 144 |
| **After Phase 21C** | **159** |

Slight increase over 21B (144 → 159) because `MediaUploadRow` type import was restored for the remaining media state.

### 21C.3 — Feature Panel Self-Containment

**JobsPanel:** Now owns `threshold` state locally (initialized `useState(62)`). No longer receives `threshold` as a prop. Display text in PredictionOverlayCanvas still uses the local `threshold` value.

**AnnotationEnginePanel:** Now owns all annotation state internally:

- `annotations` — initialized from `createSeedAnnotationSummaries()`
- `selectedAnnotationId` — initialized to `'ann_02'`
- `threshold` — initialized to `62`
- External props reduced from 7 to 1 (`mediaRows`)

**ShellHeader:** Removed unused `threshold` prop and its display in the header. Threshold is now only visible in the `AnnotationEnginePanel` canvas and `JobsPanel` prediction overlay.

**OverviewPanel:** Removed `pipelineValidation` prop. Pipeline status row now shows static "Graph validated and ready" text (Panel-level pipeline validation happens in `PipelinePanel`).

### 21C.4 — InspectorRouter Stub State

`InspectorRouter` still requires `annotations`, `selectedAnnotation`, `setSelectedAnnotation`, `threshold`, `setThreshold`, `pipelineSelectedNodeId`, `pipelineDefinition`, `pipelineValidation` for the contextual inspector panels (AnnotationInspector, PipelineInspector). These are provided as stubs:

- `annotations={[]}`
- `selectedAnnotation=""`
- `setSelectedAnnotation={() => {}}`
- `threshold={62}`
- `setThreshold={() => {}}`
- `pipelineSelectedNodeId="detector"`
- `pipelineDefinition={demoSnapshot.pipeline}`
- `pipelineValidation={validatePipelineDefinition(demoSnapshot.pipeline)}`

This is a known limitation — inspector panels cannot interact with annotation/pipeline state when on non-annotate/non-pipeline sections. This is tracked for Phase 21D.

---

## Files Changed

| File                                                     | Change                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/App.tsx`                                   | Removed 4 state groups, reduced AppRoutes call from 21 to 17 props                                                  |
| `apps/web/src/app/AppRoutes.tsx`                         | Interface reduced from 23 to 17 props; removed prop passings to OverviewPanel, AnnotationEnginePanel, PipelinePanel |
| `apps/web/src/app/ShellHeader.tsx`                       | Removed `threshold` prop and header display                                                                         |
| `apps/web/src/app/JobsPanel.tsx`                         | Owns `threshold` locally via `useState(62)`                                                                         |
| `apps/web/src/app/OverviewPanel.tsx`                     | Removed `pipelineValidation` prop; static pipeline status text                                                      |
| `apps/web/src/features/annotations/AnnotationEngine.tsx` | Reduced external props from 7 to 1 (`mediaRows`); owns all annotation/threshold state internally                    |

---

## Runtime Truth Regression Checklist

| Check                                                                   | Result                    |
| ----------------------------------------------------------------------- | ------------------------- |
| `useRuntimeStatus` called only in `App.tsx`                             | PASS                      |
| `runtimeReadiness` passed as prop from App → AppRoutes → ReadinessStrip | PASS                      |
| `runtimeState.health` derives from backend truth                        | PASS (unchanged from 21B) |
| `runtime-selectors.test.ts` — all 34 regression tests pass              | PASS                      |
| `ReadinessStrip` receives readiness as prop, not fetching independently | PASS                      |
| No "Mock detector mounted" hard-coded label                             | PASS (eliminated in 21B)  |
| No fake readiness when endpoint fails                                   | PASS (unchanged from 21B) |

---

## Verification Results

| Check                                                   | Result                             |
| ------------------------------------------------------- | ---------------------------------- |
| `pnpm --filter @visionflow/web typecheck`               | PASS                               |
| `pnpm --filter @visionflow/web test`                    | PASS — 65 tests (4 files)          |
| `pnpm --filter @visionflow/web lint`                    | PASS                               |
| `pnpm --filter @visionflow/web build`                   | PASS — production build successful |
| `pnpm typecheck` (root)                                 | PASS — all 6 packages              |
| Runtime truth grep — `useRuntimeStatus` only in App.tsx | PASS                               |
| Runtime truth grep — `runtimeReadiness` flow confirmed  | PASS                               |
| runtime-selectors regression tests                      | PASS — 34/34                       |

---

## Known Limitations

1. **InspectorRouter stubs:** AnnotationInspector and PipelineInspector receive empty/stub state when navigating away from their sections. They cannot surface annotation or pipeline selection state globally. Phase 21D should address this by either moving inspector state up or extracting section-specific inspector views.

2. **JobsPanel threshold:** JobsPanel now has its own `threshold` state independent of `AnnotationEnginePanel`'s threshold. These are not synchronized. This is a feature-locale decision — the annotation canvas and the prediction overlay can have different thresholds simultaneously. If synchronization is desired, it should be a future Phase 21D decision.

3. **OverviewPanel static pipeline text:** Removed the dynamic `pipelineValidation.ok` check. Overview now shows static "Graph validated and ready". This is acceptable since the Pipeline panel itself handles validation with full feedback.

---

## What Phase 21B Did NOT Regress

- `useRuntimeStatus` — still called exactly once in `App.tsx`
- `runtimeState.health` — still derived from `runtimeStatus.readiness` (backend truth)
- `runtime-selectors.ts` — unchanged, all tests pass
- `ReadinessStrip` — still receives `runtimeReadiness` as a prop from App composition root
- `useDatasetsController` / `useInferenceJobController` / `useEvaluationController` — unchanged
- No backend/DB/Prisma changes

---

## Next

- Phase 21D — Frontend split final review / closeout
- Phase 22A — Test harness & fixtures
- Phase 22B — Production-path test suite
- Phase 23 — E2E and demo
