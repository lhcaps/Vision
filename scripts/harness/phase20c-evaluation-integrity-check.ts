#!/usr/bin/env tsx
/**
 * scripts/harness/phase20c-evaluation-integrity-check.ts
 *
 * Read-only DB integrity harness for Phase 20C Evaluation Integrity Finalization.
 *
 * Verifies seed/runtime hash consistency and strict report validity:
 *   1. Demo dataset version exists and status is LOCKED.
 *   2. Demo inference job exists and status is SUCCEEDED.
 *   3. Demo predictions count = 3.
 *   4. Demo manual GT count scoped through DatasetVersion.annotationSets = 3.
 *   5. Latest EvaluationReport exists.
 *   6. EvaluationReportSchema strict-parse passes (report is NOT corrupt).
 *   7. report.inputHash matches recomputed canonical inputHash from DB predictions + scoped GT.
 *   8. report.metricsHash matches recomputed canonical metricsHash.
 *   9. report.metricsHash is NOT "seed_placeholder" (Phase 20C requirement).
 *  10. report.matches length = 3 (Phase 20B requirement).
 *  11. report.perClassMetrics: car/van/truck each with TP=1, FP=0, FN=0, meanIou=1.
 *  12. No stale QUEUED/RUNNING seeded inference job exists.
 *
 * Usage:
 *   npx tsx scripts/harness/phase20c-evaluation-integrity-check.ts
 *   npx tsx scripts/harness/phase20c-evaluation-integrity-check.ts --strict
 *   pnpm harness:phase20c
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

// Load shared hash utilities (pure TypeScript, no external deps).
// Relative import from apps/api source so tsx can resolve it without build.
import {
  computeEvaluationInputHash,
  computeEvaluationMetricsHash,
} from '../../apps/api/src/inference/evaluation-hash';

const LOG_PREFIX = '[phase20c-harness]';
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
  log('Starting Phase 20C Evaluation Integrity check...');
  log(`Database: ${process.env.DATABASE_URL ? '(configured)' : '(NOT configured)'}`);

  const results: CheckResult[] = [];

  // Check --strict flag first.
  const strict = process.argv.includes('--strict');

  if (!process.env.DATABASE_URL) {
    if (strict) {
      logFail('DATABASE_URL not configured — STRICT mode requires database connection.');
      logFail('Fix: set DATABASE_URL in .env or export DATABASE_URL=<connection_string>');
      process.exit(1);
    }
    log('DATABASE_URL not configured.');
    logSkip('DB integrity checks skipped — run with DATABASE_URL to verify.');
    log('');
    log('For full Phase 20C verification:');
    log('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
    log('  2. Reset DB:    pnpm seed:db -- --reset');
    log('  3. Run harness:  pnpm harness:phase20c');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    log('Connected to PostgreSQL');
    console.log('');

    // Check 1: Demo dataset version exists and status is LOCKED
    {
      const version = await prisma.datasetVersion.findUnique({
        where: { id: DEMO_DATASET_VERSION_ID },
        select: { id: true, status: true },
      });

      const passed = version?.status === 'LOCKED';
      results.push({
        name: 'Demo dataset version is LOCKED',
        passed: passed ?? false,
        details: version ? `id=${version.id}, status=${version.status}` : 'NOT FOUND',
      });

      if (passed) logPass(`Dataset version ${DEMO_DATASET_VERSION_ID} is LOCKED`);
      else logFail(`Dataset version status: ${version?.status ?? 'NOT FOUND'}`);
    }

    // Check 2: Demo job exists and status is SUCCEEDED
    {
      const job = await prisma.inferenceJob.findUnique({
        where: { id: DEMO_JOB_ID },
        select: { id: true, status: true, datasetVersionId: true },
      });

      const passed = job?.status === 'SUCCEEDED';
      results.push({
        name: 'Demo inference job is SUCCEEDED',
        passed: passed ?? false,
        details: job ? `id=${job.id}, status=${job.status}` : 'NOT FOUND',
      });

      if (passed) logPass(`Job ${DEMO_JOB_ID} is SUCCEEDED`);
      else logFail(`Job status: ${job?.status ?? 'NOT FOUND'}`);
    }

    // Check 3: Demo predictions count = 3
    {
      const predictions = await prisma.prediction.findMany({
        where: { inferenceJobId: DEMO_JOB_ID },
        select: { id: true },
      });

      const passed = predictions.length === 3;
      results.push({
        name: 'Demo predictions count = 3',
        passed,
        details: `count=${predictions.length}`,
      });

      if (passed) logPass(`${predictions.length} predictions found`);
      else logFail(`Expected 3 predictions, found ${predictions.length}`);
    }

    // Check 4: Demo manual GT count scoped through DatasetVersion.annotationSets = 3
    {
      const version = await prisma.datasetVersion.findUnique({
        where: { id: DEMO_DATASET_VERSION_ID },
        include: {
          annotationSets: {
            include: {
              annotations: {
                where: { source: 'MANUAL' },
                select: { id: true, assetId: true },
              },
            },
          },
        },
      });

      const versionAssetIds = new Set(
        (
          await prisma.datasetVersionAsset.findMany({
            where: { datasetVersionId: DEMO_DATASET_VERSION_ID },
            select: { assetId: true },
          })
        ).map((v) => v.assetId)
      );

      let gtCount = 0;
      if (version) {
        for (const annotationSet of version.annotationSets) {
          for (const ann of annotationSet.annotations) {
            if (versionAssetIds.has(ann.assetId)) {
              gtCount++;
            }
          }
        }
      }

      const passed = gtCount === 3;
      results.push({
        name: 'Demo GT annotations scoped through annotationSets = 3',
        passed,
        details: `count=${gtCount}`,
      });

      if (passed) logPass(`${gtCount} GT annotations found via annotationSets`);
      else logFail(`Expected 3 GT annotations via annotationSets, found ${gtCount}`);
    }

    // Check 5: Latest EvaluationReport exists
    {
      const report = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
        select: { id: true, metricsJson: true },
      });

      const passed = report !== null;
      results.push({
        name: 'EvaluationReport row exists',
        passed,
        details: report ? `id=${report.id}` : 'NOT FOUND',
      });

      if (passed) logPass(`EvaluationReport found: ${report!.id}`);
      else logFail('No EvaluationReport for demo job');
    }

    // Check 6: EvaluationReportSchema strict-parse passes
    if (results[4].passed) {
      const reportRow = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = reportRow!.metricsJson as Record<string, unknown>;

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
        typeof metrics.inputHash === 'string' && hashRegex.test(metrics.inputHash);
      const metricsHashOk =
        typeof metrics.metricsHash === 'string' && hashRegex.test(metrics.metricsHash);

      const passed = missing.length === 0 && inputHashOk && metricsHashOk;
      results.push({
        name: 'EvaluationReportSchema strict-parse passes',
        passed,
        details: passed
          ? 'Valid full report'
          : `Missing: ${missing.join(', ')}; inputHash=${inputHashOk}, metricsHash=${metricsHashOk}`,
      });

      if (passed) logPass('Report passes strict schema validation');
      else logFail(`Schema parse failed: missing=${missing.join(', ')}`);
    } else {
      results.push({
        name: 'EvaluationReportSchema strict-parse passes',
        passed: false,
        skipped: true,
      });
    }

    // Check 7: report.inputHash matches recomputed canonical inputHash
    if (results[4].passed) {
      const reportRow = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = reportRow!.metricsJson as Record<string, unknown>;

      // Recompute inputHash from DB predictions + scoped GT.
      const predictions = await prisma.prediction.findMany({
        where: { inferenceJobId: DEMO_JOB_ID },
        select: {
          id: true,
          assetId: true,
          labelClassId: true,
          geometryJson: true,
          confidence: true,
        },
      });

      const version = await prisma.datasetVersion.findUnique({
        where: { id: DEMO_DATASET_VERSION_ID },
        include: {
          annotationSets: {
            include: {
              annotations: {
                where: { source: 'MANUAL' },
                include: { labelClass: true },
              },
            },
          },
        },
      });

      const versionAssetIds = new Set(
        (
          await prisma.datasetVersionAsset.findMany({
            where: { datasetVersionId: DEMO_DATASET_VERSION_ID },
            select: { assetId: true },
          })
        ).map((v) => v.assetId)
      );

      const labelClasses = await prisma.labelClass.findMany({
        where: { projectId: PROJECT_ID },
        select: { id: true, name: true },
      });
      const labelClassMap = new Map(labelClasses.map((lc) => [lc.id, lc.name]));

      const predObjs = predictions.map((p) => {
        const geo = p.geometryJson as { x: number; y: number; width: number; height: number };
        const className = p.labelClassId
          ? (labelClassMap.get(p.labelClassId) ?? p.labelClassId)
          : 'unknown';
        return {
          id: p.id,
          assetId: p.assetId,
          classKey: className,
          label: className,
          geometry: geo,
          confidence: p.confidence,
        };
      });

      const gtObjs: Array<{
        id: string;
        assetId: string;
        classKey: string;
        label: string;
        geometry: { x: number; y: number; width: number; height: number };
      }> = [];

      if (version) {
        for (const annotationSet of version.annotationSets) {
          for (const ann of annotationSet.annotations) {
            if (!versionAssetIds.has(ann.assetId)) continue;
            const className = ann.labelClass?.name ?? ann.labelClassId;
            const geo = ann.geometryJson as { x: number; y: number; width: number; height: number };
            gtObjs.push({
              id: ann.id,
              assetId: ann.assetId,
              classKey: className,
              label: className,
              geometry: geo,
            });
          }
        }
      }

      const storedInputHash = metrics.inputHash as string;
      const recomputedHash = computeEvaluationInputHash(
        DEMO_JOB_ID,
        DEMO_DATASET_VERSION_ID,
        predObjs,
        gtObjs,
        0.5,
        'eval-v1-iou-0.5-greedy-class-aware'
      );

      const passed = storedInputHash === recomputedHash;
      results.push({
        name: 'report.inputHash matches recomputed canonical hash',
        passed,
        details: passed
          ? `hash=${storedInputHash}`
          : `stored=${storedInputHash}, recomputed=${recomputedHash}`,
      });

      if (passed) logPass(`inputHash verified: ${storedInputHash}`);
      else logFail(`inputHash mismatch: stored=${storedInputHash}, recomputed=${recomputedHash}`);
    } else {
      results.push({ name: 'inputHash matches recomputed', passed: false, skipped: true });
    }

    // Check 8: report.metricsHash matches recomputed canonical metricsHash
    if (results[4].passed) {
      const reportRow = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = reportRow!.metricsJson as Record<string, unknown>;
      const storedMetricsHash = metrics.metricsHash as string;

      const recomputedMetricsHash = computeEvaluationMetricsHash({
        id: metrics.id as string,
        jobId: metrics.jobId as string,
        datasetVersionId: metrics.datasetVersionId as string,
        pipelineId: metrics.pipelineId as string | null,
        modelId: metrics.modelId as string | null,
        algorithmVersion: metrics.algorithmVersion as string,
        iouThreshold: metrics.iouThreshold as number,
        inputHash: metrics.inputHash as string,
        metricsHash: '', // excluded from canonical
        precision: metrics.precision as number,
        recall: metrics.recall as number,
        f1: metrics.f1 as number,
        meanIoU: (metrics.meanIoU ?? metrics.meanIou) as number,
        truePositives: metrics.truePositives as number,
        falsePositives: metrics.falsePositives as number,
        falseNegatives: metrics.falseNegatives as number,
        predictionCount: metrics.predictionCount as number,
        groundTruthCount: metrics.groundTruthCount as number,
        assetCount: metrics.assetCount as number,
        evaluatedAt: metrics.evaluatedAt as string,
        perClassMetrics: (metrics.perClassMetrics as Array<Record<string, unknown>>).map((m) => ({
          classKey: m.classKey as string,
          label: m.label as string,
          precision: m.precision as number,
          recall: m.recall as number,
          f1: m.f1 as number,
          truePositives: m.truePositives as number,
          falsePositives: m.falsePositives as number,
          falseNegatives: m.falseNegatives as number,
          count: m.count as number,
          meanIou: m.meanIou as number,
        })),
        matches: (metrics.matches as Array<Record<string, unknown>> | undefined)?.map((m) => ({
          predictionId: m.predictionId as string,
          groundTruthId: m.groundTruthId as string,
          assetId: m.assetId as string,
          classKey: m.classKey as string,
          iou: m.iou as number,
        })),
      });

      const passed = storedMetricsHash === recomputedMetricsHash;
      results.push({
        name: 'report.metricsHash matches recomputed canonical hash',
        passed,
        details: passed
          ? `metricsHash=${storedMetricsHash}`
          : `stored=${storedMetricsHash}, recomputed=${recomputedMetricsHash}`,
      });

      if (passed) logPass(`metricsHash verified: ${storedMetricsHash}`);
      else
        logFail(
          `metricsHash mismatch: stored=${storedMetricsHash}, recomputed=${recomputedMetricsHash}`
        );
    } else {
      results.push({ name: 'metricsHash matches recomputed', passed: false, skipped: true });
    }

    // Check 9: metricsHash is NOT "seed_placeholder"
    {
      const report = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = report!.metricsJson as Record<string, unknown>;
      const metricsHash = metrics.metricsHash as string;

      const passed = metricsHash !== 'seed_placeholder';
      results.push({
        name: 'metricsHash is not "seed_placeholder"',
        passed,
        details: passed ? `metricsHash=${metricsHash}` : 'metricsHash == "seed_placeholder"',
      });

      if (passed) logPass(`metricsHash is real: ${metricsHash}`);
      else logFail('metricsHash is still "seed_placeholder" — Phase 20C fix not applied to DB');
    }

    // Check 10: report.matches length = 3
    {
      const report = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = report!.metricsJson as Record<string, unknown>;
      const matches = (metrics.matches as Array<unknown>) ?? [];

      const passed = matches.length === 3;
      results.push({
        name: 'report.matches length = 3',
        passed,
        details: `count=${matches.length}`,
      });

      if (passed) logPass(`${matches.length} matches persisted in report`);
      else logFail(`Expected 3 matches, found ${matches.length}`);
    }

    // Check 11: perClassMetrics: car/van/truck each TP=1, FP=0, FN=0, meanIou=1
    {
      const report = await prisma.evaluationReport.findFirst({
        where: { inferenceJobId: DEMO_JOB_ID },
        orderBy: { createdAt: 'desc' },
      });

      const metrics = report!.metricsJson as Record<string, unknown>;
      const perClass = (metrics.perClassMetrics as Array<Record<string, unknown>>) ?? [];

      const expected = ['car', 'van', 'truck'];
      let allCorrect = true;
      const details: string[] = [];

      for (const cls of expected) {
        const m = perClass.find((p) => p.classKey === cls || p.label === cls);
        if (!m) {
          details.push(`${cls}: NOT FOUND`);
          allCorrect = false;
          continue;
        }
        const tp = m.truePositives as number;
        const fp = m.falsePositives as number;
        const fn = m.falseNegatives as number;
        const miou = m.meanIou as number;
        if (tp !== 1 || fp !== 0 || fn !== 0 || miou !== 1) {
          details.push(`${cls}: TP=${tp} FP=${fp} FN=${fn} meanIou=${miou}`);
          allCorrect = false;
        } else {
          details.push(`${cls}: OK`);
        }
      }

      const passed = allCorrect && perClass.length >= 3;
      results.push({
        name: 'Per-class metrics: car/van/truck TP=1 FP=0 FN=0 meanIou=1',
        passed,
        details: details.join(', '),
      });

      if (passed) {
        logPass(`Per-class metrics correct: ${details.join(', ')}`);
      } else {
        logFail(`Per-class metrics incorrect: ${details.join(', ')}`);
      }
    }

    // Check 12: No stale QUEUED/RUNNING jobs for demo project
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
      log(`Phase 20C harness: ${failedCount} FAILED`);
      await prisma.$disconnect();
      process.exit(1);
    }

    log(`Phase 20C harness: ALL CHECKS PASSED`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    log(`Error: ${err}`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
