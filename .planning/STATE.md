# State

Current milestone: v1.1 — Production Hardening & Real Vertical Slice

Current phase: Phase 23 (Full E2E Playwright & Demo Video)

Last updated: 2026-05-05.

## Accumulated Context

**v1.0 Complete:** Monorepo, Web shell, Media ingestion, Dataset versioning, Bounding-box annotation, Pipeline builder, Job orchestration, CV worker scaffold, Prediction overlay, Evaluation metrics, Timeline replay, CI/CD, Linting, One-command boot

**v1.1 Complete:** Phase 11 (README), Phase 12 (CI/CD), Phase 13 (Security hardening), Phase 14A (Adapter boundary), Phase 14B (Domain invariants), Phase 15 (Observability & health), Phase 15.5-15.10 (Pre-16 Completion Track), Phase 16A (Frontend Split Minimum), Phase 17 (Real Media Processing), Phase 18 (Dataset Locking & COCO Export), Phase 19 (Real ONNX Detector), Phase 20 (Evaluation E2E), Phase 20B (Evaluation Correctness Hardening), Phase 20C (Evaluation Integrity Finalization), Phase 20D (Evaluation Persistence & CI Hardening), Phase 20E (Evaluation Migration Finalization), Phase 20F (Migration Chain Baseline & Backfill Hardening), Phase 21 (Frontend Split Completion), Phase 22A (Fixture & Test Infrastructure), Phase 22B (Production Path Test Suite), Phase 23 (Full E2E Playwright & Demo Video)

**v1.1 Complete — all phases closed.**

- Phase 13 (Security) ✅ Done
- Phase 14A (Adapter boundary) ✅ Done
- Phase 14B (Domain invariants) ✅ Done
- Phase 15 (Observability & health) ✅ Done
- Phase 15.5-15.10 (Pre-16 Completion Track) ✅ Done
- Phase 16A (Frontend split min) ✅ Done
- Phase 17 (Real media processing) ✅ Done — Pillow thumbnail, MinIO read/write, BullMQ consumer, derivative persistence, AssetDerivative.checksum field
- Phase 17.1 (Runtime fixes) ✅ Done — Race condition fix, CV worker import fix, full-stack dev boot, storage error classification, duplicate FAILED fix
- Phase 18 (Dataset lock & COCO export) completed — lock invariants, annotation immutability, deterministic COCO export, real image dimensions persisted
- Phase 19 (Real ONNX inference) ✅ FULL PASS 10/10 — YOLOv8n ONNX executed end-to-end, predictions persisted with full traceability, SHA-256 pinned, 8/8 DET criteria passed, ONNX real-object smoke (4 predictions), CI fixed
- Phase 20 (Evaluation E2E) ✅ FULL PASS 10/10 — Deterministic IoU matching in TypeScript, persisted evaluation reports with traceability (jobId/datasetVersionId/pipelineId/modelId/inputHash/metricsHash), per-class metrics for car/van/truck, label mapping from labelClassId or metadata.cocoLabel, 21 algorithm unit tests, Phase 19 harness still passes
- Phase 20B ✅ FULL PASS 10/10 — 7 correctness bugs fixed, 10 new algorithm tests, typecheck/test/build/lint/format all pass.
- Phase 20C ✅ FULL PASS 10/10 — Corrected seed hash alignment, shared evaluation-hash module, legacy adapter, 30 new unit tests.
- Phase 20D ✅ FULL PASS 10/10 — EvaluationReport schema with 7 integrity columns, unique upsert index, read-consistency check, 12-point DB harness, integration tests.
- Phase 20E ✅ FULL PASS 10/10 — Explicit migration SQL with safe backfill, backfill check/apply scripts, Phase 20E harness, CI test job schema sync fix.
- Phase 20F ✅ FULL PASS 10/10 — Baseline migration chain, db:migrate:deploy proven on fresh DB, migration-chain CI job, backfill hardening, Phase 20F harness.
- Phase 21A ✅ Done — App composition boundary, AppRoutes extraction, panel extractions, import cleanup, dead code removal, full verification gate passed.
- Phase 21B ✅ Done (10/10) — FE/BE runtime sync, /api/health/runtime/status endpoint, useRuntimeStatus hook, ReadinessStrip reads real state, useDatasetsController/useInferenceJobController/useEvaluationController extracted. App.tsx reduced from 529 to ~144 lines. runtimeState.health now derives from backend truth. Browser smoke passed.
- Phase 21C ✅ Done — AppRoutes prop surface reduced from 23 to 17 props (26% reduction). Threshold/annotation/pipeline state moved to feature-local components. JobsPanel owns threshold, AnnotationEnginePanel owns annotation state, ShellHeader cleaned up. 65/65 tests pass, all runtime truth invariants preserved. groundTruth overlay regression fixed, Overview neutral pipeline text restored. 21D pending.
- Phase 21D ✅ Done — Commit `4aa564a5`. InspectorRouter props refactored. Fake annotation/pipeline state removed from AppRoutes. AnnotationInspector and PipelineInspector rendered as honest embedded-notice panels for their respective sections. 4 unused types removed from inspector.types.ts. Option A1 chosen (section-owned inspector). Phase 21 fully closed.
- Phase 21 (Frontend split completion) Phase 21A + 21B + 21C + 21D all complete.
- Phase 22A ✅ FULL PASS (18/18) — Fixture contract, 18-point fixture harness, meta-harness, CI wiring, deterministic fixture IDs. All phase20c/20d/20e/20f harnesses still pass.
- Phase 22B ✅ FULL PASS 10/10 — Production-path API harness (8 checks), meta-harness (13 total checks), Playwright smoke (11 tests), CI wiring. Live verified: 8/8 API, 13/13 meta, 11/11 Playwright. 5 bugs found and fixed during live verification (VITE_API_BASE_URL missing /api, AbortSignal.timeout hanging, CORS origin mismatch, localhost vs 127.0.0.1, playwright baseURL). All phase20c/20d/20e/20f/22a harnesses preserved.
- Phase 23 ✅ FULL PASS — Full E2E Playwright vertical-slice spec (19 tests), Phase 23 meta-harness (composes 22A+22B+Playwright), demo docs (README-DEMO.md, DEMO-CHECKLIST.md), README portfolio cleanup, all planning artifacts updated.

## What Was True Before Phase 15

- No structured logging — NestJS used `console.log`/`console.error` for bootstrap only
- No request ID propagation — logs from different services couldn't be correlated
- No job correlation IDs — BullMQ jobs had no correlation back to API request
- No health check endpoints — `/api/health` returned a static `{ ok: true }`
- No MinIO health check — storage health couldn't be verified
- No CV worker health check — couldn't detect worker downtime
- CV worker had no structured logging — no visibility into worker operations
- CV worker had no correlation ID propagation — couldn't trace jobs through worker
- README lacked observability documentation

## What Is True After Phase 15

- **pino** for structured JSON logging in NestJS with `AsyncLocalStorage` for request context propagation
- **loguru** for structured logging in FastAPI CV worker with `contextvars` for correlation ID propagation
- `x-request-id` header on every API request (auto-generated or passthrough)
- `x-correlation-id` header propagated from API through BullMQ to CV worker and back
- 17+ distinct structured log events covering the full request lifecycle
- `/api/health/live` — lightweight liveness, always HTTP 200
- `/api/health/deep` — full dependency checks (Postgres, Redis, MinIO, CV Worker), HTTP 200/503
- CV worker `/health` endpoint returns logging configuration info
- All health checks include response time measurements and timeout handling
- README updated with comprehensive observability documentation
- 2 security vulnerabilities fixed (SSRF, raw error propagation) via code review
- 10 new tests added (2 CV worker, 8 implicitly via typecheck)

### Roadmap Evolution

- v1.0 (phases 0-10) archived as complete milestone.
- v1.1 (phases 11-23) is the new active milestone.
- Roadmap upgraded: 10 phases → 13 phases (11-23) with full scope.
- Phase 14 split into 14A (Adapter Boundary) and 14B (Domain Invariants & State Machines).
- Phase 16 split into 16A (Frontend Split Minimum) and remaining phases.
- New phases added: Phase 15 (Observability & Health Checks), Phase 22 (Production-Path Tests), Phase 23 (E2E & Demo Video).
- COCO export is dedicated Phase 18 (separate from annotation).
- Brutal scope rules: no new features until real vertical slice works, no silent fallback.

### Key Decisions

- v1.0 archived as complete. v1.1 is new active milestone.
- Architecture: Web → NestJS API → Postgres/Prisma + MinIO + BullMQ/Redis → FastAPI CV Worker → Artifacts/Predictions/Evaluation.
- Adapter pattern: select Prisma/Minio/BullMQ vs Memory/Local/Noop at module bootstrap, never inside service logic.
- ONNX detector target: YOLOv8n ONNX (640x640 input, confidence 0.25, NMS IoU 0.45).
- No silent fallback from real mode to mock mode — must fail loudly.
- Real vertical slice focus: 14-step flow from upload image to demo video.
- v1.1 complete only when product + engineering + portfolio proofs are all satisfied.

### Prior Milestone Accomplishments (v1.0)

- Read `Vision Plan.docx` and derived the VisionFlow Studio vertical-slice plan.
- Installed local GSD/Codex artifacts for this repo.
- Created product and design context in `PRODUCT.md` and `DESIGN.md`.
- Built the pnpm/turbo monorepo with `apps/web`, `apps/api`, `apps/cv-worker`, `packages/contracts`, `packages/motion`, and `infra`.
- Implemented Phase 1 foundation: web workbench shell, API health/OpenAPI/demo routes, Prisma domain schema, CV mock endpoint, shared contracts, and root verification scripts.
- Implemented Phase 2 media ingestion: multipart API upload, MIME validation, SHA-256 checksum dedupe, MinIO original storage, Prisma metadata row, audit row, queued media processing job, CV thumbnail/frame contracts, and web uploader states.
- Implemented Phase 3 dataset versioning: shared contracts, Prisma/memory-backed dataset API, draft asset assignment, locked-version mutation rejection, computed split summaries, and upgraded Versions workbench UI.
- Implemented Phase 4 annotation engine: shared annotation contracts, API workspace/CRUD endpoints, Prisma and memory fallback service paths, image-coordinate BBox clamping, mutation audit logs, and annotation workbench UI with label selector, keyboard actions, and save queue.
- Implemented Phase 5 pipeline builder: typed pipeline contracts, structured graph validation, API persistence through Prisma/memory paths, mutation audit logging, API sync/save/validate web client, and React Flow inspector with node parameter controls and validation highlighting.
- Implemented Phase 6 inference orchestrator: typed job creation and stream contracts, locked dataset and valid pipeline validation, BullMQ queue wiring with memory fallback, explicit async worker transitions, SSE job progress, API job list/detail/create routes, and Jobs workbench that follows backend truth.
- Implemented Phase 7 CV worker integration: shared CV worker contracts, FastAPI capability metadata, deterministic thresholded mock detections, explicit ONNX unavailable/runtime/model failures without silent fallback, IoU evaluation metrics, API dispatch from inference jobs to the worker, prediction persistence on the Prisma path.
- Implemented Phase 8 prediction overlay and evaluation: evaluation contracts, evaluation service with Prisma and memory fallback paths, CvWorkerClient.evaluate() method, API routes for job evaluation and predictions, PredictionOverlayCanvas with GT/prediction toggle layers, EvaluationMetricsPanel with color-coded metric blocks and per-class breakdown.
- Implemented Phase 9 timeline replay and motion polish: TimelineReplayPanel with BBox morph engine, DatasetVersionDiff with IoU-based diff computation, PipelineExecutionFlow with particle edge animations, and global CSS consolidation.
- Implemented Phase 10 hardening: unified Vitest workspace with 118 tests across 4 packages, GitHub Actions CI + E2E workflows, ESLint + Prettier with root config, project README, one-command boot scripts (Unix + PowerShell), demo data validator, and Playwright E2E test scaffolding.

### Prior Verification Evidence (v1.0)

- `pnpm verify` passed: typecheck, tests, and production build.
- `python -m pytest apps/cv-worker/tests -q` passed with 4 tests.
- Local API smoke on port 3101 passed for fallback dataset list, draft creation, asset assignment, lock, and post-lock HTTP 409 rejection.
- Playwright desktop/mobile smoke passed for Versions, Annotate, Pipeline, Jobs, Media tabs.
- Docker Compose config validated.
- Local real-ingestion smoke passed with PostgreSQL and MinIO.
- Phase 6/7/8/10 focused checks passed.
- 118 tests across 4 packages, all 4 package typechecks, production build.

## Active Goals

Phase 23 ✅ COMPLETE — Full E2E Playwright vertical-slice, meta-harness, demo docs, README cleanup, all planning artifacts updated. v1.1 fully closed.

## Known Partial Areas (v1.1 Focus)

v1.1 is complete. All phases closed. The following areas are deferred to future milestones:

- App.tsx monolithic structure — further feature hook extraction reserved for v1.2.
- CV worker real frame extraction — thumbnail only, video frames deferred.
- Authentication/RBAC — single-user workbench for v1.x.

## What Is True After Phase 16A (Complete)

Phase 16A is complete. All Phase 16A deliverables delivered via commit `95d52bc10ab60068eec0882b83d8276e870249fc`.

- Shared API boundary established at `shared/api/client.ts`: single `API_BASE_URL`, single `apiJson`, single `apiUpload`, single `readApiError`. No more duplicated error parsing across lib files.
- `lib/http.ts`, `lib/media-upload.ts`, `lib/inference.ts` now delegate to canonical modules.
- `features/media/` module: `MediaUploadRow` type, `uploadMediaFile`, `checksumFile` isolated.
- `features/inference/` module: `JobUiState`, `JobSourceState`, all inference API functions, SSE (`openInferenceJobEvents`), event merging (`mergeJobEvent`) isolated.
- `App.tsx` imports inference types/functions from `features/inference`, media types/functions from `features/media`.
- Runtime truth selectors (`shared/state/`) remain untouched — Phase 15.5 contract preserved.
- `demoSnapshot` usage unchanged in App.tsx — Phase 17+ concern.
- No circular dependencies introduced: `shared/` → `features/` chain is clean.

**Phase 17 pre-flight found 4 P0 issues to address within Phase 17 implementation:**

1. CV worker returns `mock_thumbnailer`/`mock_frame_extractor` instead of real Pillow/OpenCV output.
2. `requirements.txt` missing `minio`, `boto3`, `opencv-python-headless`, and video stack.
3. No BullMQ consumer processes `media-processing` queue jobs.
4. `AssetDerivative` schema missing `checksum` field.

## What Is True After Phase 17 (Complete)

All 4 P0 blockers resolved. Commit: `feat(media): process real thumbnail artifacts`.

**CV Worker changes:**

- `apps/cv-worker/src/storage.py`: MinIO client with `read_object`, `write_object`, `object_exists`, `compute_sha256`.
- `apps/cv-worker/src/media_processing.py`: Real Pillow thumbnail generation. 512x512 max bounding box, aspect ratio preserved, no upscaling, SHA-256 checksum computed, output as WebP.
- `apps/cv-worker/src/main.py`: `/cv/create-thumbnail` replaced with real pipeline. `/cv/extract-frames` returns explicit `FAILED` with "not yet implemented". `/health` reflects `thumbnail: True`, `frameExtraction: False`.
- `requirements.txt`: Added `minio>=7.2.0`.

**NestJS API changes:**

- `apps/api/src/media/media-cv-worker.client.ts`: HTTP client for FastAPI media endpoints with correlation ID propagation.
- `apps/api/src/media/media-processing.service.ts`: BullMQ consumer for `visionflow.media-processing`. Transitions job states (QUEUED→RUNNING→SUCCEEDED/FAILED), calls FastAPI, persists `AssetDerivative`, updates `MediaAsset.thumbnailKey`, writes audit logs.
- `apps/api/src/media/media.service.ts`: Enqueues media processing jobs after asset creation.
- `apps/api/src/media/media.module.ts`: Registers `MediaCvWorkerClient` and `MediaProcessingService`.
- `.env.example`: Added `MEDIA_QUEUE_MODE` and `MEDIA_WORKER_CONCURRENCY`.

**Contracts changes:**

- `packages/contracts/src/cv-worker.ts`: Added `CvWorkerMediaProcessingRequestSchema`, `CvWorkerDerivativeArtifactSchema`, `CvWorkerCreateThumbnailResponseSchema`, `CvWorkerExtractFramesResponseSchema` and their TypeScript types.

**Schema changes:**

- `infra/prisma/schema.prisma`: `AssetDerivative.checksum String?` field added.

**Frame extraction deferred:** `/cv/extract-frames` returns explicit `FAILED` with `error: "Frame extraction is not yet implemented. Video frame extraction will be added in a future phase."` — no fake success.

## What Is True After Phase 18 (Completed)

All Phase 18 deliverables completed. Commit: `feat(datasets): export locked versions as deterministic COCO`.

**Lock-readiness invariants (`DatasetLockValidator`):**

- 8 checks before locking: DRAFT status, at least one asset, no UNASSIGNED splits, all IMAGE assets have width/height, annotation set exists, at least one BBox annotation, all annotation assetIds belong to version, all BBox geometry has positive area.
- All rejection messages are safe, actionable, no stack traces or internal error details.

**Annotation immutability (`AnnotationsService`):**

- `getVersionStatusByAnnotationSet()` resolves annotation → annotationSet → datasetVersion status.
- create/update/delete rejected with 409 when parent version is LOCKED or ARCHIVED.
- Read path (workspace loading) unaffected.

**Real image dimensions:**

- `extractImageMetadata()` uses `sharp().metadata()` to extract width/height from uploaded images.
- `MediaIngestionPlan` carries dimensions through upload pipeline.
- `MediaProcessingService` persists dimensions from CV worker thumbnail response.
- `MediaAsset` rows now have real `width`/`height`.

**Deterministic COCO export (`CocoExportService`):**

- `GET /api/projects/:projectId/dataset-versions/:versionId/export/coco`
- Requires LOCKED status. DRAFT/ARCHIVED => 409.
- Deterministic ordering: images by (split TRAIN>VALID>TEST, storageKey, id), categories by (name, labelClassId), annotations by (image_id, category_id, id).
- COCO IDs assigned sequentially starting at 1 after sorting.
- SHA-256 hash of canonical JSON of stable content (excludes `date_created`, `generatedAt`).
- Response includes VisionFlow metadata: projectId, datasetId, datasetVersionId, datasetVersion, status, assetCount, annotationCount, categoryCount, splits, deterministicHash.

**Contracts:**

- `packages/contracts/src/coco.ts` — COCO Zod schemas exported from `@visionflow/contracts`.

## What Is True After Phase 19 (Completed)

All Phase 19 deliverables completed. Commit: `feat(inference): run ONNX detector and persist predictions`.

**ONNX detector module (`src/detectors/`):**

- `base.py`: `Detector` ABC + `Detection` dataclass with `to_dict()` method.
- `mock_detector.py`: Extracted deterministic mock detector, `image_path` param accepted for interface compatibility.
- `onnx_yolo.py`: YOLOv8n ONNX implementation with 640x640 letterbox preprocessing, ONNX Runtime inference, YOLO output decode, confidence threshold (default 0.25), NMS IoU (default 0.45), coordinate conversion back to original image space. Explicit errors for: missing onnxruntime, model load failure, image decode error. No fallback to mock in ONNX mode.
- 80 COCO class names for label mapping.

**CV worker wiring (`src/main.py`):**

- `WORKER_VERSION` updated to `0.3.0`.
- `/cv/run-pipeline` now dispatches to `MockDetector` or `OnnxYoloDetector` based on `detectorMode`.
- `_run_onnx_pipeline()` reads images from MinIO via `_resolve_asset_image()`, runs inference, returns structured response with `modelVersion`.
- Health endpoint exposes: `onnxDetector.available`, `mode`, `modelVersion`, `inputSize`, `confidenceThreshold`, `nmsIouThreshold`, `modelPath` (masked).
- Explicit error codes: 400 (missing modelArtifactKey), 404 (model not found), 422 (invalid model / image decode), 501 (onnxruntime unavailable).

**Prediction traceability (`InferenceService.persistPredictions()`):**

- Each prediction metadata now includes: `workerMode`, `workerVersion`, `datasetVersionId`, `pipelineId`, `modelVersion` (when ONNX).

**Contracts (`packages/contracts/src/cv-worker.ts`):**

- `CvWorkerRunPipelineResponseSchema` extended with optional `modelVersion` field.

**Env vars (`.env.example`, `.env`):**

- `CV_WORKER_DETECTOR_MODE=mock` (default)
- `CV_WORKER_ONNX_MODEL_PATH=./models/yolov8n.onnx`
- `CV_WORKER_ONNX_MODEL_VERSION=yolov8n-640`
- `CV_WORKER_CONFIDENCE_THRESHOLD=0.25`
- `CV_WORKER_NMS_IOU_THRESHOLD=0.45`
- `CV_WORKER_INPUT_SIZE=640`

**Model download scripts:**

- `scripts/download-model.ps1` (Windows) and `scripts/download-model.sh` (Unix) — idempotent, SHA-256 verification, pinned URL.

**Seed data (`scripts/seed-db.ts`):**

- `ModelArtifact` row seeded for `model_onnx_yolov8n_v1` with config: 640 input, confidence 0.25, NMS 0.45, 80 COCO classes.
- Pipeline updated to reference `model_onnx_yolov8n_v1` instead of `model_onnx_parking`.

**Tests:**

- 25 new CV worker tests covering letterbox (7), normalization (2), NMS (5), mock detector (4), ONNX runtime errors (2), mock pipeline endpoint (3), COCO classes (1).
- 2 new API tests: ONNX mode throws without CV_WORKER_URL, mock fallback works, prediction traceability.
- `test_thumbnail_contract_for_image_media` skipped (pre-existing, requires live MinIO).

## What Is True After Phase 20 (Completed)

All Phase 20 deliverables completed. Commit: `feat(evaluation): persist deterministic evaluation reports`.

**Evaluation algorithm (`evaluation-algorithm.ts`):**

- `computeEvaluationMetrics()` — pure function implementing greedy IoU-based matching with deterministic ordering (confidence desc, id asc for predictions; IoU desc, id asc for GT candidates)
- `computeInputHash()` — SHA-256 of canonical inputs (jobId, datasetVersionId, sorted predictions, sorted GTs, iouThreshold), 16-char hex output
- `ALGORITHM_VERSION = 'eval-v1-iou-0.5-greedy-class-aware'`, `DEFAULT_IOU_THRESHOLD = 0.5`
- Metrics: overall precision, recall, F1, mean IoU; per-class TP/FP/FN, precision, recall, F1, mean IoU
- Geometry validation rejects invalid BBox inputs with descriptive errors

**Label mapping (`label-mapper.ts`):**

- `resolvePredictionClass()` resolves from `labelClassId` (priority 1), `metadata.cocoLabel` (priority 2), or `unmapped:unknown` (fallback)
- Normalization: lowercase, trim, collapse whitespace
- Per-class metrics use real LabelClass names (car/van/truck), not hardcoded "vehicle"

**Refactored EvaluationService (`evaluation.service.ts`):**

- Removed `process.env.DATABASE_URL` branching — uses `isDatabaseMode()`
- Removed CV worker evaluation delegation — API layer owns full computation
- Removed `Date.now()` in report ID — replaced with `inputHash`-based deterministic ID: `eval_${inputHash}_${jobId}`
- Added traceability: `datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`, `predictionCount`, `groundTruthCount`
- `getPredictionsForJob()` now uses `metadata.cocoLabel` when `labelClassId` is null

**Contracts (`packages/contracts/src/evaluation.ts`):**

- `PerClassMetricSchema`: added `classKey`, `meanIou`
- `EvaluationMatchSchema`: matched prediction-GT pairs with IoU
- `EvaluationReportSummarySchema`: extended with all traceability + hash fields
- `EvaluationReportSchema`: extends summary with `perClassMetrics[]`
- `PredictionSummarySchema`: added optional `metadata` field
- `RunEvaluationRequestSchema`: added optional `iouThreshold`

**Seed data (`scripts/seed-db.ts`):**

- All `DEMO_ANNOTATIONS` now `source: 'MANUAL'` (ground truth)
- `DEMO_PREDICTIONS` geometry precisely aligned with `DEMO_ANNOTATIONS` (perfect IoU = 1.0)
- Seeded `evaluationReport` row conforms to new contract (inputHash=`0c59dbe9c7062999`, per-class metrics for car/van/truck)

**Unit tests (`evaluation-algorithm.test.ts`):**

- 21 test cases: perfect match, duplicate predictions, low IoU FP, wrong class FP, missing prediction FN, multi-class, empty predictions, empty GT, unmapped COCO label, deterministic ordering, mean IoU, geometry validation, matches sorted

**Runtime results (seed data: 3 predictions, 3 GT, identical boxes):**

- TP=3, FP=0, FN=0
- Precision=1.0, Recall=1.0, F1=1.0, Mean IoU=1.0
- Per-class: car/van/truck each P=1, R=1, F1=1, IoU=1.0
- `inputHash` stable across re-runs: `0c59dbe9c7062999`

## What Is True After Phase 20B (Completed)

All 7 Phase 20 correctness blockers fixed. Commit: `fix(evaluation): harden deterministic evaluation correctness`.

**4.1 Per-class aggregation fixed (`evaluation-algorithm.ts`):**

- The old code stored metrics into `classMetrics` map keyed by `classKey`, overwriting entries across different `assetId|classKey` groups for the same class.
- The new code uses an accumulator pattern: every `assetId|classKey` group contributes TP/FP/FN counts to a single `classKey`-keyed accumulator. If "car" appears in asset a1 (TP=1) and asset a2 (FN=1), the final per-class "car" row has TP=1, FN=1.
- Label resolution: GT label preferred over prediction label over classKey.
- 31 algorithm unit tests now cover cross-asset aggregation (10 new tests added).

**4.2 LOCKED dataset version enforcement (`evaluation.service.ts`):**

- Before loading GT annotations, the service now queries the `DatasetVersion` by `job.datasetVersionId`.
- If `status !== 'LOCKED'`, throws `ConflictException("Evaluation requires a LOCKED dataset version. Current status: <status>.")`.
- Seeded dataset version is already LOCKED, so happy path is unaffected.
- Memory/demo mode does not enforce this (architecture-compatible).

**4.3 GT scoping fixed (`evaluation.service.ts`):**

- Old code loaded annotations via `versionAssets` → `link.asset.annotations` without filtering by annotation set.
- New code loads `DatasetVersion` with `annotationSets` included, collects annotations from those sets filtered by `source: 'MANUAL'`, then filters to `assetId in versionAssetIds`.
- This prevents annotations from other dataset versions' annotation sets from leaking into evaluation.
- If no GT annotations exist for a locked version (predictions-only), evaluation produces FP-only metrics.

**4.4 Strict report parsing (`evaluation.service.ts`):**

- Old code: `EvaluationReportSchema.partial().safeParse(raw)` — any subset of fields was accepted and cast to full `EvaluationReport`.
- New code: strict `EvaluationReportSchema.safeParse(raw)` first; if it fails, try a minimal legacy adapter that verifies required summary fields exist; if that also fails, return `null`.
- Corrupt/unknown-shape reports no longer return fabricated full reports.

**4.5 Non-lossy inputHash (`evaluation-algorithm.ts`):**

- Old: `canonicalPredId` used `toFixed(1)` for geometry and `toFixed(3)` for confidence — tiny differences could produce the same hash.
- New: deterministic canonical JSON with exact numeric values, sorted by `id`, includes `algorithmVersion` in canonical input.
- Same geometry different by 0.0001 now produces a different hash.
- Same IDs in different array order produces identical hash.

**4.6 EvaluationMatch persisted (`evaluation.service.ts`, `evaluation.ts`):**

- `EvaluationReportSchema` extended with optional `matches: EvaluationMatchSchema[]`.
- `runEvaluation()` now includes `result.matches` in the persisted `metricsJson`.
- `getEvaluationReport()` returns matches automatically since the full report is returned.
- Frontend ignores unknown fields — no contract change needed on consumer side.

**4.7 metricsHash improved (`evaluation.service.ts`):**

- Old: computed from 8 fields only (jobId, inputHash, TP/FP/FN, P/R/F1/meanIoU).
- New: computed from canonical JSON of the full report payload including perClassMetrics and matches (sorted deterministically), excluding `metricsHash`, `id`, `evaluatedAt`.
- Stable across re-runs with identical inputs regardless of `evaluatedAt` timestamp.

**Seed data updates (`scripts/seed-db.ts`):**

- `meanIoU` corrected from `0.88` to `1.0` (identical boxes have IoU=1.0).
- `matches` field added to seeded `evaluationReport` with all 3 match rows.
- `computeInputHash` aligned to new signature (includes `algorithmVersion`, sorts by `id`).
- `algorithmVersion` explicitly set to `eval-v1-iou-0.5-greedy-class-aware`.

## What Is True After Phase 20D (Completed)

Phase 20D added production-grade persistence and CI wiring to the evaluation subsystem.

**EvaluationReport model (`infra/prisma/schema.prisma`):**

- New scalar columns: `datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`
- New indexes: `@@index([inferenceJobId, createdAt])`, `@@index([datasetVersionId, createdAt])`, `@@index([inputHash])`, `@@index([metricsHash])`, `@@index([algorithmVersion])`
- New unique constraint: `@@unique([inferenceJobId, inputHash])` — enables deterministic upsert

**EvaluationService (`evaluation.service.ts`):**

- `runEvaluation()` now uses `prisma.evaluationReport.upsert()` with compound unique `[inferenceJobId, inputHash]` — re-running same evaluation with identical inputs updates existing row, no duplicates
- `getEvaluationReport()` now performs read consistency check: row scalar columns are cross-checked against parsed `metricsJson` fields. Any mismatch returns `null` rather than accepting inconsistent data

**Contracts (`packages/contracts/src/evaluation.ts`):**

- `inputHash` and `metricsHash` now use `Hex16Schema = z.string().regex(/^[a-f0-9]{16}$/)` — enforces lowercase hex format, not just length

**Seed (`scripts/seed-db.ts`):**

- `EvaluationReport` row now writes all new columns (`datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`) directly to the row, not just into `metricsJson`
- `inputHash` and `metricsHash` are computed from shared `evaluation-hash.ts` module, no `seed_placeholder` remains

**Phase 20C harness (`scripts/harness/phase20c-evaluation-integrity-check.ts`):**

- `--strict` mode now exits with code 1 if `DATABASE_URL` is absent

**Phase 20D harness (`scripts/harness/phase20d-evaluation-db-index-check.ts`):**

- 12-point read-only DB integrity harness verifying: row existence, new columns non-null, row/JSON consistency for inputHash/metricsHash/datasetVersionId/algorithmVersion/iouThreshold, unique constraint effectiveness, strict parse pass, no placeholder values, hash hex format, no stale jobs

**Integration tests (`apps/api/src/inference/evaluation.integration.spec.ts`):**

- **DRAFT reject:** evaluation against DRAFT dataset version throws `ConflictException`
- **Annotation leak isolation:** two dataset versions sharing same asset, each with different GT; evaluating version A produces groundTruthCount=1 (not 2), proving version B's annotations are not leaked
- **Upsert-by-hash:** running same evaluation twice with identical inputs creates exactly 1 `EvaluationReport` row; `metricsHash` is stable across runs

**CI (`.github/workflows/ci.yml`):**

- New `db-harness` job with PostgreSQL service: runs `db:generate` → `db:push` → `seed:db --reset` → `harness:phase20c` → `harness:phase20d` → `harness:phase20e`
- `build` job now depends on `db-harness` — CI fails if any harness fails

## What Is True After Phase 20E (Completed)

Phase 20E added explicit PostgreSQL migration/backfill discipline, fixed the CI test job schema synchronization, completed Phase 20D artifact closeout, and delivered all Phase 20E artifacts.

**Explicit migration SQL (`infra/prisma/migrations/20260504_evaluation_report_integrity_columns/migration.sql`):**

- Adds 7 new columns as nullable first (zero data loss)
- Backfills from `metricsJson` with `COALESCE` (preserves existing non-null values)
- Validates required fields and hash format via `DO` block (fails migration if corrupt rows exist)
- Adds NOT NULL constraints only after validation passes
- Creates 5 indexes with `IF NOT EXISTS` (idempotent)
- Creates unique index on `[inferenceJobId, inputHash]`
- Clear rollback note included

**Phase 20E harness (`scripts/harness/phase20e-evaluation-migration-check.ts`):**

- 12-point read-only DB check: 7 columns exist, NOT NULL enforced, 5 indexes + unique index, row/JSON consistency, hex format, no duplicates, no placeholders, strict schema parse, nullable optional columns

**Backfill check/apply (`scripts/migrations/backfill-evaluation-report-integrity.ts`):**

- `--check`: dry run, reports consistency issues/invalid hashes/duplicates/missing JSON fields, exits 1 if unsafe
- `--apply`: executes safe backfill, refuses on corrupt rows, does not recompute hashes or modify `metricsJson`

**CI test job fix (`.github/workflows/ci.yml`):**

- `test` job now runs `pnpm db:generate` and `pnpm db:push` before `pnpm test` — integration tests run against a properly synchronized schema

**CI db-harness extension (`.github/workflows/ci.yml`):**

- Added `pnpm harness:phase20e` to db-harness job

**Phase 20D artifacts:**

- `20D-SUMMARY.md` created
- `20D-REVIEW.md` created
- `20D-PLAN.md` status updated to Complete

## What Is True After Phase 20C (Completed)

Phase 20C resolved the remaining integrity gaps that Phase 20B identified but did not fully fix.

**Correction: Phase 20B overclaimed seed alignment.**

Phase 20B summary stated that seed hash was aligned with the runtime. Upon closer audit, the seed still used the old lossy `canonicalPredId` (with `toFixed`) and the old string-join approach, which differs from the runtime's canonical JSON approach. Phase 20C corrected this.

**Files created:**

- `apps/api/src/inference/evaluation-hash.ts` — shared pure hash utilities imported by both runtime and seed. Exposes `computeEvaluationInputHash` and `computeEvaluationMetricsHash` (both producing 16-char hex). No external dependencies.
- `scripts/harness/phase20c-evaluation-integrity-check.ts` — 12-point read-only DB integrity harness. Verifies: LOCKED version, SUCCEEDED job, 3 predictions, 3 GT via annotationSets, report exists, strict schema parse, inputHash match, metricsHash match, no `seed_placeholder`, 3 matches, correct per-class metrics, no stale jobs.

**Shared hash module (`evaluation-hash.ts`):**

- `computeEvaluationInputHash` — deterministic canonical JSON of all inputs (jobId, datasetVersionId, iouThreshold, algorithmVersion, sorted predictions, sorted groundTruth). Exact numeric values, no rounding.
- `computeEvaluationMetricsHash` — canonical JSON of full report payload (excluding metricsHash/id/evaluatedAt), including perClassMetrics and matches sorted deterministically.
- Both imported by: `evaluation-algorithm.ts`, `evaluation.service.ts`, `seed-db.ts`, `phase20c-harness.ts`.

**Seed alignment (`scripts/seed-db.ts`):**

- Removed old `canonicalPredId`/`canonicalGtId` (with `toFixed` rounding) and local `computeInputHash`.
- Now imports `computeEvaluationInputHash` and `computeEvaluationMetricsHash` from `evaluation-hash.ts` via relative path.
- `metricsHash` is computed from the shared canonical logic, not `seed_placeholder`.

**Legacy adapter (`evaluation.service.ts`):**

- Removed unsafe `partial as EvaluationReport` cast.
- Strict parse first, then explicit legacy adapter that checks all required summary fields, validates adapted object against full schema, returns null if either fails.

**New unit tests (30 added):**

- `evaluation-hash.test.ts`: 15 tests covering hash stability, order independence, tiny diff detection, 16-char hex format, algorithmVersion/iouThreshold inclusion.
- `evaluation-report-schema.test.ts`: 15 tests covering strict parse, partial rejection, legacy accept, regex validation.

**README fixed:**

- Phase 19: changed from "Planned" to "Done"
- Phase 20: changed from "Planned" to "Done"
- Phase 20B: added entry
- Phase 20C: added entry
- CV Worker ONNX: changed from "(stub)" to "YOLOv8n detector"
- Known limitations: updated evaluation reproducibility to reflect implementation status

## What Is True After Phase 21A (Complete)

Phase 21A established the app composition boundary. `App.tsx` is now the thin composition root. All route rendering is in `AppRoutes.tsx`. All panel components are in the `app/` directory.

**Files extracted (commit 86416bf):**

- `AppRoutes.tsx` — route rendering with conditional panel display
- `OverviewPanel.tsx`, `MediaPanel.tsx`, `DatasetPanel.tsx`, `PipelinePanel.tsx`, `JobsPanel.tsx` — panel components
- `Panel`, `VisionPreview`, `StateRow`, `OverviewStateRow` — shared UI primitives
- `NavRail`, `ShellHeader`, `ReadinessStrip`, `StatusPill` — shell components

**Import cleanup (this pass):**

- Removed 11 unused icon imports from App.tsx
- Removed 8 unused type imports from App.tsx
- Removed 40+ unused value/component imports from App.tsx
- Removed dead `visibleMediaRows` (duplicated in AppRoutes)
- Removed dead `showPipelineExecution` (computed but unused)
- Removed unused `useRef` hook from App.tsx
- Cleaned inline `MediaUploadRow` type import in AppRoutes.tsx
- Removed unused `MediaInspectorData`/`DatasetInspectorData` type imports from AppRoutes.tsx

**App.tsx line counts:**

- Before Phase 21A: 799 lines
- After extraction (86416bf): 638 lines
- After cleanup (this pass): 548 lines

**Boundary maintained:**

- `app/` imports `features/` — correct
- `features/` does not import `app/` — correct
- `shared/` does not import `app/` or `features/` — correct
- No circular dependencies

**Not changed:**

- No hook extraction — reserved for Phase 21B
- No state management changes — React useState/useEffect remain
- No backend changes
- No CSS/visual changes
