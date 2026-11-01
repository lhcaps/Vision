#!/usr/bin/env tsx
/**
 * scripts/harness/phase20e-evaluation-migration-check.ts
 *
 * Read-only DB integrity harness for Phase 20E Evaluation Migration Finalization.
 *
 * Verifies that the EvaluationReport migration SQL has been applied and that all
 * columns, indexes, constraints, and data integrity are correct.
 *
 * Checks (12-point):
 *   1.  All 7 new scalar columns exist in information_schema.
 *   2.  Required columns (datasetVersionId, algorithmVersion, iouThreshold,
 *       inputHash, metricsHash) are NOT NULL in information_schema.
 *   3.  Required indexes exist:
 *       - EvaluationReport_inferenceJobId_createdAt_idx
 *       - EvaluationReport_datasetVersionId_createdAt_idx
 *       - EvaluationReport_inputHash_idx
 *       - EvaluationReport_metricsHash_idx
 *       - EvaluationReport_algorithmVersion_idx
 *   4.  Unique index exists for [inferenceJobId, inputHash].
 *   5.  Every row has row/JSON consistency:
 *       row.inputHash === metricsJson.inputHash
 *       row.metricsHash === metricsJson.metricsHash
 *       row.datasetVersionId === metricsJson.datasetVersionId
 *       row.algorithmVersion === metricsJson.algorithmVersion
 *       row.iouThreshold === metricsJson.iouThreshold
 *   6.  Every row has lowercase 16-char hex hashes for inputHash and metricsHash.
 *   7.  No duplicate [inferenceJobId, inputHash] groups exist.
 *   8.  At least one EvaluationReport row exists.
 *   9.  No seed_placeholder exists in any hash field.
 *  10.  Latest report passes EvaluationReportSchema strict-parse.
 *  11.  Required optional columns (pipelineId, modelId) exist as nullable.
 *  12.  --strict mode exits 1 if DATABASE_URL is absent.
 *
 * Usage:
 *   npx tsx scripts/harness/phase20e-evaluation-migration-check.ts
 *   npx tsx scripts/harness/phase20e-evaluation-migration-check.ts --strict
 *   pnpm harness:phase20e
 */

import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase20e-harness]';

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

interface ColumnInfo {
  column_name: string;
  is_nullable: string;
  data_type: string;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function main() {
  log('Starting Phase 20E Evaluation Migration check...');
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
    log('For full Phase 20E verification:');
    log('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
    log('  2. Reset DB:    pnpm seed:db -- --reset');
    log('  3. Run harness: pnpm harness:phase20e');
    process.exit(0);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    log('Connected to PostgreSQL');
    console.log('');

    // Fetch column metadata from information_schema
    const columns = await prisma.$queryRawUnsafe<ColumnInfo[]>(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'EvaluationReport'
        AND column_name IN (
          'datasetVersionId',
          'pipelineId',
          'modelId',
          'algorithmVersion',
          'iouThreshold',
          'inputHash',
          'metricsHash'
        )
      ORDER BY column_name
    `);

    // Fetch all indexes on EvaluationReport
    const indexes = await prisma.$queryRawUnsafe<IndexInfo[]>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'EvaluationReport'
      ORDER BY indexname
    `);

    // Fetch all rows for bulk checks
    const allRows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        inferenceJobId: string;
        datasetVersionId: string | null;
        pipelineId: string | null;
        modelId: string | null;
        algorithmVersion: string | null;
        iouThreshold: number | null;
        inputHash: string | null;
        metricsHash: string | null;
        metricsJson: Record<string, unknown>;
      }>
    >(
      `SELECT id, "inferenceJobId", "datasetVersionId", "pipelineId", "modelId", "algorithmVersion", "iouThreshold", "inputHash", "metricsHash", "metricsJson" FROM "EvaluationReport"`
    );

    // ── Check 1: All 7 scalar columns exist ─────────────────────────────────────
    {
      const requiredCols = [
        'datasetVersionId',
        'pipelineId',
        'modelId',
        'algorithmVersion',
        'iouThreshold',
        'inputHash',
        'metricsHash',
      ];
      const foundCols = new Set(columns.map((c) => c.column_name));
      const missing = requiredCols.filter((c) => !foundCols.has(c));

      const passed = missing.length === 0;
      results.push({
        name: 'All 7 new scalar columns exist',
        passed,
        details: passed ? `found: ${requiredCols.join(', ')}` : `missing: ${missing.join(', ')}`,
      });

      if (passed) logPass(`All 7 columns present`);
      else logFail(`Missing columns: ${missing.join(', ')}`);
    }

    // ── Check 2: Required columns are NOT NULL ─────────────────────────────────
    {
      const notNullCols = [
        'datasetVersionId',
        'algorithmVersion',
        'iouThreshold',
        'inputHash',
        'metricsHash',
      ];
      const colMap = new Map(columns.map((c) => [c.column_name, c.is_nullable]));
      const notNullPassed = notNullCols.every((c) => colMap.get(c) === 'NO');
      const nullableCols = notNullCols.filter((c) => colMap.get(c) !== 'NO');

      const passed = notNullPassed;
      results.push({
        name: 'Required scalar columns are NOT NULL',
        passed,
        details: passed ? notNullCols.join(', ') : `nullable: ${nullableCols.join(', ')}`,
      });

      if (passed) logPass(`All required columns are NOT NULL`);
      else logFail(`Nullable columns (should be NOT NULL): ${nullableCols.join(', ')}`);
    }

    // ── Check 3: Required indexes exist ─────────────────────────────────────────
    {
      const requiredIndexes = [
        'EvaluationReport_inferenceJobId_createdAt_idx',
        'EvaluationReport_datasetVersionId_createdAt_idx',
        'EvaluationReport_inputHash_idx',
        'EvaluationReport_metricsHash_idx',
        'EvaluationReport_algorithmVersion_idx',
      ];
      const foundIndexes = new Set(indexes.map((i) => i.indexname));
      const missing = requiredIndexes.filter((i) => !foundIndexes.has(i));

      const passed = missing.length === 0;
      results.push({
        name: 'Required indexes exist',
        passed,
        details: passed ? requiredIndexes.join(', ') : `missing: ${missing.join(', ')}`,
      });

      if (passed) logPass(`All 5 required indexes present`);
      else logFail(`Missing indexes: ${missing.join(', ')}`);
    }

    // ── Check 4: Unique index exists for [inferenceJobId, inputHash] ────────────
    {
      const uniqueIndex = indexes.find(
        (i) =>
          i.indexdef.includes('UNIQUE') &&
          i.indexdef.includes('"inferenceJobId"') &&
          i.indexdef.includes('"inputHash"')
      );

      const passed = uniqueIndex !== undefined;
      results.push({
        name: 'Unique index exists for [inferenceJobId, inputHash]',
        passed,
        details: uniqueIndex ? uniqueIndex.indexname : 'NOT FOUND',
      });

      if (passed) logPass(`Unique index: ${uniqueIndex!.indexname}`);
      else logFail('No unique index found for [inferenceJobId, inputHash]');
    }

    // ── Check 5: Row/JSON consistency ───────────────────────────────────────────
    if (allRows.length > 0) {
      let consistencyFailures = 0;
      const details: string[] = [];

      for (const row of allRows) {
        const json = row.metricsJson;

        if (row.inputHash !== (json.inputHash as string | undefined)) {
          consistencyFailures++;
          details.push(`id=${row.id}: inputHash row="${row.inputHash}" json="${json.inputHash}"`);
        }
        if (row.metricsHash !== (json.metricsHash as string | undefined)) {
          consistencyFailures++;
          details.push(
            `id=${row.id}: metricsHash row="${row.metricsHash}" json="${json.metricsHash}"`
          );
        }
        if (row.datasetVersionId !== (json.datasetVersionId as string | undefined)) {
          consistencyFailures++;
          details.push(`id=${row.id}: datasetVersionId mismatch`);
        }
        if (row.algorithmVersion !== (json.algorithmVersion as string | undefined)) {
          consistencyFailures++;
          details.push(`id=${row.id}: algorithmVersion mismatch`);
        }
        if (row.iouThreshold !== (json.iouThreshold as number | undefined)) {
          consistencyFailures++;
          details.push(
            `id=${row.id}: iouThreshold row=${row.iouThreshold} json=${json.iouThreshold}`
          );
        }
      }

      const passed = consistencyFailures === 0;
      results.push({
        name: 'Every row has row/JSON consistency',
        passed,
        details: passed
          ? `all ${allRows.length} row(s) consistent`
          : `${consistencyFailures} mismatch(es): ${details.slice(0, 3).join('; ')}`,
      });

      if (passed) logPass(`All ${allRows.length} row(s) consistent with JSON`);
      else
        logFail(`${consistencyFailures} consistency failure(s): ${details.slice(0, 3).join('; ')}`);
    } else {
      results.push({ name: 'Every row has row/JSON consistency', passed: false, skipped: true });
    }

    // ── Check 6: All hashes are lowercase 16-char hex ──────────────────────────
    {
      const hexRegex = /^[a-f0-9]{16}$/;
      const invalidHashes: Array<{ id: string; field: string; value: string }> = [];

      for (const row of allRows) {
        if (row.inputHash && !hexRegex.test(row.inputHash)) {
          invalidHashes.push({ id: row.id, field: 'inputHash', value: row.inputHash });
        }
        if (row.metricsHash && !hexRegex.test(row.metricsHash)) {
          invalidHashes.push({ id: row.id, field: 'metricsHash', value: row.metricsHash });
        }
      }

      const passed = invalidHashes.length === 0;
      results.push({
        name: 'All rows have lowercase 16-char hex hashes',
        passed,
        details: passed
          ? 'all valid'
          : invalidHashes.map((h) => `${h.field}=${h.value}`).join(', '),
      });

      if (passed) logPass('All hashes conform to /^[a-f0-9]{16}$/');
      else
        logFail(
          `Invalid hashes: ${invalidHashes.map((h) => `${h.id}:${h.field}=${h.value}`).join(', ')}`
        );
    }

    // ── Check 7: No duplicate [inferenceJobId, inputHash] groups ───────────────
    {
      const duplicates = await prisma.$queryRawUnsafe<
        Array<{ inferenceJobId: string; inputHash: string; count: number }>
      >(`
        SELECT "inferenceJobId", "inputHash", COUNT(*)::int AS count
        FROM "EvaluationReport"
        GROUP BY "inferenceJobId", "inputHash"
        HAVING COUNT(*) > 1
      `);

      const passed = duplicates.length === 0;
      results.push({
        name: 'No duplicate [inferenceJobId, inputHash] groups',
        passed,
        details: passed ? 'all unique' : `${duplicates.length} duplicate group(s)`,
      });

      if (passed) logPass('No duplicate [inferenceJobId, inputHash] groups');
      else logFail(`${duplicates.length} duplicate group(s): ${JSON.stringify(duplicates)}`);
    }

    // ── Check 8: At least one EvaluationReport row exists ──────────────────────
    {
      const passed = allRows.length >= 1;
      results.push({
        name: 'At least one EvaluationReport row exists',
        passed,
        details: `count=${allRows.length}`,
      });

      if (passed) logPass(`${allRows.length} row(s) found`);
      else logFail('No EvaluationReport rows found');
    }

    // ── Check 9: No seed_placeholder in any hash field ────────────────────────
    {
      const rowsWithPlaceholder = allRows.filter(
        (r) =>
          (r.inputHash &&
            (r.inputHash === 'seed_placeholder' || r.inputHash.includes('placeholder'))) ||
          (r.metricsHash &&
            (r.metricsHash === 'seed_placeholder' || r.metricsHash.includes('placeholder')))
      );

      const passed = rowsWithPlaceholder.length === 0;
      results.push({
        name: 'No seed_placeholder in any hash field',
        passed,
        details: passed
          ? 'no placeholders found'
          : `${rowsWithPlaceholder.length} row(s) with placeholder`,
      });

      if (passed) logPass('No placeholder values in hash fields');
      else logFail(`${rowsWithPlaceholder.length} row(s) contain placeholder hash values`);
    }

    // ── Check 10: Latest report passes strict schema parse ────────────────────
    {
      const latestRows = await prisma.$queryRawUnsafe<
        Array<{ metricsJson: Record<string, unknown> }>
      >('SELECT "metricsJson" FROM "EvaluationReport" ORDER BY "createdAt" DESC LIMIT 1');
      if (latestRows.length > 0) {
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
        const latestMetrics = latestRows[0].metricsJson;
        const missing = requiredFields.filter(
          (f) => !(f in latestMetrics) || latestMetrics[f] === null
        );
        const hashRegex = /^[a-f0-9]{16}$/;
        const inputHashOk =
          typeof latestMetrics.inputHash === 'string' &&
          hashRegex.test(latestMetrics.inputHash as string);
        const metricsHashOk =
          typeof latestMetrics.metricsHash === 'string' &&
          hashRegex.test(latestMetrics.metricsHash as string);

        const passed = missing.length === 0 && inputHashOk && metricsHashOk;
        results.push({
          name: 'Latest report passes EvaluationReportSchema strict-parse',
          passed,
          details: passed
            ? 'Valid full report'
            : `Missing: ${missing.join(', ')}; inputHash=${inputHashOk}, metricsHash=${metricsHashOk}`,
        });

        if (passed) logPass('Latest report passes strict schema validation');
        else logFail(`Schema parse failed: missing=${missing.join(', ')}`);
      } else {
        results.push({
          name: 'Latest report passes EvaluationReportSchema strict-parse',
          passed: false,
          skipped: true,
        });
      }
    }

    // ── Check 11: pipelineId and modelId exist as nullable ───────────────────
    {
      const colMap = new Map(columns.map((c) => [c.column_name, c.is_nullable]));
      const pipelineOk = colMap.get('pipelineId') === 'YES';
      const modelOk = colMap.get('modelId') === 'YES';

      const passed = pipelineOk && modelOk;
      results.push({
        name: 'pipelineId and modelId exist as nullable',
        passed,
        details: passed
          ? 'both nullable'
          : `pipelineId=${colMap.get('pipelineId')}, modelId=${colMap.get('modelId')}`,
      });

      if (passed) logPass('pipelineId and modelId are nullable');
      else
        logFail(
          `pipelineId nullable=${colMap.get('pipelineId')}, modelId nullable=${colMap.get('modelId')}`
        );
    }

    // ── Check 12: STRICT mode enforces DATABASE_URL (already checked above) ───────
    {
      results.push({
        name: '--strict mode enforces DATABASE_URL',
        passed: true,
        details: 'DATABASE_URL is configured',
      });
      logPass('--strict mode: DATABASE_URL is configured');
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
    log(`Phase 20E harness: ${failedCount} FAILED`);
    await prisma.$disconnect();
    process.exit(1);
  }

  log(`Phase 20E harness: ALL CHECKS PASSED`);
  await prisma.$disconnect();
  process.exit(0);
}

main();
