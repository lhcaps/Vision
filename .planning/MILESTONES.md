# Milestones

## v1.0 — Foundation & Core Workbench

**Completed:** 2026-05-01  
**Phases:** 0–10

### Scope

Established the VisionFlow Studio monorepo with a full-stack workbench covering dataset versioning, annotation, pipeline definition, inference orchestration, CV worker integration, prediction overlay, evaluation metrics, timeline replay, motion polish, and CI/CD hardening.

### Phases

| #   | Name                            | Goal                                                               |
| --- | ------------------------------- | ------------------------------------------------------------------ |
| 0   | Boot                            | GSD artifacts, monorepo, shared contracts                          |
| 1   | Foundation Vertical Slice       | Web shell, API skeleton, Prisma schema, CV mock                    |
| 2   | Media Ingestion                 | MinIO upload, MIME validation, checksum dedupe, queued jobs        |
| 3   | Dataset Versioning              | Immutable versions, split summaries, lock behavior                 |
| 4   | Annotation Engine               | BBox CRUD, annotation canvas, label selector, save queue           |
| 5   | Pipeline Builder                | React Flow builder, graph validation, persistence                  |
| 6   | Inference Orchestrator          | BullMQ queue, worker state machine, SSE progress                   |
| 7   | CV Worker                       | FastAPI worker, mock detector, ONNX capability guard               |
| 8   | Prediction Overlay & Evaluation | IoU metrics, GT comparison, overlay canvas, per-class report       |
| 9   | Timeline Replay & Motion Polish | BBox morphs, dataset diffs, pipeline execution flow                |
| 10  | Hardening                       | 118 tests, CI workflows, README, boot scripts, Playwright scaffold |

### Key Outcomes

- Monorepo: `apps/web`, `apps/api`, `apps/cv-worker`, `packages/contracts`, `packages/motion`, `infra`
- 118 unit/integration tests across 4 packages
- GitHub Actions CI + E2E workflows
- One-command boot scripts (Unix + PowerShell)
- Responsive workbench shell covering Overview, Media, Versions, Annotate, Pipeline, Jobs

### Known Partial Areas

- CV worker produces mock artifacts rather than real thumbnail/frame extraction
- Frontend App.tsx is a single large file (not yet split into feature modules)
- No real production-path test matrix
- COCO/YOLO export deferred

---

## v1.1 — Production Hardening & Real Vertical Slice

**Status:** Complete
**Started:** 2026-05-01
**Completed:** 2026-05-05
**Phases:** 11–23
**Completed in v1.1:** 11, 12A, 12B, 12C, 13, 14A, 14B, 15, 15.5–15.10, 16A, 17, 18, 19, 20, 20B, 20C, 20D, 20E, 20F, 21A–21D, 22A, 22B, 23

### Goal

Convert the prototype into a production-hardened platform with one real end-to-end vertical slice: upload media → annotate → run detector job → view prediction/evaluation → export COCO. Fix structural issues: no README, mixed memory/production paths, mock CV workers, monolithic frontend, missing security hardening, and untested production paths.

### Target

Build a deployable portfolio piece — one real dataset, one real annotation flow, one real async job, one real worker artifact, one real prediction persistence, one real evaluation report, one real export, one clean README, one clean demo video.

### Phase Progress

| #     | Name                                          | Goal                                                                                                                                                                               | Status       |
| ----- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 11    | Public README & Portfolio First Impression    | Root README, architecture diagram, demo GIF, setup docs                                                                                                                            | ✅ Done      |
| 12A   | CI/CD Completeness                            | Full CI pipeline, db:generate, format check, pytest                                                                                                                                | ✅ Done      |
| 12B   | Local Stack & Seed Reliability                | Docker compose, boot scripts, seed, .env.example                                                                                                                                   | ✅ Done      |
| 12C   | Dev Flow & Local Reliability Closeout         | DB scripts, CV port alignment, script fixes                                                                                                                                        | ✅ Done      |
| 13    | Security & Input Validation Hardening         | ValidationPipe, CORS, upload hardening, safe errors                                                                                                                                | ✅ Done      |
| 14A   | Adapter Boundary Cleanup                      | Repository interfaces, adapter implementations                                                                                                                                     | ✅ Done      |
| 14B   | Domain Invariants & State Machines            | Zod validation, job state machine, audit logs                                                                                                                                      | ✅ Done      |
| 15    | Observability & Health Checks                 | Request IDs, structured logs, /health endpoints                                                                                                                                    | ✅ Done      |
| 15.5  | Runtime Truth & State Consistency             | WorkbenchRuntimeState, eligibility selectors                                                                                                                                       | ✅ Done      |
| 15.6  | Workflow Guidance & Primary Next Action       | NextAction model, disabled reasons, recovery paths                                                                                                                                 | ✅ Done      |
| 15.7  | Contextual Inspector                          | Section-aware inspectors (Media, Dataset, Annotation, Pipeline, Jobs)                                                                                                              | ✅ Done      |
| 15.8  | UX States & Table Actions                     | EmptyState, ErrorState, DisabledReason, RowActions                                                                                                                                 | ✅ Done      |
| 15.9  | Visual System Hardening                       | Focus-visible, semantic colors, consistent spacing                                                                                                                                 | ✅ Done      |
| 15.10 | Motion, Portfolio Mode & Regression Tests     | Purposeful motion, isPortfolioSafe, 32 regression tests                                                                                                                            | ✅ Done      |
| 16A   | Frontend Split Minimum                        | Feature module extraction (media, inference)                                                                                                                                       | ✅ Done      |
| 17    | Real Media Processing                         | Pillow thumbnails, MinIO read/write, BullMQ consumer, derivative persistence, checksum field                                                                                       | ✅ Done      |
| 18    | Dataset Locking & COCO Export                 | Lock invariants, annotation immutability, deterministic COCO export, real image dimensions                                                                                         | ✅ Done      |
| 19    | Real ONNX Detector & Prediction Persistence   | YOLOv8n ONNX, prediction traceability, SHA-256 pinned, runtime smoke verified                                                                                                      | ✅ FULL PASS |
| 20    | Evaluation Report E2E                         | IoU matching, persisted reports, per-class metrics, label mapping                                                                                                                  | ✅ FULL PASS |
| 20B   | Evaluation Correctness Hardening              | 7 correctness bugs fixed: per-class agg, LOCKED check, GT scoping, strict parse, non-lossy hash, matches, metricsHash                                                              | ✅ Done      |
| 20C   | Evaluation Integrity Finalization             | Shared hash module, seed alignment, safe legacy adapter, 12-point harness, README fixed                                                                                            | ✅ Done      |
| 20D   | Evaluation Persistence & CI Hardening         | DB columns, upsert-by-hash, read consistency, hex regex, strict harness fix, phase20d harness, DB-backed integration tests, CI wiring                                              | ✅ FULL PASS |
| 20E   | Evaluation Migration Finalization             | Explicit migration SQL, backfill scripts, CI test job fix, phase20e harness, Phase 20D/20E artifact closeout                                                                       | ✅ FULL PASS |
| 20F   | Migration Chain Baseline & Backfill Hardening | Baseline migration, migrate deploy, migration-chain CI job, backfill hardening, phase20f harness, Phase 20E harness fixes                                                          | ✅ FULL PASS |
| 21    | Frontend Split Completion                     | Phase 21A/21B/21C/21D all complete. InspectorRouter fake state removed. AppRoutes prop surface clean. Phase 21 closed.                                                             | ✅ Done      |
| 22A   | Test Harness & Fixtures                       | Fixture contract, deterministic fixture harness, meta-harness, CI wiring                                                                                                           | ✅ Done      |
| 22B   | Production-Path Test Suite                    | API harness (8 checks), meta-harness (DB-only CI-safe), Playwright smoke (10 tests), CI wiring. FIXTURE_IDS canonical source.                                                      | ✅ FULL PASS |
| 23    | Full E2E Playwright & Demo Video              | Complete E2E flow: 19 Playwright tests, meta-harness (22A+22B+Playwright), demo docs (README-DEMO.md, DEMO-CHECKLIST.md), README portfolio cleanup, all planning artifacts updated | ✅ FULL PASS |

### Phase 11 Key Outcomes

- Root `README.md` with full architecture diagram (ASCII), Quick Start (5 steps), Features section, Tech Stack table, Development commands, Environment Variables, Project Structure, Known Limitations, Contributing guide
- `docs/demo/README-DEMO.md` with complete demo recording instructions

### Phase 12 Key Outcomes

- **CI/CD (12A):** GitHub Actions pipeline with job dependency graph `lint → [typecheck, format, pytest, test] → build`. Prisma client generation validated before typecheck. Python pytest suite (8 tests) runs in isolated job. Prettier format check prevents style drift. CI badge in README.
- **Local Stack (12B):** Docker compose with named network, MinIO bucket initialization, fixed healthchecks. Both Unix and Windows boot scripts with prerequisite checks, service health waits, colored output. Seed script with `--api` mode for API-based demo data creation. Complete `.env.example` with 16 documented variables in 8 sections.

### Phase 13 Key Outcomes

- **Input Validation:** Global NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. Unknown fields in request payloads rejected with HTTP 400.
- **CORS Policy:** Explicit allowlist from `WEB_ORIGIN` env var. Cross-origin requests blocked when not configured.
- **Upload Hardening:** Magic byte validation (`magic-bytes.ts` + tests), corrupted media detection (`media-integrity.ts`), 250MB file size limit, MIME type allowlist (JPEG, PNG, WebP, MP4, MOV).
- **Asset Access:** `SignedUrlService` for MinIO presigned URLs; `streamFile()` API proxy fallback when `SIGNED_URL_EXPIRY_SECONDS` is not set.
- **Safe Filenames:** `sanitize-filename.ts` strips path traversal attempts from original filenames.
- **Structured Errors:** All error responses are consistently formatted `{ statusCode, message, error, timestamp }`. Internal details never leaked to clients.
- Full Security section in README documenting all controls.

### Phase 14A Key Outcomes

- **Repository Interfaces:** 9 interfaces defined in `provider-tokens.ts`: `MediaRepository`, `DatasetRepository`, `AnnotationRepository`, `PipelineRepository`, `InferenceRepository`, `PredictionRepository`, `EvaluationRepository`, `StorageRepository`, `JobQueue`, `AuditLogger`.
- **Adapter Implementations:** `Prisma*` implementations (media, dataset, annotation, inference, prediction, evaluation), `MinioStorageRepository`, `BullMqJobQueue`, `PrismaAuditLogger` for production. `Memory*` and `LocalStorageRepository`, `NoopJobQueue`, `MemoryAuditLogger` for demo.
- **Module Bootstrap Pattern:** `AppMode` enum drives adapter selection. No `if (process.env.DATABASE_URL)` inside service methods. All infrastructure wired in `app.module.ts`.
- Clean separation: API module owns DB writes, CV worker owns MinIO artifact writes.

### Phase 14B Key Outcomes

- **Zod Validation at Boundary:** `annotation-geometry.validator.ts` validates BBox geometry via `BBoxGeometrySchema` before persistence. Pipeline graph validation via `pipeline-definition.integration.spec.ts`.
- **Inference Job State Machine:** `inference-job-state-machine.ts` enforces valid transitions (`QUEUED → RUNNING → SUCCEEDED/FAILED`, `QUEUED → CANCELLED`, `RUNNING → CANCELLED`). Invalid transitions throw `InferenceJobTransitionError`.
- **Progress Rewind Guard:** `assertValidProgress()` prevents progress percentage from decreasing (unless transitioning to FAILED).
- **Audit Logger Interface:** `AuditLogger` interface with `log(event: AuditEvent)` method. `PrismaAuditLogger` persists audit events; `MemoryAuditLogger` for demo.
- Prediction traceability: all predictions link to `inferenceJobId`, `mediaAssetId`, `datasetVersionId`, `pipelineId`.

### Phase 20 Key Outcomes

- **Deterministic evaluation algorithm:** `computeEvaluationMetrics()` — pure function, greedy IoU-based matching (threshold 0.5), deterministic ordering (confidence desc, id asc for predictions; IoU desc, id asc for GT candidates)
- **inputHash:** SHA-256 of canonical inputs (jobId, datasetVersionId, sorted predictions, sorted GTs, iouThreshold, algorithmVersion), 16-char hex, stable across re-runs. Non-lossy: exact numeric values, no rounding.
- **Label mapping:** `resolvePredictionClass()` from `labelClassId`, `metadata.cocoLabel`, or `unmapped:unknown`; real class names (car/van/truck) in per-class metrics
- **EvaluationService refactored:** Removed `DATABASE_URL` branching, removed CV worker delegation, removed `Date.now()` in report ID, added full traceability fields
- **Contracts extended:** `PerClassMetricSchema` +`classKey`/`meanIou`, `EvaluationMatchSchema`, `EvaluationReportSummarySchema` + traceability + hash fields
- **31 algorithm unit tests:** Covering all EVAL-09 fixture cases plus cross-asset aggregation, hash precision, and order stability (10 new tests added by Phase 20B)
- **Runtime results:** TP=3, FP=0, FN=0; Precision=1.0, Recall=1.0, F1=1.0, Mean IoU=1.0 (seed data: identical GT/prediction boxes)

### Phase 20B Key Outcomes (Evaluation Correctness Hardening)

Phase 20B fixed 7 correctness blockers found in the Phase 20 audit:

- **Per-class aggregation:** Accumulator pattern — if "car" appears in asset a1 (TP) and asset a2 (FP+FN), one aggregated "car" row with TP=1, FP=1, FN=1
- **LOCKED check:** Throws `ConflictException` before evaluation if `DatasetVersion.status !== 'LOCKED'`
- **GT scoping:** Ground truth loaded only from `AnnotationSet` rows belonging to the evaluated `DatasetVersion`, filtered by `source='MANUAL'`
- **Strict report parsing:** `safeParse` first; legacy adapter for known shapes; `null` if neither succeeds
- **Non-lossy hash:** Exact numeric values in canonical JSON; tiny differences change hash; same IDs in different order produce identical hash
- **Matches persisted:** `matches[]` included in `EvaluationReportSchema` and persisted in `metricsJson`
- **Full metricsHash:** Computed from canonical JSON of full report payload including perClassMetrics and matches, excluding `metricsHash`/`id`/`evaluatedAt`

> **Phase 20C correction:** Phase 20B artifacts overclaimed seed alignment. The seed still used the old lossy `toFixed`-based hash and `metricsHash: 'seed_placeholder'`. Phase 20C resolved this by creating a shared hash module and updating the seed to use it.

### Phase 20C Key Outcomes (Evaluation Integrity Finalization)

Phase 20C resolved the remaining integrity gaps:

- **Shared hash module (`evaluation-hash.ts`):** Pure TypeScript, no external deps. Single source of truth for `computeEvaluationInputHash` and `computeEvaluationMetricsHash`. Imported by runtime, seed, and harness.
- **Seed alignment:** Removed old `canonicalPredId`/`canonicalGtId` (with `toFixed`), removed `seed_placeholder`. Seed now uses the same canonical JSON approach as the runtime.
- **Safe legacy adapter:** Removed `partial as EvaluationReport` cast. Strict parse first, then explicit field validation, then full schema re-validation.
- **12-point harness:** `phase20c-evaluation-integrity-check.ts` verifies all DB integrity conditions including hash recomputation from live data.
- **30 new unit tests:** 15 hash utility tests + 15 schema validation tests.
- **README fixed:** Phase 19/20/20B/20C now show correct status, ONNX no longer described as "stub".

### Phase 20D Key Outcomes (Evaluation Persistence & CI Hardening)

Phase 20D added production-grade persistence and CI wiring:

- **DB columns:** `EvaluationReport` model now has dedicated scalar columns for `datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash` — not just JSON blob
- **Upsert-by-hash:** `runEvaluation()` uses `prisma.evaluationReport.upsert()` keyed on `[inferenceJobId, inputHash]` — re-running identical evaluation updates existing row, no duplicates
- **Read consistency:** `getEvaluationReport()` cross-checks row scalar columns against parsed `metricsJson` — mismatches return `null`
- **Hash hex validation:** `Hex16Schema = z.string().regex(/^[a-f0-9]{16}$/)` enforces lowercase hex, rejects uppercase/non-hex/wrong-length
- **Phase 20C strict fix:** `--strict` harness exits 1 without `DATABASE_URL`
- **Phase 20D harness:** 12-point read-only DB check verifying new columns, row/JSON consistency, unique constraint effectiveness, hash format
- **DB-backed integration tests:** DRAFT reject, annotation leak isolation, upsert dedupe
- **CI wiring:** `db-harness` job runs `db:push` → `seed:db --reset` → `harness:phase20c` → `harness:phase20d` → `harness:phase20e`; `build` depends on `db-harness`

> **Note:** Phase 20B artifacts initially overclaimed seed alignment. Phase 20C later corrected that the seed still used the old lossy hash (toFixed-based) and "seed_placeholder" metricsHash. Phase 20D then added the persistence layer. Phase 20E added explicit migration SQL, backfill scripts, CI fixes, and artifact closeout.

### Phase 20E Key Outcomes (Evaluation Migration Finalization)

Phase 20E added explicit migration/backfill discipline and completed Phase 20D artifact closeout:

- **Migration SQL:** `infra/prisma/migrations/20260504_evaluation_report_integrity_columns/migration.sql` — safe backfill with COALESCE, validation DO block, idempotent indexes
- **Phase 20E harness:** 12-point read-only DB check via `information_schema` — all 7 columns, NOT NULL, indexes, unique constraint, row/JSON consistency, hex format
- **Backfill scripts:** `--check` (dry run, no mutations) and `--apply` (safe backfill only, refuses on corrupt rows)
- **CI test job fix:** `test` job now runs `db:generate` + `db:push` before `pnpm test` — integration tests run against synchronized schema
- **CI db-harness extension:** Added `harness:phase20e`
- **Phase 20D artifacts:** `20D-SUMMARY.md` and `20D-REVIEW.md` created, `20D-PLAN.md` status updated to Complete
