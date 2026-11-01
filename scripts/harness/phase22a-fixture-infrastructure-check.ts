#!/usr/bin/env tsx
/**
 * scripts/harness/phase22a-fixture-infrastructure-check.ts
 *
 * Read-only DB integrity harness for Phase 22A Fixture & Test Infrastructure.
 *
 * Uses FIXTURE_IDS from scripts/fixtures/visionflow-fixtures.ts as the single
 * source of truth for all canonical fixture IDs. The harness verifies that the
 * deterministic seed produces the expected fixture baseline.
 *
 * DB integrity checks (18 total):
 *   1.  Project exists.
 *   2.  Dataset exists.
 *   3.  Dataset version exists and is LOCKED.
 *   4.  At least 3 assets linked to the version.
 *   5.  Annotation workspace target asset exists.
 *   6.  Annotation set exists.
 *   7.  At least one MANUAL ground-truth annotation exists on the workspace asset.
 *   8.  Pipeline exists.
 *   9.  Pipeline references the canonical ONNX model.
 *  10.  ONNX model artifact row exists.
 *  11.  SUCCEEDED inference job exists.
 *  12.  Predictions exist for the job.
 *  13.  Evaluation report exists with all traceability fields.
 *  14.  No stale QUEUED/RUNNING jobs remain after seed reset.
 *  15.  EvaluationReport row scalars match metricsJson.
 *  16.  Phase 20D harness equivalence: integrity columns non-null.
 *  17.  Phase 20E harness equivalence: all migration columns present.
 *  18.  Phase 20F harness equivalence: no stale/pending migrations.
 *
 * Preflight (always runs, not counted above):
 *   - --strict mode exits non-zero if DATABASE_URL is absent.
 *
 * Usage:
 *   npx tsx scripts/harness/phase22a-fixture-infrastructure-check.ts
 *   npx tsx scripts/harness/phase22a-fixture-infrastructure-check.ts --strict
 *   pnpm harness:phase22a
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { FIXTURE_IDS as F } from '../fixtures/visionflow-fixtures';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase22a-harness]';

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logPass(msg: string) {
  console.log(`\x1b[32m  PASS\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`\x1b[31m  FAIL\x1b[0m ${msg}`);
}

function logSkip(msg: string) {
  console.log(`\x1b[33m  SKIP\x1b[0m ${msg}`);
}

interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

async function main() {
  log('Starting Phase 22A Fixture Infrastructure check...');
  log(`Database: ${process.env.DATABASE_URL ? '(configured)' : '(NOT configured)'}`);

  const results: CheckResult[] = [];
  const strict = process.argv.includes('--strict');

  if (!process.env.DATABASE_URL) {
    if (strict) {
      logFail('DATABASE_URL not configured — STRICT mode requires database connection.');
      logFail('Fix: set DATABASE_URL in .env or export DATABASE_URL=<connection_string>');
      process.exit(1);
    }
    logSkip('DATABASE_URL not configured — DB checks skipped.');
    log('For full Phase 22A verification:');
    log('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
    log('  2. Reset DB:    pnpm seed:db -- --reset');
    log('  3. Run harness: pnpm harness:phase22a');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    log('Connected to PostgreSQL');
    console.log('');

    // ── Check 1: Project exists ─────────────────────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, name FROM "Project" WHERE id = $1',
        F.project.id
      )) as Array<{ id: string; name: string }>;

      const passed = rows.length === 1 && rows[0].id === F.project.id;
      results.push({
        name: `Project ${F.project.id} exists`,
        passed,
        details: passed ? rows[0].name : 'NOT FOUND',
      });
      if (passed) logPass(`Project ${F.project.id} exists`);
      else logFail(`Project ${F.project.id} NOT FOUND`);
    }

    // ── Check 2: Dataset exists ──────────────────────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id FROM "Dataset" WHERE id = $1',
        F.dataset.id
      )) as Array<{ id: string }>;

      const passed = rows.length === 1;
      results.push({
        name: `Dataset ${F.dataset.id} exists`,
        passed,
        details: passed ? 'found' : 'NOT FOUND',
      });
      if (passed) logPass(`Dataset ${F.dataset.id} exists`);
      else logFail(`Dataset ${F.dataset.id} NOT FOUND`);
    }

    // ── Check 3: Dataset version exists and is LOCKED ───────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, status FROM "DatasetVersion" WHERE id = $1',
        F.datasetVersion.id
      )) as Array<{ id: string; status: string }>;

      const passed = rows.length === 1 && String(rows[0].status) === 'LOCKED';
      results.push({
        name: 'Dataset version exists and is LOCKED',
        passed,
        details: passed
          ? `id=${rows[0].id}, status=${rows[0].status}`
          : rows.length === 0
            ? 'NOT FOUND'
            : `status=${rows[0].status} (expected LOCKED)`,
      });
      if (passed) logPass(`Dataset version ${F.datasetVersion.id} is LOCKED`);
      else logFail(`Dataset version status: ${rows[0]?.status ?? 'NOT FOUND'}`);
    }

    // ── Check 4: At least 3 assets linked to the version ────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS cnt FROM "DatasetVersionAsset" WHERE "datasetVersionId" = $1',
        F.datasetVersion.id
      )) as Array<{ cnt: number }>;

      const passed = rows.length === 1 && rows[0].cnt >= 3;
      results.push({
        name: 'At least 3 assets linked to dataset version',
        passed,
        details: passed ? `${rows[0].cnt} assets linked` : `only ${rows[0]?.cnt ?? 0} linked`,
      });
      if (passed) logPass(`${rows[0].cnt} assets linked to dataset version`);
      else logFail(`${rows[0]?.cnt ?? 0} assets linked (expected >= 3)`);
    }

    // ── Check 5: Annotation workspace target asset exists ─────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, width, height FROM "MediaAsset" WHERE id = $1',
        F.annotationWorkspace.assetId
      )) as Array<{ id: string; width: number; height: number }>;

      const passed = rows.length === 1;
      results.push({
        name: 'Annotation workspace target asset exists',
        passed,
        details: passed
          ? `${rows[0].width}x${rows[0].height}`
          : `${F.annotationWorkspace.assetId} NOT FOUND`,
      });
      if (passed) logPass(`Annotation workspace asset ${F.annotationWorkspace.assetId} exists`);
      else logFail(`Asset ${F.annotationWorkspace.assetId} NOT FOUND`);
    }

    // ── Check 6: Annotation set exists ────────────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id FROM "AnnotationSet" WHERE id = $1',
        F.annotationWorkspace.annotationSetId
      )) as Array<{ id: string }>;

      const passed = rows.length === 1;
      results.push({
        name: 'Annotation set exists',
        passed,
        details: passed ? rows[0].id : `${F.annotationWorkspace.annotationSetId} NOT FOUND`,
      });
      if (passed) logPass('Annotation set exists');
      else logFail('Annotation set NOT FOUND');
    }

    // ── Check 7: At least one MANUAL annotation on workspace asset ────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, "labelClassId", source FROM "Annotation" WHERE "annotationSetId" = $1 AND "assetId" = $2 AND source::text = $3',
        F.annotationWorkspace.annotationSetId,
        F.annotationWorkspace.assetId,
        'MANUAL'
      )) as Array<{ id: string; labelClassId: string; source: string }>;

      const passed = rows.length >= 1;
      results.push({
        name: 'At least one MANUAL annotation on workspace asset',
        passed,
        details: passed ? `${rows.length} MANUAL annotation(s)` : 'NONE found',
      });
      if (passed)
        logPass(`${rows.length} MANUAL annotation(s) on ${F.annotationWorkspace.assetId}`);
      else logFail('No MANUAL annotations found');
    }

    // ── Check 8: Pipeline exists ────────────────────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, name, "definitionJson" FROM "Pipeline" WHERE id = $1',
        F.pipeline.id
      )) as Array<{
        id: string;
        name: string;
        definitionJson: Record<string, unknown>;
      }>;

      const passed = rows.length === 1;
      results.push({
        name: 'Pipeline exists',
        passed,
        details: passed ? rows[0].name : `${F.pipeline.id} NOT FOUND`,
      });
      if (passed) logPass(`Pipeline exists: ${rows[0].name}`);
      else logFail('Pipeline NOT FOUND');
    }

    // ── Check 9: Pipeline references canonical ONNX model ────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT "definitionJson" FROM "Pipeline" WHERE id = $1',
        F.pipeline.id
      )) as Array<{ definitionJson: Record<string, unknown> }>;

      let passed = false;
      let details = 'pipeline not found';
      if (rows.length === 1) {
        const def = rows[0].definitionJson;
        const nodes = (def?.nodes ?? []) as Array<{
          type: string;
          params: { modelId?: string };
        }>;
        const detectorNode = nodes.find((n) => n.type === 'yolo_onnx');
        if (detectorNode) {
          passed = detectorNode.params?.modelId === F.pipeline.modelId;
          details = passed
            ? `pipeline references ${F.pipeline.modelId}`
            : `pipeline references ${detectorNode.params?.modelId} (expected ${F.pipeline.modelId})`;
        } else {
          details = 'no yolo_onnx node found in pipeline';
        }
      }
      results.push({ name: `Pipeline references ${F.pipeline.modelId}`, passed, details });
      if (passed) logPass(`Pipeline correctly references ${F.pipeline.modelId}`);
      else logFail(details);
    }

    // ── Check 10: ONNX model artifact row exists ────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, name, runtime, "configJson" FROM "ModelArtifact" WHERE id = $1',
        F.modelArtifact.id
      )) as Array<{
        id: string;
        name: string;
        runtime: string;
        configJson: Record<string, unknown>;
      }>;

      const passed = rows.length === 1 && rows[0].runtime === 'ONNX';
      results.push({
        name: 'ONNX model artifact row exists',
        passed,
        details: passed
          ? `${rows[0].name} (${rows[0].runtime})`
          : `${F.modelArtifact.id} NOT FOUND or wrong runtime`,
      });
      if (passed)
        logPass(`Model artifact ${F.modelArtifact.id} exists (runtime=${rows[0].runtime})`);
      else logFail(`Model artifact ${F.modelArtifact.id} NOT FOUND or wrong runtime`);
    }

    // ── Check 11: SUCCEEDED inference job exists ───────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT id, status FROM "InferenceJob" WHERE id = $1 AND status::text = $2',
        F.inferenceJob.id,
        'SUCCEEDED'
      )) as Array<{ id: string; status: string }>;

      const passed = rows.length === 1;
      results.push({
        name: 'SUCCEEDED inference job exists',
        passed,
        details: passed ? rows[0].id : `${F.inferenceJob.id} NOT FOUND or not SUCCEEDED`,
      });
      if (passed) logPass(`Inference job ${F.inferenceJob.id} exists and is SUCCEEDED`);
      else logFail(`Inference job ${F.inferenceJob.id} NOT FOUND or not SUCCEEDED`);
    }

    // ── Check 12: Predictions exist for the job ────────────────────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int AS cnt FROM "Prediction" WHERE "inferenceJobId" = $1',
        F.inferenceJob.id
      )) as Array<{ cnt: number }>;

      const passed = rows.length === 1 && rows[0].cnt >= 3;
      results.push({
        name: 'At least 3 predictions exist for the job',
        passed,
        details: passed ? `${rows[0].cnt} predictions` : `${rows[0]?.cnt ?? 0} predictions`,
      });
      if (passed) logPass(`${rows[0].cnt} predictions exist for ${F.inferenceJob.id}`);
      else logFail(`${rows[0]?.cnt ?? 0} predictions (expected >= 3)`);
    }

    // ── Check 13: Evaluation report exists with traceability fields ─────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, "datasetVersionId", "pipelineId", "modelId",
         "algorithmVersion", "inputHash", "metricsHash"
         FROM "EvaluationReport"
         WHERE "inferenceJobId" = $1
         ORDER BY "createdAt" DESC LIMIT 1`,
        F.inferenceJob.id
      )) as Array<{
        id: string;
        datasetVersionId: string;
        pipelineId: string;
        modelId: string;
        algorithmVersion: string;
        inputHash: string;
        metricsHash: string;
      }>;

      const passed =
        rows.length === 1 &&
        rows[0].datasetVersionId !== null &&
        rows[0].algorithmVersion !== null &&
        rows[0].inputHash !== null &&
        rows[0].metricsHash !== null;
      results.push({
        name: 'Evaluation report exists with all traceability fields',
        passed,
        details: passed
          ? `inputHash=${rows[0].inputHash}, metricsHash=${rows[0].metricsHash}`
          : 'report NOT FOUND or missing traceability fields',
      });
      if (passed) logPass('Evaluation report exists with full traceability');
      else logFail('Evaluation report NOT FOUND or missing traceability fields');
    }

    // ── Check 14: No stale QUEUED/RUNNING jobs for demo project ────────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, status FROM "InferenceJob"
         WHERE "projectId" = $1 AND status::text IN ('QUEUED','RUNNING')`,
        F.project.id
      )) as Array<{ id: string; status: string }>;

      const passed = rows.length === 0;
      results.push({
        name: 'No stale QUEUED/RUNNING jobs for demo project',
        passed,
        details: passed
          ? 'none found'
          : `${rows.length} stale: ${rows.map((j) => j.id).join(', ')}`,
      });
      if (passed) logPass('No stale QUEUED/RUNNING jobs');
      else
        logFail(
          `${rows.length} stale job(s): ${rows.map((j) => `${j.id}(${j.status})`).join(', ')}`
        );
    }

    // ── Check 15: EvaluationReport row scalars match metricsJson ───────────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "inputHash", "metricsHash", "datasetVersionId",
         "algorithmVersion", "iouThreshold", "metricsJson"
         FROM "EvaluationReport"
         WHERE "inferenceJobId" = $1
         ORDER BY "createdAt" DESC LIMIT 1`,
        F.inferenceJob.id
      )) as Array<{
        inputHash: string;
        metricsHash: string;
        datasetVersionId: string;
        algorithmVersion: string;
        iouThreshold: number;
        metricsJson: Record<string, unknown>;
      }>;

      let passed = false;
      let details = 'report not found';
      if (rows.length === 1) {
        const r = rows[0];
        const mj = r.metricsJson ?? {};
        const mjInputHash = (mj['inputHash'] as string) ?? '';
        const mjMetricsHash = (mj['metricsHash'] as string) ?? '';
        const mjAlgo = (mj['algorithmVersion'] as string) ?? '';
        const mjIou = (mj['iouThreshold'] as number) ?? -1;

        passed =
          r.inputHash === mjInputHash &&
          r.metricsHash === mjMetricsHash &&
          r.datasetVersionId === F.datasetVersion.id &&
          r.algorithmVersion === mjAlgo &&
          Math.abs(r.iouThreshold - mjIou) < 0.001;

        details = passed
          ? 'row scalars match metricsJson'
          : `mismatch: row.inputHash=${r.inputHash} vs json.inputHash=${mjInputHash}, row.metricsHash=${r.metricsHash} vs json.metricsHash=${mjMetricsHash}`;
      }
      results.push({
        name: 'EvaluationReport row scalars match metricsJson',
        passed,
        details,
      });
      if (passed) logPass('Row scalars match metricsJson');
      else logFail(`Scalar/JSON mismatch: ${details}`);
    }

    // ── Check 16: Phase 20D harness equivalence: integrity columns non-null ────
    {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "datasetVersionId", "pipelineId", "modelId",
         "algorithmVersion", "iouThreshold", "inputHash", "metricsHash"
         FROM "EvaluationReport"
         WHERE "inferenceJobId" = $1 LIMIT 1`,
        F.inferenceJob.id
      )) as Array<{
        datasetVersionId: string | null;
        pipelineId: string | null;
        modelId: string | null;
        algorithmVersion: string | null;
        iouThreshold: number | null;
        inputHash: string | null;
        metricsHash: string | null;
      }>;

      const passed =
        rows.length === 1 &&
        rows[0].datasetVersionId !== null &&
        rows[0].algorithmVersion !== null &&
        rows[0].iouThreshold !== null &&
        rows[0].inputHash !== null &&
        rows[0].metricsHash !== null;
      results.push({
        name: 'Phase 20D harness equivalence: integrity columns non-null',
        passed,
        details: passed ? 'all required columns non-null' : 'some integrity columns are null',
      });
      if (passed) logPass('Phase 20D equivalence: all integrity columns non-null');
      else logFail('Phase 20D equivalence: some integrity columns are NULL');
    }

    // ── Check 17: Phase 20E harness equivalence: migration columns present ──────
    {
      const cols = (await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'EvaluationReport'
         AND column_name IN (
           'datasetVersionId', 'pipelineId', 'modelId',
           'algorithmVersion', 'iouThreshold', 'inputHash', 'metricsHash'
         )`
      )) as Array<{ column_name: string }>;

      const requiredCols = [
        'datasetVersionId',
        'pipelineId',
        'modelId',
        'algorithmVersion',
        'iouThreshold',
        'inputHash',
        'metricsHash',
      ];
      const foundCols = new Set(cols.map((c) => c.column_name));
      const missing = requiredCols.filter((c) => !foundCols.has(c));
      const passed = missing.length === 0;
      results.push({
        name: 'Phase 20E harness equivalence: all 7 migration columns present',
        passed,
        details: passed ? requiredCols.join(', ') : `missing: ${missing.join(', ')}`,
      });
      if (passed) logPass('Phase 20E equivalence: all 7 migration columns present');
      else logFail(`Phase 20E equivalence: missing columns: ${missing.join(', ')}`);
    }

    // ── Check 18: Phase 20F harness equivalence: migrations settled ───────────
    {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT migration_name, finished_at, rolled_back_at
         FROM _prisma_migrations
         WHERE finished_at IS NULL AND rolled_back_at IS NULL`
      )) as Array<{
        migration_name: string;
        finished_at: string | null;
        rolled_back_at: string | null;
      }>;

      const passed = rows.length === 0;
      results.push({
        name: 'Phase 20F harness equivalence: no stale/pending migrations',
        passed,
        details: passed
          ? 'all migrations settled'
          : `${rows.length} unsettled: ${rows.map((m) => m.migration_name).join(', ')}`,
      });
      if (passed) logPass('Phase 20F equivalence: no stale migrations');
      else logFail(`Phase 20F equivalence: ${rows.length} unsettled migration(s)`);
    }

    printResults(prisma, results);
  } catch (err) {
    log(`Error: ${err}`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function printResults(prisma: PrismaClient, results: CheckResult[]) {
  console.log('');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  log(`Results: ${passedCount} passed, ${failedCount} failed`);

  if (failedCount > 0) {
    console.log('');
    for (const r of results) {
      if (!r.passed) {
        logFail(`${r.name}: ${r.details}`);
      }
    }
    console.log('');
    log(`Phase 22A harness: ${failedCount} CHECKS FAILED`);
    await prisma.$disconnect();
    process.exit(1);
  }

  log(`Phase 22A harness: ALL ${passedCount} CHECKS PASSED`);
  await prisma.$disconnect();
  process.exit(0);
}

main();
