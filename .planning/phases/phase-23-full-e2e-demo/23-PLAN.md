# Phase 23 — Full E2E Playwright & Demo Video

**Status:** Complete
**Type:** Test Generation + GSD Workflow Execution
**Depends on:** Phase 22B (completed, 2026-05-05)

## Goal

Deliver the final portfolio-grade proof: a full vertical-slice Playwright E2E test, a composed meta-harness that gates on Phase 22A/22B, demo documentation, and final README cleanup.

## Architecture Decision: E2E Mode

**Mode: Hybrid (seeded production path)**

Phase 22B already proved 8/8 live API checks pass against seeded fixtures. Phase 23 adds the browser UI layer on top of that verified foundation.

**Rationale:**

- Full UI mutation flow (upload → thumbnail → dataset → annotation → lock → COCO → inference → eval → overlay) requires: (a) a deterministic binary fixture uploaded via the web UI, (b) no race conditions on async job completion, (c) stable timing for SSE progress. These are integration-level concerns, not E2E-proof concerns.
- The Phase 22B API harness proves the entire production path is live and correct.
- The Phase 22B Playwright smoke proves all 8 navigation sections load without console errors.
- Phase 23 adds deep seeded-state assertions (canonical dataset/version visible, SUCCEEDED job visible, predictions visible, evaluation metrics visible) proving the browser reflects the real production path.
- Mutation flow is documented as a manual demo path.

**Honest limitation:** The automated E2E is seeded-state browser proof, not full user-initiated upload-to-eval flow. The full mutation flow is verified manually via demo docs.

## What Phase 22B Left Undone

Phase 22B produced 11 Playwright smoke tests covering navigation + load states. Phase 23 extends that with deep assertions against seeded fixture surfaces.

## Deliverables

### A. Full Vertical-Slice Playwright Spec

**File:** `apps/web/e2e/full-vertical-slice.spec.ts`

Extends Phase 22B smoke with fixture-aware assertions:

| #   | Test                                            | Assertion                           |
| --- | ----------------------------------------------- | ----------------------------------- |
| 1   | App loads without console errors                | errors.length === 0                 |
| 2   | ReadinessStrip shows real backend state         | text includes "Database" or "ready" |
| 3   | Media section loads                             | visible, no errors                  |
| 4   | Versions section shows canonical LOCKED dataset | version row with "LOCKED" status    |
| 5   | Annotate section shows annotation workspace     | canvas or annotation panel visible  |
| 6   | Pipeline section loads                          | pipeline builder visible            |
| 7   | Jobs section shows SUCCEEDED job                | job row with status "SUCCEEDED"     |
| 8   | Jobs section shows canonical prediction count   | >= 3 prediction indicators          |
| 9   | Evaluation metrics visible in Jobs panel        | metric values (numbers) visible     |
| 10  | Replay section loads without errors             | timeline or replay panel visible    |
| 11  | Diff section loads without errors               | diff panel visible                  |
| 12  | No console errors on any section                | errors.length === 0                 |

**Navigation labels:** duplicated from `FIXTURE_IDS` inline (same limitation as Phase 22B — relative path from `apps/web/e2e/` to `scripts/` not available).

**No screenshot assertions. No flaky sleeps. Uses `waitForLoadState('networkidle')`.**

**baseURL fix:** Replace `baseURL` env var fallback with a static default in `playwright.config.ts` to prevent "Cannot navigate to invalid URL" when env var is unset.

### B. Phase 23 Meta-Harness

**File:** `scripts/harness/phase23-full-e2e-check.ts`

Composes Phase 22A, Phase 22B, and Playwright:

```
pnpm meta:harness:phase22b --strict --with-api    # Phase 22A + 22B
pnpm --filter @visionflow/web test:e2e -- e2e/full-vertical-slice.spec.ts --project=chromium
```

**Requires:** Full stack running (API on 3000, web on 5173). Fails loudly with clear boot instructions if unreachable.

**package.json script:**

```json
"meta:harness:phase23": "pnpm exec tsx scripts/harness/phase23-full-e2e-check.ts --strict"
```

### C. Demo Documentation

**Files:**

- `docs/demo/README-DEMO.md` — updated with exact boot/seed/verification commands
- `docs/demo/DEMO-CHECKLIST.md` — new: manual demo walkthrough checklist

### D. README Final Cleanup

Remove stale status language:

- Phase 22B: "Planned" → "Done" (was already marked done in STATE/MILESTONES, need to verify README)
- Phase 23: "Planned" → "Done"
- Verify commands are accurate
- Verify env semantics table matches `.env.example`

### E. Planning Artifacts

- `23-PLAN.md` — this file
- `23-SUMMARY.md` — post-execution report
- `23-REVIEW.md` — code review findings
- `.planning/STATE.md` — Phase 23 complete
- `.planning/ROADMAP.md` — Phase 23 commit SHA
- `.planning/MILESTONES.md` — Phase 23 complete

## Success Criteria

### E2E (Playwright)

1. `full-vertical-slice.spec.ts` exists and runs against live stack.
2. All 12 tests pass.
3. No console errors on any section.
4. `playwright.config.ts` baseURL fallback fixed to static string.

### Harness

5. `phase23-full-e2e-check.ts` exists and composes Phase 22A + 22B + Playwright.
6. `pnpm meta:harness:phase23` fails loudly if stack is not running.
7. `pnpm meta:harness:phase23` passes when stack is running.

### Demo

8. `docs/demo/README-DEMO.md` has exact boot + verification commands.
9. `docs/demo/DEMO-CHECKLIST.md` has manual demo walkthrough.
10. README demo section points to actual artifact or exact instructions.

### README

11. No "Phase 23 Planned" language remains.
12. No stale "Phase 22B Planned" language.
13. v1.1 milestone status reflects Phase 23 completion.

### Regression

14. Phase 22A harness still passes.
15. Phase 22B harness still passes.
16. `pnpm typecheck` passes.
17. `pnpm test` passes.
18. `pnpm build` passes.
19. `pnpm lint` passes.

## Files to Create

- `apps/web/e2e/full-vertical-slice.spec.ts`
- `scripts/harness/phase23-full-e2e-check.ts`
- `docs/demo/DEMO-CHECKLIST.md`
- `.planning/phases/phase-23-full-e2e-demo/23-PLAN.md`
- `.planning/phases/phase-23-full-e2e-demo/23-SUMMARY.md`
- `.planning/phases/phase-23-full-e2e-demo/23-REVIEW.md`

## Files to Change

- `apps/web/playwright.config.ts` — fix baseURL fallback to static default
- `docs/demo/README-DEMO.md` — update with exact commands
- `README.md` — remove stale phase status language
- `package.json` — add `meta:harness:phase23`
- `.planning/STATE.md` — mark Phase 23 complete
- `.planning/ROADMAP.md` — Phase 23 entry with commit SHA
- `.planning/MILESTONES.md` — Phase 23 marked Done
- `.github/workflows/ci.yml` — add `meta:harness:phase23` to db-harness and migration-chain

## Out of Scope

- Full UI mutation flow automation (upload → thumbnail → dataset → annotation → lock → COCO → inference → eval)
- Demo GIF/video recording (instructions included, not generated)
- Docker test-stack.yml
- New product features
- UI redesign
- Model weight downloads
