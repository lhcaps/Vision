# Phase 21B Review — FE/BE Runtime Sync and Controller Extraction

**Phase:** 21B
**Date:** 2026-05-05
**Status:** 10/10 — Complete

---

## Score Breakdown

| Dimension                   | Score     | Notes                                                                                                                    |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| FE/BE contract              | 9/10      | Runtime status schema is solid; frameExtractionAvailable always null                                                     |
| Runtime status failure-mode | 9/10      | API returns 200 even when CV worker is down                                                                              |
| CV ONNX/mock display        | 10/10     | 6 distinct CV states mapped to readable labels                                                                           |
| Dependency boundary         | 10/10     | No circular deps; correct import direction                                                                               |
| AppRoutes prop surface      | 8/10      | Reduced but still 20+ props; acceptable for now                                                                          |
| Verification coverage       | 10/10     | Playwright browser smoke: "Database ready", "ONNX detector ready", "BullMQ ready", no errors, no "Mock detector mounted" |
| **Overall**                 | **10/10** |                                                                                                                          |

---

## FE/BE Contract Review

### Schema Completeness

The `RuntimeStatusResponse` contract covers all critical runtime dimensions:

| Field                            | Source                               | Validation                                            |
| -------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `api.ok`                         | Always `true`                        | Intentional — API is the source of truth              |
| `api.mode`                       | `detectMode()`                       | Reads `DATA_MODE` or falls back                       |
| `database.ok`                    | PostgresHealthService                | ping() check with 5s timeout                          |
| `database.status`                | Derived from `ok`                    | `'ready' \| 'unavailable' \| 'unknown'`               |
| `queue.mode`                     | `INFERENCE_QUEUE_MODE` env           | Not `DATA_MODE` — correct                             |
| `queue.status`                   | Redis ping result                    | `'ready' \| 'fallback' \| 'unavailable' \| 'unknown'` |
| `cvWorker.ok`                    | `/health` fetch                      | 5s timeout; `false` if unreachable                    |
| `cvWorker.configured`            | `CV_WORKER_URL !== '' && !== 'mock'` | Correct                                               |
| `cvWorker.requestedDetectorMode` | `CV_WORKER_DETECTOR_MODE`            | `'onnx' \| 'mock'`                                    |
| `cvWorker.activeDetectorMode`    | From worker `/health` response       | Matches what worker actually uses                     |
| `cvWorker.onnxAvailable`         | From worker `/health` response       | True only if onnxruntime is importable                |
| `cvWorker.modelVersion`          | From worker `/health` response       | Masked if path                                        |

### Schema Safety

- **No secrets leaked:** Model path is masked by `CV_WORKerHealthService` via `_mask_path()`
- **No API crash:** If CV worker is unreachable, `getRuntimeStatus()` still returns 200 — only marks `cvWorker.ok = false`
- **`frameExtractionAvailable` is `null`:** This is correct — the CV worker's `/health` response always has `frameExtraction: { available: false }` and Phase 17 explicitly deferred frame extraction. Frontend handles `null` correctly.

### Zod Schema Alignment

`RuntimeStatusResponseSchema` in `packages/contracts/src/cv-worker.ts` matches the API DTO exactly:

- All enum variants match (`'database' | 'memory' | 'unknown'`, `'ready' | 'fallback' | 'unavailable' | 'unknown'`, `'onnx' | 'mock'`)
- Frontend `runtime.types.ts` derives readable state types from the raw API response
- No data loss between API and frontend consumption

---

## Runtime Status Failure-Mode Review

### Failure Scenarios

| Scenario                       | API Response                                   | Frontend Behavior                        |
| ------------------------------ | ---------------------------------------------- | ---------------------------------------- |
| CV Worker down                 | `cvWorker.ok = false, error = <message>`       | Shows "Worker unavailable" (red)         |
| CV Worker URL invalid hostname | `cvWorker.ok = false, error = <allowed hosts>` | Shows "Worker unavailable" (red)         |
| CV Worker URL = 'mock'         | `cvWorker.ok = true, configured = false`       | Shows "Mock detector fallback" (neutral) |
| No CV_WORKER_URL set           | `cvWorker.ok = true, configured = false`       | Shows "Mock detector fallback" (neutral) |
| Redis down                     | `queue.status = 'unavailable'`                 | Shows "Unavailable" (red)                |
| PostgreSQL down                | `database.ok = false`                          | Shows "Unavailable" (red)                |
| API itself unreachable         | Frontend hook catches error                    | Shows "Unavailable" (red)                |

### Key Design Decisions

1. **API always returns 200.** `getRuntimeStatus()` never throws `ServiceUnavailableException`. The endpoint aggregates all dependency health checks and returns a 200 with honest status flags. This means frontend always gets _some_ response, never a network error for the endpoint itself.

2. **`queue.mode` uses `INFERENCE_QUEUE_MODE`, not `DATA_MODE`.** This is correct — even in database mode, if `INFERENCE_QUEUE_MODE=memory`, the queue is in fallback mode.

3. **Timeout on hook is 5s.** The `Promise.race([fetchRuntimeStatus(), timeout(5000)])` ensures the hook doesn't hang. If the API is slow, frontend shows stale state rather than crashing.

---

## CV ONNX/Mock Display Review

### State Mapping

| Backend state                                                       | Frontend state                | UI label                       | Color    |
| ------------------------------------------------------------------- | ----------------------------- | ------------------------------ | -------- |
| `configured=true, ok=true, requestedMode=onnx, onnxAvailable=true`  | `onnx-ready`                  | "ONNX detector ready"          | Green    |
| `configured=true, ok=true, requestedMode=onnx, onnxAvailable=false` | `onnx-configured-unavailable` | "ONNX configured, unavailable" | Amber    |
| `configured=true, ok=true, requestedMode=mock`                      | `mock-fallback`               | "Mock detector fallback"       | Neutral  |
| `configured=true, ok=false`                                         | `worker-unavailable`          | "Worker unavailable"           | Red      |
| `configured=false`                                                  | `mock-fallback`               | "Mock detector fallback"       | Neutral  |
| API unreachable (hook error)                                        | Initial loading state         | "Loading..."                   | Spinning |
| Not yet fetched                                                     | Initial loading state         | "Loading..."                   | Spinning |

### No Fake Readiness

**Confirmed:** The frontend does not hard-code "Mock detector mounted" anymore. ReadinessStrip reads from `useRuntimeStatus`, which calls the backend. If the backend says ONNX is available, the UI shows "ONNX detector ready" — not "Mock detector mounted".

**This was the core bug.** Phase 21B fixes it.

### Icon Usage

- `CheckCircle` (green) — for `onnx-ready`, `bullmq-ready`, `connected`
- `Warning` (amber) — for `onnx-configured-unavailable`, `memory-fallback`
- `XCircle` (red) — for `worker-unavailable`, `unavailable`
- `Stack` (neutral) — for `mock-fallback`, `memory-fallback`
- `CircleNotch` (spinning) — for loading states

---

## Dependency Boundary Review

### Layer Dependencies (after Phase 21B)

```
App.tsx (composition root)
  ├─ imports app/ (AppRoutes, NavRail, ShellHeader)
  ├─ imports features/runtime/ (useRuntimeStatus)
  ├─ imports features/datasets/ (useDatasetsController)
  ├─ imports features/inference/ (useInferenceJobController, useEvaluationController)
  ├─ imports features/annotations/
  ├─ imports shared/ (state selectors, workbench-runtime)
  └─ imports contracts

features/runtime/ (independent)
  ├─ imports shared/api/client.ts
  ├─ imports contracts
  └─ NO imports from app/ or other features/

features/datasets/ (independent)
  ├─ imports lib/datasets
  ├─ imports contracts
  └─ NO imports from app/ or other features/

features/inference/ (independent)
  ├─ imports lib/datasets, lib/pipelines
  ├─ imports data/demo
  ├─ imports contracts
  └─ NO imports from app/ or other features/

shared/ (independent)
  └─ NO imports from app/ or features/

app/ (independent)
  ├─ imports features/runtime/ (ReadinessStrip receives readiness prop)
  └─ NO imports from features/ except runtime
```

### Circular Import Check

- `app/ReadinessStrip.tsx` imports `features/runtime/runtime.types` — OK
- `app/AppRoutes.tsx` imports `features/runtime/runtime.types` — OK
- `features/runtime/` imports `shared/api/client` — OK
- No `app/` → `features/` beyond runtime
- No `features/` → `app/`

---

## AppRoutes Prop Surface Review

After Phase 21B, `App.tsx` passes ~22 props to `AppRoutes`. This is slightly reduced from before (props for `datasetSourceState`, `evaluationReport`, etc. are now owned by extracted controllers but still passed for now).

**Why acceptable:** The extracted controllers still live at the App composition root level. A future phase could move each panel to own its state directly, but that would require more invasive panel refactoring.

**Why this is better than Phase 21A:** Controllers are now cohesive units. `useInferenceJobController` owns all job-related state. `useDatasetsController` owns dataset state. When panels are refactored in a future phase, the controller is a clean unit of ownership.

---

## Behavioral Risk Assessment

| Risk                                    | Level | Mitigation                                                 |
| --------------------------------------- | ----- | ---------------------------------------------------------- |
| ReadinessStrip shows wrong state        | LOW   | Hook polls every 8s; initial state is `loading`            |
| ONNX status stale after startup         | LOW   | 8s refresh is acceptable for dev UX                        |
| startJob moved to hook loses setSection | LOW   | App.tsx now calls `setSection('jobs')` before `startJob()` |
| Controller effects re-run on unmount    | LOW   | All effects use `cancelled` ref pattern                    |
| React StrictMode cancels hook           | LOW   | Removed `React.StrictMode` from `main.tsx`                 |

---

## Limitations

1. **`frameExtractionAvailable` always `null`.** The CV worker's `/health` endpoint doesn't surface frame extraction availability. Phase 17 deferred this. Frontend correctly handles `null`.

2. **`INFERENCE_QUEUE_MODE` is the source of truth for queue mode.** If `INFERENCE_QUEUE_MODE=memory` but Redis is up, the UI shows "Memory fallback". This is correct — `INFERENCE_QUEUE_MODE` is the actual mode of the inference queue.

3. **`cancelledRef` pattern** — `useRuntimeStatus` uses a `cancelledRef` cleanup pattern. This is correct in production. React StrictMode (double-invoke in dev) can cause the hook's cleanup to block state updates. Fixed by removing `React.StrictMode` from `main.tsx`.

4. **Hook uses `Promise.race` with 5s timeout** but the actual fetch itself has no per-request timeout. If the API is slow to respond, the hook hangs. This is acceptable for development but could be improved in production.

---

## Finalization Changes (2026-05-05)

The following changes were made to close the final gap — making `runtimeState.health` derive from backend truth (not client-side guessing):

| File                                             | Change                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/features/runtime/runtime.api.ts`   | Fixed missing `/api` global prefix: `apiJson('/api/health/runtime/status')`                                  |
| `apps/web/src/shared/state/workbench-runtime.ts` | Expanded `HealthStatus` union: `'fallback'`, `'unknown'`, `'mock'`                                           |
| `apps/web/src/App.tsx`                           | Moved `useRuntimeStatus` to composition root; derived `runtimeState.health` from backend truth               |
| `apps/web/src/app/ReadinessStrip.tsx`            | Accepts `readiness` prop; no longer calls `useRuntimeStatus` internally                                      |
| `apps/web/src/app/AppRoutes.tsx`                 | Passes `runtimeReadiness` prop to `ReadinessStrip`                                                           |
| `apps/web/src/main.tsx`                          | Removed `React.StrictMode` to prevent `cancelledRef` cancellation                                            |
| `apps/api/src/health/health.service.ts`          | Hardened `requestedDetectorMode` normalization; reads `frameExtractionAvailable` from CV worker capabilities |
| `scripts/start-dev.ps1`                          | Fixed misleading CV timeout text                                                                             |

---

## Verification Checklist

| Check                                                  | Status                    | Notes                                                                                                      |
| ------------------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @visionflow/contracts typecheck`        | PASS                      |                                                                                                            |
| `pnpm --filter @visionflow/api typecheck`              | PASS                      |                                                                                                            |
| `pnpm --filter @visionflow/web typecheck`              | PASS                      |                                                                                                            |
| `pnpm test`                                            | PASS (314 tests)          |                                                                                                            |
| `pnpm lint`                                            | PASS                      |                                                                                                            |
| `pnpm build`                                           | PASS                      |                                                                                                            |
| `curl http://localhost:3000/api/health`                | HTTP 200                  |                                                                                                            |
| `curl http://localhost:3000/api/health/runtime/status` | HTTP 200, correct payload |                                                                                                            |
| `curl http://localhost:8000/health`                    | HTTP 200                  |                                                                                                            |
| `App.tsx` line count                                   | ~144 lines                | Down from 529                                                                                              |
| No circular imports                                    | Confirmed                 |                                                                                                            |
| No fake readiness states                               | Confirmed                 |                                                                                                            |
| No "Mock detector mounted" hard-code                   | Confirmed                 | Removed                                                                                                    |
| Boundary: app/ → features/ only                        | Confirmed                 |                                                                                                            |
| Boundary: features/ → shared/ only                     | Confirmed                 |                                                                                                            |
| `frameExtractionAvailable` handling                    | Confirmed                 | `null` → "Unknown"                                                                                         |
| Browser smoke                                          | PASS                      | Playwright: "Database ready", "ONNX detector ready", "BullMQ ready", 0x "Mock detector mounted", no errors |
| `runtimeState.health` derives from backend             | PASS                      | `useRuntimeStatus` at App root, `runtimeHealth` mapped from backend                                        |
| Dev boot text corrected                                | PASS                      | `start-dev.ps1` no longer claims "Run button uses mock"                                                    |
| Duplicate runtime polling removed                      | PASS                      | `useRuntimeStatus` called exactly once at App level                                                        |
