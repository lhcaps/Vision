# Phase 21B Plan — FE/BE Runtime Sync and Controller Extraction

## Goal

Synchronize frontend runtime readiness with real backend/CV worker state, remove stale hard-coded readiness labels, and extract App.tsx orchestration into controller hooks.

## Context

Phase 21A established the app composition boundary. `App.tsx` was reduced from 799 to 529 lines. It still owns dataset loading, inference job SSE/polling, evaluation fetch/run, runtimeState derivation, and startJob. ReadinessStrip still uses static/hard-coded readiness text ("Mock detector mounted"). The frontend reads nothing from the backend about actual runtime state.

## Scope

### 21B.1 — Backend Runtime Status Endpoint

**Goal:** Add `GET /api/health/runtime/status` returning real state of API, database, queue, and CV worker.

**Implementation:**

- Extend `HealthService` with `getRuntimeStatus()` method
- Add `RuntimeStatusResponseDto` and `RuntimeStatusResponseSchema` (Zod)
- Endpoint returns 200 even if CV worker is down (only marks `cvWorker.ok = false`)
- `cvWorker` section reflects `CV_WORKER_URL`, `CV_WORKER_DETECTOR_MODE`, and live `/health` capabilities from CV worker
- No secret leaking (model paths masked)

**Contract:**

```typescript
RuntimeStatusResponse = {
  api: { ok: boolean; mode: 'database' | 'memory' | 'unknown' };
  database: { ok: boolean | null; status: 'ready' | 'unavailable' | 'unknown' };
  queue: { ok: boolean | null; mode: 'bullmq' | 'memory' | 'unknown'; status: 'ready' | 'fallback' | 'unavailable' | 'unknown' };
  cvWorker: {
    ok: boolean; configured: boolean; url: string | null;
    requestedDetectorMode: 'onnx' | 'mock';
    activeDetectorMode: string | null;
    onnxAvailable: boolean | null;
    modelVersion: string | null; modelPath: string | null;
    frameExtractionAvailable: boolean | null; error: string | null;
  };
};
```

### 21B.2 — Frontend Runtime API + Hook

**Goal:** Replace client-side guessing with real backend data.

**Implementation:**

- Create `features/runtime/runtime.api.ts` — calls `/api/health/runtime/status`
- Create `features/runtime/runtime.types.ts` — derived state types (CvReadinessState, QueueReadinessState, etc.)
- Create `features/runtime/useRuntimeStatus.ts` — polls every 8s, exposes loading/error/data
- NEVER fake "ready" — if API fails, mark api unavailable; if CV fails, mark only CV unavailable

### 21B.3 — Replace Hard-coded ReadinessStrip + Extract Controllers

**Goal:** `ReadinessStrip` reflects real state. `App.tsx` shrinks.

**ReadinessStrip:**

- Replace hard-coded "Mock detector mounted" with real runtime data
- States: ONNX detector ready / ONNX configured unavailable / Mock fallback / Worker unavailable / Loading / Unknown
- Queue states: BullMQ ready / Memory fallback / Unavailable / Loading / Unknown
- API states: Connected (Database/In-memory) / Unavailable / Loading
- Database states: Ready / Unavailable / Unknown / Loading

**Controllers to extract from App.tsx:**

1. `useDatasetsController` — dataset versions loading, selected version state, source state
2. `useInferenceJobController` — job state, SSE effect, polling fallback, startJob
3. `useEvaluationController` — evaluation report, predictions, handleRunEvaluation

**App.tsx target:** Under 400 lines (was 529, now 144 after extraction).

### 21B.4 — Browser Smoke

**Checklist:**

- App loads at http://localhost:5173
- ReadinessStrip shows ONNX detector ready if env ONNX + worker healthy
- ReadinessStrip shows correct fallback states when services are down
- Run button eligibility still correct
- Navigation between sections works

## Verification

- [x] `pnpm --filter @visionflow/contracts typecheck` — pass
- [x] `pnpm --filter @visionflow/api typecheck` — pass
- [x] `pnpm --filter @visionflow/web typecheck` — pass
- [x] `pnpm test` — 314 tests pass
- [x] `pnpm lint` — pass
- [x] `pnpm build` — pass
- [x] `curl http://localhost:3000/api/health` — 200
- [x] `curl http://localhost:3000/api/health/runtime/status` — 200 with correct data
- [ ] Browser smoke: ReadinessStrip shows ONNX when configured
- [ ] Browser smoke: Run button eligibility
- [ ] Browser smoke: Navigation across sections

## Non-Goals

- No UI redesign
- No new state management library (Redux/Zustand/React Query)
- No algorithm changes
- No DB migration
- No breaking contract changes

## Files

### New (backend)

- `apps/api/src/health/dto/runtime-status-response.dto.ts`

### Modified (backend)

- `apps/api/src/health/health.service.ts` — added `getRuntimeStatus()`
- `apps/api/src/health/health.controller.ts` — added `/runtime/status` endpoint
- `packages/contracts/src/cv-worker.ts` — added RuntimeStatus schemas
- `packages/contracts/src/index.ts` — re-exported RuntimeStatus types

### New (frontend)

- `apps/web/src/features/runtime/runtime.api.ts`
- `apps/web/src/features/runtime/runtime.types.ts`
- `apps/web/src/features/runtime/useRuntimeStatus.ts`
- `apps/web/src/features/runtime/RuntimeReadinessStrip.tsx`
- `apps/web/src/features/datasets/useDatasetsController.ts`
- `apps/web/src/features/inference/useInferenceJobController.ts`
- `apps/web/src/features/inference/useEvaluationController.ts`

### Modified (frontend)

- `apps/web/src/app/ReadinessStrip.tsx` — uses `useRuntimeStatus` hook
- `apps/web/src/App.tsx` — uses extracted controllers
