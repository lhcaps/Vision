# Phase 22B — Production-Path Test Suite Summary

**Status:** ✅ FULL PASS — Live Verified (2026-05-05)
**Score:** 10/10
**Date:** 2026-05-05

## What Was Built

### A. Phase 22B API Production-Path Harness

**Location:** `scripts/harness/phase22b-production-path-api-check.ts`

8 endpoint checks proving the live NestJS API surface works against seeded PostgreSQL fixtures:

| #   | Endpoint                                                     | Check                                                                            |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `GET /api/health`                                            | `ok: true`, `service: 'visionflow-api'`                                          |
| 2   | `GET /api/health/runtime/status`                             | `api.ok: true`, `database.status: 'ready'`                                       |
| 3   | `GET /api/projects/:projectId/datasets`                      | Canonical dataset present                                                        |
| 4   | `GET /api/.../annotation-workspace?assetId=asset_frame_1482` | MANUAL annotations present                                                       |
| 5   | `GET /api/.../export/coco`                                   | LOCKED status, deterministic hash, COCO schema valid, hash stable across 2 calls |
| 6   | `GET /api/.../inference-jobs`                                | Canonical job visible                                                            |
| 7   | `GET /api/.../predictions`                                   | >= 3 predictions                                                                 |
| 8   | `GET /api/.../evaluation`                                    | `report.inputHash === FIXTURE_IDS.evaluation.inputHash`                          |

**Key design decisions:**

- Uses `FIXTURE_IDS` from `scripts/fixtures/visionflow-fixtures.ts` — no hard-coded IDs outside the fixture contract
- `--strict` mode: exit 1 if API unreachable or any check fails
- Non-strict mode: skip with clear instructions if API not running
- No DB mutations — purely read-only HTTP checks
- COCO determinism proven by calling endpoint twice and comparing `deterministicHash`

### B. Phase 22B Meta-Harness

**Location:** `scripts/harness/phase22b-meta-harness.ts`

Orchestrates Phase 22A meta-harness + Phase 22B API harness:

- `pnpm meta:harness:phase22b --strict`: runs Phase 22A meta-harness (DB-only), reports API skipped unless `--with-api`
- `pnpm meta:harness:phase22b --strict --with-api`: runs Phase 22A meta-harness + Phase 22B API harness; fails if API unreachable
- Auto-detects API reachability via a preflight `/health` check
- In CI: runs DB-only checks (Phase 22A meta-harness) — no live API required

### C. Playwright Production-Path Smoke

**Location:** `apps/web/e2e/production-path.spec.ts`

11 tests proving seeded fixture surfaces are navigable in the browser:

- App loads with no console errors (2 tests)
- ReadinessStrip appears (Phase 21B runtime truth)
- Navigation to all 9 sections (Command, Media, Versions, Annotate, Pipeline, Jobs, Replay, Diff) without console errors
- Initial load + first navigation smoke

Navigation labels duplicated from `FIXTURE_IDS` — relative path from `apps/web/e2e/` to `scripts/` is not available through tsx/module resolution. Only route-independent labels are duplicated — no API IDs or fixture assertions.

### D. CI Wiring

**`.github/workflows/ci.yml`:**

- `db-harness` job: added `pnpm meta:harness:phase22b` after `harness:phase22a`
- `migration-chain` job: added `pnpm meta:harness:phase22b` after `harness:phase22a`
- Both jobs preserve all existing phase20c/20d/20e/20f harnesses
- Live API harness NOT added to CI (requires booted stack)

### E. package.json Scripts

```json
"harness:phase22b:api": "pnpm exec tsx scripts/harness/phase22b-production-path-api-check.ts",
"meta:harness:phase22b": "pnpm exec tsx scripts/harness/phase22b-meta-harness.ts --strict"
```

## Architecture Decisions

### API harness: HTTP over Prisma

Phase 22A verifies DB integrity via Prisma. Phase 22B verifies API surface integrity via HTTP. This is the correct boundary — the harness exercises the full NestJS request pipeline including routing, guards, services, contracts, and Prisma queries.

### Meta-harness: split DB vs API concerns

Phase 22A meta-harness always requires DATABASE_URL (DB harnesses). Phase 22B meta-harness requires DATABASE_URL for Phase 22A meta-harness, but the API harness is conditional on reachability. This makes CI safe (DB-only) while enabling full verification locally (with live stack).

### Strict mode skip vs fail

- API harness non-strict: skip with instructions if API unreachable
- API harness strict: fail if API unreachable
- Meta-harness strict: always runs DB checks; API checks gated by `--with-api`

### No binary fixtures, no Docker test stack

No Phase 22B harness or test requires a binary fixture file. All checks use seeded DB state or HTTP responses. Docker test stack is not needed because GitHub Actions PostgreSQL service is sufficient for Phase 22B CI needs.

## Live Verification (2026-05-05)

All tests run against live stack: Docker (PostgreSQL + Redis + MinIO), NestJS API (port 3000), Vite web (port 5173), seeded DB.

### Pre-flight

```
pnpm seed:db -- --reset  → PASS (seed complete)
pnpm harness:phase22a     → PASS (18/18 DB checks)
```

### API Production-Path (strict mode)

```
npx tsx scripts/harness/phase22b-production-path-api-check.ts --strict
→ 8/8 PASS
  1. /api/health                     → ok=true, service=visionflow-api
  2. /api/health/runtime/status      → api=database, db=ready, queue=ready
  3. /api/projects/.../datasets      → ds_proj_parking_lot found
  4. /api/.../annotation-workspace   → 3 MANUAL annotations
  5. /api/.../export/coco            → LOCKED, hash stable across 2 calls
  6. /api/.../inference-jobs        → job_2026_04_28_2036 SUCCEEDED
  7. /api/.../predictions           → 3 predictions found
  8. /api/.../evaluation            → inputHash=04c479cae541f764 matches FIXTURE_IDS
```

### Meta Harness (--strict --with-api)

```
npx tsx scripts/harness/phase22b-meta-harness.ts --strict --with-api
→ 2/2 PASS (13 total sub-checks)
  - phase22a-meta-harness: 5/5 (phase22a + phase20c + phase20d + phase20e + phase20f)
  - phase22b-api-harness:  8/8
```

### Playwright Production-Path Smoke

```
npx playwright test apps/web/e2e/production-path.spec.ts
→ 11/11 PASS (4.2s)
  1. loads app with no console errors on initial load
  2. ReadinessStrip appears on initial load
  3. navigates to Command section without console errors
  4. navigates to Media section without console errors
  5. navigates to Versions section without console errors
  6. navigates to Annotate section without console errors
  7. navigates to Pipeline section without console errors
  8. navigates to Jobs section without console errors
  9. navigates to Replay section without console errors
 10. navigates to Diff section without console errors
 11. no console errors on initial load and first navigation
```

### Bugs Found and Fixed During Live Verification

1. **API harness 404**: `VITE_API_BASE_URL` in `.env` was `http://localhost:3000` (missing `/api` suffix), causing the harness to call `http://localhost:3000/health` instead of `http://localhost:3000/api/health`. Fixed to `http://localhost:3000/api`.
2. **AbortSignal.timeout hanging on Windows**: Node's `AbortSignal.timeout(10000)` caused fetch to hang indefinitely in the PowerShell/tsx environment. Fixed with `setTimeout`-based `AbortController`.
3. **CORS origin mismatch**: `WEB_ORIGIN=http://localhost:5173` did not include port 5175 (when web auto-assigned). Updated to `http://localhost:5173,http://localhost:5174,http://localhost:5175`.
4. **annotations.ts localhost vs 127.0.0.1**: `import.meta.env.VITE_API_BASE_URL` default was `http://127.0.0.1:3000` which triggered CORS on Playwright (origin is `localhost`). Fixed default to `http://localhost:3000`.
5. **Playwright baseURL**: `playwright.config.ts` used `VITE_API_BASE_URL` for `baseURL`, causing navigation to `http://localhost:3000/api/`. Fixed to use `VITE_WEB_BASE_URL` with default `http://localhost:5173`.

## Verification

| Check                   | Command                                                                  | Result                                                        |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| typecheck               | `pnpm typecheck`                                                         | PASS (4 packages)                                             |
| test                    | `pnpm test`                                                              | PASS (338 tests: 208 API + 43 contracts + 22 motion + 65 web) |
| build                   | `pnpm build`                                                             | PASS (4 packages)                                             |
| lint                    | `pnpm lint`                                                              | PASS                                                          |
| API harness (no stack)  | `pnpm harness:phase22b:api`                                              | SKIP (API not running — expected in CI)                       |
| API harness strict      | `npx tsx scripts/harness/phase22b-production-path-api-check.ts --strict` | **PASS 8/8** (live)                                           |
| Meta harness --with-api | `npx tsx scripts/harness/phase22b-meta-harness.ts --strict --with-api`   | **PASS 13/13** (live)                                         |
| Playwright smoke        | `npx playwright test apps/web/e2e/production-path.spec.ts`               | **PASS 11/11** (live)                                         |

## Files Changed

| File                                                                   | Change                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `scripts/harness/phase22b-production-path-api-check.ts`                | New — 8-point API harness                                                                     |
| `scripts/harness/phase22b-meta-harness.ts`                             | New — meta-harness aggregator                                                                 |
| `apps/web/e2e/production-path.spec.ts`                                 | New — 11 Playwright smoke tests                                                               |
| `package.json`                                                         | Added `harness:phase22b:api`, `meta:harness:phase22b`                                         |
| `.github/workflows/ci.yml`                                             | Added meta:harness:phase22b to db-harness + migration-chain                                   |
| `.env`                                                                 | Fixed `VITE_API_BASE_URL` to include `/api` suffix; extended `WEB_ORIGIN` for ports 5173-5175 |
| `apps/web/src/lib/annotations.ts`                                      | Fixed default from `http://127.0.0.1:3000` to `http://localhost:3000`                         |
| `apps/web/playwright.config.ts`                                        | Fixed `baseURL` to use `VITE_WEB_BASE_URL` instead of `VITE_API_BASE_URL`                     |
| `.planning/phases/phase-22b-production-path-test-suite/22B-PLAN.md`    | New — phase plan                                                                              |
| `.planning/phases/phase-22b-production-path-test-suite/22B-SUMMARY.md` | New — this file                                                                               |
| `.planning/phases/phase-22b-production-path-test-suite/22B-REVIEW.md`  | New — review                                                                                  |

## Known Limitations

- Phase 22B API harness requires live API stack to run (not available in CI without booting services)
- Binary fixtures not implemented (no Phase 22B harness requires them)
- Docker test-stack.yml not implemented (CI PostgreSQL service is sufficient)
- Playwright spec cannot import `FIXTURE_IDS` directly (relative path limitation from `apps/web/e2e/`); navigation labels duplicated inline
