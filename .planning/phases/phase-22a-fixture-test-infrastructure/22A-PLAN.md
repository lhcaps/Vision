# Phase 22A — Fixture & Test Infrastructure

**Status:** Complete

## Goal

Establish deterministic test fixtures and reusable production-path test infrastructure to bootstrap Phase 22B. Phase 22A does not write production-path tests — it ensures the ground is solid and reproducible before Phase 22B writes them.

## What Was Done

### A. Fixture Contract (`scripts/fixtures/visionflow-fixtures.ts`)

Canonical TypeScript module exporting `FIXTURE_IDS` — the single source of truth for all hard-coded IDs used across seed, harnesses, and smoke commands.

Verified IDs:

- `project.id = 'proj_parking_lot'`
- `dataset.id = 'ds_proj_parking_lot'`
- `datasetVersion.id = 'dataset_proj_parking_lot_parking_v3'` (LOCKED)
- `annotationWorkspace.assetId = 'asset_frame_1482'`
- `annotationWorkspace.annotationSetId = 'annset_dataset_proj_parking_lot_parking_v3_manual'`
- 3 media assets: `asset_frame_1482`, `asset_frame_1506`, `asset_frame_1519`
- `pipeline.id = 'pipeline_proj_parking_lot_parking_detector'`
- `modelArtifact.id = 'model_onnx_yolov8n_v1'` (ONNX runtime)
- `inferenceJob.id = 'job_2026_04_28_2036'` (SUCCEEDED)
- `evaluation.inputHash = '04c479cae541f764'` (computed from canonical JSON of seeded report payload)
- 3 predictions, 3 MANUAL annotations, 4 label classes

### B. Fixture Infrastructure Harness (`scripts/harness/phase22a-fixture-infrastructure-check.ts`)

18-point read-only DB integrity check. Key checks:

1. Project `proj_parking_lot` exists
2. Dataset exists
3. Dataset version exists and is LOCKED
4. At least 3 assets linked to version
5. Annotation workspace asset `asset_frame_1482` exists
6. Annotation set exists
7. At least 1 MANUAL annotation on workspace asset
8. Pipeline exists
9. Pipeline references `model_onnx_yolov8n_v1`
10. ONNX model artifact row exists
11. SUCCEEDED inference job exists
12. At least 3 predictions exist
13. Evaluation report with full traceability fields
14. No stale QUEUED/RUNNING jobs
15. Row scalars match metricsJson
16. Phase 20D equivalence: integrity columns non-null
17. Phase 20E equivalence: all 7 migration columns present
18. Phase 20F equivalence: no stale migrations

Strict mode (exit 1 on failure). Clean Prisma disconnect.

### C. Meta-Harness (`scripts/harness/phase22a-meta-harness.ts`)

Orchestrator that runs Phase 22A fixture check plus phase20c/20d/20e/20f in sequence. Each harness runs with its own `pnpm` command. Exits non-zero if any harness fails. Total duration reported.

Does NOT run `seed:db -- --reset` — that step is handled externally by CI or developer.

### D. package.json Scripts

```json
"harness:phase22a": "pnpm exec tsx scripts/harness/phase22a-fixture-infrastructure-check.ts --strict"
"meta:harness:phase22a": "pnpm exec tsx scripts/harness/phase22a-meta-harness.ts --strict"
```

### E. CI Wiring (`.github/workflows/ci.yml`)

- `db-harness` job: added `pnpm harness:phase22a` after `pnpm seed:db -- --reset`
- `migration-chain` job: added `pnpm harness:phase22a` after `pnpm seed:db -- --reset`
- Both jobs preserve all existing phase20c/20d/20e/20f harnesses

## Out of Scope

**Phase 22A scope was intentionally narrowed** to establish deterministic fixture/harness foundation only. The following items are Phase 22B scope:

- Test fixture factory helpers (`create-test-project.ts`, etc.)
- Docker test-stack.yml
- Deterministic binary fixtures (image/video)
- Test database reset scripts
- `pnpm test:integration` script

Phase 22A does not implement any of the above.

## Verification

| Check           | Command                      | Result       |
| --------------- | ---------------------------- | ------------ |
| typecheck       | `pnpm typecheck`             | PASS         |
| test            | `pnpm test`                  | PASS         |
| build           | `pnpm build`                 | PASS         |
| lint            | `pnpm lint`                  | PASS         |
| fixture harness | `pnpm harness:phase22a`      | PASS (18/18) |
| meta harness    | `pnpm meta:harness:phase22a` | PASS         |

## Depends On

Phase 14A, Phase 20F

## Next

Phase 22B — Production-Path Test Suite
