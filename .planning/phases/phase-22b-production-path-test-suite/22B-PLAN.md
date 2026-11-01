# Phase 22B — Production-Path Test Suite

**Status:** In Progress

**Goal:** Prove the real production path — seeded database, live API endpoints, and Playwright smoke — is testable, deterministic, and CI-safe.

**Depends on:** Phase 22A (Fixture & Test Infrastructure), Phase 17, Phase 18, Phase 19, Phase 20

## What Was Not Done in Phase 22A

Phase 22A established deterministic fixture infrastructure (`FIXTURE_IDS` contract, 18-point DB harness, meta-harness, CI wiring). Phase 22B builds on that foundation to prove the live API surface against seeded fixtures.

## Deliverables

### P0: Phase 22B API Production-Path Harness

**File:** `scripts/harness/phase22b-production-path-api-check.ts`

Uses `FIXTURE_IDS` from `scripts/fixtures/visionflow-fixtures.ts` as the single source of truth. Makes HTTP requests to live API endpoints, validates response shapes, and checks fixture ID consistency.

**Endpoints checked:**

| #   | Endpoint                                                                                                 | Fixture Reference                                                          | Validation                                                                    |
| --- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | `GET /api/health`                                                                                        | —                                                                          | `ok: true`, `service: 'visionflow-api'`                                       |
| 2   | `GET /api/health/runtime/status`                                                                         | —                                                                          | `api.ok: true`, `database.status: 'ready'`                                    |
| 3   | `GET /api/projects/:projectId/datasets`                                                                  | `FIXTURE_IDS.project.id`                                                   | `datasets[0].id === FIXTURE_IDS.dataset.id`                                   |
| 4   | `GET /api/projects/:projectId/dataset-versions/:versionId/annotation-workspace?assetId=asset_frame_1482` | `FIXTURE_IDS.datasetVersion.id`, `FIXTURE_IDS.annotationWorkspace.assetId` | `annotations` contains MANUAL source                                          |
| 5   | `GET /api/projects/:projectId/dataset-versions/:versionId/export/coco`                                   | `FIXTURE_IDS.datasetVersion.id`                                            | `metadata.status === 'LOCKED'`, deterministic hash present, COCO schema valid |
| 6   | `GET /api/projects/:projectId/inference-jobs`                                                            | `FIXTURE_IDS.inferenceJob.id`                                              | canonical job visible                                                         |
| 7   | `GET /api/projects/:projectId/inference-jobs/:jobId/predictions`                                         | `FIXTURE_IDS.inferenceJob.id`                                              | at least 3 predictions                                                        |
| 8   | `GET /api/projects/:projectId/inference-jobs/:jobId/evaluation`                                          | `FIXTURE_IDS.inferenceJob.id`                                              | `report.inputHash === FIXTURE_IDS.evaluation.inputHash`                       |

**Behavior:**

- `--strict` mode: exit 1 if `API_BASE_URL` is unreachable or any check fails
- Non-strict: skip with instructions if API not running
- No DB mutations
- Validate Zod schemas where contracts are available
- COCO determinism: call export twice, hash must match

### P0: Phase 22B Meta-Harness

**File:** `scripts/harness/phase22b-meta-harness.ts`

Orchestrates Phase 22A meta-harness + Phase 22B API harness. DB-only checks always run. Live API checks run only when `--with-api` is passed or `API_BASE_URL` is reachable.

**Behavior:**

- `pnpm meta:harness:phase22b --strict`: runs Phase 22A meta-harness (DB-only), reports API skipped unless `--with-api`
- `pnpm meta:harness:phase22b --strict --with-api`: runs Phase 22A meta-harness + Phase 22B API harness; fails if API unreachable
- In CI: runs DB-only checks only

### P1: Playwright Production-Path Smoke

**File:** `apps/web/e2e/production-path.spec.ts`

Focused smoke test proving seeded fixture surfaces are navigable in the browser.

- Confirms ReadinessStrip appears (Phase 21B requirement)
- Navigates to Jobs section and verifies non-empty job state
- Navigates to Annotate section
- No console errors on any navigation
- No screenshot-only assertions
- No flaky sleeps

### P1: CI Wiring (DB-only)

**`.github/workflows/ci.yml`:**

- Add `pnpm meta:harness:phase22b` to `db-harness` and `migration-chain` jobs after `harness:phase22a`
- Live API harness NOT added to CI (requires booted stack)
- `build` continues to depend on `db-harness` and `migration-chain`

### P2: Deterministic Binary Fixtures

Not implemented. Rationale: no Phase 22B harness or test actually requires a binary fixture file — all checks use seeded DB state or HTTP responses. If future tests need binary fixtures, implement in Phase 23.

### P2: Docker Test Stack

Not implemented. GitHub Actions PostgreSQL service is sufficient for Phase 22B CI needs. Docker test stack deferred to Phase 23 or future enhancement.

## Architecture Decisions

### API harness: HTTP client over Prisma

Phase 22A verifies DB integrity. Phase 22B verifies API surface integrity. HTTP is the correct boundary — the harness exercises the full NestJS request pipeline including routing, guards, services, contracts, and Prisma queries.

### Strict mode skip vs fail

- DB harnesses: strict mode requires DATABASE_URL
- API harness: strict mode requires API_BASE_URL reachable
- Meta-harness: strict mode always runs DB checks; API checks gated by `--with-api`
- CI runs DB-only (no strict API requirement)

### No fixture factory helpers

Phase 22A established that FIXTURE_IDS is the single source of truth. Phase 22B uses those IDs directly. No new fixture factory pattern is needed at this stage.

### COCO determinism check

Calling the COCO endpoint twice and comparing deterministic hashes is sufficient proof of stability. Full content comparison is covered by Phase 20C's hash computation harness.

## Out of Scope

- Demo video/GIF work (Phase 23)
- UI redesign
- Product feature changes
- Docker test-stack.yml
- Binary fixture files
- CV worker integration tests (covered by pytest suite)
- Replacing Phase 22A harness

## Success Criteria

1. `pnpm harness:phase22b:api` passes all 8 endpoint checks (when API is running)
2. `pnpm meta:harness:phase22b` runs Phase 22A meta-harness + Phase 22B checks
3. Phase 22A harness still passes (no regression)
4. Phase 20C/D/E/F harnesses still pass
5. Playwright `production-path.spec.ts` passes with zero console errors
6. CI wiring: `db-harness` and `migration-chain` jobs run Phase 22B meta-harness
7. No existing harness removed or weakened
8. All FIXTURE_IDS imported from canonical source

## Files to Create

- `scripts/harness/phase22b-production-path-api-check.ts`
- `scripts/harness/phase22b-meta-harness.ts`
- `apps/web/e2e/production-path.spec.ts`
- `.planning/phases/phase-22b-production-path-test-suite/22B-PLAN.md`
- `.planning/phases/phase-22b-production-path-test-suite/22B-SUMMARY.md`
- `.planning/phases/phase-22b-production-path-test-suite/22B-REVIEW.md`

## Files to Change

- `package.json` — add `harness:phase22b:api` and `meta:harness:phase22b`
- `.github/workflows/ci.yml` — add Phase 22B to db-harness and migration-chain
- `.planning/STATE.md` — mark Phase 22B done
- `.planning/ROADMAP.md` — Phase 22B entry with commit SHA
- `.planning/MILESTONES.md` — Phase 22B entry
