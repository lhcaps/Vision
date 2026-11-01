#!/usr/bin/env tsx
/**
 * scripts/harness/phase22b-production-path-api-check.ts
 *
 * Read-only API production-path harness for Phase 22B.
 *
 * Proves that the live NestJS API surface works correctly against seeded
 * PostgreSQL fixtures. Uses FIXTURE_IDS from scripts/fixtures/visionflow-fixtures.ts
 * as the single source of truth for canonical fixture IDs.
 *
 * Endpoints checked (8 total):
 *   1.  GET /api/health                              — basic liveness
 *   2.  GET /api/health/runtime/status                — real runtime state
 *   3.  GET /api/projects/:projectId/datasets        — dataset list
 *   4.  GET /api/projects/:projectId/dataset-versions/:versionId/annotation-workspace?assetId=...
 *   5.  GET /api/projects/:projectId/dataset-versions/:versionId/export/coco
 *   6.  GET /api/projects/:projectId/inference-jobs
 *   7.  GET /api/projects/:projectId/inference-jobs/:jobId/predictions
 *   8.  GET /api/projects/:projectId/inference-jobs/:jobId/evaluation
 *
 * COCO determinism: endpoint called twice, hash must match.
 *
 * Usage:
 *   npx tsx scripts/harness/phase22b-production-path-api-check.ts
 *   npx tsx scripts/harness/phase22b-production-path-api-check.ts --strict
 *   pnpm harness:phase22b:api
 */

import { FIXTURE_IDS as F } from '../fixtures/visionflow-fixtures';

// Load .env for API_BASE_URL override
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase22b-api-harness]';

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logPass(msg: string) {
  console.log(`  \x1b[32mPASS\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`  \x1b[31mFAIL\x1b[0m ${msg}`);
}

function logSkip(msg: string) {
  console.log(`  \x1b[33mSKIP\x1b[0m ${msg}`);
}

function logInfo(msg: string) {
  console.log(`  \x1b[36mINFO\x1b[0m ${msg}`);
}

// ── API client ────────────────────────────────────────────────────────────────

// API_BASE_URL: harness scripts use /api-prefixed paths (e.g. /health, /projects/...).
// This differs from the frontend convention where paths include /api/ and BASE_URL is host-only.
// The harness therefore uses a dedicated API_BASE_URL env var (not VITE_API_BASE_URL).
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  // Allow the timer to be GC'd when aborted
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function apiGet<T = unknown>(
  path: string
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: createTimeoutSignal(10_000),
    });
    let data: T | undefined;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = (await res.json()) as T;
      } catch {
        /* ignore */
      }
    }
    return { ok: res.ok, status: res.status, data, error: undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: msg };
  }
}

// ── Check definitions ────────────────────────────────────────────────────────

async function checkHealth(results: CheckResult[]) {
  const r = await apiGet<{ ok: boolean; service: string; time?: string }>('/health');
  if (!r.ok) {
    results.push({ name: 'GET /api/health', passed: false, details: `HTTP ${r.status}` });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const d = r.data;
  const ok = d?.ok === true && d?.service === 'visionflow-api';
  results.push({
    name: 'GET /api/health',
    passed: ok,
    details: ok ? `${d?.service} at ${d?.time}` : JSON.stringify(d),
  });
  if (ok) logPass(`ok=${d.ok}, service=${d.service}`);
  else logFail(`Expected ok=true, service=visionflow-api — got: ${JSON.stringify(d)}`);
}

async function checkRuntimeStatus(results: CheckResult[]) {
  const r = await apiGet<{
    api: { ok: boolean; mode: string };
    database: { ok: boolean | null; status: string };
    queue: { ok: boolean | null; mode: string; status: string };
    cvWorker: { ok: boolean; configured: boolean; activeDetectorMode: string | null };
  }>('/health/runtime/status');
  if (!r.ok) {
    results.push({
      name: 'GET /api/health/runtime/status',
      passed: false,
      details: `HTTP ${r.status}`,
    });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const d = r.data!;
  const apiOk = d.api?.ok === true;
  const dbOk = d.database?.status === 'ready';
  const ok = apiOk && dbOk;
  results.push({
    name: 'GET /api/health/runtime/status',
    passed: ok,
    details: ok
      ? `api=${d.api.mode}, db=${d.database.status}, queue=${d.queue.status}`
      : JSON.stringify(d),
  });
  if (ok) logPass(`api=${d.api.mode}, db=${d.database.status}, queue=${d.queue.status}`);
  else logFail(JSON.stringify(d));
}

async function checkDatasetList(results: CheckResult[]) {
  const projectId = F.project.id;
  const r = await apiGet<{ datasets: Array<{ id: string; name: string; versionCount: number }> }>(
    `/projects/${projectId}/datasets`
  );
  if (!r.ok) {
    results.push({
      name: 'GET /api/projects/:projectId/datasets',
      passed: false,
      details: `HTTP ${r.status}`,
    });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const datasets = r.data?.datasets ?? [];
  const canonical = datasets.find((d) => d.id === F.dataset.id);
  const ok = canonical !== undefined;
  results.push({
    name: 'GET /api/projects/:projectId/datasets',
    passed: ok,
    details: ok
      ? `found dataset ${F.dataset.id}`
      : `canonical dataset NOT FOUND — got: ${JSON.stringify(datasets.map((d) => d.id))}`,
  });
  if (ok) logPass(`canonical dataset ${F.dataset.id} (${canonical.name}) found`);
  else
    logFail(
      `canonical dataset ${F.dataset.id} not in list: ${JSON.stringify(datasets.map((d) => d.id))}`
    );
}

async function checkAnnotationWorkspace(results: CheckResult[]) {
  const projectId = F.project.id;
  const versionId = F.datasetVersion.id;
  const assetId = F.annotationWorkspace.assetId;
  const url = `/projects/${projectId}/dataset-versions/${versionId}/annotation-workspace?assetId=${assetId}`;
  const r = await apiGet<{
    annotationSet: { id: string; source: string } | null;
    annotations: Array<{ id: string; source: string }>;
  }>(url);

  if (!r.ok) {
    results.push({
      name: 'GET /api/.../annotation-workspace',
      passed: false,
      details: `HTTP ${r.status}`,
    });
    logFail(`HTTP ${r.status}`);
    return;
  }

  const d = r.data!;
  const hasSet = d.annotationSet !== null;
  const manualAnnotations = (d.annotations ?? []).filter((a) => a.source === 'MANUAL');
  const ok = hasSet && manualAnnotations.length > 0;
  results.push({
    name: 'GET /api/.../annotation-workspace',
    passed: ok,
    details: ok
      ? `${manualAnnotations.length} MANUAL annotation(s) in set ${d.annotationSet?.id}`
      : `annotationSet=${d.annotationSet?.id ?? 'null'}, MANUAL annotations=${manualAnnotations.length}`,
  });
  if (ok) logPass(`${manualAnnotations.length} MANUAL annotation(s) in workspace`);
  else
    logFail(
      `annotationSet=${d.annotationSet?.id ?? 'null'}, MANUAL annotations=${manualAnnotations.length}`
    );
}

async function checkCocoExport(results: CheckResult[]) {
  const projectId = F.project.id;
  const versionId = F.datasetVersion.id;

  // Call twice to verify determinism
  const [r1, r2] = await Promise.all([
    apiGet<Record<string, unknown>>(
      `/projects/${projectId}/dataset-versions/${versionId}/export/coco`
    ),
    apiGet<Record<string, unknown>>(
      `/projects/${projectId}/dataset-versions/${versionId}/export/coco`
    ),
  ]);

  if (!r1.ok || !r2.ok) {
    const details = `call1=HTTP${r1.status}, call2=HTTP${r2.status}`;
    results.push({ name: 'GET /api/.../export/coco', passed: false, details });
    logFail(details);
    return;
  }

  const d1 = r1.data!;
  const d2 = r2.data!;

  // Validate structure
  const metadata = d1.metadata as Record<string, unknown> | undefined;
  const status = metadata?.status;
  const hash1 = metadata?.deterministicHash as string | undefined;
  const hash2 = (d2.metadata as Record<string, unknown>)?.deterministicHash as string | undefined;
  const images = d1.images as Array<unknown> | undefined;
  const categories = d1.categories as Array<unknown> | undefined;
  const annotations = d1.annotations as Array<unknown> | undefined;

  const hashStable = hash1 === hash2 && hash1 !== undefined && hash1.length > 0;
  const statusLocked = status === 'LOCKED';
  const hasImages = Array.isArray(images) && images.length >= 3;
  const hasCategories = Array.isArray(categories) && categories.length >= 3;
  const hasAnnotations = Array.isArray(annotations);
  const ok = hashStable && statusLocked && hasImages && hasCategories && hasAnnotations;

  results.push({
    name: 'GET /api/.../export/coco',
    passed: ok,
    details: ok
      ? `LOCKED, hash=${hash1}, images=${images!.length}, categories=${categories!.length}, annotations=${annotations!.length}`
      : `status=${status}, hash1=${hash1}, hash2=${hash2}, images=${images?.length}, categories=${categories?.length}`,
  });

  if (ok) logPass(`LOCKED, deterministic hash=${hash1}, stable across 2 calls`);
  else {
    logFail(`status=${status} (expected LOCKED)`);
    logFail(`hash1=${hash1}, hash2=${hash2} (expected equal and non-empty)`);
    logFail(
      `images=${images?.length} (expected >= 3), categories=${categories?.length} (expected >= 3)`
    );
  }
}

async function checkInferenceJobs(results: CheckResult[]) {
  const projectId = F.project.id;
  const r = await apiGet<{ jobs: Array<{ id: string; status: string }> }>(
    `/projects/${projectId}/inference-jobs`
  );
  if (!r.ok) {
    results.push({
      name: 'GET /api/.../inference-jobs',
      passed: false,
      details: `HTTP ${r.status}`,
    });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const jobs = r.data?.jobs ?? [];
  const canonical = jobs.find((j) => j.id === F.inferenceJob.id);
  const ok = canonical !== undefined;
  results.push({
    name: 'GET /api/.../inference-jobs',
    passed: ok,
    details: ok
      ? `canonical job ${F.inferenceJob.id} (${canonical!.status})`
      : `canonical job NOT FOUND — got: ${JSON.stringify(jobs.map((j) => j.id))}`,
  });
  if (ok) logPass(`canonical job ${F.inferenceJob.id} found with status=${canonical!.status}`);
  else logFail(`canonical job ${F.inferenceJob.id} not in list`);
}

async function checkPredictions(results: CheckResult[]) {
  const projectId = F.project.id;
  const jobId = F.inferenceJob.id;
  const r = await apiGet<{ predictions: Array<{ id: string }> }>(
    `/projects/${projectId}/inference-jobs/${jobId}/predictions`
  );
  if (!r.ok) {
    results.push({ name: 'GET /api/.../predictions', passed: false, details: `HTTP ${r.status}` });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const predictions = r.data?.predictions ?? [];
  const ok = predictions.length >= 3;
  results.push({
    name: 'GET /api/.../predictions',
    passed: ok,
    details: ok
      ? `${predictions.length} predictions`
      : `only ${predictions.length} predictions (expected >= 3)`,
  });
  if (ok) logPass(`${predictions.length} predictions found`);
  else logFail(`expected >= 3 predictions, got ${predictions.length}`);
}

async function checkEvaluationReport(results: CheckResult[]) {
  const projectId = F.project.id;
  const jobId = F.inferenceJob.id;
  const r = await apiGet<{
    report: { inputHash: string; metricsHash: string; jobId: string } | null;
  }>(`/projects/${projectId}/inference-jobs/${jobId}/evaluation`);
  if (!r.ok) {
    results.push({ name: 'GET /api/.../evaluation', passed: false, details: `HTTP ${r.status}` });
    logFail(`HTTP ${r.status}`);
    return;
  }
  const report = r.data?.report;
  const ok = report !== null && report !== undefined;
  const hashMatch = report?.inputHash === F.evaluation.inputHash;
  results.push({
    name: 'GET /api/.../evaluation',
    passed: ok && hashMatch,
    details: ok
      ? `inputHash=${report!.inputHash} (expected ${F.evaluation.inputHash})`
      : `report is null`,
  });
  if (ok && hashMatch) logPass(`inputHash=${report!.inputHash} matches FIXTURE_IDS`);
  else if (!ok) logFail(`report is null`);
  else logFail(`inputHash=${report!.inputHash} (expected ${F.evaluation.inputHash})`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('Starting Phase 22B Production-Path API check...');
  log(`API Base: ${API_BASE_URL}`);

  const results: CheckResult[] = [];
  const strict = process.argv.includes('--strict');

  // Preflight: try a quick health check
  const preflight = await apiGet('/health');
  if (!preflight.ok) {
    if (strict) {
      logFail(`API not reachable at ${API_BASE_URL} — STRICT mode requires live API.`);
      logFail(`HTTP status: ${preflight.status}, error: ${preflight.error ?? 'none'}`);
      logFail(`Start the stack first: pnpm dev:full:win`);
      process.exit(1);
    }
    logSkip(`API not reachable at ${API_BASE_URL} (HTTP ${preflight.status}).`);
    log('Run with --strict to fail instead of skip, or start the stack first.');
    log('For full Phase 22B verification:');
    log('  1. Start stack: pnpm dev:full:win');
    log('  2. Wait for API health: curl http://localhost:3000/api/health');
    log('  3. Run harness:  pnpm harness:phase22b:api');
    process.exit(0);
  }

  console.log('');
  logInfo(`API is live — running 8 production-path checks...`);
  console.log('');

  await checkHealth(results);
  await checkRuntimeStatus(results);
  await checkDatasetList(results);
  await checkAnnotationWorkspace(results);
  await checkCocoExport(results);
  await checkInferenceJobs(results);
  await checkPredictions(results);
  await checkEvaluationReport(results);

  printResults(results);
}

function printResults(results: CheckResult[]) {
  console.log('');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('');
    for (const r of results) {
      if (!r.passed) {
        logFail(`${r.name}: ${r.details}`);
      }
    }
    console.log('');
    log(`Phase 22B API harness: ${failed} CHECKS FAILED`);
    process.exit(1);
  }
  log(`Phase 22B API harness: ALL ${passed} CHECKS PASSED`);
  process.exit(0);
}

main();
