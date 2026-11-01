# Phase 21A Plan — App Composition Boundary Cleanup

**Phase:** 21A — App Composition Boundary Cleanup
**Status:** Complete
**Commit:** `86416bf` (extraction) + cleanup pass
**Date:** 2026-05-05

## Scope

Phase 21A establishes the app composition boundary by:

1. Extracting route rendering to `AppRoutes.tsx`
2. Extracting panel components to `app/` directory
3. Removing all route/panel JSX blocks from `App.tsx`
4. Cleaning unused imports in `App.tsx` and `AppRoutes.tsx`
5. Removing dead derived values (`visibleMediaRows`, `showPipelineExecution`) now computed in `AppRoutes`

## Explicit Non-Goals

- No hook extraction (reserved for Phase 21B)
- No SSE/polling logic movement (reserved for Phase 21B)
- No dataset loading logic movement (reserved for Phase 21B)
- No evaluation logic movement (reserved for Phase 21B)
- No UI redesign
- No backend changes
- No CSS changes
- No new state library introduced

## Deliverables

| Deliverable                                              | Status                |
| -------------------------------------------------------- | --------------------- |
| `AppRoutes.tsx` extracted                                | Done (commit 86416bf) |
| `OverviewPanel.tsx` extracted                            | Done (commit 86416bf) |
| `MediaPanel.tsx` extracted                               | Done (commit 86416bf) |
| `DatasetPanel.tsx` extracted                             | Done (commit 86416bf) |
| `PipelinePanel.tsx` extracted                            | Done (commit 86416bf) |
| `JobsPanel.tsx` extracted                                | Done (commit 86416bf) |
| `Panel`/`VisionPreview`/`StateRow` extracted             | Done (commit 86416bf) |
| `NavRail`, `ShellHeader`, `ReadinessStrip`, `StatusPill` | Done (commit 86416bf) |
| `App.tsx` import cleanup                                 | Done (this pass)      |
| `AppRoutes.tsx` import cleanup                           | Done (this pass)      |
| Dead `visibleMediaRows` removed from App.tsx             | Done (this pass)      |
| Dead `showPipelineExecution` removed from App.tsx        | Done (this pass)      |
| Dead `useRef` removed from App.tsx                       | Done (this pass)      |
| Inline `MediaUploadRow` import fixed in AppRoutes        | Done (this pass)      |

## Acceptance Criteria

- [x] `AppRoutes.tsx` renders route JSX — no route JSX in `App.tsx`
- [x] `App.tsx` reduced from 799 to 638 lines (extraction), then to 548 lines (cleanup)
- [x] All panel component definitions removed from `App.tsx`
- [x] No unused imports in `App.tsx`
- [x] No unused imports in `AppRoutes.tsx`
- [x] No dead code (`visibleMediaRows`, `showPipelineExecution`) in `App.tsx`
- [x] `pnpm --filter @visionflow/web typecheck` passes
- [x] `pnpm --filter @visionflow/web test` passes (63 tests)
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] No circular imports introduced
- [x] No backend files changed
- [x] No CSS/visual redesign
- [x] No route behavior changed
- [x] `app/` imports `features/` — `features/` does not import `app/`
- [x] `shared/` does not import `app/` or `features/`

## Remaining Work (Phase 21B+)

Phase 21A leaves `App.tsx` as the composition root with orchestration hooks intact. The following are reserved for subsequent phases:

- **Phase 21B:** Extract `useInferenceJobController`, `useEvaluationController`, `useDatasetsController` hooks
- **Phase 21C:** Line count polish — target `App.tsx` under 400 lines
- **Phase 21D:** Final circular dependency resolution and shared component extraction
