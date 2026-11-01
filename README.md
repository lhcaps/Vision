# VisionFlow Studio

[![CI](https://github.com/lhcaps/Vision/actions/workflows/ci.yml/badge.svg)](https://github.com/lhcaps/Vision/actions/workflows/ci.yml)

A fullstack computer vision platform for dataset versioning, annotation, visual pipeline construction, async inference orchestration, and model evaluation.

## Features

- **Media Ingestion** — Upload media with SHA-256 dedupe and MinIO storage
- **Dataset Versioning** — Immutable version snapshots with train/valid/test split summaries
- **Annotation Engine** — Bounding box annotations in image coordinates with live preview
- **Pipeline Builder** — React Flow pipeline graph with typed node/edge validation
- **Inference Orchestration** — BullMQ job queue with SSE progress streaming
- **CV Worker** — FastAPI with ONNX runtime support and YOLOv8n detector
- **Prediction Overlay** — Side-by-side GT vs. prediction bounding box comparison
- **Evaluation** — IoU-based precision, recall, F1 metrics per class, persisted reports with deterministic hash fingerprints
- **Timeline Replay** — Frame-by-frame BBox morph animation with playback controls
- **Dataset Diff** — Visual added/removed/changed annotation comparison

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lhcaps/Vision.git
cd Vision
pnpm install

# 2. Copy environment
cp .env.example .env

# 3. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 4. Generate Prisma client
pnpm db:generate

# 5. Start all apps (Unix/macOS)
pnpm dev:full

# Or on Windows:
pnpm dev:full:win

# Or start individually:
pnpm dev:web    # Web: http://localhost:5173
pnpm dev:api    # API:  http://localhost:3000
python -m uvicorn apps.cv-worker.src.main:app --reload --port 8000 --host 127.0.0.1
```

## Demo

**Automated demo walkthrough** — follow the step-by-step recording instructions in [docs/demo/README-DEMO.md](docs/demo/README-DEMO.md) and the manual checklist at [docs/demo/DEMO-CHECKLIST.md](docs/demo/DEMO-CHECKLIST.md).

The full vertical-slice proof is automated via Playwright E2E tests (see [docs/demo/README-DEMO.md](docs/demo/README-DEMO.md)) and verified by the Phase 23 meta-harness:

```bash
pnpm meta:harness:phase23
```

To record a demo GIF or MP4, see the recording tips in [docs/demo/DEMO-CHECKLIST.md](docs/demo/DEMO-CHECKLIST.md).

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             VisionFlow Studio                                 │
├──────────────────────────────────────────────────────────────────────────────┤

  Browser (React)
       │
       │ HTTP / WebSocket
       ▼
  ┌─────────────┐           ┌──────────────────────────────────────────────────┐
  │   Web App   │◄──────────►│                   NestJS API                     │
  │  (Vite/5173)│   REST     │  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
  │             │            │  │  Media  │  │ Dataset  │  │    Job        │  │
  │  • Media   │            │  │ Module  │  │  Module  │  │   Module      │  │
  │  • Annotate│            │  └────┬────┘  └────┬─────┘  └───────┬───────┘  │
  │  • Pipeline│            │       │            │                │          │
  │  • Jobs    │            │  ┌────▼────────────▼────────────────▼────────┐ │
  │  • Timeline│            │  │              Repository Layer              │ │
  │             │            │  │   Prisma (production)   Memory (demo)     │ │
  └─────────────┘            │  └─────────────────────┬────────────────────┘ │
                             │                        │                        │
                             │  ┌─────────────────────┴────────────────────┐ │
                             │  │          BullMQ / Redis (job queue)     │ │
                             │  │          MinIO (object storage)         │ │
                             │  └───────────────────────────────────────────┘ │
                             └──────────────────────────────────────────────────┘
                                          │
                           ┌──────────────▼──────────────────────────────────┐
                           │              FastAPI CV Worker                   │
                           │  ┌─────────────────┐  ┌─────────────────────┐  │
                           │  │  Thumbnail Gen  │  │  Frame Extraction   │  │
                           │  │    (Pillow)     │  │ (OpenCV/deferred) │  │
                           │  └─────────────────┘  └─────────────────────┘  │
                           │  ┌────────────────────────────────────────────┐ │
                           │  │      ONNX Runtime (detector)               │ │
                           │  │      NMS + confidence threshold            │ │
                           │  └────────────────────────────────────────────┘ │
                           └──────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                           Infrastructure                                   │
  │  ┌────────────┐   ┌────────────┐   ┌────────────────────────────────┐  │
  │  │ PostgreSQL │   │   Redis   │   │            MinIO                │  │
  │  │  (state)  │   │  (queue)  │   │  (originals / derivatives /       │  │
  │  │  :5432    │   │  :6379   │   │   predictions / artifacts) :9000  │  │
  │  └────────────┘   └────────────┘   └────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────────┘
```

**Data flow:** Browser → NestJS API (metadata + job dispatch) → Redis (job queue) → FastAPI CV Worker (processing) → MinIO (artifacts) → PostgreSQL (predictions + evaluation reports)

**Evaluation** runs in the NestJS API layer (Phase 20) — IoU-based matching with greedy assignment, deterministic input/metrics hashing, per-class precision/recall/F1 metrics.

## Implementation Status

### Implemented (v1.0 — Phases 0–10)

| Feature                 | Status  | Notes                                                          |
| ----------------------- | ------- | -------------------------------------------------------------- |
| Monorepo structure      | ✅ Done | pnpm workspaces + Turborepo, 6 packages                        |
| Web workbench shell     | ✅ Done | React 19, 8 nav sections, responsive (1920/900/390px)          |
| Media ingestion         | ✅ Done | MinIO storage, SHA-256 dedupe, MIME validation, thumbnail jobs |
| Dataset versioning      | ✅ Done | Immutable versions, train/valid/test splits, lock enforcement  |
| Bounding-box annotation | ✅ Done | Image-coordinate BBox, keyboard actions, save queue            |
| Pipeline builder        | ✅ Done | React Flow, typed node/edge validation, persistence            |
| Job orchestration       | ✅ Done | BullMQ queue, SSE progress streaming, state transitions        |
| CV worker scaffold      | ✅ Done | Mock detector, ONNX capability guard, evaluation endpoint      |
| Prediction overlay      | ✅ Done | GT vs prediction toggle, color-coded bounding boxes            |
| Evaluation metrics      | ✅ Done | IoU-based precision, recall, F1, per-class breakdown           |
| Timeline replay         | ✅ Done | BBox morph animation, dataset diff, pipeline execution flow    |
| CI/CD                   | ✅ Done | GitHub Actions, Vitest, Playwright E2E                         |
| Linting & formatting    | ✅ Done | ESLint 9 flat config, Prettier + Tailwind plugin               |
| One-command boot        | ✅ Done | Unix shell + Windows PowerShell scripts                        |

### v1.1 — Production Hardening & Real Vertical Slice (Complete)

| Feature                          | Status  | Target Phase                             |
| -------------------------------- | ------- | ---------------------------------------- |
| Professional README              | ✅ Done | Phase 11 (complete)                      |
| CI completeness                  | ✅ Done | Phase 12A                                |
| Local stack & seed               | ✅ Done | Phase 12B                                |
| Security hardening               | ✅ Done | Phase 13 (complete)                      |
| Adapter boundary cleanup         | ✅ Done | Phase 14A (complete)                     |
| Domain invariants                | ✅ Done | Phase 14B (complete)                     |
| Observability & health           | ✅ Done | Phase 15                                 |
| Frontend feature split (minimum) | ✅ Done | Phase 16A                                |
| Frontend split completion        | ✅ Done | Phase 21 (complete)                      |
| Real media processing            | ✅ Done | Phase 17                                 |
| Dataset lock & COCO export       | ✅ Done | Phase 18                                 |
| Real ONNX inference              | ✅ Done | Phase 19 (complete)                      |
| Evaluation E2E                   | ✅ Done | Phase 20 (complete)                      |
| Evaluation Correctness           | ✅ Done | Phase 20B (complete)                     |
| Evaluation Persistence           | ✅ Done | Phase 20D (complete)                     |
| Evaluation Migration             | ✅ Done | Phase 20E (complete)                     |
| Evaluation Migration Chain       | ✅ Done | Phase 20F (complete)                     |
| Frontend split completion        | ✅ Done | Phase 21 (complete)                      |
| Fixture & Test Infrastructure    | ✅ Done | Phase 22A (complete)                     |
| Production test suite            | ✅ Done | Phase 22B (complete)                     |
| Full E2E proof + demo docs       | ✅ Done | Phase 23 (complete, demo media deferred) |

### Out of Scope

| Feature                  | Reason                |
| ------------------------ | --------------------- |
| Authentication / RBAC    | Single-user workbench |
| Segmentation masks       | v1.x out of scope     |
| Model training           | v1.x out of scope     |
| Multi-user collaboration | v1.x out of scope     |
| Cloud deployment         | v1.x out of scope     |

## Tech Stack

| Layer     | Technology                                                                   |
| --------- | ---------------------------------------------------------------------------- |
| Web       | React 19, Vite, Tailwind, Framer Motion, Zustand, React Flow, Phosphor Icons |
| API       | NestJS, Prisma, BullMQ, MinIO, Zod                                           |
| CV Worker | FastAPI, Pydantic, ONNX Runtime (YOLOv8n)                                    |
| Storage   | PostgreSQL, Redis, MinIO                                                     |
| Types     | TypeScript, Zod                                                              |
| Tests     | Vitest, Playwright                                                           |

## Database Migrations

VisionFlow uses Prisma for database management.

```bash
# Generate Prisma client from schema (run after pulling changes)
pnpm db:generate

# Production/migration-proof path: apply migrations in order
pnpm db:migrate:deploy

# Check migration status (which migrations are applied, pending, or failed)
pnpm db:migrate:status

# Seed demo data (run after migrations)
pnpm seed:db -- --reset

# Run Phase 20F migration-chain harness
pnpm harness:phase20f

# Sync schema without migration history (local dev only — faster)
pnpm db:push

# Open Prisma Studio to browse and edit data
pnpm db:studio

# Check EvaluationReport integrity columns (dry run, no mutations)
pnpm migration:eval-report:check

# Apply backfill for EvaluationReport integrity columns
pnpm migration:eval-report:apply

# Run EvaluationReport migration verification harness
pnpm harness:phase20e
```

**When to use which:**

- **Local dev fast path:** `pnpm db:push` — skips migration history, good for rapid iteration.
- **Production/migration proof path:** `pnpm db:migrate:deploy` + `pnpm db:migrate:status` — applies migrations in order and verifies the chain works from scratch.
- **CI runs:** `db:migrate:deploy` → `db:migrate:status` → `seed:db --reset` → `harness:phase20f` to prove the full migration chain on a fresh database.

**In CI:** The GitHub Actions pipeline runs `pnpm db:generate` to validate the schema compiles correctly. Migration application happens at deployment time via `pnpm db:migrate:deploy`.

**Fresh start:** `docker compose up -d` → `pnpm db:generate` → `pnpm db:migrate:deploy` → `pnpm db:migrate:status` → `pnpm seed:db -- --reset` → `pnpm harness:phase20f`

## Development

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm dev:full`     | Start Docker + all apps (Unix)             |
| `pnpm dev:full:win` | Start Docker + all apps (Windows)          |
| `pnpm dev:web`      | Web only (http://localhost:5173)           |
| `pnpm dev:api`      | API only (http://localhost:3000)           |
| `pnpm build`        | Build all packages                         |
| `pnpm typecheck`    | Type-check all packages                    |
| `pnpm test`         | Run all tests                              |
| `pnpm verify`       | Type-check + test + build                  |
| `pnpm lint`         | Lint all files                             |
| `pnpm format`       | Format all files with Prettier             |
| `pnpm db:generate`  | Regenerate Prisma client                   |
| `pnpm seed`         | Validate demo data and print summary       |
| `pnpm seed --api`   | Create demo data via API (requires Docker) |
| `pnpm kill`         | Stop Docker containers                     |

## Health & Observability

VisionFlow provides comprehensive health check endpoints and structured logging for reliable operations and distributed tracing.

### Health Endpoints

VisionFlow API exposes health check endpoints for orchestrating platforms (Kubernetes, Docker Compose, load balancers).

#### Liveness Check

```bash
curl http://localhost:3000/api/health/live
```

Response (always HTTP 200):

```json
{
  "status": "ok",
  "timestamp": "2026-05-02T00:00:00.000Z",
  "uptimeSeconds": 3600
}
```

Use this for Kubernetes liveness probes and container restarts.

#### Deep Health Check

```bash
curl http://localhost:3000/api/health/deep
```

Response (HTTP 200 when all dependencies healthy, HTTP 503 when any dependency is down):

```json
{
  "status": "healthy",
  "timestamp": "2026-05-02T00:00:00.000Z",
  "uptimeSeconds": 3600,
  "version": "0.1.0",
  "dependencies": {
    "postgres": { "status": "up", "responseTimeMs": 2 },
    "redis": { "status": "up", "responseTimeMs": 1 },
    "minio": { "status": "up", "responseTimeMs": 15 },
    "cvWorker": { "status": "up", "responseTimeMs": 8, "details": { "version": "0.2.0" } }
  }
}
```

Use this for Kubernetes readiness probes, Docker Compose healthchecks, and load balancer registration.

### Distributed Tracing

All API requests are traced with a unique `x-request-id` header. The API echoes this back in the response:

```bash
curl -H "x-request-id: my-trace-123" http://localhost:3000/api/health/live
```

For inference jobs, use `x-correlation-id` to trace through the BullMQ queue to the CV worker:

```bash
curl -H "x-correlation-id: job-trace-456" \
     -X POST http://localhost:3000/api/inference/jobs \
     -H "Content-Type: application/json" \
     -d '{"datasetVersionId":"...","pipelineId":"..."}'
```

The CV worker echoes the `x-correlation-id` in its response headers.

### Structured Logging

The API uses [pino](https://getpino.io) for structured JSON logging. In development, logs are pretty-printed. In production, logs are JSON lines for log aggregation systems (Datadog, Loki, ELK, etc.).

**Log Levels:** Controlled by `LOG_LEVEL` environment variable (`debug`, `info`, `warn`, `error`).

**Log Format (production JSON):**

```json
{
  "level": 30,
  "time": 1717200000000,
  "pid": 1234,
  "hostname": "vision-api",
  "name": "inference-service",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "jobId": "job-123",
  "msg": "Inference job enqueued"
}
```

**Reading logs:**

- Development: Auto-pretty-printed to console with color
- Production: JSON lines — parse with `pino`, `jq`, or any log aggregator

**CV Worker Logging:** The FastAPI CV worker uses [loguru](https://loguru.readthedocs.io) for structured logging. All endpoints log: request received, processing started, processing completed/failed, and duration in milliseconds. Correlation IDs are propagated through all log entries.

## Security

VisionFlow Studio implements the following security controls for API endpoints and media uploads.

### Input Validation

All API requests pass through a global NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. Unknown fields in request payloads are rejected with HTTP 400.

### CORS Policy

CORS is configured via the `WEB_ORIGIN` environment variable. If not set, cross-origin requests are blocked. When set, only the specified origins are allowed:

```bash
# Single origin
WEB_ORIGIN=http://localhost:5173

# Multiple origins (comma-separated)
WEB_ORIGIN=http://localhost:5173,https://my-domain.com
```

### File Upload Restrictions

| Limit             | Value                               |
| ----------------- | ----------------------------------- |
| Maximum file size | 250 MB                              |
| Accepted types    | JPEG, PNG, WebP, MP4, MOV           |
| Validation        | MIME type + magic byte verification |
| Corruption check  | Image/video decode validation       |

Uploads exceeding the size limit return **HTTP 413 Payload Too Large**. Files whose magic bytes do not match the declared MIME type, or that fail decode validation, return **HTTP 400 Bad Request**.

### Asset Access

Assets are never served via direct MinIO URLs. Access is controlled through one of two mechanisms:

1. **Signed URLs** — When `SIGNED_URL_EXPIRY_SECONDS` is set, the API generates a time-limited MinIO presigned URL and redirects the client. The URL expires after the configured duration (default: 3600 seconds).

2. **API Proxy** — When `SIGNED_URL_EXPIRY_SECONDS` is not set, assets are streamed through the API as a controlled proxy. The API never exposes the MinIO endpoint to the client.

### Error Responses

All API error responses are structured consistently:

```json
{
  "statusCode": 400,
  "message": "Human-readable error description",
  "error": "Bad Request",
  "timestamp": "2026-05-01T10:00:00.000Z"
}
```

Internal details such as file paths, stack traces, SQL errors, and environment variables are never included in error responses.

### Security Notes

- **Authentication** — Not implemented in v1.x. This is a single-user local workbench.
- **Rate limiting** — Planned for a future phase.
- **CSRF protection** — Not applicable (no session-based auth).
- **Public exposure** — This platform is designed for local/private use. Do not expose the API publicly without adding authentication and rate limiting.

For vulnerability reports, open a GitHub issue.

## Testing

```bash
# Run all unit and integration tests
pnpm test

# Run with visual test runner
pnpm test:ui

# Run with coverage report
pnpm test:coverage

# Run end-to-end tests (requires playwright install)
pnpm test:e2e

# Run a single package's tests
pnpm --filter @visionflow/api test
pnpm --filter @visionflow/web test
pnpm --filter @visionflow/contracts test
pnpm --filter @visionflow/motion test
```

**Python tests (CV worker):**

```bash
cd apps/cv-worker
python -m pytest tests/ -v
```

**Meta-harness verification (requires running stack):**

```bash
# Reset and seed database
pnpm seed:db -- --reset

# Phase 22A: DB fixture infrastructure check
pnpm harness:phase22a

# Phase 22B: Production path API + meta-harness (strict mode)
pnpm meta:harness:phase22b -- --strict --with-api

# Phase 23: Full E2E Playwright + meta-harness (strict mode)
pnpm meta:harness:phase23

# Run production-path smoke tests only
pnpm --filter @visionflow/web test:e2e -- e2e/production-path.spec.ts --project=chromium

# Run full vertical-slice E2E tests only
pnpm --filter @visionflow/web test:e2e -- e2e/full-vertical-slice.spec.ts --project=chromium
```

**Current test coverage:**

- API: domain logic tests (Prisma + memory fallback paths)
- Web: API client tests, metric tone logic, diff engine
- Contracts: Zod schema validation tests
- Motion: Token and animation class tests
- CV Worker: pytest unit tests

## Environment Variables

| Variable                    | Default                               | Description                                                            |
| --------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`              | `postgresql://...@localhost:5432/...` | PostgreSQL connection string                                           |
| `REDIS_HOST`                | `localhost`                           | Redis host                                                             |
| `REDIS_PORT`                | `6379`                                | Redis port                                                             |
| `MINIO_ENDPOINT`            | `localhost`                           | MinIO endpoint                                                         |
| `MINIO_PORT`                | `9000`                                | MinIO port                                                             |
| `MINIO_ACCESS_KEY`          | `visionflow`                          | MinIO access key                                                       |
| `MINIO_SECRET_KEY`          | `visionflow-secret`                   | MinIO secret key                                                       |
| `MINIO_BUCKET`              | `visionflow-artifacts`                | MinIO bucket name                                                      |
| `API_PORT`                  | `3000`                                | API server port                                                        |
| `API_BASE_URL`              | `http://localhost:3000/api`           | Harness → API base URL (harnesses use this)                            |
| `CV_WORKER_URL`             | `http://localhost:8000`               | CV Worker URL                                                          |
| `CV_WORKER_DETECTOR_MODE`   | `mock`                                | Detector mode (`mock` or `onnx`)                                       |
| `VITE_API_BASE_URL`         | `http://localhost:3000`               | Web → API base URL (no `/api` suffix)                                  |
| `VITE_WEB_BASE_URL`         | `http://localhost:5173`               | Playwright baseURL (fallback; Playwright manages its own server in CI) |
| `WEB_ORIGIN`                | `http://localhost:5173`               | Allowed CORS origins (comma-separated)                                 |
| `SIGNED_URL_EXPIRY_SECONDS` | `3600`                                | Signed URL expiry (0 = use API proxy)                                  |
| `LOG_LEVEL`                 | `info`                                | Log level: debug, info, warn, error                                    |
| `HEALTH_CHECK_TIMEOUT_MS`   | `5000`                                | Timeout for health check dependency probes (ms)                        |

## Project Structure

```
Vision/
├── apps/
│   ├── api/          NestJS REST API + Swagger at /api/docs
│   ├── cv-worker/    FastAPI CV inference worker
│   └── web/          React 19 frontend
├── packages/
│   ├── contracts/    Zod schemas + TypeScript types
│   └── motion/       Framer Motion tokens + CSS classes
├── infra/
│   ├── docker-compose.yml   Docker infra config
│   └── prisma/      Prisma schema + migrations
├── scripts/
│   ├── start-dev.sh Unix/macOS full-stack boot
│   ├── start-dev.ps1 Windows full-stack boot
│   └── seed-demo.ts  Demo data validator
└── .github/
    └── workflows/    CI + E2E GitHub Actions
```

## Known Limitations

This is a prototype under active development (v1.1). The following limitations exist:

### Infrastructure

- **Redis required for live queue** — BullMQ needs Redis. In-memory fallback is used in demo mode.
- **PostgreSQL required for production** — Prisma path needs PostgreSQL. In-memory fallback is available for demo mode.
- **MinIO required for storage** — Media storage uses MinIO. Local filesystem fallback is available for demo mode.
- **Docker required** — Full stack needs Docker for infrastructure services.

### CV Worker

- **Real thumbnail extraction** — Implemented in Phase 17. Pillow thumbnail generation, MinIO read/write, BullMQ consumer, derivative persistence. Frame extraction deferred (returns explicit FAILED).
- **Real ONNX inference** — Implemented in Phase 19. YOLOv8n ONNX detector runs end-to-end with real predictions persisted. Mock detector available as fallback.

### Data & Reproducibility

- **Evaluation persistence** — Implemented in Phase 20D. NestJS API layer runs deterministic IoU-based evaluation (greedy matching, threshold 0.5). Reports persisted with full traceability (dedicated DB columns + JSON). Upsert-by-hash ensures exactly one report per unique [jobId, inputHash] pair. Canonical input hash and metrics hash validated at read time. Explicit Prisma migration SQL with safe backfill implemented in Phase 20E. Full baseline migration chain via `db:migrate:deploy` proven in Phase 20F.
- **COCO export** — Implemented in Phase 18. `GET /api/projects/:projectId/dataset-versions/:versionId/export/coco`. Dataset must be LOCKED. Export is deterministic (stable ordering, SHA-256 hash of canonical content).
- **Immutable version lock** — Implemented in Phase 18. Lock-readiness invariants enforced: at least one asset, no UNASSIGNED splits, all assets have dimensions, at least one BBox annotation. Locked versions reject annotation create/update/delete.
- **Evaluation reproducibility** — Deterministic IoU-based evaluation (NestJS API layer, Phase 20) with locked dataset versions. Canonical input hash and metrics hash ensure stable output across re-runs. Dedicated DB columns and upsert-by-hash ensure exactly one report per unique input. Migration chain proven via `db:migrate:deploy` (Phase 20F).

### Frontend

- **App.tsx is the composition root** — Phase 21 extracted routes and panels, but App.tsx remains the composition root. Further hook-level extraction is deferred to v1.2.
- **No authentication** — Single-user workbench. Auth/RBAC is out of scope for v1.
- **No real-time collaboration** — Annotations are single-user.

### Security

- **Authentication** — Not implemented in v1.x. This is a single-user local workbench.
- **Rate limiting** — Planned for a future phase.
- **CSRF protection** — Not applicable (no session-based auth).
- **Public exposure** — This platform is designed for local/private use. Do not expose the API publicly without adding authentication and rate limiting.

### Browser Support

- Tested on Chrome, Firefox, Safari (latest)
- Reduced-motion users receive static fallbacks for animations
- Responsive tested at 1920px, 900px, and 390px widths

For the full roadmap, see [.planning/ROADMAP.md](.planning/ROADMAP.md).

For the final v1.1 closeout status and future development direction, see [docs/PROJECT-CLOSEOUT.md](docs/PROJECT-CLOSEOUT.md).

## Contributing

1. Fork and clone the repository
2. Run `pnpm install` to set up all workspaces
3. Copy `.env.example` to `.env` and configure
4. Start infrastructure: `docker compose -f infra/docker-compose.yml up -d`
5. Generate Prisma client: `pnpm db:generate`
6. Sync schema: `pnpm db:push`
7. Run `pnpm verify` to check typecheck + test + build pass
8. Submit a pull request with your changes

## License

MIT
