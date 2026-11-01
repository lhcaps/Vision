# Phase 21D Plan — Frontend Split Final Closeout & InspectorRouter State Resolution

## Status

Planned — Phase 21A/21B/21C complete. No existing 21D plan file.

## Phase Objective

Resolve the remaining frontend split closeout issues: remove fake/stub annotation and pipeline state from `InspectorRouter`, finalize Phase 21 with honest section-owned inspector rendering, and update all planning artifacts.

## What Phase 21B Established (Do Not Regress)

- `useRuntimeStatus` is called exactly once in `App.tsx`
- `ReadinessStrip` receives `runtimeReadiness` as a prop from `App.tsx`
- `runtimeState.health` derives from `runtimeStatus.readiness` (backend truth)
- `runtime-selectors.ts` eligibility functions are unchanged
- `runtime-selectors.test.ts` regression tests pass

## What Phase 21C Established (Do Not Regress)

- `JobsPanel` owns `threshold` locally via `useState(62)`
- `AnnotationEnginePanel` owns all annotation state internally
- `PipelinePanel` owns pipeline definition/validation/selected node internally
- `OverviewPanel` shows neutral pipeline text (no fake validation claim)
- `JobsPanel` and `TimelineReplayPanel` use `seededGroundTruth` via `useMemo`
- `AppRoutes` has 17 props

## Current Problem

`AppRoutes` passes 8 fake/stub props to `InspectorRouter`:

```tsx
annotations={[]}
selectedAnnotation=""
setSelectedAnnotation={() => {}}
threshold={62}
setThreshold={() => {}}
pipelineSelectedNodeId="detector"
pipelineDefinition={demoSnapshot.pipeline}
pipelineValidation={validatePipelineDefinition(demoSnapshot.pipeline)}
```

`InspectorRouter` uses these to render `AnnotationInspector` and `PipelineInspector` in the global right rail. However:

1. **PipelinePanel already renders `PipelineInspector` internally** at its right column (`grid-cols-[minmax(0,1.35fr)_320px]`), with real state derived from its own local `definition`, `validation`, `selectedNodeId`.
2. **AnnotationEnginePanel already owns annotation state internally** and has its own embedded annotation inspector.
3. Rendering a second inspector in the global rail with fake/stale state is dishonest and creates confusion.

## Architecture Decision

**Chosen option: A1 — Honest embedded-notice panels for annotate/pipeline sections in InspectorRouter.**

For `annotate` and `pipeline` sections, the global `InspectorRouter` will render a non-interactive notice stating that the inspector is embedded in the workspace. For `media`, `datasets`, `jobs`, it continues rendering real data.

This is preferred because:

- `PipelinePanel` and `AnnotationEnginePanel` already own their inspector state locally
- The global right rail inspector for those sections was always fake/secondary
- Option A1 preserves the prop-surface gains from Phase 21C (no lifting state back to App root)
- Option B (extracting route containers) is heavier and would increase prop surface

## Scope

### In Scope

- Refactor `InspectorRouterProps` to remove: `annotations`, `selectedAnnotation`, `setSelectedAnnotation`, `threshold`, `setThreshold`, `pipelineSelectedNodeId`, `pipelineDefinition`, `pipelineValidation`
- Update `InspectorRouter` to render honest embedded-notice panels for `annotate` and `pipeline`
- Update `AppRoutes.tsx` to remove fake prop passings and unused imports (`validatePipelineDefinition`, `PipelineValidationResult`, `demoSnapshot.pipeline`)
- Verify no no-op setters are passed to visible inspector controls
- Verify `PipelinePanel` and `AnnotationEnginePanel` own their inspectors independently (already true — confirm)
- Update `inspector/index.ts` barrel export (may need adjustment)
- Update `inspector.types.ts` — remove `AnnotationInspectorData` and `PipelineInspectorData` if only used by the removed props
- Circular dependency audit of app/feature/shared imports
- Preserve `seededGroundTruth` for Jobs/Timeline
- Preserve `runtimeReadiness` flow

### Out of Scope

- No backend changes
- No Prisma/schema changes
- No new product feature
- No UI redesign
- No lifting annotation/pipeline state back to App.tsx
- No Redux/Zustand/React Query
- No creating new feature route containers (Option B)
- No visual polish unless a layout regression is caused
- No changing `useRuntimeStatus` call site
- No changing `runtime-selectors` behavior

## Implementation Steps

### Step 1 — Refactor InspectorRouterProps

Reduce `InspectorRouterProps` from:

```typescript
type InspectorRouterProps = {
  active: SectionId;
  annotations: AnnotationSummary[];
  selectedAnnotation: string;
  setSelectedAnnotation: (id: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  job: JobUiState;
  predictions: PredictionSummary[];
  pipelineSelectedNodeId: string;
  pipelineDefinition: PipelineDefinition;
  pipelineValidation: PipelineValidationResult;
  mediaInspectorData: MediaInspectorData;
  datasetInspectorData: DatasetInspectorData;
  projectName: string;
};
```

to:

```typescript
type InspectorRouterProps = {
  active: SectionId;
  job: JobUiState;
  predictions: PredictionSummary[];
  mediaInspectorData: MediaInspectorData;
  datasetInspectorData: DatasetInspectorData;
  projectName: string;
};
```

### Step 2 — Update InspectorRouter

For `active === 'annotate'`:

- Render `InspectorShell` with honest text: "Annotation inspector is embedded in the workspace panel."

For `active === 'pipeline'`:

- Render `InspectorShell` with honest text: "Pipeline node inspector is embedded in the Pipeline workspace."

For `active === 'overview'`, `active === 'timeline'`, `active === 'diff'`:

- Keep existing fallback (project name + job status)

For `active === 'media'`, `active === 'datasets'`, `active === 'jobs'`:

- Keep existing real inspector rendering (unchanged)

### Step 3 — Update AppRoutes.tsx

Remove all fake prop passings to `InspectorRouter`:

- Remove `annotations={[]}`
- Remove `selectedAnnotation=""`
- Remove `setSelectedAnnotation={() => {}}`
- Remove `threshold={62}`
- Remove `setThreshold={() => {}}`
- Remove `pipelineSelectedNodeId="detector"`
- Remove `pipelineDefinition={demoSnapshot.pipeline}`
- Remove `pipelineValidation={...}`

Remove unused imports:

- `validatePipelineDefinition` from `@visionflow/contracts`
- `PipelineValidationResult` from `@visionflow/contracts`
- `AnnotationSummary`, `PipelineDefinition`, `PipelineNode` (if only used for fake props)
- `demoSnapshot` (if only used for `demoSnapshot.pipeline` fake prop — check if `demoSnapshot.project.name` is still needed)

Note: `demoSnapshot.project.name` is still passed to `projectName`. Keep `demoSnapshot` import if needed for that. Check if `demoSnapshot` is used elsewhere in AppRoutes.

Remove `createSeedAnnotationSummaries` import? No — it is still used for `seededGroundTruth` in Jobs/Timeline.

### Step 4 — Update inspector/index.ts

Check if `InspectorRouterProps` is still exported from barrel. If the type shape changed, update consumers of `InspectorRouterProps` if any exist outside InspectorRouter.

### Step 5 — Update inspector.types.ts

Remove `AnnotationInspectorData` and `PipelineInspectorData` from `inspector.types.ts` if they are no longer referenced anywhere (they are only used by the now-removed props).

### Step 6 — Audit imports

Grep for the removed patterns in AppRoutes to confirm they're gone:

- `annotations={[]}`
- `setSelectedAnnotation`
- `setThreshold`
- `pipelineDefinition={demoSnapshot.pipeline}`
- `pipelineValidation={validatePipelineDefinition`

### Step 7 — Verify PipelinePanel self-containment

Confirm `PipelinePanel`:

- Renders `PipelineInspector` internally (confirmed: line ~346-361)
- Does not depend on `InspectorRouter` for pipeline inspector state
- Uses its own local `definition`, `validation`, `selectedNodeId`

Confirm `AnnotationEnginePanel`:

- Owns annotation state internally (confirmed from Phase 21C)
- Does not depend on `InspectorRouter` for annotation state

### Step 8 — Circular dependency audit

Check imports:

- `app/` imports from `features/inspector/` — `InspectorRouter` only (AppRoutes.tsx)
- `features/inspector/` imports from `@visionflow/contracts` — no app/ or feature-local imports
- `features/inspector/` does NOT import from `app/`
- `shared/` does NOT import from `app/` or `features/inspector/`
- `app/` does NOT import from `features/annotations/` internals beyond `AnnotationEnginePanel`
- `app/` does NOT import from `features/pipeline/` internals (PipelinePanel is in app/)

## Non-Goals

- No lifting annotation/pipeline mutable state to App.tsx
- No creating new route container files
- No changing runtime truth flow
- No visual redesign of existing panels

## File Map

### Files Changed

| File                                                  | Change                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/web/src/features/inspector/InspectorRouter.tsx` | Remove 8 fake props; render honest embedded-notice for annotate/pipeline       |
| `apps/web/src/app/AppRoutes.tsx`                      | Remove fake prop passings; remove unused imports                               |
| `apps/web/src/features/inspector/index.ts`            | Update `InspectorRouterProps` type export (if shape changed)                   |
| `apps/web/src/features/inspector/inspector.types.ts`  | Remove `AnnotationInspectorData` and `PipelineInspectorData` (if unreferenced) |

### Files Unchanged (guarded)

- `App.tsx` — no changes needed
- `PipelinePanel.tsx` — no changes needed (already self-contained)
- `AnnotationEnginePanel` — no changes needed (already self-contained)
- `JobsPanel.tsx` — no changes needed
- `TimelineReplayPanel` — no changes needed
- `ReadinessStrip.tsx` — no changes needed
- `useRuntimeStatus.ts` — no changes needed
- `runtime-selectors.ts` — no changes needed
- `runtime-selectors.test.ts` — no changes needed

## Verification Plan

1. `pnpm --filter @visionflow/web typecheck` — must pass
2. `pnpm --filter @visionflow/web test` — all tests pass
3. `pnpm --filter @visionflow/web lint` — must pass
4. `pnpm --filter @visionflow/web build` — must pass
5. Runtime truth grep checks:
   - `grep "useRuntimeStatus" apps/web/src/App.tsx` — only one call site
   - `grep "runtimeReadiness" apps/web/src/` — correct flow
6. Fake-state grep checks:
   - `grep "annotations={}" apps/web/src/` — zero results
   - `grep "setSelectedAnnotation={() => {}}" apps/web/src/` — zero results
   - `grep "setThreshold={() => {}}" apps/web/src/` — zero results
   - `grep "pipelineDefinition={demoSnapshot" apps/web/src/` — zero results
   - `grep "pipelineValidation={validatePipelineDefinition" apps/web/src/` — zero results
7. Runtime truth invariants unchanged:
   - `useRuntimeStatus` called only in App.tsx
   - `runtimeState.health` derives from backend truth
   - `runtime-selectors.test.ts` passes
8. Phase 21C preservation:
   - JobsPanel still uses `seededGroundTruth`
   - TimelineReplayPanel still uses `seededGroundTruth`
   - OverviewPanel still shows neutral pipeline text
   - AppRoutes prop count does not increase
9. Browser smoke (if stack running):
   - Annotate page shows annotation inspector embedded in canvas panel
   - Pipeline page shows pipeline inspector embedded in pipeline panel
   - No fake annotation state in the global inspector rail
   - No fake pipeline state in the global inspector rail
   - Media/Datasets/Jobs inspectors still show real data

## Success Criteria

1. No fake annotation state is passed to InspectorRouter
2. No fake pipeline state is passed to InspectorRouter
3. No no-op setter is passed to a visible inspector control
4. Annotation/pipeline inspector ownership is explicit and documented
5. Global inspector rail renders honest embedded-notice for annotate/pipeline
6. `useRuntimeStatus` remains single-call at App root
7. `runtimeState.health` remains backend-derived
8. `seededGroundTruth` preserved for Jobs and Timeline
9. Overview neutral pipeline text preserved
10. AppRoutes prop surface does not balloon
11. Phase 21A/21B/21C invariants all preserved
12. Typecheck/test/lint/build all pass
13. All planning artifacts updated (STATE, ROADMAP, MILESTONES, 21D-SUMMARY, 21D-REVIEW)
