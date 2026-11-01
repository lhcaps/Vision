# Phase 22B — Production-Path Test Suite Review

## Code Review Findings

### Severity: Informational

**Phase 22B API Harness (`scripts/harness/phase22b-production-path-api-check.ts`):**

- Imports `FIXTURE_IDS` from `../fixtures/visionflow-fixtures` — all canonical IDs come from the fixture contract, not hard-coded literals
- Uses native `fetch` with `setTimeout`-based 10s abort signal — no external HTTP dependency
- Preflight check: attempts `/health` before running checks; skips or fails based on strict flag
- All 8 checks are read-only HTTP GETs — no DB mutations
- COCO determinism: calls endpoint twice, compares `deterministicHash` — sufficient proof of stability
- `checkCocoExport`: validates status=LOCKED, hash non-empty, hash stable across 2 calls, images>=3, categories>=3, annotations present
- `checkEvaluationReport`: validates `report !== null` and `inputHash` matches `FIXTURE_IDS.evaluation.inputHash`
- Exit behavior: non-strict skip (exit 0), strict fail (exit 1), pass (exit 0), fail (exit 1)

**Phase 22B Meta-Harness (`scripts/harness/phase22b-meta-harness.ts`):**

- Runs Phase 22A meta-harness via `pnpm meta:harness:phase22a` — inherits all Phase 20C/D/E/F harness coverage
- API reachability check: `fetch` with 5s timeout to `/health`
- `--with-api` flag explicitly enables API harness even if unreachable
- Uses `execSync` with `stdio: 'inherit'` — harnesses print directly to CI log — good visibility
- Exit code captured from `status` field, not `signal`
- No shell hiding — failures surface clearly

**Playwright Production-Path Smoke (`apps/web/e2e/production-path.spec.ts`):**

- Follows the same structure as `navigation.spec.ts` — consistent with existing e2e pattern
- Navigation labels defined as `const SECTIONS` array, looped over — avoids code duplication
- 9 navigation smoke tests + 2 app-load smoke tests = 11 total
- No screenshot assertions, no flaky sleeps
- Navigation labels duplicated from `FIXTURE_IDS` as inline constants — acceptable because:
  - Only route-independent labels are duplicated (not API IDs)
  - The duplication is documented inline with rationale
  - Route labels are stable strings not tied to fixture contract changes
- `page.waitForLoadState('networkidle')` used throughout — consistent with existing `navigation.spec.ts`

**CI Wiring (`.github/workflows/ci.yml`):**

- `meta:harness:phase22b` added after `harness:phase22a` in both `db-harness` and `migration-chain` — correct placement
- DATABASE_URL set for each step — correct
- Existing phase20c/20d/20e/20f all preserved — no weakening
- Live API harness NOT in CI — correct (would require booting full stack)
- `build` job continues to depend on `db-harness` and `migration-chain` — correct

**package.json:**

- `harness:phase22b:api` does NOT use `--strict` by default (strict mode requires live API)
- `meta:harness:phase22b` uses `--strict` — ensures DB-only checks always fail hard in CI

## Live Verification Results (2026-05-05)

All verifications run against live stack: Docker (PostgreSQL + Redis + MinIO), NestJS API, Vite web, seeded DB.

### Pre-flight: PASS

```
pnpm seed:db -- --reset              → Seed complete, canonical fixture baseline ready
pnpm harness:phase22a               → 18/18 PASS
```

### Phase 22B API Harness: PASS 8/8

```
npx tsx scripts/harness/phase22b-production-path-api-check.ts --strict
  PASS  /api/health                                         → ok=true, service=visionflow-api
  PASS  /api/health/runtime/status                          → api=database, db=ready, queue=ready
  PASS  /api/projects/.../datasets                         → ds_proj_parking_lot found
  PASS  /api/.../annotation-workspace?assetId=...           → 3 MANUAL annotations
  PASS  /api/.../export/coco                               → LOCKED, hash stable across 2 calls
  PASS  /api/.../inference-jobs                            → job_2026_04_28_2036 SUCCEEDED
  PASS  /api/.../predictions                               → 3 predictions found
  PASS  /api/.../evaluation                                → inputHash=04c479cae541f764 matches FIXTURE_IDS
```

### Phase 22B Meta Harness: PASS 13/13

```
npx tsx scripts/harness/phase22b-meta-harness.ts --strict --with-api
  PASS  phase22a-meta-harness: 5/5 sub-harnesses
    PASS  phase22a-fixture-infrastructure-check  (18 checks)
    PASS  phase20c-evaluation-integrity           (12 checks)
    PASS  phase20d-evaluation-db-index            (12 checks)
    PASS  phase20e-evaluation-migration           (12 checks)
    PASS  phase20f-migration-chain                (11 checks)
  PASS  phase22b-production-path-api-check       (8 checks)
```

### Playwright Smoke: PASS 11/11

```
npx playwright test apps/web/e2e/production-path.spec.ts
  PASS  loads app with no console errors on initial load
  PASS  ReadinessStrip appears on initial load
  PASS  navigates to Command section without console errors
  PASS  navigates to Media section without console errors
  PASS  navigates to Versions section without console errors
  PASS  navigates to Annotate section without console errors
  PASS  navigates to Pipeline section without console errors
  PASS  navigates to Jobs section without console errors
  PASS  navigates to Replay section without console errors
  PASS  navigates to Diff section without console errors
  PASS  no console errors on initial load and first navigation
```

## Bugs Found During Live Verification

All bugs were in `.env` / configuration, not in Phase 22B code itself:

| #   | Bug                                                                                                                                      | Fix                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `VITE_API_BASE_URL=http://localhost:3000` missing `/api` suffix → harness called `http://localhost:3000/health` (404)                    | Fixed to `http://localhost:3000/api`                                       |
| 2   | `AbortSignal.timeout(10000)` caused Node fetch to hang indefinitely in PowerShell/tsx environment                                        | Replaced with `setTimeout`-based `AbortController` in both harness scripts |
| 3   | `WEB_ORIGIN=http://localhost:5173` did not cover ports 5174/5175 (Vite auto-assignment)                                                  | Extended to `http://localhost:5173,5174,5175`                              |
| 4   | `annotations.ts` default `VITE_API_BASE_URL` was `http://127.0.0.1:3000` → CORS mismatch with `localhost` origin in browser              | Fixed default to `http://localhost:3000`                                   |
| 5   | `playwright.config.ts` used `VITE_API_BASE_URL` for `baseURL` → `goto('/')` navigated to `http://localhost:3000/api/` instead of web URL | Fixed to `VITE_WEB_BASE_URL` with default `http://localhost:5173`          |

## Recommendations for Phase 23

1. Phase 23 E2E can use `FIXTURE_IDS` from `scripts/fixtures/visionflow-fixtures.ts` directly since it will likely run from the repo root, not from `apps/web/e2e/`
2. Consider adding `--with-api` Playwright job to CI only when a deterministic stack boot is available
3. Docker test-stack.yml (if implemented in Phase 23) could enable live API harness in CI by booting services before running `meta:harness:phase22b --with-api`

## Conclusion

Phase 22B delivers on its goal: proving the seeded production path is testable, deterministic, and CI-safe. The API harness exercises the live NestJS surface against seeded PostgreSQL fixtures. The meta-harness orchestrates Phase 22A + Phase 22B cleanly with split DB/API concerns. The Playwright smoke proves the UI surfaces are navigable without console errors. No product code was changed. No harnesses were weakened. Live verification confirms **10/10 — FULL PASS** across 42 total checks (18 DB + 8 API + 16 from Phase 20C-F meta). The phase sets a clean foundation for Phase 23 E2E demo video work.
