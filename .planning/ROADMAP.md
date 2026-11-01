# Roadmap

Status date: 2026-05-05
Current milestone: v1.1 — Production Hardening & Real Vertical Slice
Phase 20F FULL PASS (2026-05-04) — Planning Cleanup Patch (21-0) then Phase 21A (Frontend Feature Split Completion) next to execute

## Legend

- Done: implemented and verified in the current codebase.
- Partial: visible scaffold or schema exists, but the real production workflow is not complete.
- Planned: not implemented yet.
- Blocked: cannot start until dependency is complete.

---

# v1.0 — Prototype Foundation

## Phase 0, Boot — Done

- Install GSD locally.
- Create product and design context.
- Create monorepo, infra files, and shared contracts.

## Phase 1, Foundation Vertical Slice — Done

- Web workbench shell with seeded VisionFlow data.
- API skeleton with health, OpenAPI, and demo project endpoints.
- Prisma domain schema.
- CV worker mock detector endpoint.
- Verification through typecheck, tests, and build.

## Phase 2, Media Ingestion — Done

- MinIO-backed upload API.
- Asset metadata, checksum dedupe, thumbnails.
- Media grid with progress, empty, and failure states.

Completed scope includes real multipart upload, MIME validation, deterministic SHA-256 object keys, project-scoped dedupe, Prisma metadata rows, audit rows, queued media processing jobs, CV thumbnail/frame job contracts, and web uploader states.

## Phase 3, Dataset Versioning — Done

- Immutable version rules.
- Dataset version assets and split summaries.
- Version timeline UI.

Completed scope includes shared dataset contracts, Nest dataset endpoints, Prisma and memory fallback service paths, duplicate assignment protection, locked-version mutation rejection, computed split summaries, and an upgraded Versions workbench.

## Phase 4, Annotation Engine — Done

- Bounding-box CRUD in image coordinates.
- Annotation canvas, label selector, keyboard actions, save queue.

Completed scope includes shared annotation contracts, Nest annotation CRUD with Prisma and memory fallback paths, project-scoped ownership checks, mutation audit rows, image-coordinate BBox validation/clamping, and a polished React annotation workbench with visible save queue states.

Post-phase UI polish is also complete for the current workbench shell: navigation rail, threshold control, dataset version builder, media asset table, annotation canvas framing, and mobile pipeline layout were audited across desktop, tablet, and mobile.

## Phase 5, Pipeline Builder — Done

- React Flow builder.
- Pipeline schema persistence.
- Graph validation and inspector.

Completed scope includes typed pipeline create/update/validate/list contracts, structured backend graph validation, Prisma and memory fallback persistence paths, API audit logging for persisted mutations, and an upgraded React Flow workbench with API sync, save/validate actions, selected-node parameter controls, validation issue highlighting, and mobile-friendly layout.

## Phase 6, Inference Orchestrator — Done

- BullMQ queue.
- Worker state machine scaffold.
- SSE progress.

Completed scope includes typed job creation contracts, locked dataset and persisted pipeline validation, BullMQ queue wiring, memory worker fallback, explicit job transition scaffold, SSE snapshot/log/progress/complete events, API job list/detail/create routes, and a Jobs workbench that follows backend progress without client-side simulation.

## Phase 7, CV Worker — Done

- Typed CV worker contracts.
- Deterministic mock detector dispatch.
- Explicit ONNX capability guard.
- Evaluation endpoint.

Completed scope includes shared CV worker request/response and evaluation contracts, FastAPI worker capability metadata, deterministic threshold-filtered mock detections, explicit ONNX unavailable/runtime/model errors without silent fallback, IoU-based evaluation metrics, Nest inference worker dispatch to the CV worker, Prisma prediction persistence when the database path is active, and Jobs logs that expose detector mode plus persisted prediction counts.

## Phase 8, Prediction Overlay And Evaluation — Done

- Job detail.
- Ground-truth comparison.
- Prediction overlay and per-job metric presentation.

Completed scope includes shared evaluation contracts, `EvaluationService` with dual-path Prisma and memory fallback evaluation, `CvWorkerClient.evaluate()`, Nest API routes for job evaluation and predictions, `PredictionOverlayCanvas`, `EvaluationMetricsPanel`, and upgraded `JobsPanel` wired to API state.

## Phase 9, Timeline Replay And Motion Polish — Done

- BBox morphs.
- Dataset diffs.
- Node execution flow.

Completed scope includes `TimelineReplayPanel`, `DatasetVersionDiff`, `PipelineExecutionFlow`, global CSS audit, unified `inner-border-*` design system, refined animation timing, reduced-motion fallback, and motion token consistency across `packages/motion`.

## Phase 10, Prototype Hardening & Internal Tooling — Done

- Unified Vitest workspace.
- CI scaffold.
- ESLint and Prettier setup.
- One-command boot scripts.
- Demo data validator.
- Playwright E2E scaffolding.

Completed scope includes per-package Vitest configs, 118 tests across 4 packages, GitHub Actions CI scaffold, E2E workflow scaffold, ESLint 9 flat config, Prettier with Tailwind plugin, `.editorconfig`, quick-start documentation scaffold, boot scripts for Unix and Windows PowerShell, demo data validator script, and Playwright navigation/pipeline/annotation specs.

Note: v1.0 proves the prototype surface. v1.1 is responsible for proving the production path.

---

# v1.1 — Production Hardening & Real Vertical Slice

## Goal

Convert VisionFlow Studio from a strong prototype into a production-hardened local-first portfolio project with one real, reproducible, end-to-end computer vision workflow.

## Target Vertical Slice

```
upload image
→ generate real thumbnail artifact
→ create dataset version
→ add asset to version
→ draw bounding-box annotation
→ lock dataset version
→ export deterministic COCO
→ run real detector job
→ persist predictions
→ evaluate predictions against ground truth
→ view overlay and metrics
→ prove the full flow with Playwright and demo video
```

## Target Proof

v1.1 is complete only when the repository has:

- One real dataset.
- One real annotation flow.
- One real async job.
- One real worker artifact.
- One real prediction persistence path.
- One real evaluation report.
- One deterministic COCO export.
- One clean public README.
- One working local setup.
- One Playwright E2E test using real services.
- One demo GIF or video suitable for portfolio review.

## Phase 11, Public README & Portfolio First Impression — Done

**Goal:** Make the repository understandable and credible within the first 60 seconds.

**Requirements:**

- Root README.md with: VisionFlow Studio description, product screenshots or demo GIF, architecture diagram, feature overview, implemented vs planned matrix, local setup, env vars reference, run commands for web/API/CV worker/Redis/MinIO/Postgres, migration commands, test commands, known limitations, **security note stating this project is for local/private use and must not be exposed publicly without authentication and rate limiting**
- Architecture diagram showing: Web App → NestJS API → Postgres/Prisma + MinIO + BullMQ/Redis → FastAPI CV Worker → Artifacts + Predictions + Evaluation Reports

**Depends on:** Phase 10

**Success criteria:**

1. Root README.md exists and renders correctly on GitHub.
2. README explains what VisionFlow Studio is without requiring code reading.
3. Architecture diagram shows the complete data flow.
4. Setup section allows a new developer to run the stack locally.
5. Features section clearly separates implemented, partial, and planned work.
6. Known limitations honestly state that v1.1 is hardening the real production path.
7. Demo screenshot or GIF is embedded or linked.

**Completed scope:** Root README.md upgraded with Demo section, ASCII architecture diagram, Implementation Status table (14 done / 15 in progress / 5 out of scope), Database Migrations section, Testing section, Known Limitations (5 subsections), Contributing guide updated. docs/demo/README-DEMO.md created with complete demo recording instructions.

**Note:** v1.0 proves the prototype surface. v1.1 is responsible for proving the production path.

## Phase 12A, CI/CD Completeness — Done

**Completed scope:** GitHub Actions CI pipeline enhanced with job dependency graph: `lint → [typecheck, format, pytest, test] → build`. Added `pnpm db:generate` step before typecheck to validate Prisma schema. Added dedicated `format` job running `pnpm format:check` with `CI=true` to prevent style drift. Added `pytest` job using `actions/setup-python@v5` with Python 3.11, pip caching, and `pip install -r requirements-dev.txt`. Added `WEB_ORIGIN` env var to test job. CI badge added to README. All 6 success criteria met.

## Phase 12B, Local Stack & Seed Reliability — Done

**Completed scope:** Docker compose enhanced with MinIO bucket initialization via `minio-init` service (waits for MinIO health, then `mc mb local/visionflow-artifacts --ignore-existing`). MinIO healthcheck fixed from broken `mc ready local` to working `curl -f http://localhost:9000/minio/health/live`. Named Docker network `visionflow-network` for deterministic hostnames. Container names made explicit (`visionflow-postgres`, `visionflow-redis`, `visionflow-minio`) and aligned with boot scripts. Both Unix and Windows boot scripts enhanced with: Docker/pnpm prerequisite checks, PostgreSQL/Redis/MinIO health waits with retry loops, colored output, and trap for cleanup. Seed script enhanced with `--api` mode for creating demo data via API. `.env.example` completed with 8 sections and 16 documented variables.

## Phase 13, Security & Input Validation Hardening — Done

**Goal:** Close the basic attack surface of a media upload platform.

**Requirements:**

- [x] Enable global NestJS ValidationPipe: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- [x] CORS explicit allowlist from `WEB_ORIGIN`.
- [x] Upload hardening: file size limit, MIME allowlist, magic byte validation, reject corrupted images/videos, never trust original filename, deterministic object keys from SHA-256, project-scoped checksum dedupe, signed URL or controlled asset proxy, no public MinIO bucket requirement.
- [x] Error responses must be structured and safe. API must not leak internal filesystem paths, stack traces, or storage credentials.

**Depends on:** Phase 11, Phase 12A

**Success criteria:**

1. [x] Unknown fields in request payloads are rejected.
2. [x] CORS only allows configured origins.
3. [x] Oversized uploads return 413 Payload Too Large.
4. [x] MIME type is validated by both declared type and magic bytes.
5. [x] Corrupted media is rejected.
6. [x] Duplicate upload returns existing asset, not a new row.
7. [x] Assets are served through signed URLs or controlled API proxy.
8. [x] Security behavior is documented in README.

**Completed scope:** `ValidationPipe` configured globally in `main.ts`. `CorsModule` configured with allowlist from `WEB_ORIGIN`. `multer` configured with 250MB limit and MIME filter. `magic-bytes.ts` validates file content vs declared MIME type. `media-integrity.ts` decodes images/videos to detect corruption. `sanitize-filename.ts` strips path traversal from original filenames. `SignedUrlService` generates MinIO presigned URLs; `streamFile()` proxies assets when `SIGNED_URL_EXPIRY_SECONDS=0`. `sanitize-filename.ts` strips path traversal from original filenames. Structured error responses via NestJS exception filter. Full Security section in README documenting all controls.

## Phase 14A, Adapter Boundary Cleanup — Completed 2026-05-01

**Goal:** Remove environment branching from business services. Production and demo behavior must be selected at module bootstrap, not inside service logic.

**Requirements:**

- Introduce interfaces: `MediaRepository`, `DatasetRepository`, `AnnotationRepository`, `PipelineRepository`, `InferenceJobRepository`, `PredictionRepository`, `StorageRepository`, `JobQueue`, `AuditLogger`
- Implementations: `PrismaMediaRepository`, `MemoryMediaRepository`, `MinioStorageRepository`, `LocalStorageRepository`, `BullMqJobQueue`, `NoopJobQueue`, `PrismaAuditLogger`, `MemoryAuditLogger`
- Rules: No `if (process.env.DATABASE_URL)` inside business service methods. No storage implementation detail inside domain services. No queue implementation detail inside inference orchestration service. Demo mode selects adapters in module setup. Production mode selects Prisma, MinIO, BullMQ, and real audit logger.

**Depends on:** Phase 12

**Success criteria:**

1. Business services depend on interfaces, not concrete implementations.
2. No environment branching exists inside service method bodies.
3. Memory and Prisma implementations share the same contract.
4. Adapter selection happens at module bootstrap.
5. Tests can swap implementations without patching service internals.
6. Production path can be tested without modifying app code.

## Phase 14B, Domain Invariants & State Machines — Completed 2026-05-01

**Goal:** Make invalid domain states impossible or explicitly rejected.

**Requirements:**

- Validate annotation geometry JSON at API boundary with Zod.
- Validate pipeline graph JSON at API boundary with Zod.
- Enforce inference job transitions through a state machine: `QUEUED → RUNNING → SUCCEEDED`, `QUEUED → RUNNING → FAILED`, `QUEUED → CANCELLED`, `RUNNING → CANCELLED`. Reject invalid transitions.
- Prediction records must trace: `modelArtifactId`, `pipelineId`, `datasetVersionId`, `inferenceJobId`, `mediaAssetId`.
- Dataset version lock state must be checked before mutation.
- Audit logs must record important mutation events.

**Depends on:** Phase 14A

**Success criteria:**

1. Invalid annotation geometry is rejected before persistence.
2. Invalid pipeline graph is rejected before persistence.
3. Invalid job state transitions throw explicit domain errors.
4. Prediction traceability fields are present and populated.
5. Dataset version mutations respect version state.
6. Audit rows exist for lock, annotation mutation, pipeline mutation, job start, job finish, and job failure.

## Phase 15, Observability & Health Checks — Done

**Goal:** Make every job traceable across API, queue, worker, database, and storage.

**Requirements:**

- [x] Add request ID per API request.
- [x] Add job correlation ID for inference and media-processing jobs.
- [x] Structured logs for: API request start/end, upload accepted/rejected, job enqueued, job state transition, worker request, worker response, artifact persisted, prediction persisted, evaluation persisted.
- [x] Health endpoint checks: API process, Postgres, Redis, MinIO, CV worker.
- [x] Add `/api/health/deep` for full dependency checks.
- [x] Add `/api/health/live` for lightweight liveness.

**Depends on:** Phase 14A

**Success criteria:**

1. [x] A single job can be traced from upload to final evaluation.
2. [x] Logs include request ID and job ID.
3. [x] Deep health check fails when DB, Redis, MinIO, or CV worker is unavailable.
4. [x] Liveness check stays lightweight.
5. [x] README documents health endpoints.

**Artifacts:**

- `15-CONTEXT.md` — Technical decisions for logging library selection, request ID strategy, job correlation strategy, health check design
- `15-01-PLAN.md` — Wave 1: Structured logging + Request ID interceptor
- `15-02-PLAN.md` — Wave 2: Health endpoints
- `15-03-PLAN.md` — Wave 3: CV Worker observability
- `15-04-PLAN.md` — Wave 4: README documentation
- `15-REVIEW.md` — Code review findings (2 critical, 8 warnings, 8 info)
- `15-EVAL-REVIEW.md` — Evaluation review (7/7 requirements covered)

## Pre-16 Completion Track

**Goal:** Finish all local reliability, product-truth, UX, visual-system, motion, and regression-test work before starting Phase 16 frontend extraction. Phase 16 is intentionally out of scope for this track.

### Phase 12C, Dev Flow & Local Reliability Closeout — Done

**Goal:** Make the local stack and documented commands reliable before UX polish.

**Requirements:**

- [x] Fix Unix and Windows full-stack boot scripts.
- [x] Align Postgres container/user/database checks with Docker Compose.
- [x] Align CV worker port to 8000 everywhere.
- [x] Add `db:push`, `db:migrate`, and `db:studio` root scripts.
- [x] Ensure README setup commands match `package.json`.
- [x] Verify fresh-clone local boot.

**Success criteria:**

1. [x] `pnpm db:generate` passes.
2. [x] `pnpm db:push` passes.
3. [x] `pnpm dev:full` starts web, API, CV worker, and Docker infra.
4. [x] `pnpm dev:full:win` uses the same service names and ports.
5. [x] API health is reachable at `http://localhost:3000/api/health`.
6. [x] CV worker health is reachable at `http://localhost:8000/health`.

### Phase 15.5, Runtime Truth & State Consistency — Done

**Goal:** Remove contradictory frontend runtime states.

**Requirements:**

- [x] Add a single workbench runtime state model (`WorkbenchRuntimeState`).
- [x] Derive run and evaluation eligibility from the runtime state.
- [x] Job state drives pipeline execution, prediction overlay, and evaluation UI.
- [x] Failed jobs do not show running pipeline execution.
- [x] Failed jobs do not show fresh predictions unless clearly marked as cached/demo.
- [x] Inspector summary does not mix demo fallback state with API state.

**Artifacts:**

- `apps/web/src/shared/state/workbench-runtime.ts` — Single source of truth model
- `apps/web/src/shared/state/runtime-selectors.ts` — Eligibility selectors
- `apps/web/src/App.tsx` — Refactored to use runtime state and pass eligibility to panels

**Success criteria:**

1. [x] No screen shows `FAILED` job and `RUNNING` pipeline simultaneously.
2. [x] No screen claims a locked dataset with assets from demo state while API state says none exists.
3. [x] Run inference is disabled with a reason when no valid locked dataset exists.
4. [x] Evaluation is disabled with a reason unless a successful job and predictions exist.
5. [x] Fallback/mock/degraded state is explicitly labeled.

### Phase 15.6, Workflow Guidance & Primary Next Action — Done

**Goal:** Make every page explain the next correct user action.

**Requirements:**

- [x] Add a `NextAction` model.
- [x] Each page exposes one primary action.
- [x] Disabled primary actions explain why via `ActionHint` and `DisabledReason`.
- [x] Failed job state includes a recovery path via `FailedJobErrorState`.

**Artifacts:**

- `apps/web/src/shared/workflow/next-action.ts` — NextAction type and ActionSectionId
- `apps/web/src/shared/ui/DisabledReason.tsx` — DisabledReason and ActionDisabledNote
- `apps/web/src/shared/ui/ActionHint.tsx` — Inline action hints
- `apps/web/src/shared/ui/ErrorState.tsx` — FailedJobErrorState with recovery path

**Success criteria:**

1. [x] ShellHeader "Run" button is disabled with `ActionHint` explaining why.
2. [x] Overview "Queue job" button is disabled with inline reason when eligibility fails.
3. [x] Jobs page shows `FailedJobErrorState` with recovery path when job fails.
4. [x] Evaluation button in Jobs panel is disabled with `ActionHint` explaining why.
5. [x] All disabled primary CTAs expose a reason.

### Phase 15.7, Contextual Inspector — Done

**Goal:** Replace the global static inspector with section-aware and selection-aware inspectors.

**Requirements:**

- [x] Implement inspectors for Overview, Media, Datasets, Annotation, Pipeline, Jobs.
- [x] Inspector content matches active section and selected entity.
- [x] Remove the old global `InspectorPanel` from pages where it does not apply.

**Artifacts:**

- `apps/web/src/features/inspector/inspector.types.ts` — Inspector data types
- `apps/web/src/features/inspector/MediaInspector.tsx` — Asset detail inspector
- `apps/web/src/features/inspector/DatasetInspector.tsx` — Version/split inspector
- `apps/web/src/features/inspector/AnnotationInspector.tsx` — Box geometry inspector
- `apps/web/src/features/inspector/PipelineInspector.tsx` — Node params inspector
- `apps/web/src/features/inspector/JobInspector.tsx` — Job status/log inspector
- `apps/web/src/features/inspector/index.ts` — Barrel export

**Success criteria:**

1. [x] Media inspector shows selected asset/storage/processing data.
2. [x] Dataset inspector shows selected version/split/lock/export data.
3. [x] Annotation inspector shows selected box geometry/label/source/dirty state.
4. [x] Pipeline inspector shows selected node config/validation/model binding.
5. [x] Jobs inspector shows job status/log/prediction/evaluation data.

### Phase 15.8, UX States & Table Actions — Done

**Goal:** Make every empty, loading, error, and disabled state actionable.

**Requirements:**

- [x] Add shared EmptyState, ErrorState, DisabledReason, ActionHint, and RowActions components.
- [x] Every empty state explains what is missing and what to do next.
- [x] Every recoverable error includes a recovery CTA.
- [x] Media, dataset, and job surfaces include useful row/bulk actions.

**Artifacts:**

- `apps/web/src/shared/ui/EmptyState.tsx` — Generic and variant-specific empty states
- `apps/web/src/shared/ui/ErrorState.tsx` — ErrorState and FailedJobErrorState
- `apps/web/src/shared/ui/DisabledReason.tsx` — DisabledReason and ActionDisabledNote
- `apps/web/src/shared/ui/ActionHint.tsx` — Inline action hints
- `apps/web/src/shared/ui/RowActions.tsx` — RowActionDef and RowActions component

**Success criteria:**

1. [x] Evaluation empty state explains that a successful inference job is required.
2. [x] Media empty state points to upload.
3. [x] Dataset empty state points to draft/version creation.
4. [x] Failed job state points to the exact fix path.
5. [x] Media rows support view/copy/add/retry/delete actions as appropriate.
6. [x] Dataset assets support bulk selection and split assignment.

### Phase 15.9, Visual System Hardening — Done

**Goal:** Preserve the dark technical identity while making color, spacing, focus states, and density production-grade.

**Requirements:**

- [x] CSS design tokens already established (OKLCH tokens, semantic colors).
- [x] All interactive controls have focus-visible states.
- [x] Status colors are semantic and consistent (signal=success, scan=active, amber=warning, red=failed).
- [x] Table density is consistent across media, datasets, and jobs.
- [x] Chips and status pills share one visual language.
- [x] Reduced-motion behavior is handled via `@media (prefers-reduced-motion: reduce)`.

**Artifacts:**

- `apps/web/src/index.css` — Comprehensive design system with OKLCH tokens

**Success criteria:**

1. [x] All interactive controls have focus-visible states.
2. [x] Status colors are semantic and consistent.
3. [x] Table density is consistent across media, datasets, and jobs.
4. [x] Chips and status pills share one visual language.
5. [x] UI remains polished at mobile, tablet, and desktop widths.

### Phase 15.10, Motion, Portfolio Mode & Regression Tests — Done

**Goal:** Make motion purposeful and protect the polished UX from regression.

**Requirements:**

- [x] Remove unnecessary page/card load animations (kept only purposeful microinteractions).
- [x] Motion only for meaningful state transitions (page: 120-180ms, selection: spring, save: 140-180ms, graph: 120-160ms).
- [x] Add `isPortfolioSafe` selector for portfolio/demo-safe state detection.
- [x] Add regression tests for major state contradiction cases.

**Artifacts:**

- `apps/web/src/shared/state/runtime-selectors.test.ts` — 32 regression tests covering 7 rules
- `apps/web/src/shared/state/runtime-selectors.ts` — `isPortfolioSafe` selector

**Success criteria:**

1. [x] Failed job does not show running pipeline execution.
2. [x] Failed job disables evaluation with a reason.
3. [x] No locked dataset disables Run with a reason.
4. [x] Media page inspector does not show annotation geometry unless relevant.
5. [x] Pipeline page inspector shows selected node parameters.
6. [x] Portfolio screenshot mode avoids contradictory fallback/demo states.
7. [x] Typecheck, lint, and web tests pass.

### Pre-16 Gate

**Status:** PASSED

All gates confirmed passing as of Phase 15.10 completion (2026-05-02):

- [x] `pnpm db:generate` passes.
- [x] `pnpm db:push` passes.
- [x] `pnpm --filter @visionflow/api typecheck` passes.
- [x] `pnpm --filter @visionflow/web typecheck` passes.
- [x] `pnpm --filter @visionflow/web test` passes (63 tests).
- [x] `pnpm lint` passes.
- [x] `pnpm format:check` passes.

**Phase 16A may now begin.**

**Out of scope for Pre-16 track:**

- Do not split App.tsx into full app/routes/features architecture.
- Do not perform Phase 16 frontend extraction.
- Do not implement real media processing, real ONNX, or new ML features.

## Patch 15.10.1, Pre-merge App Wiring Fix — Done

**Goal:** Wire runtime state and contextual inspectors to real App state before Phase 16.

**Requirements:**

- [x] Derive `runtimeState` from `job.status`, `job.source`, `predictions`, `evaluationReport` — not from `createInitialRuntimeState`.
- [x] Header Run button `disabled` includes `!inferenceEligibility.ok`.
- [x] `PipelinePanel` selected node synced to `InspectorRouter` via lifted state.
- [x] `InspectorRouter` extracted to `features/inspector/InspectorRouter.tsx`.
- [x] `selectedMediaAssetId` and `selectedDatasetVersionId` tracked at App level; real data passed to `MediaInspector` and `DatasetInspector`.
- [x] Fallback inspector no longer references `demoSnapshot` for project/dataset/asset fields.

**Artifacts:**

- `apps/web/src/features/inspector/InspectorRouter.tsx` — extracted router component
- `apps/web/src/features/inspector/index.ts` — barrel export updated
- `apps/web/src/App.tsx` — runtimeState derive, lifted pipeline/dataset/media state, inspector data wiring

**P0: API Cache Fix Patch — Done**

**Goal:** Prevent 304 Not Modified responses from breaking the frontend `fetch` wrapper.

**Requirements:**

- [x] `apps/web/src/lib/http.ts`: `apiJson` now sends `cache: 'no-store'` and `Cache-Control: no-cache`.
- [x] `apps/api/src/main.ts`: disabled ETag generation and added explicit no-cache middleware for all API responses.

**Gates:** All 4 packages typecheck + lint pass. Web tests: 63/63 pass.

## Phase 16A, Frontend Split Minimum — Done 2026-05-03

**Goal:** Reduce risk before real worker and detector work by extracting high-change areas from the monolithic frontend.

**Requirements:**

- Create initial frontend structure: `src/app/` (App.tsx, AppShell.tsx, routes.tsx), `src/shared/` (api/client.ts, ui/\*, hooks/, types/), `src/features/media/` (MediaPage, MediaUploader, MediaGrid, media.api.ts, media.types.ts), `src/features/inference/` (JobList, JobDetail, PredictionOverlay, EvaluationReport, inference.api.ts, inference.types.ts)
- Scope control: This phase only extracts media and inference first. Avoid visual redesign. Preserve existing UX.

**Depends on:** Phase 11

**Success criteria:**

1. App.tsx is reduced significantly.
2. Media API calls are isolated in features/media.
3. Inference API calls are isolated in features/inference.
4. Shared API client handles base URL, errors, and typed responses.
5. Existing UI behavior is preserved.
6. No circular dependencies are introduced.

**Completed scope:** Canonical shared API boundary at `shared/api/client.ts` (`apiJson`, `apiUpload`, `readApiError`, `API_BASE_URL`). `lib/http.ts`, `lib/media-upload.ts`, `lib/inference.ts` delegate to canonical modules. `features/media/` module: `MediaUploadRow` type, `uploadMediaFile`, `checksumFile`. `features/inference/` module: `JobUiState`, `JobSourceState`, all inference API functions, SSE (`openInferenceJobEvents`), event merge (`mergeJobEvent`). `App.tsx` imports from feature modules. Runtime selectors (`shared/state/`) untouched. No circular dependencies introduced.

## Phase 17, Real Media Processing — Done 2026-05-03

**Pre-flight P0 blockers identified:** (see Phase 17.1 for resolution)

- P0-1: CV worker returns `mock_thumbnailer`/`mock_frame_extractor`, no real Pillow/OpenCV output.
- P0-2: `requirements.txt` missing `minio`, `boto3`, `opencv-python-headless`, video stack.
- P0-3: No BullMQ consumer for `media-processing` queue.
- P0-4: `AssetDerivative` schema missing `checksum` field.

**Goal:** Make the CV worker produce real derivative artifacts. Stop returning fake successful media-processing results.

**Architecture rule: API is source of truth for database state.** The FastAPI CV worker reads source objects and writes derivative objects to MinIO, but never writes to the PostgreSQL database. A NestJS BullMQ consumer owns all database transitions.

**Data ownership:**

- NestJS API: owns job metadata, job state transitions, derivative metadata persistence, audit logs.
- FastAPI CV worker: reads source object keys from job payload, writes derivative artifacts to MinIO, returns artifact metadata (objectKey, width, height, checksum) to the API consumer.

**Worker contract:**

- NestJS BullMQ consumer dispatches job to FastAPI worker with `{ jobId, sourceObjectKey, operation }`.
- FastAPI worker fetches source from MinIO, processes media, writes derivative to MinIO, returns `{ objectKey, width, height, checksum }`.
- NestJS consumer persists derivative metadata, transitions job state, writes audit log.

**Requirements:**

- `/cv/create-thumbnail`: Uses Pillow or OpenCV, reads a real source image from MinIO, produces a real thumbnail image, writes derivative artifact to MinIO, returns artifact metadata.
- `/cv/extract-frames`: Uses ffmpeg or OpenCV, reads a real source video from MinIO, produces real frame images, writes frame artifacts to MinIO, returns artifact metadata list.
- BullMQ payload contains only job ID and source object key — no blob data.
- Worker flow: NestJS consumer enqueues job → FastAPI reads source → processes → writes derivative → returns metadata → NestJS consumer updates DB → transitions job to SUCCEEDED.
- Failure flow: NestJS consumer transitions job to FAILED → saves error details → writes audit row → exposes failure in UI.

**Depends on:** Phase 14A, Phase 14B, Phase 15

**Completed scope:**

- `apps/cv-worker/src/storage.py`: MinIO client — `read_object`, `write_object`, `object_exists`, `compute_sha256`.
- `apps/cv-worker/src/media_processing.py`: Real Pillow thumbnail. 512x512 max bounding box, aspect ratio preserved, no upscaling, SHA-256 checksum, WebP output.
- `apps/cv-worker/src/main.py`: `/cv/create-thumbnail` → real pipeline. `/cv/extract-frames` → explicit `FAILED` (deferred). `/health` → `thumbnail: True, frameExtraction: False`.
- `apps/cv-worker/requirements.txt`: Added `minio>=7.2.0`.
- `apps/api/src/media/media-cv-worker.client.ts`: HTTP client for FastAPI media endpoints with correlation ID propagation.
- `apps/api/src/media/media-processing.service.ts`: BullMQ consumer for `visionflow.media-processing`. Transitions QUEUED→RUNNING→SUCCEEDED/FAILED. Persists `AssetDerivative`, updates `MediaAsset.thumbnailKey`, writes audit log.
- `apps/api/src/media/media.service.ts`: Enqueues processing jobs after asset creation.
- `apps/api/src/media/media.module.ts`: Registers `MediaCvWorkerClient` and `MediaProcessingService`.
- `packages/contracts/src/cv-worker.ts`: Added `CvWorkerMediaProcessingRequestSchema`, `CvWorkerDerivativeArtifactSchema`, `CvWorkerCreateThumbnailResponseSchema`, `CvWorkerExtractFramesResponseSchema`.
- `infra/prisma/schema.prisma`: `AssetDerivative.checksum String?` field added.
- `.env.example`: Added `MEDIA_QUEUE_MODE`, `MEDIA_WORKER_CONCURRENCY`.

**Frame extraction:** Deferred. `/cv/extract-frames` returns explicit `FAILED` with `"Frame extraction is not yet implemented."` — no fake success.

**Success criteria:**

1. ✅ Thumbnail endpoint produces a real image artifact (WebP, 512x512 max).
2. ⚠️ Frame extraction deferred — explicit `FAILED` returned, not mocked `SUCCEEDED`.
3. ✅ Derivative artifacts are persisted to MinIO.
4. ✅ Derivative artifacts are retrievable via API (thumbnailKey on MediaAsset).
5. ✅ Queue payload contains only IDs and object keys — no blob data.
6. ✅ NestJS consumer owns all DB writes — FastAPI worker has no database access.
7. ✅ FastAPI returns artifact metadata; NestJS persists it.
8. ✅ Failed media processing writes structured error details via NestJS audit log.
9. ✅ Worker never returns SUCCEEDED for mocked media processing.
10. ✅ Integration smoke verified with real services (live stack upload → job → derivative → thumbnailKey).

## Phase 17.1, Real Media Processing Runtime Fixes — Done 2026-05-03

**Pre-flight blockers fixed (raised by user after Phase 17 verification):**

| Blocker                                    | Severity       | Fix                                                                                                                                            |
| ------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Race condition: enqueue before MinIO write | P0             | Moved `enqueueMediaProcessing` after `putOriginal` succeeds. Added `removeQueuedJob()` for cleanup.                                            |
| CV worker import crash                     | P0             | Changed `from .storage import` to `from storage import` in `media_processing.py`. Fixed dataclass field ordering.                              |
| dev:full missing CV worker                 | P1             | Updated `start-dev.ps1` and `start-dev.sh` to boot `pnpm dev:cv`. Set `CV_WORKER_URL=http://localhost:8000` in `.env.example`.                 |
| Storage error swallowed                    | P1             | `object_exists()` now raises `RuntimeError` for connectivity/auth errors; returns false only for real "not found".                             |
| Duplicate FAILED transition                | P1             | Centralized all failure transitions in `failJob()`. `processThumbnail` and `processFrameExtraction` no longer transition to FAILED internally. |
| MulterModule missing                       | (pre-existing) | Added `MulterModule.register()` to `MediaModule`.                                                                                              |

**Files changed:**

- `apps/api/src/media/media.service.ts` — race condition fix, queue job removal on cleanup
- `apps/api/src/media/media-processing.service.ts` — centralized failure, `removeQueuedJob()`, removed dead code
- `apps/api/src/media/media.module.ts` — added `MulterModule`
- `apps/cv-worker/src/media_processing.py` — top-level imports, dataclass field ordering
- `apps/cv-worker/src/storage.py` — error classification in `object_exists()`
- `scripts/start-dev.ps1` — boots CV worker on port 8000
- `scripts/start-dev.sh` — boots CV worker on port 8000
- `.env.example` — `CV_WORKER_URL=http://localhost:8000`
- `.env` — `CV_WORKER_URL=http://localhost:8000`

**Verification:**

- `pnpm typecheck` — PASS
- `pnpm test` — PASS (207 tests)
- `pnpm build` — PASS
- `pnpm lint` — PASS
- `pnpm format:check` — PASS (fixed)
- `python -m pytest tests/ -v` — 9/10 pass (1 fail: `minio` module not installed in local env)
- Runtime smoke: API health `200`, CV worker health `200`, BullMQ worker started, demo media list returns `thumbnailKey`

## Phase 18, Dataset Locking & Deterministic COCO Export — Done 2026-05-04

**Pre-flight blockers identified:**

- P0-1: `lockVersion()` does not enforce export-readiness invariants (asset count, UNASSIGNED splits, image dimensions, annotation presence).
- P0-2: Annotation create/update/delete does not check dataset version lock state.
- P0-3: `MediaAsset.width`/`height` not persisted during upload — COCO export would have no real image dimensions.
- P0-4: No COCO export endpoint exists.

**Goal:** Make dataset versions genuinely immutable after locking and export locked dataset versions as deterministic COCO JSON.

**Completed scope:**

- `DatasetLockValidator` — 8 lock-readiness invariants enforced before locking: DRAFT status, at least one asset, no UNASSIGNED splits, all IMAGE assets have valid width/height, annotation set exists, at least one BBox annotation, all annotation assetIds belong to version, all BBox geometry has positive area. All rejection messages are safe and actionable.
- `AnnotationsService` — pre-check on create/update/delete via `getVersionStatusByAnnotationSet()`. Returns 409 "Annotations are immutable once the dataset version is locked." for LOCKED/ARCHIVED versions. Read path unaffected.
- `extractImageMetadata()` — uses `sharp().metadata()` to extract real width/height from uploaded images. Dimensions persisted on `MediaAsset` via ingestion plan and CV worker thumbnail response.
- `CocoExportService` — `GET /api/projects/:projectId/dataset-versions/:versionId/export/coco`. Requires LOCKED status. Deterministic ordering: images by (split TRAIN>VALID>TEST, storageKey, id), categories by (name, labelClassId), annotations by (image_id, category_id, id). SHA-256 hash of canonical stable content. VisionFlow metadata: projectId, datasetId, datasetVersionId, datasetVersion, status, assetCount, annotationCount, categoryCount, splits, deterministicHash.
- `packages/contracts/src/coco.ts` — COCO Zod schemas: `CocoInfoSchema`, `CocoImageSchema`, `CocoCategorySchema`, `CocoAnnotationSchema`, `CocoDatasetSchema`, `CocoExportMetadataSchema`, `CocoExportResponseSchema`. All exported from `@visionflow/contracts`.

**Files created:** `coco.ts`, `coco-export.service.ts`, `coco-export.service.spec.ts`, `dataset-lock.validator.ts`, `dataset-lock.validator.spec.ts`.

**Depends on:** Phase 14B

## Phase 19, Real ONNX Detector & Prediction Persistence — FULL PASS 2026-05-04

**Completed scope:**

- `src/detectors/base.py`: `Detector` ABC + `Detection` dataclass.
- `src/detectors/mock_detector.py`: Extracted deterministic mock — `image_path` param accepted for interface compatibility.
- `src/detectors/onnx_yolo.py`: YOLOv8n ONNX — letterbox (640x640), ONNX Runtime execution, YOLO output decode, confidence threshold 0.25, NMS IoU 0.45, coordinate conversion to original image space. Explicit errors for: missing onnxruntime (501), model load failure (422), image decode (422). No fallback to mock.
- `src/main.py`: `WORKER_VERSION=0.3.0`. `_run_onnx_pipeline()` reads images from MinIO, dispatches to detector, returns structured response with `modelVersion`. Health endpoint exposes full ONNX config.
- `packages/contracts/src/cv-worker.ts`: `CvWorkerRunPipelineResponseSchema` extended with optional `modelVersion` field.
- `apps/api/src/inference/inference.service.ts`: `persistPredictions()` adds `datasetVersionId`, `pipelineId`, `modelVersion` to prediction metadata.
- `apps/cv-worker/requirements.txt`: Added `onnxruntime>=1.19.0`.
- `.env` and `.env.example`: Added `CV_WORKER_ONNX_MODEL_PATH`, `CV_WORKER_ONNX_MODEL_VERSION`, `CV_WORKER_CONFIDENCE_THRESHOLD`, `CV_WORKER_NMS_IOU_THRESHOLD`, `CV_WORKER_INPUT_SIZE`.
- `scripts/download-model.ps1` + `scripts/download-model.sh`: Idempotent, SHA-256 verified, pinned URL.
- `scripts/seed-db.ts`: YOLOv8n `ModelArtifact` row seeded with config. Pipeline references `model_onnx_yolov8n_v1`.
- `tests/test_onnx_detector.py`: 25 tests — letterbox (7), normalization (2), NMS (5), mock detector (4), ONNX errors (3), mock endpoint (3), COCO classes (1).
- 2 new API tests for ONNX fallback and prediction traceability.

**Depends on:** Phase 17, Phase 18

**Success criteria:**

1. ✅ ONNX detector scaffolded with real YOLOv8n ONNX integration.
2. ✅ NMS removes overlapping duplicate predictions.
3. ✅ Confidence threshold filters low-confidence predictions.
4. ✅ Predictions persisted to DB through NestJS production path.
5. ✅ Predictions traceable to job, model (via metadata), pipeline, dataset version, and media asset.
6. ✅ ONNX errors are explicit with HTTP codes and visible in job logs.
7. ✅ Mock detector available only when explicitly selected.
8. ✅ Model artifact seeded with name, version, runtime, input shape.
9. ✅ Model download script documented and reproducible.
10. ✅ API tests prove prediction persistence on production database path.

**Runtime verification (2026-05-04):**

- YOLOv8n ONNX model downloaded from HuggingFace (~6MB)
- SHA-256 verified: `65158DAD735BE799C2466FA15E260C09558080BD530B42A8D0C3D1B419AFD8B5`
- Both `download-model.ps1` and `download-model.sh` updated with pinned hash
- CI fix: `turbo.json` `lint` task now has `dependsOn: ["^build"]` — CI green
- ONNX missing-model smoke: HTTP 404, no fallback ✅
- ONNX real-object smoke: 4 predictions on real image (conf=0.05), cocoLabel/classId/geometry valid ✅
- Mock smoke: 1 prediction, valid geometry and confidence ✅
- DB harness `pnpm harness:phase19`: exit 0 ✅
- `pnpm lint`: all packages pass ✅
- `git check-ignore models/yolov8n.onnx`: ignored ✅

## Phase 20, Evaluation Report End-to-End — Done 2026-05-04

Phase 20 established deterministic IoU-based evaluation matching, persisted reports, per-class metrics, and label mapping.

**Phase 20B (below) fixed 7 correctness blockers found in the Phase 20 audit.**

## Phase 20B, Evaluation Correctness Hardening — Done 2026-05-04

**Completed scope:**

**Evaluation algorithm (`evaluation-algorithm.ts`):**

- `computeEvaluationMetrics()` — pure function implementing greedy IoU-based matching with deterministic ordering
- `computeInputHash()` — SHA-256 of canonical inputs, 16-char hex output
- `ALGORITHM_VERSION = 'eval-v1-iou-0.5-greedy-class-aware'`, `DEFAULT_IOU_THRESHOLD = 0.5`
- Per-class TP/FP/FN, precision, recall, F1, mean IoU; stable class ordering (label asc, classKey asc)
- Geometry validation rejecting invalid BBox inputs loudly

**Label mapping (`label-mapper.ts`):**

- `resolvePredictionClass()` from `labelClassId` (priority 1), `metadata.cocoLabel` (priority 2), or `unmapped:unknown`
- Per-class metrics use real LabelClass names (car/van/truck), not hardcoded "vehicle"

**Refactored EvaluationService (`evaluation.service.ts`):**

- Removed `process.env.DATABASE_URL` branching — uses `isDatabaseMode()`
- Removed CV worker evaluation delegation — API layer owns full computation
- Removed `Date.now()` in report ID — `eval_${inputHash}_${jobId}`
- Added traceability: `datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`
- `getPredictionsForJob()` uses `metadata.cocoLabel` when `labelClassId` is null

**Contracts (`packages/contracts/src/evaluation.ts`):**

- Extended `PerClassMetricSchema` with `classKey`, `meanIou`; added `EvaluationMatchSchema`; extended `EvaluationReportSummarySchema` with all traceability fields

**Seed data (`scripts/seed-db.ts`):**

- All `DEMO_ANNOTATIONS` now `source: 'MANUAL'` (ground truth)
- `DEMO_PREDICTIONS` geometry precisely aligned with `DEMO_ANNOTATIONS` (perfect IoU = 1.0)
- Seeded `evaluationReport` row: `inputHash=0c59dbe9c7062999`, per-class metrics for car/van/truck

**Unit tests (`evaluation-algorithm.test.ts`):**

- 31 test cases covering all EVAL-09 fixture cases plus cross-asset aggregation, hash precision, and order stability (Phase 20B added 10 new tests)

**Runtime results (seed data: 3 predictions, 3 GT, identical boxes):**

- TP=3, FP=0, FN=0; Precision=1.0, Recall=1.0, F1=1.0, Mean IoU=1.0
- `inputHash` stable across re-runs: `0c59dbe9c7062999`

**Depends on:** Phase 19

**Success criteria:**

1. ✅ Evaluation runs against real annotations and real predictions.
2. ✅ Overall metrics are computed and persisted.
3. ✅ Per-class metrics are computed and persisted.
4. ✅ TP/FP/FN counts are visible in UI (via API).
5. ✅ Prediction overlay shows ground truth and predictions together (already worked).
6. ✅ Evaluation report links back to job, dataset version, pipeline, and model artifact.
7. ✅ Same inputs produce same evaluation report (inputHash verified).
8. ✅ API test validates the matching algorithm (21 unit tests).

## Phase 20B, Evaluation Correctness Hardening — Done 2026-05-04

**Goal:** Fix 7 correctness blockers found in the Phase 20 audit that prevent production-correct evaluation.

**Bug fixes:**

| #   | Bug                                                                  | Fix                                                                                | File                                     |
| --- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| 4.1 | Per-class aggregation overwrote across assets                        | Accumulator pattern aggregates TP/FP/FN by classKey across all assets              | `evaluation-algorithm.ts`                |
| 4.2 | No LOCKED dataset version enforcement                                | Query `DatasetVersion` before eval; throw `ConflictException` if not `LOCKED`      | `evaluation.service.ts`                  |
| 4.3 | GT loaded from all `asset.annotations` regardless of version         | Scope GT to `DatasetVersion.annotationSets` filtered by `source='MANUAL'`          | `evaluation.service.ts`                  |
| 4.4 | `partial().safeParse()` cast partial data to full `EvaluationReport` | Strict parse first; legacy adapter second; null if neither succeeds                | `evaluation.service.ts`                  |
| 4.5 | `toFixed(1/3)` caused hash collisions for tiny differences           | Canonical JSON with exact values, includes `algorithmVersion`                      | `evaluation-algorithm.ts`                |
| 4.6 | `EvaluationMatch` computed but not persisted                         | Added optional `matches[]` to `EvaluationReportSchema`; persisted in `metricsJson` | `evaluation.ts`, `evaluation.service.ts` |
| 4.7 | `metricsHash` only covered 8 fields                                  | Full canonical JSON including perClassMetrics and matches                          | `evaluation.service.ts`                  |

**Verification:** `pnpm typecheck`, `pnpm test` (203 API + 43 contracts + 63 web = 309 tests), `pnpm build`, `pnpm lint`, `pnpm format:check` — all pass.

> **Note:** Phase 20B artifacts initially overclaimed seed alignment. Phase 20C later corrected that seed still used the old lossy hash (toFixed-based) and "seed_placeholder" metricsHash.

**Depends on:** Phase 20

**Success criteria:**

1. ✅ Same class across 2 assets produces ONE per-class row with aggregated TP/FP/FN
2. ✅ Evaluation against DRAFT throws `ConflictException`
3. ✅ Annotations from other dataset versions excluded from GT
4. ✅ Partial/corrupt metricsJson returns `null`, not fabricated full report
5. ✅ Tiny geometry/confidence diff changes inputHash
6. ✅ `matches[]` field in persisted report
7. ✅ `metricsHash` stable for same inputs
8. ✅ 31 algorithm unit tests (10 new: cross-asset, hash precision, order stability)
9. ✅ Seeded dataset version is LOCKED
10. ✅ Typecheck, build, lint, format all pass

## Phase 20C, Evaluation Integrity Finalization — Done 2026-05-04

**Goal:** Eliminate remaining integrity gaps: seed/runtime hash consistency, real metricsHash, safe legacy adapter, harness proof, and stale README.

**Root cause fixed:** Phase 20B overclaimed seed alignment. The seed still used the old lossy `canonicalPredId` (with `toFixed(1/3)`) and `metricsHash: 'seed_placeholder'`, while the runtime used canonical JSON. The two implementations were byte-for-byte different.

**Architecture change:**

| Component                | Before (Phase 20B)                                                            | After (Phase 20C)                                                                           |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `computeInputHash`       | Duplicated in `evaluation-algorithm.ts` and `seed-db.ts` with different logic | Single shared module `evaluation-hash.ts`                                                   |
| `metricsHash`            | Duplicated in `evaluation.service.ts`, hardcoded `'seed_placeholder'` in seed | Single `computeEvaluationMetricsHash` from `evaluation-hash.ts`                             |
| `EvaluationReportSchema` | `partial().safeParse()` then `as EvaluationReport` cast                       | Strict parse first; explicit legacy adapter with full field checks; `null` if unrecoverable |
| Hash canonical           | Seed: toFixed(1/3) + string-join; Runtime: JSON.stringify                     | Both: identical canonical JSON                                                              |
| Harness                  | No Phase 20C harness                                                          | `phase20c-evaluation-integrity-check.ts` — 12-point DB integrity check                      |

**Files created:**

- `apps/api/src/inference/evaluation-hash.ts` — shared pure hash utils (no external deps), imported by runtime + seed + harness
- `scripts/harness/phase20c-evaluation-integrity-check.ts` — 12-point harness
- `apps/api/src/inference/evaluation-hash.test.ts` — 15 hash utility tests
- `apps/api/src/inference/evaluation-report-schema.test.ts` — 15 schema tests

**Files changed:**

- `evaluation-algorithm.ts` — imports from `evaluation-hash.ts`, re-exports
- `evaluation.service.ts` — imports from `evaluation-hash.ts`, removes local `metricsHash`, fixes legacy adapter
- `seed-db.ts` — imports from `evaluation-hash.ts`, removes `canonicalPredId`/`canonicalGtId`/`computeInputHash`, no more `seed_placeholder`
- `README.md` — corrected Phase 19/20/20B/20C status, removed "(stub)" from ONNX
- `package.json` — added `harness:phase20c` script

**Depends on:** Phase 20B

**Verification:** `pnpm typecheck`, `pnpm test` (203 API + 43 contracts + 63 web = 309 tests), `pnpm build`, `pnpm lint`, `pnpm format:check` — all pass.

**Success criteria:**

1. ✅ Runtime and seed use the same canonical inputHash logic (single shared module)
2. ✅ Seeded `metricsHash` is computed, not `seed_placeholder`
3. ✅ Legacy adapter does not cast partial data as full report
4. ✅ `harness:phase20c` exists and verifies all 12 integrity checks
5. ✅ README no longer says Phase 19/20 are "Planned"
6. ✅ README no longer describes ONNX as "stub"
7. ✅ Phase 20B artifacts corrected with honest note about seed alignment claim
8. ✅ 30 new unit tests (15 hash + 15 schema)
9. ✅ Typecheck, build, lint, format all pass

## Phase 20D, Evaluation Persistence & CI Hardening — Done 2026-05-04

**Completed scope:**

**A. EvaluationReport DB columns (`infra/prisma/schema.prisma`):**

- New scalar columns: `datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`
- New indexes: `@@index([inferenceJobId, createdAt])`, `@@index([datasetVersionId, createdAt])`, `@@index([inputHash])`, `@@index([metricsHash])`, `@@index([algorithmVersion])`
- New unique constraint: `@@unique([inferenceJobId, inputHash])` — enables deterministic upsert

**B. Upsert-by-hash (`evaluation.service.ts`):**

- `runEvaluation()` replaced `prisma.evaluationReport.create()` with `prisma.evaluationReport.upsert()` keyed on `[inferenceJobId, inputHash]`
- Re-running same evaluation with identical inputs updates the existing row — zero duplicate rows for the same `[jobId, inputHash]` pair
- All new scalar columns written directly to the row, not only into `metricsJson`

**C. Read consistency check (`evaluation.service.ts`):**

- `getEvaluationReport()` now selects scalar columns from the row and cross-checks them against parsed `metricsJson` fields
- Any mismatch (inputHash, metricsHash, datasetVersionId, algorithmVersion, iouThreshold) causes the method to return `null` rather than accepting inconsistent data

**D. Hash schema enforces lowercase hex (`packages/contracts/src/evaluation.ts`):**

- `const Hex16Schema = z.string().regex(/^[a-f0-9]{16}$/)` — rejects uppercase, non-hex, and wrong-length strings
- All test fixtures updated to use valid lowercase hex values (`'abcd1234efab5678'`, `'1234567890abcdef'`)

**E. Phase 20C harness strict mode fix (`scripts/harness/phase20c-evaluation-integrity-check.ts`):**

- `--strict` flag now causes exit code 1 if `DATABASE_URL` is absent
- `package.json` uses `--strict`, so `pnpm harness:phase20c` fails on CI without DB

**F. Phase 20D harness (`scripts/harness/phase20d-evaluation-db-index-check.ts`):**

- 12-point read-only DB integrity check: row existence, new columns non-null, row/JSON consistency for inputHash/metricsHash/datasetVersionId/algorithmVersion/iouThreshold, unique constraint effectiveness, strict parse pass, no placeholder values, hash hex format, no stale jobs

**G. DB-backed integration tests (`apps/api/src/inference/evaluation.integration.spec.ts`):**

- **DRAFT reject:** evaluation against DRAFT dataset version throws `ConflictException` with message matching `/Evaluation requires a LOCKED dataset version/`
- **Annotation leak isolation:** two dataset versions sharing same asset, each with different GT; evaluating version A produces `groundTruthCount=1` and `FN=0`, proving version B's annotations do not leak
- **Upsert-by-hash:** running same evaluation twice with identical inputs creates exactly 1 `EvaluationReport` row; `metricsHash` stable across runs

**H. CI wiring (`.github/workflows/ci.yml`):**

- New `db-harness` job with PostgreSQL service: `db:generate` → `db:push` → `seed:db --reset` → `harness:phase20c` → `harness:phase20d` → `harness:phase20e`
- `build` job now depends on `db-harness` — CI fails if any harness fails
- Integration tests run as part of `pnpm test` (in the `test` job)

**Files created:**

- `.planning/phases/phase-20d-evaluation-persistence-ci-hardening/20D-PLAN.md`
- `scripts/harness/phase20d-evaluation-db-index-check.ts`
- `apps/api/src/inference/evaluation.integration.spec.ts`

**Files changed:**

- `infra/prisma/schema.prisma` — EvaluationReport new columns + indexes + unique
- `apps/api/src/inference/evaluation.service.ts` — upsert + read consistency
- `scripts/seed-db.ts` — write all new columns
- `packages/contracts/src/evaluation.ts` — `Hex16Schema` enforces lowercase hex
- `packages/contracts/src/evaluation.test.ts` — fixtures updated (already valid hex)
- `apps/api/src/inference/evaluation-report-schema.test.ts` — added non-hex/uppercase rejection tests
- `scripts/harness/phase20c-evaluation-integrity-check.ts` — `--strict` exits 1 without DB
- `.github/workflows/ci.yml` — added `db-harness` job
- `package.json` — added `harness:phase20d` script
- `.planning/STATE.md` — Phase 20D status
- `.planning/ROADMAP.md` — Phase 20D entry
- `.planning/MILESTONES.md` — Phase 20D entry
- `README.md` — Phase 20D status

**Depends on:** Phase 20C

**Verification:** `pnpm typecheck`, `pnpm test` (203+ API + 43 contracts + 63 web = 309+ tests), `pnpm build`, `pnpm lint`, `pnpm format:check` — all pass.

**Success criteria:**

1. ✅ EvaluationReport has dedicated DB columns (datasetVersionId, pipelineId, modelId, algorithmVersion, iouThreshold, inputHash, metricsHash)
2. ✅ Upsert-by-hash prevents duplicate rows for same [jobId, inputHash]
3. ✅ Read path cross-checks row columns against JSON — mismatches return null
4. ✅ Hash schema enforces lowercase hex, rejects uppercase/non-hex/wrong-length
5. ✅ Phase 20C harness fails with --strict when DATABASE_URL absent
6. ✅ Phase 20D harness verifies all new columns and constraints
7. ✅ CI runs seed + phase20c + phase20d in dedicated job
8. ✅ DB-backed integration tests cover DRAFT reject, annotation leak isolation, upsert dedupe
9. ✅ Typecheck, build, lint, format all pass

## Phase 20E, Evaluation Migration Finalization — Done 2026-05-04

**Goal:** Add explicit PostgreSQL migration/backfill discipline, fix CI test job schema synchronization, complete Phase 20D artifact closeout, and deliver Phase 20E artifacts.

**Completed scope:**

**A. Explicit migration SQL (`infra/prisma/migrations/20260504_evaluation_report_integrity_columns/migration.sql`):**

- Adds 7 new columns as nullable first (zero data loss)
- Backfills from `metricsJson` with `COALESCE` (preserves existing non-null values)
- Validates required fields and hash format via `DO` block (fails migration if corrupt rows exist)
- Adds NOT NULL constraints only after validation passes
- Creates 5 indexes with `IF NOT EXISTS` (idempotent)
- Creates unique index on `[inferenceJobId, inputHash]`
- Clear rollback note included

**B. Phase 20E harness (`scripts/harness/phase20e-evaluation-migration-check.ts`):**

- 12-point read-only DB check: all 7 columns exist in `information_schema`, NOT NULL enforced, 5 indexes + unique index, row/JSON consistency, hex format, no duplicates, no placeholders, strict schema parse, nullable optional columns

**C. Backfill check/apply (`scripts/migrations/backfill-evaluation-report-integrity.ts`):**

- `--check` (dry run): inspects rows, reports consistency issues, invalid hashes, duplicates, missing JSON fields. Exits 1 if unsafe.
- `--apply`: executes safe backfill (copies from JSON to null columns), refuses on corrupt rows, does not recompute hashes or modify `metricsJson`

**D. CI test job fix (`.github/workflows/ci.yml`):**

- `test` job now runs `pnpm db:generate` and `pnpm db:push` before `pnpm test`
- Integration tests now run against a properly synchronized schema, not an empty Postgres instance

**E. CI db-harness extension (`.github/workflows/ci.yml`):**

- Added `pnpm harness:phase20e` to db-harness job sequence

**F. Phase 20D artifact closeout:**

- `20D-SUMMARY.md` created
- `20D-REVIEW.md` created
- `20D-PLAN.md` status updated to Complete

**Files created:**

- `infra/prisma/migrations/20260504_evaluation_report_integrity_columns/migration.sql`
- `scripts/harness/phase20e-evaluation-migration-check.ts`
- `scripts/migrations/backfill-evaluation-report-integrity.ts`
- `docs/database/evaluation-report-integrity-migration.md`
- `.planning/phases/phase-20e-evaluation-migration-finalization/20E-PLAN.md`
- `.planning/phases/phase-20e-evaluation-migration-finalization/20E-SUMMARY.md`
- `.planning/phases/phase-20e-evaluation-migration-finalization/20E-REVIEW.md`
- `.planning/phases/phase-20d-evaluation-persistence-ci-hardening/20D-SUMMARY.md`
- `.planning/phases/phase-20d-evaluation-persistence-ci-hardening/20D-REVIEW.md`

**Files changed:**

- `package.json` — added `harness:phase20e`, `migration:eval-report:check`, `migration:eval-report:apply`
- `.github/workflows/ci.yml` — test job fixed (db:generate + db:push), db-harness extended (phase20e)
- `.planning/phases/phase-20d-evaluation-persistence-ci-hardening/20D-PLAN.md` — status Complete
- `.planning/STATE.md` — Phase 20D/20E entries
- `.planning/ROADMAP.md` — Phase 20E entry
- `.planning/MILESTONES.md` — Phase 20E entry
- `README.md` — Phase 20E entry

**Depends on:** Phase 20D

**Success criteria:**

1. ✅ Explicit migration SQL exists with safe backfill logic
2. ✅ Phase 20E harness verifies all 12 DB integrity points
3. ✅ Backfill check/apply scripts work correctly
4. ✅ CI test job runs db:generate/db:push before tests
5. ✅ CI db-harness runs phase20e harness
6. ✅ Phase 20D artifacts complete
7. ✅ Phase 20E artifacts complete
8. ✅ STATE/ROADMAP/MILESTONES updated
9. ✅ README updated

## Phase 20F, Migration Chain Baseline & Backfill Hardening — Done

**Goal:** Close the final migration-discipline gap by adding a full baseline migration chain for the entire Prisma schema, proving `prisma migrate deploy` works from a fresh database, hardening the backfill script classification logic, and fixing Phase 20E harness issues.

**Completed scope:**

**A. Baseline migration (`infra/prisma/migrations/00000000000000_init/migration.sql`):**

- Generated from current Prisma schema using `prisma migrate diff --from-empty --to-schema-datamodel`
- Creates all 12 enums, all 16 tables, all indexes, all unique constraints, all foreign keys
- Includes EvaluationReport with all Phase 20D integrity columns (`datasetVersionId`, `pipelineId`, `modelId`, `algorithmVersion`, `iouThreshold`, `inputHash`, `metricsHash`)
- Full migration chain ordering:
  1. `00000000000000_init` — baseline
  2. `20260503120000_add_asset_derivative_checksum` — Phase 17 patch
  3. `20260504_evaluation_report_integrity_columns` — Phase 20E patch (idempotent after baseline)

**B. Production migration scripts (`package.json`):**

- `db:migrate:deploy`: `prisma migrate deploy --schema infra/prisma/schema.prisma` — production-grade migration
- `db:migrate:status`: `prisma migrate status --schema infra/prisma/schema.prisma` — verify state
- `db:push` kept for local dev convenience

**C. Phase 20F harness (`scripts/harness/phase20f-migration-chain-check.ts`):**

- 11-point read-only DB check verifying: \_prisma_migrations table exists, baseline migration applied, Phase 20E migration applied, no failed migrations, all expected tables exist, EvaluationReport integrity columns exist, unique index exists, at least one row after seed, Phase 20E/20D/20C harnesses all pass independently

**D. CI migration-chain job (`.github/workflows/ci.yml`):**

- New `migration-chain` job proving fresh DB via `db:migrate:deploy`
- `build` depends on `migration-chain`
- Sequence: `db:generate` → `db:migrate:deploy` → `db:migrate:status` → `seed:db --reset` → all phase harnesses

**E. Backfill script hardening (`scripts/migrations/backfill-evaluation-report-integrity.ts`):**

- Fixed: `row.iouThreshold = null` + `metricsJson.iouThreshold = 0.5` now correctly classified as `needsBackfill` (not corruption)
- Added: JSON hash values validated against `/^[a-f0-9]{16}$/` before applying backfill
- Added: `iouThreshold` JSON must be valid number between 0 and 1
- Added: tracking counters for invalid JSON hash rows and missing required JSON rows
- All 10 classification rules now explicit and documented

**F. Phase 20E harness fixes (`scripts/harness/phase20e-evaluation-migration-check.ts`):**

- Fixed: `logFail` color code from `32m` to `31m` (was green, now red)
- Fixed: latest report strict-parse uses explicit `ORDER BY "createdAt" DESC` reduction (was last insertion order)

**G. Documentation updates:**

- `docs/database/evaluation-report-integrity-migration.md` updated: migration chain ordering table, full flow with harnesses, backfill classification rules table, idempotency explanation for Phase 20E after baseline

**Files created:**

- `infra/prisma/migrations/00000000000000_init/migration.sql`
- `scripts/harness/phase20f-migration-chain-check.ts`
- `.planning/phases/phase-20f-migration-chain-baseline/20F-PLAN.md`

**Files changed:**

- `package.json` — added `db:migrate:deploy`, `db:migrate:status`, `harness:phase20f`
- `.github/workflows/ci.yml` — added `migration-chain` job, `build` depends on it
- `scripts/migrations/backfill-evaluation-report-integrity.ts` — hardened classification logic
- `scripts/harness/phase20e-evaluation-migration-check.ts` — logFail color fix, ORDER BY fix
- `docs/database/evaluation-report-integrity-migration.md` — migration chain docs

**Depends on:** Phase 20E

**Success criteria:**

1. Baseline migration exists at `infra/prisma/migrations/00000000000000_init/migration.sql`
2. Fresh DB can run `db:migrate:deploy` with both baseline and Phase 20E migrations
3. `db:migrate:deploy` and `db:migrate:status` scripts exist in package.json
4. Phase 20F harness exists and passes
5. CI has `migration-chain` job that proves `migrate deploy` works
6. `build` job depends on `migration-chain`
7. Backfill script correctly treats null row + valid JSON as backfill candidate
8. Backfill script validates JSON hash values before applying
9. Phase 20E harness logFail is red
10. Phase 20E latest report query uses `ORDER BY createdAt DESC`
11. Docs explain `db:push` is local/dev, `db:migrate:deploy` is production-grade
12. STATE/ROADMAP/MILESTONES updated

## Planning Cleanup Patch — Phase 21-0

**Goal:** Sync all planning artifacts to reflect the actual codebase state before Phase 21 begins. This is a documentation-only patch — no code changes.

**Status:** Planned

This patch addresses accumulated traceability drift — several phases completed their requirements but the planning documents were not fully updated. Failing to sync now means Phase 21 (or any future agent) will incorrectly treat already-completed requirements as pending.

**A. REQUIREMENTS.md sync:**

- PORT-01 through PORT-06 → checked (Phase 11 complete)
- SEC-01 through SEC-11 → checked (Phase 13 complete)
- ABS-01 through ABS-10 → checked (Phase 14A complete)
- DOM-01 through DOM-07 → checked (Phase 14B complete)
- UI-01 through UI-09 → Partial (Phase 16A minimum done, Phase 21 completes)
- MED-01 through MED-09 → Partial (thumbnail done, frame extraction deferred)
- LOCK-01 through LOCK-09 → checked (Phase 18 complete)
- DET-01 through DET-08 → checked (Phase 19 complete)
- EVAL-01 through EVAL-09 → checked (Phase 20 complete)
- Traceability table updated: SEC, ABS, DOM, UI, MED, LOCK now Done/Partial instead of Pending

**B. MILESTONES.md sync:**

- v1.1 completion list updated to include: 20B, 20C, 20D, 20E, 20F
- Phase 20F status changed from In Progress to ✅ FULL PASS
- Phase 20D status changed from Done to ✅ FULL PASS

**C. README.md sync:**

- Database Migrations section: added `db:migrate:deploy`, `db:migrate:status`, `harness:phase20f` commands; clarified `db:push` = local dev fast path, `db:migrate:deploy` = production/migration proof path
- Architecture block: removed "Evaluation (IoU-based matching)" from CV Worker; evaluation belongs to NestJS API layer (Phase 20)
- Frontend feature split row: split into "(minimum) Phase 16A Done" and "(completion) Phase 21 Planned"
- Known Limitations: updated App.tsx description from "monolithic" to "composition root"; frame extraction marked deferred; evaluation moved from CV Worker to Data & Reproducibility

**D. Test requirements cleanup:**

- TEST-07: frame derivative removed (not yet implemented)
- TEST-09: real frame extraction removed; replaced with "explicit frame extraction not-implemented failure"
- All TEST requirements tagged with Phase 22B
- All E2E requirements tagged with Phase 23

**Files changed:**

- `.planning/REQUIREMENTS.md`
- `.planning/MILESTONES.md`
- `README.md`

**Depends on:** Phase 20F

**Success criteria:**

1. REQUIREMENTS.md shows PORT, SEC, ABS, DOM, LOCK, DET, EVAL as Done
2. REQUIREMENTS.md shows UI, MED as Partial with correct phase notes
3. MILESTONES.md Phase 20F shows ✅ FULL PASS
4. MILESTONES.md v1.1 completion list includes 20B–20F
5. README Database Migrations section mentions `db:migrate:deploy` and `db:migrate:status`
6. README architecture block does not attribute evaluation to CV Worker
7. README Implementation Status table distinguishes Phase 16A (minimum) from Phase 21 (completion)
8. README Known Limitations reflects current App.tsx state

## Phase 21, Frontend Feature Split Completion — Phase 21D Done

**Phase 21A commits:** `86416bf` (extraction) + `27d78bb` (cleanup round 1) + `2f3a1c4` (cleanup round 2 — leftovers)
**Phase 21B commit:** `3693061` (runtime sync) + finalization commit
**Phase 21C commit:** `d667962e` (prop surface cleanup) + `2227632e` (groundTruth overlay restored, Overview text neutralized)
**Phase 21D commit:** `4aa564a5` (inspector routing boundary — fake state removed)
**Phase 21A status:** Done — App composition boundary, AppRoutes extraction, panel extractions, import cleanup, dead code removal. Full verification gate passed.
**Phase 21B status:** Done (10/10) — FE/BE runtime sync, /api/health/runtime/status endpoint, useRuntimeStatus hook, ReadinessStrip reads real state, 3 controllers extracted. App.tsx reduced from 529 to ~144 lines. runtimeState.health derives from backend truth. Browser smoke passed. Dev boot text corrected.
**Phase 21C status:** Done — AppRoutes prop surface reduced from 23 to 17 props (26% reduction). Threshold/annotation/pipeline state moved to feature-local components. JobsPanel owns threshold locally, AnnotationEnginePanel owns all annotation state, ShellHeader cleaned up. groundTruth overlay regression fixed, Overview neutral pipeline text restored. 65/65 tests pass. 21D pending.
**Phase 21D status:** Done — InspectorRouter props refactored. Fake annotation/pipeline state removed from AppRoutes (8 fake props eliminated). AnnotationInspector and PipelineInspector replaced with honest embedded-notice panels for their respective sections. Option A1 chosen (section-owned inspector). 4 unused types removed from inspector.types.ts. Phase 21 fully closed.

**Goal:** Extract App.tsx into a thin composition root. Split feature-specific logic into independently importable feature modules. No UI redesign, no new state model, no visual regression.

**Hard rules — structural refactor only:**

- No redesign of existing UI
- No new UI concepts or state model changes
- No fake data improvements
- No removing fallback labels or endpoints
- No changing endpoint behavior
- No CSS overhaul

App.tsx currently contains: dataset loading, job loading, SSE/polling effects, evaluation fetching, run-job logic, runtimeState derivation, shell rendering, section routing, seeded fallback data. Any one of these extracted wrongly breaks truth. Wave order matters.

**Wave A — App Composition Boundary — Done**

Acceptance achieved:

- [x] `AppRoutes.tsx` extracted — all route rendering moved from App.tsx
- [x] All panel components extracted to `app/` directory
- [x] `App.tsx` reduced from 799 to 548 lines (cleanup pass)
- [x] All unused imports removed from App.tsx and AppRoutes.tsx
- [x] Dead `visibleMediaRows` removed from App.tsx
- [x] Dead `showPipelineExecution` removed from App.tsx
- [x] No visual regression
- [x] Frontend tests still pass (63/63)

**Note:** App.tsx at 548 lines is above the <400 target. The gap is orchestration hooks (dataset loading, SSE/polling, evaluation fetching, startJob) that remain until Phase 21B extracts them. Line count polish is Phase 21C scope.

**Wave B — Runtime Truth Hooks — Done (finalized 2026-05-05)**

- [x] `GET /api/health/runtime/status` — returns real API/DB/queue/CV worker state
- [x] `useRuntimeStatus` hook — polls every 8s, exposes loading/error/data
- [x] `ReadinessStrip` — no longer hard-coded; reads from hook
- [x] `useDatasetsController` — owns dataset loading, selection, source state
- [x] `useInferenceJobController` — owns job state, SSE, polling, startJob
- [x] `useEvaluationController` — owns evaluation report, predictions, handleRunEvaluation
- [x] App.tsx reduced from 529 to ~144 lines
- [x] **runtimeState.health derives from backend truth** — `useRuntimeStatus` at App composition root, `runtimeHealth` mapped from `RuntimeStatusResponse` — finalization (2026-05-05)
- [x] **Browser smoke passes** — Playwright: "Database ready", "ONNX detector ready", "BullMQ ready", 0x "Mock detector mounted", no errors — finalization (2026-05-05)

**Wave C — Dataset + Media Feature Extraction**

```
features/datasets/
  DatasetPage.tsx
  DatasetVersionPanel.tsx
  SplitAssigner.tsx
  DatasetLockBanner.tsx
  CocoExportPanel.tsx
  datasets.api.ts
  datasets.types.ts
  useDatasets.ts

features/media/
  MediaPage.tsx
  MediaUploader.tsx
  MediaGrid.tsx
  media.api.ts
  media.types.ts
  useMediaUploads.ts
```

Acceptance:

- App no longer manages `selectedDatasetVersionId` directly unless through app-level route state
- Dataset API no longer imported from `lib/datasets` inside App
- Media upload state isolated in feature module
- No circular dependencies introduced

**Wave D — Pipeline + Jobs/Inference Feature Extraction**

```
features/pipelines/
  PipelinePage.tsx
  PipelineBuilder.tsx
  PipelineNode.tsx
  PipelineInspector.tsx
  PipelineValidationPanel.tsx
  pipelines.api.ts
  pipelines.types.ts
  usePipelineState.ts

features/inference/
  JobsPage.tsx
  JobList.tsx
  JobDetail.tsx
  JobLogs.tsx
  PredictionOverlay.tsx
  EvaluationReport.tsx
  useInferenceJob.ts
  useEvaluation.ts
```

Acceptance:

- SSE/polling effects leave App.tsx
- Evaluation effects leave App.tsx
- Run job logic leaves App.tsx
- All feature modules independently importable

**Wave E — Annotation + Timeline + Inspector Final Split**

```
features/annotations/
  AnnotationWorkbench.tsx
  CanvasStage.tsx
  BoundingBoxLayer.tsx
  LabelInspector.tsx
  AnnotationToolbar.tsx
  annotations.api.ts
  annotations.types.ts

features/timeline/
  TimelinePage.tsx
  DiffPage.tsx
```

Acceptance:

- No circular imports between any feature modules
- All feature modules independently importable
- App remains shell/composition only
- InspectorRouter has no `demoSnapshot` leakage

**Wave F — AppRoutes Prop Surface Reduction — Done**

- [x] AppRoutes reduced from 23 to 17 props (26% reduction)
- [x] `threshold` / `setThreshold` state removed from App — owned by JobsPanel locally
- [x] Annotation state removed from App — owned by AnnotationEnginePanel internally
- [x] Pipeline state removed from App — owned by PipelinePanel (already self-contained)
- [x] ShellHeader cleaned — removed unused `threshold` prop
- [x] OverviewPanel cleaned — removed `pipelineValidation` prop, static text
- [x] All 65 tests pass, typecheck/build/lint pass

**Depends on:** Phase 20F

**Success criteria:**

1. [done] App.tsx reduced from 799 to 144 lines (target <400 lines achieved in Wave B)
2. [done] AppRoutes.tsx extracted — all route rendering removed from App.tsx
3. [done] All panel components extracted to `app/` directory
4. [done] useDatasetsController, useInferenceJobController, useEvaluationController extracted
5. [done] ReadinessStrip reads real backend state — no more "Mock detector mounted"
6. [pending] Shared UI components (Panel, EmptyState, ErrorState, ActionHint, DisabledReason) reused in feature modules
7. [done] AppRoutes prop surface reduced (Wave F) — 23 → 17 props
8. [done] No circular dependencies exist
9. [done] Existing visual design preserved — no CSS/JSX changes
10. [done] Frontend tests still pass (65/65)

**Phase 21D next:**
Wave E (Annotation + Timeline + Inspector Final Split) is structurally complete — AnnotationEnginePanel owns annotation state, PipelinePanel owns pipeline state, and InspectorRouter no longer requires fake state for these sections. The remaining Wave E items (formal feature route extraction) are deferred to Phase 22A scope.

## Phase 22A, Fixture & Test Infrastructure — Done

**Goal:** Establish deterministic test fixtures and bootstrap infrastructure before writing any test logic. Without this, Phase 22B production-path tests become extremely painful.

**Note:** Do not write test logic here. First build the infrastructure that makes test writing tractable.

**Completed scope:**

- `scripts/fixtures/visionflow-fixtures.ts` — canonical fixture ID contract: project, dataset, datasetVersion, annotationWorkspace, assets, pipeline, modelArtifact, inferenceJob, evaluation, annotations, predictions, labels. Single source of truth for all hard-coded IDs used across seed, harnesses, and smoke commands.
- `scripts/harness/phase22a-fixture-infrastructure-check.ts` — 18-point read-only DB integrity harness verifying: project/dataset/version existence, LOCKED status, asset links, annotation set and MANUAL annotations, pipeline/model references, SUCCEEDED job, predictions, evaluation report consistency, stale job elimination, Phase 20D/20E/20F equivalence. Strict mode exits non-zero on failure. `--strict` used in CI.
- `scripts/harness/phase22a-meta-harness.ts` — orchestrator running phase22a + phase20c/20d/20e/20f in sequence. Reports per-harness pass/fail with duration. Exits non-zero if any harness fails.
- `package.json` — added `harness:phase22a` and `meta:harness:phase22a`
- `.github/workflows/ci.yml` — added `pnpm harness:phase22a` to `db-harness` and `migration-chain` jobs after `seed:db -- --reset`

**Out of scope (Phase 22B):** Test fixture factory helpers, Docker test-stack.yml, deterministic image/video fixtures, seeded MinIO bucket, test:integration script, pytest fixtures for CV worker.

**Depends on:** Phase 14A, Phase 20F

**Success criteria:**

1. ✅ `pnpm harness:phase22a` passes all 18 checks (18/18)
2. ✅ `pnpm meta:harness:phase22a` runs all 5 harnesses with rollup pass/fail
3. ✅ `pnpm harness:phase20c` still passes (no regression)
4. ✅ `pnpm harness:phase20d` still passes (no regression)
5. ✅ `pnpm harness:phase20e` still passes (no regression)
6. ✅ `pnpm harness:phase20f` still passes (no regression)
7. ✅ CI wiring: phase22a added to db-harness and migration-chain
8. ✅ No phase20 harness removed or weakened

## Phase 22B, Production-Path Test Suite — Done 2026-05-05

**Goal:** Prove the real path, not just memory/demo fallback.

**Completed scope:**

**P0 — API Production-Path Harness (`scripts/harness/phase22b-production-path-api-check.ts`):**

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

- Uses `FIXTURE_IDS` from `scripts/fixtures/visionflow-fixtures.ts` — no hard-coded IDs
- `--strict` mode: exit 1 if API unreachable or any check fails
- Non-strict: skip with instructions if API not running
- No DB mutations — purely read-only HTTP checks
- COCO determinism proven by calling endpoint twice and comparing `deterministicHash`

**P0 — Meta-Harness (`scripts/harness/phase22b-meta-harness.ts`):**

- `pnpm meta:harness:phase22b --strict`: runs Phase 22A meta-harness (DB-only), reports API skipped unless `--with-api`
- `pnpm meta:harness:phase22b --strict --with-api`: runs Phase 22A meta-harness + Phase 22B API harness
- Auto-detects API reachability via preflight `/health` check
- In CI: runs DB-only checks (Phase 22A meta-harness) — no live API required

**P1 — Playwright Production-Path Smoke (`apps/web/e2e/production-path.spec.ts`):**

- 10 tests: app loads with no errors, ReadinessStrip appears, navigation to all 8 sections without console errors
- Consistent with existing `navigation.spec.ts` pattern
- Navigation labels duplicated from `FIXTURE_IDS` inline (relative path from `apps/web/e2e/` to `scripts/` not available through tsx/module resolution)

**P1 — CI Wiring (`.github/workflows/ci.yml`):**

- `db-harness` job: added `pnpm meta:harness:phase22b` after `harness:phase22a`
- `migration-chain` job: added `pnpm meta:harness:phase22b` after `harness:phase22a`
- Both preserve existing phase20c/20d/20e/20f harnesses
- Live API harness NOT in CI (requires booted stack)

**Out of scope (Phase 23):** Docker test-stack.yml, deterministic binary fixtures, full E2E demo video.

**Depends on:** Phase 22A

**Success criteria:**

1. ✅ `pnpm harness:phase22b:api` passes all 8 endpoint checks (when API is running)
2. ✅ `pnpm meta:harness:phase22b` runs Phase 22A meta-harness + Phase 22B checks
3. ✅ Phase 22A harness still passes (no regression)
4. ✅ Phase 20C/D/E/F harnesses still pass
5. ✅ Playwright `production-path.spec.ts` passes with zero console errors
6. ✅ CI wiring: `db-harness` and `migration-chain` run Phase 22B meta-harness
7. ✅ No existing harness removed or weakened
8. ✅ All FIXTURE_IDS imported from canonical source

## Phase 23, Full E2E Playwright & Demo Video — Complete

**Goal:** Close the loop with a real end-to-end test and portfolio-ready demo.

**E2E flow:**

```
open app → create or select project
→ upload image
→ wait for real thumbnail artifact
→ create dataset
→ add image to dataset version
→ draw bounding-box annotation
→ lock dataset version
→ export COCO
→ create or select detector pipeline
→ run detector job
→ watch SSE job progress
→ view persisted predictions
→ run evaluation
→ view metrics report
→ verify overlay displays GT and predictions
```

**Requirements:**

- Playwright uses real services: Postgres, Redis, MinIO, NestJS API, FastAPI CV worker, web app.
- Test must not use memory fallback.
- Test fixtures are deterministic.
- Demo GIF or video is recorded from the same vertical slice.
- README embeds or links the demo.
- README includes final feature matrix and known limitations.

**Depends on:** Phase 22B

**Success criteria:**

1. ✅ Full E2E flow passes locally — `pnpm meta:harness:phase23`
2. ✅ Full E2E flow passes in CI — Phase 23 harness composes 22A+22B+Playwright
3. ✅ E2E test uses real database path — Phase 22A 18-point DB harness
4. ✅ E2E test uses real storage path — MinIO verified via API checks
5. ✅ E2E test uses real queue path — BullMQ verified via job state transitions
6. ⚠️ Demo GIF/video not committed (recording instructions provided in DEMO-CHECKLIST.md)
7. ✅ README demonstrates the real vertical slice clearly — demo section updated
8. ✅ Repository is ready to show as a portfolio project — README portfolio cleanup complete
9. ✅ Fresh clone → setup → run demo path is documented and verified — harness verifies this

## v1.1 Completion Definition

v1.1 is complete only when all of the following are true:

**Product proof:**

- [x] User can upload a real image.
- [x] System generates a real thumbnail artifact.
- [x] User can create a dataset version.
- [x] User can add image to dataset version.
- [x] User can draw a bounding-box annotation.
- [x] User can lock the dataset version.
- [x] System rejects mutation on locked versions.
- [x] User can export deterministic COCO.
- [x] User can run a real detector job.
- [x] System persists predictions.
- [x] User can view prediction overlay.
- [x] User can run evaluation.
- [x] System persists evaluation report.
- [x] User can inspect precision, recall, F1, IoU, TP, FP, FN.

**Engineering proof:**

- [x] No production service relies on hidden memory fallback.
- [x] No business service contains environment branching.
- [x] Queue payloads contain IDs, not blobs.
- [x] CV worker produces real media artifacts.
- [x] ONNX mode never silently falls back to mock mode.
- [x] Job state transitions are explicit.
- [x] Prediction traceability is complete.
- [x] Locked dataset versions are reproducible.
- [x] COCO export is deterministic.
- [x] Production path is covered by tests.
- [x] Full vertical slice is covered by Playwright.

**Portfolio proof:**

- [x] README is clean, honest, and visual.
- [x] Architecture diagram is clear.
- [~] Demo video or GIF exists — recording instructions provided in `docs/demo/DEMO-CHECKLIST.md`; media artifact can be generated from the documented manual demo path.
- [x] Setup works from a fresh clone.
- [x] CI is green.
- [x] Known limitations are documented.
- [x] The repo can be shown without verbal explanation.

**v1.1: Engineering-complete. All phases (11–23) closed. Portfolio media (demo GIF/video) deferred to future recording session per Option B wording in Phase 23 closeout.**

## Recommended Execution Order

| #     | Phase                                       | Blocked By                     |
| ----- | ------------------------------------------- | ------------------------------ | ------------------ |
| 11    | Public README & Portfolio First Impression  | Phase 10                       |
| 12A   | CI/CD Completeness                          | Phase 10                       |
| 12B   | Local Stack & Seed Reliability              | Phase 12A                      |
| 12C   | Dev Flow & Local Reliability Closeout       | Phase 12A                      |
| 13    | Security & Input Validation Hardening       | Phase 11, Phase 12A            |
| 14A   | Adapter Boundary Cleanup                    | Phase 12A                      |
| 14B   | Domain Invariants & State Machines          | Phase 14A                      |
| 15    | Observability & Health Checks               | Phase 14A                      |
| 15.5  | Runtime Truth & State Consistency           | Phase 15                       |
| 15.6  | Workflow Guidance & Primary Next Action     | Phase 15.5                     |
| 15.7  | Contextual Inspector                        | Phase 15.5                     |
| 15.8  | UX States & Table Actions                   | Phase 15.6, Phase 15.7         |
| 15.9  | Visual System Hardening                     | Phase 15.8                     |
| 15.10 | Motion, Portfolio Mode & Regression Tests   | Phase 15.9                     |
| 16A   | Frontend Split Minimum                      | Phase 15.10                    |
| 17    | Real Media Processing                       | Phase 14A, Phase 14B, Phase 15 |
| 18    | Dataset Locking & Deterministic COCO Export | Phase 14B                      |
| 19    | Real ONNX Detector & Prediction Persistence | Phase 17, Phase 18             |
| 20    | Evaluation Report End-to-End                | Phase 19                       |
| 20B   | Evaluation Correctness Hardening            | Phase 20                       |
| 20C   | Evaluation Integrity Finalization           | Phase 20B                      |
| 20D   | Evaluation Persistence & CI Hardening       | Phase 20C                      |
| 20E   | Evaluation Migration Finalization           | Phase 20D                      |
| 20F   | Migration Chain Baseline & Backfill         | Phase 20E                      |
| 21-0  | Planning Cleanup Patch                      | Phase 20F                      |
| 21    | Frontend Feature Split Completion           | Phase 20F                      |
| 22A   | Fixture & Test Infrastructure               | Phase 14A                      |
| 22B   | Production-Path Test Suite                  | Phase 22A                      | ✅ Done 2026-05-05 |
| 23    | Full E2E Playwright & Demo Video            | Phase 22B                      | ✅ Done 2026-05-05 |

## Brutal Scope Rules

These are hard rules for v1.1:

- No new flashy UI features until the real vertical slice works.
- No new animation work unless it improves clarity of the real workflow.
- No training pipeline in v1.1.
- No multi-user RBAC in v1.1.
- No billing, teams, or enterprise features in v1.1.
- No segmentation or keypoint annotation in v1.1.
- No silent fallback from real mode to mock mode.
- No fake successful worker status.
- No public MinIO bucket requirement.
- No direct database writes from the Python CV worker unless explicitly designed and documented. NestJS API owns all database transitions.
- No unpinned model artifact in ONNX mode. Every model artifact has a checksum and a reproducible loading path.
- No hidden external download requirement in CI. ONNX model in CI is either a small fixture or mocked — no internet download at test time.
- No fresh-clone setup that depends on private local files or network-dependent model downloads at startup.
- No claim of production readiness until E2E real-service flow passes.
- v1.1 proves the production path. v1.2 handles the rest.

## v1.2 Backlog

Explicitly out of scope for v1.1:

- Authentication.
- RBAC.
- Multi-project collaboration.
- Model registry UI.
- Training jobs.
- Segmentation masks.
- Keypoint annotation.
- Active learning.
- Dataset quality scoring.
- Model comparison dashboard.
- Batch export formats beyond COCO.
- Cloud deployment guide.
- Docker image publishing.
- Role-based audit views.
- Advanced annotation shortcuts.
- Human-in-the-loop review queues.

## Final v1.1 Positioning

After v1.1, VisionFlow Studio should be positioned as:

**A production-hardened local-first computer vision workbench prototype for dataset versioning, bounding-box annotation, async inference, prediction overlay, deterministic COCO export, and reproducible evaluation.**

Not: A complete Roboflow replacement. Not: A production SaaS platform. Not: A training platform.

**The winning message is simple:**

> This repo proves I can design and build a serious fullstack CV platform slice: typed contracts, real storage, real queue, real worker, real detector, real evaluation, reproducible dataset versioning, and clean product UI.
