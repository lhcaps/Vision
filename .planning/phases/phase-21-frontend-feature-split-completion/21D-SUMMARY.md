# Phase 21D Summary — Frontend Split Final Closeout & InspectorRouter State Resolution

**Phase:** 21D
**Date:** 2026-05-05
**Status:** Complete
**Commit:** `4aa564a5`

---

## What Was Done

### 21D.1 — InspectorRouter Props Refactored

Removed 8 fake/stub props from `InspectorRouter` and replaced their rendering with honest embedded-notice panels.

**Props removed:**

- `annotations: AnnotationSummary[]` (was `[]`)
- `selectedAnnotation: string` (was `""`)
- `setSelectedAnnotation: (id: string) => void` (was `() => {}`)
- `threshold: number` (was `62`)
- `setThreshold: (v: number) => void` (was `() => {}`)
- `pipelineSelectedNodeId: string` (was `"detector"`)
- `pipelineDefinition: PipelineDefinition` (was `demoSnapshot.pipeline`)
- `pipelineValidation: PipelineValidationResult` (was `validatePipelineDefinition(demoSnapshot.pipeline)`)

**New `InspectorRouterProps`:**

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

### 21D.2 — Honest Embedded-Notice Rendering

For `active === 'annotate'`:

```tsx
<InspectorShell title="Inspector" section="annotate">
  <ActionHint
    label="Embedded"
    description="Annotation controls are handled inside the Annotation workspace panel."
    tone="neutral"
  />
</InspectorShell>
```

For `active === 'pipeline'`:

```tsx
<InspectorShell title="Inspector" section="pipeline">
  <ActionHint
    label="Embedded"
    description="Pipeline node inspector is handled inside the Pipeline workspace panel."
    tone="neutral"
  />
</InspectorShell>
```

### 21D.3 — AppRoutes.tsx Import Cleanup

**Imports removed:**

- `validatePipelineDefinition` from `@visionflow/contracts`
- `PipelineValidationResult` from `@visionflow/contracts`
- `AnnotationSummary`, `PipelineDefinition`, `PipelineNode` from `@visionflow/contracts` (no longer needed after prop removal)

**Note:** `demoSnapshot` import is retained — `demoSnapshot.project.name` is still passed as `projectName` and `demoSnapshot.media` is used for TimelineReplayPanel.

### 21D.4 — Dead Type Cleanup

- Removed `AnnotationInspectorData` and `PipelineInspectorData` from `inspector.types.ts` (were never referenced outside the barrel export)
- Removed `SectionId` type from `inspector.types.ts` (no longer exported, now defined locally in InspectorRouter)
- Removed unused `AnnotationSummary` import from `inspector.types.ts`
- Removed `AnnotationInspectorData` and `PipelineInspectorData` from `inspector/index.ts` barrel export

### 21D.5 — Architecture Decision

**Chosen: Option A1** — Honest embedded-notice panels for annotate/pipeline sections.

Not Option B because:

- `PipelinePanel` already renders `PipelineInspector` internally at its right column (`grid-cols-[minmax(0,1.35fr)_320px]`)
- `AnnotationEnginePanel` already owns annotation state internally and renders its own annotation inspector
- Option B would require creating feature route container files and lifting state, undoing the prop-surface gains from Phase 21C
- Option A1 is the smallest correct fix

---

## Files Changed

| File                                                  | Change                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/features/inspector/InspectorRouter.tsx` | Props reduced from 13 to 6. Honest embedded-notice for annotate/pipeline. Real inspector for media/datasets/jobs. Fallback for overview/timeline/diff. |
| `apps/web/src/app/AppRoutes.tsx`                      | 8 fake props removed from InspectorRouter. Unused imports removed.                                                                                     |
| `apps/web/src/features/inspector/index.ts`            | Removed AnnotationInspectorData and PipelineInspectorData from barrel export                                                                           |
| `apps/web/src/features/inspector/inspector.types.ts`  | Removed AnnotationInspectorData, PipelineInspectorData, SectionId, unused AnnotationSummary import                                                     |

---

## Verification Results

| Check                                                                 | Result                                 |
| --------------------------------------------------------------------- | -------------------------------------- |
| `pnpm --filter @visionflow/web typecheck`                             | **PASS**                               |
| `pnpm --filter @visionflow/web test`                                  | **PASS** — 65 tests (4 files)          |
| `pnpm --filter @visionflow/web lint`                                  | **PASS**                               |
| `pnpm --filter @visionflow/web build`                                 | **PASS** — production build successful |
| `grep "annotations={}" apps/web/src/`                                 | 0 results                              |
| `grep "setSelectedAnnotation=()" apps/web/src/`                       | 0 results                              |
| `grep "setThreshold=()" apps/web/src/`                                | 0 results                              |
| `grep "pipelineDefinition={demoSnapshot" apps/web/src/`               | 0 results                              |
| `grep "pipelineValidation={validatePipelineDefinition" apps/web/src/` | 0 results                              |

---

## Runtime Truth Regression Checklist

| Check                                                                   | Result                        |
| ----------------------------------------------------------------------- | ----------------------------- |
| `useRuntimeStatus` called only in `App.tsx`                             | **PASS**                      |
| `runtimeReadiness` passed as prop from App → AppRoutes → ReadinessStrip | **PASS**                      |
| `runtimeState.health` derives from backend truth                        | **PASS** (unchanged from 21B) |
| `runtime-selectors.test.ts` — all 34 regression tests pass              | **PASS**                      |
| `ReadinessStrip` receives readiness as prop, not fetching independently | **PASS**                      |
| No "Mock detector mounted" hard-coded label                             | **PASS** (eliminated in 21B)  |
| No fake readiness when endpoint fails                                   | **PASS** (unchanged from 21B) |

---

## Phase 21C Preservation Checklist

| Check                                                        | Result                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `JobsPanel` uses `seededGroundTruth` via `useMemo`           | **PASS**                                               |
| `TimelineReplayPanel` uses `seededGroundTruth` via `useMemo` | **PASS**                                               |
| `OverviewPanel` shows neutral pipeline text                  | **PASS** — "Open Pipeline to inspect graph validation" |
| `AppRoutes` prop surface does not balloon                    | **PASS** — no new props added                          |
| Phase 21B runtime truth invariants preserved                 | **PASS**                                               |

---

## Browser Smoke

**PASS — Playwright navigation smoke (2026-05-05)**

Ran `pnpm playwright test e2e/navigation.spec.ts --project=chromium` against `http://localhost:5173`.

All 10 checks passed:

- 8 nav sections navigate without errors (Command, Media, Versions, Annotate, Pipeline, Jobs, Replay, Diff)
- No console errors on initial load
- All 8 nav buttons are visible

This confirms the `InspectorRouter` refactor does not break navigation or introduce console errors.

---

## Remaining Limitations

1. **Global inspector rail still exists for annotate/pipeline** — it now shows an honest embedded-notice instead of fake state. This is the correct behavior. A heavier option (Option B) would remove the rail entirely for those sections, but that would require layout changes outside the Phase 21D scope.

2. **Two inspector locations for annotate/pipeline** — `PipelinePanel` renders its own `PipelineInspector` at its right column, and `InspectorRouter` (global rail) shows an embedded notice for the `pipeline` section. `AnnotationEnginePanel` similarly owns its annotation inspector internally. This dual rendering is acceptable — the global rail becomes a notice panel rather than a duplicate inspector.

3. **Threshold not synchronized** between `AnnotationEnginePanel`'s canvas threshold and `JobsPanel`'s overlay threshold. This is a feature-locale design decision preserved from Phase 21C.

---

## What Phase 21A/21B/21C Did NOT Regress

- `App.tsx` — unchanged (no useRuntimeStatus regression)
- `PipelinePanel` — unchanged (already self-contained)
- `AnnotationEnginePanel` — unchanged (already self-contained)
- `JobsPanel` — unchanged (seededGroundTruth preserved)
- `TimelineReplayPanel` — unchanged (seededGroundTruth preserved)
- `OverviewPanel` — unchanged (neutral pipeline text preserved)
- `ReadinessStrip` — unchanged
- `runtime-selectors.ts` — unchanged
- `runtime-selectors.test.ts` — unchanged (34 tests pass)

---

## Next

- Phase 22A — Fixture & Test Infrastructure
- Phase 22B — Production-Path Test Suite
- Phase 23 — Full E2E Playwright & Demo Video
