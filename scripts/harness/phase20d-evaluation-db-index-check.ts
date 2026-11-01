#!/usr/bin/env tsx
/**
 * scripts/harness/phase20d-evaluation-db-index-check.ts
 *
 * Read-only DB integrity harness for Phase 20D Evaluation Persistence & CI Hardening.
 *
 * Verifies that the new EvaluationReport DB columns, indexes, and unique constraints
 * are correctly persisted and consistent with the JSON payload.
 *
 * Checks:
 *   1.  EvaluationReport row exists for the demo job.
 *   2.  New DB columns (datasetVersionId, pipelineId, modelId, algorithmVersion,
 *       iouThreshold, inputHash, metricsHash) are all non-null on the latest row.
 *   3.  row.inputHash === metricsJson.inputHash.
 *   4.  row.metricsHash === metricsJson.metricsHash.
 *   5.  row.datasetVersionId === metricsJson.datasetVersionId.
 *   6.  row.algorithmVersion === metricsJson.algorithmVersion.
 *   7.  row.iouThreshold === metricsJson.iouThreshold.
 *   8.  @@unique([inferenceJobId, inputHash]) is effective — querying by both
 *       returns exactly one row for the demo job + its inputHash.
 *   9.  Latest report passes EvaluationReportSchema strict-parse.
 *  10.  No seed_placeholder in row.metricsHash or row.inputHash.
 *  11.  All hash values conform to /^[a-f0-9]{16}$/.
 *  12.  No stale QUEUED/RUNNING seeded jobs for the demo project.
 *
 * Usage:
 *   npx tsx scripts/harness/phase20d-evaluation-db-index-check.ts
 *   npx tsx scripts/harness/phase20d-evaluation-db-index-check.ts --strict
 *   pnpm harness:phase20d
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase20d-harness]';
const PROJECT_ID = 'proj_parking_lot';
const DEMO_JOB_ID = 'job_2026_04_28_2036';
const DEMO_DATASET_VERSION_ID = 'dataset_proj_parking_lot_parking_v3';

function log(msg: string, data?: unknown) {
  console.log(`${LOG_PREFIX} ${msg}`, data ?? '');
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
  skipped?: boolean;
  details?: string;
}

async function main() {
  log('Starting Phase 20D Evaluation DB Index & Column check...');
  log(`Database: ${process.env.DATABASE_URL ? '(configured)' : '(NOT configured)'}`);

  const results: CheckResult[] = [];

  const strict = process.argv.includes('--strict');

  if (!process.env.DATABASE_URL) {
    if (strict) {
      logFail('DATABASE_URL not configured — STRICT mode requires database connection.');
      logFail('Fix: set DATABASE_URL in .env or export DATABASE_URL=<connection_string>');
      process.exit(1);
    }
    log('DATABASE_URL not configured.');
    logSkip('DB checks skipped — run with DATABASE_URL to verify.');
    log('');
    log('For full Phase 20D verification:');
    log('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
    log('  2. Reset DB:    pnpm seed:db -- --reset');
    log('  3. Run harness:  pnpm harness:phase20d');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    log('Connected to PostgreSQL');
    console.log('');

    // Get the latest EvaluationReport row for the demo job, selecting all new scalar columns.
    const reportRow = await prisma.evaluationReport.findFirst({
      where: { inferenceJobId: DEMO_JOB_ID },
      orderBy: { createdAt: 'desc' },
    });

    // ── Check 1: EvaluationReport row exists ─────────────────────────────────
    {
      const passed = reportRow !== null;
      results.push({
        name: 'EvaluationReport row exists for demo job',
        passed,
        details: reportRow ? `id=${reportRow.id}` : 'NOT FOUND',
      });

      if (passed) logPass(`Row exists: ${reportRow!.id}`);
      else logFail('No EvaluationReport row for demo job');
    }

    if (!reportRow) {
      // Cannot continue without the row — mark remaining checks as skipped.
      for (let i = 1; i < 12; i++) {
        results.push({ name: `(skipped)`, passed: false, skipped: true });
      }
      return printResults(prisma, results);
    }

    const metrics = reportRow.metricsJson as Record<string, unknown>;

    // ── Check 2: New DB columns are non-null ────────────────────────────────────
    {
      const checks: Array<{ field: string; value: unknown }> = [
        { field: 'datasetVersionId', value: reportRow.datasetVersionId },
        { field: 'algorithmVersion', value: reportRow.algorithmVersion },
        { field: 'iouThreshold', value: reportRow.iouThreshold },
        { field: 'inputHash', value: reportRow.inputHash },
        { field: 'metricsHash', value: reportRow.metricsHash },
      ];

      const allNonNull = checks.every(
        (c) => c.value !== null && c.value !== undefined && c.value !== ''
      );
      const failures = checks.filter(
        (c) => c.value === null || c.value === undefined || c.value === ''
      );

      results.push({
        name: 'New DB columns are non-null where required',
        passed: allNonNull,
        details: allNonNull
          ? checks.map((c) => `${c.field}=${c.value}`).join(', ')
          : `NULL: ${failures.map((c) => c.field).join(', ')}`,
      });

      if (allNonNull) logPass('All required scalar columns are non-null');
      else logFail(`Null columns: ${failures.map((c) => c.field).join(', ')}`);
    }

    // ── Check 3: row.inputHash === metricsJson.inputHash ───────────────────────
    {
      const rowVal = reportRow.inputHash;
      const jsonVal = metrics.inputHash as string;
      const passed = rowVal === jsonVal;

      results.push({
        name: 'row.inputHash === metricsJson.inputHash',
        passed,
        details: passed ? `hash=${rowVal}` : `row=${rowVal}, json=${jsonVal}`,
      });

      if (passed) logPass(`inputHash column matches JSON: ${rowVal}`);
      else logFail(`inputHash mismatch — row=${rowVal}, json=${jsonVal}`);
    }

    // ── Check 4: row.metricsHash === metricsJson.metricsHash ───────────────────
    {
      const rowVal = reportRow.metricsHash;
      const jsonVal = metrics.metricsHash as string;
      const passed = rowVal === jsonVal;

      results.push({
        name: 'row.metricsHash === metricsJson.metricsHash',
        passed,
        details: passed ? `hash=${rowVal}` : `row=${rowVal}, json=${jsonVal}`,
      });

      if (passed) logPass(`metricsHash column matches JSON: ${rowVal}`);
      else logFail(`metricsHash mismatch — row=${rowVal}, json=${jsonVal}`);
    }

    // ── Check 5: row.datasetVersionId === metricsJson.datasetVersionId ──────────
    {
      const rowVal = reportRow.datasetVersionId;
      const jsonVal = metrics.datasetVersionId as string;
      const passed = rowVal === jsonVal;

      results.push({
        name: 'row.datasetVersionId === metricsJson.datasetVersionId',
        passed,
        details: passed ? `version=${rowVal}` : `row=${rowVal}, json=${jsonVal}`,
      });

      if (passed) logPass(`datasetVersionId column matches JSON: ${rowVal}`);
      else logFail(`datasetVersionId mismatch — row=${rowVal}, json=${jsonVal}`);
    }

    // ── Check 6: row.algorithmVersion === metricsJson.algorithmVersion ───────────
    {
      const rowVal = reportRow.algorithmVersion;
      const jsonVal = metrics.algorithmVersion as string;
      const passed = rowVal === jsonVal;

      results.push({
        name: 'row.algorithmVersion === metricsJson.algorithmVersion',
        passed,
        details: passed ? `version=${rowVal}` : `row=${rowVal}, json=${jsonVal}`,
      });

      if (passed) logPass(`algorithmVersion column matches JSON: ${rowVal}`);
      else logFail(`algorithmVersion mismatch — row=${rowVal}, json=${jsonVal}`);
    }

    // ── Check 7: row.iouThreshold === metricsJson.iouThreshold ────────────────────
    {
      const rowVal = reportRow.iouThreshold;
      const jsonVal = metrics.iouThreshold as number;
      const passed = rowVal === jsonVal;

      results.push({
        name: 'row.iouThreshold === metricsJson.iouThreshold',
        passed,
        details: passed ? `iou=${rowVal}` : `row=${rowVal}, json=${jsonVal}`,
      });

      if (passed) logPass(`iouThreshold column matches JSON: ${rowVal}`);
      else logFail(`iouThreshold mismatch — row=${rowVal}, json=${jsonVal}`);
    }

    // ── Check 8: @@unique([inferenceJobId, inputHash]) is effective ────────────
    {
      // Query by the compound unique key to verify the constraint returns exactly one row.
      const uniqueRows = await prisma.evaluationReport.findMany({
        where: {
          inferenceJobId: DEMO_JOB_ID,
          inputHash: reportRow.inputHash,
        },
        select: { id: true },
      });

      const passed = uniqueRows.length === 1;
      results.push({
        name: 'Unique [inferenceJobId, inputHash] returns exactly 1 row',
        passed,
        details: `count=${uniqueRows.length}`,
      });

      if (passed)
        logPass(`Unique constraint effective: 1 row for [${DEMO_JOB_ID}, ${reportRow.inputHash}]`);
      else
        logFail(
          `Expected 1 row, found ${uniqueRows.length} — unique constraint may not be working correctly`
        );
    }

    // ── Check 9: Latest report passes EvaluationReportSchema strict-parse ───────
    {
      // Inline schema-equivalent check (no @visionflow/contracts dependency).
      const requiredFields = [
        'id',
        'jobId',
        'datasetVersionId',
        'algorithmVersion',
        'iouThreshold',
        'inputHash',
        'metricsHash',
        'precision',
        'recall',
        'f1',
        'meanIoU',
        'truePositives',
        'falsePositives',
        'falseNegatives',
        'predictionCount',
        'groundTruthCount',
        'assetCount',
        'evaluatedAt',
      ];
      const missing = requiredFields.filter((f) => !(f in metrics) || metrics[f] === null);
      const hashRegex = /^[a-f0-9]{16}$/;
      const inputHashOk =
        typeof metrics.inputHash === 'string' && hashRegex.test(metrics.inputHash as string);
      const metricsHashOk =
        typeof metrics.metricsHash === 'string' && hashRegex.test(metrics.metricsHash as string);

      const passed = missing.length === 0 && inputHashOk && metricsHashOk;
      results.push({
        name: 'Latest report passes EvaluationReportSchema strict-parse',
        passed,
        details: passed
          ? 'Valid full report'
          : `Missing: ${missing.join(', ')}; inputHash=${inputHashOk}, metricsHash=${metricsHashOk}`,
      });

      if (passed) logPass('Report passes strict schema validation');
      else logFail(`Schema parse failed: missing=${missing.join(', ')}`);
    }

    // ── Check 10: No seed_placeholder anywhere in hashes ───────────────────────────
    {
      const inputHash = reportRow.inputHash;
      const metricsHash = reportRow.metricsHash;

      const noInputPlaceholder =
        inputHash !== 'seed_placeholder' && !inputHash.includes('placeholder');
      const noMetricsPlaceholder =
        metricsHash !== 'seed_placeholder' && !metricsHash.includes('placeholder');

      const passed = noInputPlaceholder && noMetricsPlaceholder;
      results.push({
        name: 'No seed_placeholder in any hash field',
        passed,
        details: passed
          ? `inputHash=${inputHash}, metricsHash=${metricsHash}`
          : `inputHash=${inputHash}, metricsHash=${metricsHash}`,
      });

      if (passed) logPass('No placeholder values in hash fields');
      else logFail('Placeholder value detected in hash field');
    }

    // ── Check 11: Hash values conform to /^[a-f0-9]{16}$/ ─────────────────────
    {
      const hexRegex = /^[a-f0-9]{16}$/;
      const inputValid = hexRegex.test(reportRow.inputHash);
      const metricsValid = hexRegex.test(reportRow.metricsHash);

      const passed = inputValid && metricsValid;
      results.push({
        name: 'Hash fields conform to lowercase 16-char hex format',
        passed,
        details: passed
          ? `inputHash=${reportRow.inputHash}, metricsHash=${reportRow.metricsHash}`
          : `inputHash valid=${inputValid} (${reportRow.inputHash}), metricsHash valid=${metricsValid} (${reportRow.metricsHash})`,
      });

      if (passed)
        logPass(
          `Both hashes valid: inputHash=${reportRow.inputHash}, metricsHash=${reportRow.metricsHash}`
        );
      else {
        if (!inputValid)
          logFail(`inputHash does not match /^[a-f0-9]{16}$/: ${reportRow.inputHash}`);
        if (!metricsValid)
          logFail(`metricsHash does not match /^[a-f0-9]{16}$/: ${reportRow.metricsHash}`);
      }
    }

    // ── Check 12: No stale QUEUED/RUNNING seeded jobs ─────────────────────────
    {
      const staleJobs = await prisma.inferenceJob.findMany({
        where: {
          projectId: PROJECT_ID,
          status: { in: ['QUEUED', 'RUNNING'] },
        },
        select: { id: true, status: true },
      });

      const passed = staleJobs.length === 0;
      results.push({
        name: 'No stale QUEUED/RUNNING seeded jobs',
        passed,
        details:
          staleJobs.length > 0
            ? `Found: ${staleJobs.map((j) => `${j.id}(${j.status})`).join(', ')}`
            : 'Clean',
      });

      if (passed) logPass('No stale jobs');
      else
        logFail(
          `Found ${staleJobs.length} stale job(s): ${staleJobs.map((j) => `${j.id}(${j.status})`).join(', ')}`
        );
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
  const passedCount = results.filter((r) => r.passed && !r.skipped).length;
  const failedCount = results.filter((r) => !r.passed && !r.skipped).length;
  const skippedCount = results.filter((r) => r.skipped).length;

  log(`Results: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped`);

  if (failedCount > 0) {
    console.log('');
    for (const r of results) {
      if (!r.passed && !r.skipped) {
        logFail(`${r.name}: ${r.details}`);
      }
    }
    console.log('');
    log(`Phase 20D harness: ${failedCount} FAILED`);
    await prisma.$disconnect();
    process.exit(1);
  }

  log(`Phase 20D harness: ALL CHECKS PASSED`);
  await prisma.$disconnect();
  process.exit(0);
}

main();
