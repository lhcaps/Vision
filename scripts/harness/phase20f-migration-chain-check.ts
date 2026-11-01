#!/usr/bin/env tsx
/**
 * scripts/harness/phase20f-migration-chain-check.ts
 *
 * Read-only DB integrity harness for Phase 20F Migration Chain Baseline.
 *
 * Verifies that the migration chain is complete and consistent:
 *   1.  --strict mode fails if DATABASE_URL missing.
 *   2.  _prisma_migrations table exists.
 *   3.  Baseline migration 00000000000000_init is applied.
 *   4.  Phase 20E migration 20260504_evaluation_report_integrity_columns is applied.
 *   5.  No failed migrations (finished_at null AND rolled_back_at null).
 *   6.  Expected tables exist: Project, DatasetVersion, EvaluationReport, InferenceJob, Prediction.
 *   7.  EvaluationReport integrity columns exist (all 7).
 *   8.  Unique index for [inferenceJobId, inputHash] exists.
 *   9.  At least one EvaluationReport row exists after seed.
 *  10.  Phase 20E harness equivalence (inline DB checks — same assertions).
 *  11.  Phase 20D harness equivalence (inline DB checks — same assertions).
 *  12.  Phase 20C harness equivalence (inline DB checks — same assertions).
 *
 * Note: Sub-harness checks use inline DB queries instead of exec() to avoid
 * local workspace symlink resolution issues. In CI, harnesses run as separate
 * processes with proper pnpm workspace context.
 *
 * Usage:
 *   npx tsx scripts/harness/phase20f-migration-chain-check.ts
 *   npx tsx scripts/harness/phase20f-migration-chain-check.ts --strict
 *   pnpm harness:phase20f
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase20f-harness]';

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
  log('Starting Phase 20F Migration Chain check...');
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
    log('For full Phase 20F verification:');
    log('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
    log('  2. Reset DB:    pnpm seed:db -- --reset');
    log('  3. Run harness: pnpm harness:phase20f');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    log('Connected to PostgreSQL');
    console.log('');

    // ── Check 1: _prisma_migrations table exists ──────────────────────────────
    {
      const tableExists = (await prisma.$queryRawUnsafe(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations') AS exists"
      )) as Array<{ exists: boolean }>;

      const passed = tableExists[0]?.exists === true;
      results.push({
        name: '_prisma_migrations table exists',
        passed,
        details: passed ? 'table found' : 'table NOT FOUND',
      });

      if (passed) logPass('_prisma_migrations table exists');
      else logFail('_prisma_migrations table NOT FOUND — run pnpm db:migrate:deploy first');
    }

    // ── Check 2: Baseline migration applied ──────────────────────────────────
    {
      const baseline = (await prisma.$queryRawUnsafe(
        "SELECT migration_name, finished_at, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations WHERE migration_name = '00000000000000_init' ORDER BY finished_at DESC LIMIT 1"
      )) as Array<{
        migration_name: string;
        finished_at: string | null;
        rolled_back_at: string | null;
        started_at: string;
        applied_steps_count: number;
      }>;

      const passed =
        baseline.length > 0 &&
        baseline[0].finished_at !== null &&
        baseline[0].rolled_back_at === null;
      results.push({
        name: 'Baseline migration 00000000000000_init is applied',
        passed,
        details: passed
          ? `applied at ${baseline[0].finished_at}`
          : baseline.length === 0
            ? 'NOT FOUND'
            : `status: finished=${baseline[0].finished_at}, rolled_back=${baseline[0].rolled_back_at}`,
      });

      if (passed) logPass('Baseline migration applied: 00000000000000_init');
      else if (baseline.length === 0)
        logFail('Baseline migration 00000000000000_init NOT FOUND in _prisma_migrations');
      else
        logFail(
          `Baseline migration status: finished=${baseline[0].finished_at}, rolled_back=${baseline[0].rolled_back_at}`
        );
    }

    // ── Check 3: Phase 20E migration applied ─────────────────────────────────
    {
      const patch = (await prisma.$queryRawUnsafe(
        "SELECT migration_name, finished_at, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations WHERE migration_name = '20260504_evaluation_report_integrity_columns' ORDER BY finished_at DESC LIMIT 1"
      )) as Array<{
        migration_name: string;
        finished_at: string | null;
        rolled_back_at: string | null;
        started_at: string;
        applied_steps_count: number;
      }>;

      const passed =
        patch.length > 0 && patch[0].finished_at !== null && patch[0].rolled_back_at === null;
      results.push({
        name: 'Phase 20E migration 20260504_evaluation_report_integrity_columns is applied',
        passed,
        details: passed
          ? `applied at ${patch[0].finished_at}`
          : patch.length === 0
            ? 'NOT FOUND'
            : `status: finished=${patch[0].finished_at}, rolled_back=${patch[0].rolled_back_at}`,
      });

      if (passed)
        logPass('Phase 20E migration applied: 20260504_evaluation_report_integrity_columns');
      else if (patch.length === 0) logFail('Phase 20E migration NOT FOUND in _prisma_migrations');
      else
        logFail(
          `Phase 20E migration status: finished=${patch[0].finished_at}, rolled_back=${patch[0].rolled_back_at}`
        );
    }

    // ── Check 4: No failed migrations ─────────────────────────────────────────
    {
      const failed = (await prisma.$queryRawUnsafe(
        'SELECT migration_name, finished_at, rolled_back_at, started_at, applied_steps_count FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at ASC'
      )) as Array<{
        migration_name: string;
        finished_at: string | null;
        rolled_back_at: string | null;
        started_at: string;
        applied_steps_count: number;
      }>;

      const passed = failed.length === 0;
      results.push({
        name: 'No failed migrations (finished_at null AND rolled_back_at null)',
        passed,
        details: passed
          ? 'all migrations settled'
          : `${failed.length} unsettled: ${failed.map((f) => f.migration_name).join(', ')}`,
      });

      if (passed) logPass('No failed or pending migrations');
      else
        logFail(
          `${failed.length} unsettled migration(s): ${failed.map((f) => f.migration_name).join(', ')}`
        );
    }

    // ── Check 5: All expected tables exist ──────────────────────────────────
    {
      const expectedTables = [
        'Project',
        'DatasetVersion',
        'EvaluationReport',
        'InferenceJob',
        'Prediction',
      ];
      const tables = (await prisma.$queryRawUnsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
      )) as Array<{ table_name: string }>;

      const foundTables = new Set(tables.map((t) => t.table_name));
      const missing = expectedTables.filter((t) => !foundTables.has(t));

      const passed = missing.length === 0;
      results.push({
        name: 'All expected tables exist',
        passed,
        details: passed ? expectedTables.join(', ') : `missing: ${missing.join(', ')}`,
      });

      if (passed) logPass(`All ${expectedTables.length} expected tables exist`);
      else logFail(`Missing tables: ${missing.join(', ')}`);
    }

    // ── Check 6: EvaluationReport integrity columns exist ──────────────────────
    {
      const columns = (await prisma.$queryRawUnsafe(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'EvaluationReport' AND column_name IN ('datasetVersionId', 'pipelineId', 'modelId', 'algorithmVersion', 'iouThreshold', 'inputHash', 'metricsHash')"
      )) as Array<{ column_name: string }>;

      const foundCols = new Set(columns.map((c) => c.column_name));
      const requiredCols = [
        'datasetVersionId',
        'pipelineId',
        'modelId',
        'algorithmVersion',
        'iouThreshold',
        'inputHash',
        'metricsHash',
      ];
      const missing = requiredCols.filter((c) => !foundCols.has(c));

      const passed = missing.length === 0;
      results.push({
        name: 'EvaluationReport integrity columns exist',
        passed,
        details: passed ? requiredCols.join(', ') : `missing: ${missing.join(', ')}`,
      });

      if (passed) logPass('All 7 integrity columns exist in EvaluationReport');
      else logFail(`Missing columns: ${missing.join(', ')}`);
    }

    // ── Check 7: Unique index for [inferenceJobId, inputHash] exists ──────────
    {
      const indexes = (await prisma.$queryRawUnsafe(
        "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'EvaluationReport' AND indexdef LIKE '%UNIQUE%'"
      )) as Array<{ indexname: string; indexdef: string }>;

      const uniqueIndex = indexes.find(
        (i) => i.indexdef.includes('"inferenceJobId"') && i.indexdef.includes('"inputHash"')
      );

      const passed = uniqueIndex !== undefined;
      results.push({
        name: 'Unique index for [inferenceJobId, inputHash] exists',
        passed,
        details: uniqueIndex ? uniqueIndex.indexname : 'NOT FOUND',
      });

      if (passed) logPass(`Unique index found: ${uniqueIndex!.indexname}`);
      else logFail('No unique index found for [inferenceJobId, inputHash]');
    }

    // ── Check 8: At least one EvaluationReport row exists ────────────────────
    {
      const count = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::bigint AS count FROM "EvaluationReport"'
      )) as Array<{ count: bigint }>;

      const rowCount = Number(count[0]?.count ?? 0);
      const passed = rowCount >= 1;
      results.push({
        name: 'At least one EvaluationReport row exists after seed',
        passed,
        details: `count=${rowCount}`,
      });

      if (passed) logPass(`${rowCount} EvaluationReport row(s) found`);
      else logFail('No EvaluationReport rows found — seed may not have run');
    }

    // ── Check 9: Phase 20E harness equivalence ─────────────────────────────────
    // Inline DB checks matching phase20e-evaluation-migration-check.ts assertions.
    {
      const checks: { name: string; passed: boolean }[] = [];

      const cols = (await prisma.$queryRawUnsafe(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'EvaluationReport' AND column_name IN ('datasetVersionId', 'pipelineId', 'modelId', 'algorithmVersion', 'iouThreshold', 'inputHash', 'metricsHash')"
      )) as Array<{ column_name: string }>;
      checks.push({ name: 'All 7 integrity columns present', passed: cols.length >= 7 });

      const notNull = (await prisma.$queryRawUnsafe(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'EvaluationReport' AND column_name IN ('datasetVersionId', 'algorithmVersion', 'iouThreshold', 'inputHash', 'metricsHash') AND is_nullable = 'NO'"
      )) as Array<{ column_name: string }>;
      checks.push({ name: 'Required columns NOT NULL', passed: notNull.length >= 5 });

      const indexes = (await prisma.$queryRawUnsafe(
        "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'EvaluationReport' AND indexdef LIKE '%UNIQUE%'"
      )) as Array<{ indexname: string; indexdef: string }>;
      const hasUnique = indexes.some(
        (i) => i.indexdef.includes('"inferenceJobId"') && i.indexdef.includes('"inputHash"')
      );
      checks.push({ name: 'Unique index for [inferenceJobId, inputHash]', passed: hasUnique });

      const rows = (await prisma.$queryRawUnsafe(
        'SELECT "inputHash", "metricsHash", "metricsJson" FROM "EvaluationReport"'
      )) as Array<Record<string, unknown>>;
      const allHashesValid = rows.every((r) => {
        const inputHash = r['inputHash'] as string | null;
        const metricsHash = r['metricsHash'] as string | null;
        const metricsJson = r['metricsJson'] as Record<string, unknown> | null;
        if (!inputHash || !/^[a-f0-9]{16}$/.test(inputHash)) return false;
        if (!metricsHash || !/^[a-f0-9]{16}$/.test(metricsHash)) return false;
        if (metricsJson) {
          const jsonIH = (metricsJson['inputHash'] as string | null) || '';
          const jsonMH = (metricsJson['metricsHash'] as string | null) || '';
          if (jsonIH && jsonIH !== inputHash) return false;
          if (jsonMH && jsonMH !== metricsHash) return false;
        }
        return true;
      });
      checks.push({
        name: 'All row data consistent with JSON',
        passed: rows.length === 0 || allHashesValid,
      });

      const duplicates = (await prisma.$queryRawUnsafe(
        'SELECT "inferenceJobId", "inputHash", COUNT(*)::int AS cnt FROM "EvaluationReport" GROUP BY "inferenceJobId", "inputHash" HAVING COUNT(*) > 1'
      )) as Array<{ inferenceJobId: string; inputHash: string; cnt: number }>;
      checks.push({
        name: 'No duplicate [inferenceJobId, inputHash] groups',
        passed: duplicates.length === 0,
      });

      const allPassed = checks.every((c) => c.passed);
      results.push({
        name: 'Phase 20E harness equivalence (inline DB checks)',
        passed: allPassed,
        details: allPassed
          ? 'columns, NOT NULL, unique index, hash consistency, no duplicates'
          : checks
              .filter((c) => !c.passed)
              .map((c) => c.name)
              .join('; '),
      });

      if (allPassed) logPass('Phase 20E harness equivalence: all inline checks passed');
      else {
        logFail('Phase 20E harness equivalence failed:');
        for (const c of checks.filter((c) => !c.passed)) {
          log(`    FAIL: ${c.name}`);
        }
      }
    }

    // ── Check 10: Phase 20D harness equivalence ────────────────────────────────
    // Inline DB checks matching phase20d-evaluation-db-index-check.ts assertions.
    {
      const DEMO_JOB_ID = 'job_2026_04_28_2036';
      const checks: { name: string; passed: boolean }[] = [];

      // Check 1: EvaluationReport row exists for demo job
      const reportRows = (await prisma.$queryRawUnsafe(
        'SELECT "id", "datasetVersionId", "algorithmVersion", "iouThreshold", "inputHash", "metricsHash", "metricsJson" FROM "EvaluationReport" WHERE "inferenceJobId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
        DEMO_JOB_ID
      )) as Array<{
        id: string;
        datasetVersionId: string;
        algorithmVersion: string;
        iouThreshold: number;
        inputHash: string;
        metricsHash: string;
        metricsJson: Record<string, unknown>;
      }>;
      checks.push({
        name: 'EvaluationReport row exists for demo job',
        passed: reportRows.length >= 1,
      });

      if (reportRows.length >= 1) {
        const row = reportRows[0];

        // Check 2: New DB columns are non-null
        const nonNull =
          row.datasetVersionId !== null &&
          row.algorithmVersion !== null &&
          row.iouThreshold !== null &&
          row.inputHash !== null &&
          row.metricsHash !== null;
        checks.push({ name: 'New DB columns non-null', passed: nonNull });

        // Check 3: row.inputHash === metricsJson.inputHash
        const jsonIH = (row.metricsJson?.['inputHash'] as string | null) ?? '';
        checks.push({ name: 'row.inputHash matches JSON', passed: row.inputHash === jsonIH });

        // Check 4: row.metricsHash === metricsJson.metricsHash
        const jsonMH = (row.metricsJson?.['metricsHash'] as string | null) ?? '';
        checks.push({ name: 'row.metricsHash matches JSON', passed: row.metricsHash === jsonMH });

        // Check 5: Hash values conform to /^[a-f0-9]{16}$/
        const hex16 = /^[a-f0-9]{16}$/;
        checks.push({ name: 'inputHash is 16-char hex', passed: hex16.test(row.inputHash) });
        checks.push({ name: 'metricsHash is 16-char hex', passed: hex16.test(row.metricsHash) });
      }

      // Check 6: Predictions exist
      const predCount = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::bigint AS cnt FROM "Prediction"'
      )) as Array<{ cnt: bigint }>;
      checks.push({ name: 'Predictions exist', passed: Number(predCount[0]?.cnt ?? 0) > 0 });

      // Check 7: No stale QUEUED/RUNNING seeded jobs for demo project
      const staleJobs = (await prisma.$queryRawUnsafe(
        'SELECT "id" FROM "InferenceJob" WHERE "projectId" = $1 AND "status" IN (\'QUEUED\',\'RUNNING\') LIMIT 1',
        'proj_parking_lot'
      )) as Array<{ id: string }>;
      checks.push({
        name: 'No stale QUEUED/RUNNING jobs for demo project',
        passed: staleJobs.length === 0,
      });

      const allPassed = checks.every((c) => c.passed);
      results.push({
        name: 'Phase 20D harness equivalence (inline DB checks)',
        passed: allPassed,
        details: allPassed
          ? 'report exists, all columns non-null, hashes valid, predictions exist, no stale jobs'
          : checks
              .filter((c) => !c.passed)
              .map((c) => c.name)
              .join('; '),
      });

      if (allPassed) logPass('Phase 20D harness equivalence: all inline checks passed');
      else {
        logFail('Phase 20D harness equivalence failed:');
        for (const c of checks.filter((c) => !c.passed)) {
          log(`    FAIL: ${c.name}`);
        }
      }
    }

    // ── Check 11: Phase 20C harness equivalence ──────────────────────────────────
    // Inline DB checks matching phase20c-evaluation-integrity-check.ts assertions.
    {
      const checks: { name: string; passed: boolean }[] = [];

      // Check 1: Dataset version is LOCKED
      const dvLocked = (await prisma.$queryRawUnsafe(
        'SELECT "id" FROM "DatasetVersion" WHERE "status" = \'LOCKED\' LIMIT 1'
      )) as Array<{ id: string }>;
      checks.push({ name: 'Dataset version is LOCKED', passed: dvLocked.length >= 1 });

      // Check 2: InferenceJob is SUCCEEDED
      const jobSucc = (await prisma.$queryRawUnsafe(
        'SELECT "id" FROM "InferenceJob" WHERE "status" = \'SUCCEEDED\' LIMIT 1'
      )) as Array<{ id: string }>;
      checks.push({
        name: 'At least one SUCCEEDED InferenceJob exists',
        passed: jobSucc.length >= 1,
      });

      // Check 3: Predictions found (>0)
      const predCount = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::bigint AS cnt FROM "Prediction"'
      )) as Array<{ cnt: bigint }>;
      checks.push({ name: 'Predictions found (>0)', passed: Number(predCount[0]?.cnt ?? 0) > 0 });

      // Check 4: EvaluationReport found (>0)
      const reportCount = (await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::bigint AS cnt FROM "EvaluationReport"'
      )) as Array<{ cnt: bigint }>;
      checks.push({
        name: 'EvaluationReport found (>0)',
        passed: Number(reportCount[0]?.cnt ?? 0) > 0,
      });

      const allPassed = checks.every((c) => c.passed);
      results.push({
        name: 'Phase 20C harness equivalence (inline DB checks)',
        passed: allPassed,
        details: allPassed
          ? 'dataset locked, job succeeded, predictions found, report exists'
          : checks
              .filter((c) => !c.passed)
              .map((c) => c.name)
              .join('; '),
      });

      if (allPassed) logPass('Phase 20C harness equivalence: all inline checks passed');
      else {
        logFail('Phase 20C harness equivalence failed:');
        for (const c of checks.filter((c) => !c.passed)) {
          log(`    FAIL: ${c.name}`);
        }
      }
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
    log(`Phase 20F harness: ${failedCount} FAILED`);
    await prisma.$disconnect();
    process.exit(1);
  }

  log(`Phase 20F harness: ALL CHECKS PASSED`);
  await prisma.$disconnect();
  process.exit(0);
}

main();
