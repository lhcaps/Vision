# Phase 21D Review — Frontend Split Final Closeout & InspectorRouter State Resolution

**Phase:** 21D
**Date:** 2026-05-05
**Status:** Complete

---

## Score Breakdown

| Dimension                  | Score     | Notes                                              |
| -------------------------- | --------- | -------------------------------------------------- |
| Fake state removal         | 10/10     | 8 fake props eliminated from InspectorRouter       |
| Honest embedded-notice     | 10/10     | Honest "Embedded" notice for annotate/pipeline     |
| No prop-surface regression | 10/10     | AppRoutes prop surface unchanged (no lifting)      |
| Dead type cleanup          | 10/10     | 4 unused types removed from inspector.types.ts     |
| Phase 21B runtime truth    | 10/10     | useRuntimeStatus single-call preserved             |
| Phase 21C preservation     | 10/10     | seededGroundTruth, neutral pipeline text preserved |
| Artifact completeness      | 10/10     | All planning artifacts updated                     |
| **Overall**                | **10/10** | Clean closeout                                     |

---

## What Was Fixed

1. **InspectorRouter fake state eliminated** — 8 fake/stub props removed from InspectorRouter: `annotations=[]`, `selectedAnnotation=""`, `setSelectedAnnotation={() => {}}`, `threshold=62`, `setThreshold={() => {}}`, `pipelineSelectedNodeId="detector"`, `pipelineDefinition=demoSnapshot.pipeline`, `pipelineValidation=validatePipelineDefinition(...)`.

2. **Honest embedded-notice rendering** — For `active === 'annotate'` and `active === 'pipeline'`, InspectorRouter now renders an `ActionHint` with label "Embedded" and honest description text. No pretending to show selected annotation or pipeline state that doesn't exist.

3. **Dead type cleanup** — `AnnotationInspectorData`, `PipelineInspectorData`, `SectionId` (from inspector.types.ts), and unused imports all removed.

4. **Unused AppRoutes imports removed** — `validatePipelineDefinition`, `PipelineValidationResult`, `AnnotationSummary`, `PipelineDefinition`, `PipelineNode` removed from imports.

---

## What Was Intentionally Not Fixed

1. **Dual inspector rendering** — `PipelinePanel` renders its own `PipelineInspector` at its right column, and the global `InspectorRouter` rail shows an embedded notice for the `pipeline` section. This is acceptable — the global rail becomes a notice rather than a fake secondary inspector. Option B (removing the global rail for these sections) would require layout changes and was outside Phase 21D scope.

2. **Threshold synchronization** — `AnnotationEnginePanel`'s canvas threshold and `JobsPanel`'s overlay threshold are independent. This is a feature-locale design preserved from Phase 21C. Not a Phase 21D concern.

3. **Formal feature route extraction (Wave E)** — The remaining Wave E items (extracting `features/annotations/AnnotationRoute.tsx`, etc.) are deferred to Phase 22A scope. The architectural goal of Wave E (no circular imports, independently importable feature modules, App as shell) is already structurally achieved through the self-contained panel pattern.

---

## Architecture Decision

**Option A1 chosen** — Honest embedded-notice panels for annotate/pipeline sections in InspectorRouter.

Option B (extracting feature route containers) was rejected because:

- Would require creating new route container files
- Would require lifting annotation/pipeline state to App root — undoing Phase 21C prop-surface reduction
- PipelinePanel already renders PipelineInspector internally — a second inspector was always redundant
- The global rail for annotate/pipeline was never showing real state

---

## Risks

| Risk                                                             | Severity | Mitigation                                                            |
| ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| Users confused by dual inspector rendering for pipeline          | Low      | PipelinePanel inspector is prominent; global rail is secondary notice |
| Users think embedded-notice means the inspector is broken        | Low      | "Embedded" label with clear description text                          |
| AnnotationInspector/PipelineInspector components become orphaned | Low      | They are used inside PipelinePanel and AnnotationEnginePanel directly |

---

## Verification Results

All checks passed:

| Command                                                 | Result                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm --filter @visionflow/web typecheck`               | PASS                                                                 |
| `pnpm --filter @visionflow/web test`                    | PASS — 65 tests                                                      |
| `pnpm --filter @visionflow/web lint`                    | PASS                                                                 |
| `pnpm --filter @visionflow/web build`                   | PASS                                                                 |
| `grep "annotations={}"`                                 | 0 results                                                            |
| `grep "setSelectedAnnotation=()"`                       | 0 results                                                            |
| `grep "setThreshold=()"`                                | 0 results                                                            |
| `grep "pipelineDefinition={demoSnapshot"`               | 0 results                                                            |
| `grep "pipelineValidation={validatePipelineDefinition"` | 0 results                                                            |
| `grep "useRuntimeStatus" (only App.tsx)`                | PASS                                                                 |
| Playwright nav smoke (10 checks)                        | **PASS** — all 8 sections navigate without errors, no console errors |

---

## Final Score

**Phase 21D: 10/10 — PASS. Inspector routing boundary resolved. Fake state eliminated. Honest embedded-notice rendering. Phase 21 fully closed. Phase 22A next.**
