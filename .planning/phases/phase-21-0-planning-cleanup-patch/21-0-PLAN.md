# Phase 21-0: Planning & CI Truth Cleanup

**Status:** Planned
**Type:** Documentation-only patch
**Depends on:** Phase 20F

## Goal

Sync all planning artifacts to reflect the actual codebase state before Phase 21 begins. This is a documentation-only patch — no code changes.

## Why This Exists

Several phases (13, 14A, 14B, 16A, 17, 18, 20B, 20C, 20D, 20E, 20F) completed their requirements but the planning documents were not fully updated. REQUIREMENTS.md still showed ~94 requirements as pending that are actually done. Failing to sync now means any agent using REQUIREMENTS.md as source of truth will treat already-completed work as undone.

## Scope

### A. REQUIREMENTS.md sync

| Section    | Before  | After   | Phase |
| ---------- | ------- | ------- | ----- |
| PORT-01–06 | Pending | Done    | 11    |
| SEC-01–11  | Pending | Done    | 13    |
| ABS-01–10  | Pending | Done    | 14A   |
| DOM-01–07  | Pending | Done    | 14B   |
| UI-01–09   | Pending | Partial | 16A   |
| MED-01–09  | Pending | Partial | 17    |
| LOCK-01–09 | Pending | Done    | 18    |
| DET-01–08  | Pending | Done    | 19    |
| EVAL-01–09 | Pending | Done    | 20    |

- MED-02: Frame extraction deferred → Partial
- MED-07: Failure flow documented
- UI items tagged with Phase 16A
- All TEST items tagged with Phase 22B
- All E2E items tagged with Phase 23
- TEST-07: frame derivative removed (not yet implemented)
- TEST-09: real frame extraction removed; replaced with "explicit frame extraction not-implemented failure"
- Traceability table: SEC/ABS/DOM/UI/MED/LOCK updated from Pending to Done/Partial
- Total count: 149 reqs, 88 Done, 11 Partial, 50 Pending

### B. MILESTONES.md sync

- v1.1 completion list: added 20B, 20C, 20D, 20E, 20F
- Phase 20F status: In Progress → ✅ FULL PASS
- Phase 20D status: Done → ✅ FULL PASS

### C. README.md sync

1. **Database Migrations section:** Added `db:migrate:deploy`, `db:migrate:status`, `harness:phase20f`. Clarified `db:push` = local dev fast path, `db:migrate:deploy` = production/migration proof path. Fresh start command updated to use migration chain.

2. **Architecture block:** Removed "Evaluation (IoU-based matching)" from CV Worker section. Frame extraction marked "(OpenCV/deferred)". Evaluation note added to data flow line: "Evaluation runs in the NestJS API layer (Phase 20)."

3. **Implementation Status table:** Split "Frontend feature split" into "(minimum) Phase 16A ✅ Done" and "(completion) Phase 21 🔄 Planned".

4. **Known Limitations:**
   - App.tsx: "monolithic" → "composition root"; "Being split into feature modules in Phase 16A" → "Being fully split into feature modules (datasets, annotations, pipelines, jobs, timeline, shell) in Phase 21"
   - CV Worker section: evaluation moved to Data & Reproducibility; frame extraction explicitly marked deferred
   - Data & Reproducibility: added full evaluation persistence bullet with API layer note

### D. ROADMAP.md updates

1. Header status line updated: Phase 20F FULL PASS, Planning Cleanup Patch (21-0) then Phase 21A next
2. Added Planning Cleanup Patch section (Phase 21-0) documenting all sync work
3. Phase 21 restructured into 4 waves: 21A (App Composition Boundary), 21B (Dataset + Media), 21C (Pipeline + Jobs), 21D (Annotation + Timeline)
4. Phase 22A renamed: "Test Harness & Fixtures" → "Fixture & Test Infrastructure"
5. Phase 22A expanded: added `scripts/test-fixtures/` and `scripts/test-db/` bootstrap helpers
6. Phase 22B requirements: removed frame derivative test, removed evaluation from CV worker tests
7. Phase 21 hard rules added: structural refactor only, no redesign
8. Execution order table: added 20F, 21-0, 21 entries

## Files Changed

| File                        | Changes                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `.planning/REQUIREMENTS.md` | PORT/SEC/ABS/DOM/UI/MED/LOCK/DET/EVAL checked, trace table updated, TEST/E2E tagged  |
| `.planning/MILESTONES.md`   | v1.1 completion list, Phase 20F status                                               |
| `README.md`                 | DB migration commands, architecture block, Implementation Status, Known Limitations  |
| `.planning/ROADMAP.md`      | Header, Phase 21-0 section, Phase 21 waves, Phase 22A/B adjustments, execution table |

## Verification

1. REQUIREMENTS.md shows PORT, SEC, ABS, DOM, LOCK, DET, EVAL as [x] Done
2. REQUIREMENTS.md shows UI, MED as [~] Partial with correct phase notes
3. MILESTONES.md Phase 20F shows ✅ FULL PASS
4. MILESTONES.md v1.1 completion list includes 20B–20F
5. README Database Migrations section mentions `db:migrate:deploy` and `db:migrate:status`
6. README architecture block does not attribute evaluation to CV Worker
7. README Implementation Status table distinguishes Phase 16A (minimum) from Phase 21 (completion)
8. README Known Limitations reflects current App.tsx state
9. ROADMAP.md has Phase 21-0 section with all 8 success criteria
10. ROADMAP.md Phase 21 has 4-wave structure with hard rules
