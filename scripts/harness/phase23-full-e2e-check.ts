#!/usr/bin/env tsx
/**
 * scripts/harness/phase23-full-e2e-check.ts
 *
 * Phase 23 Full E2E Meta-Harness.
 *
 * Composes Phase 22B meta-harness + Playwright full vertical-slice spec.
 *
 * Prerequisites (must be running before this harness):
 *   - Docker: PostgreSQL (port 5432), Redis (6380), MinIO (9000)
 *   - NestJS API (port 3000)
 *   - Vite web app (port 5173 or configured VITE_WEB_BASE_URL)
 *   - Seeded database: pnpm seed:db -- --reset
 *
 * Does NOT boot services — fails loudly with boot instructions if unreachable.
 *
 * Usage:
 *   npx tsx scripts/harness/phase23-full-e2e-check.ts
 *   npx tsx scripts/harness/phase23-full-e2e-check.ts --strict
 *   pnpm meta:harness:phase23
 */

import { execSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase23-meta]';

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function logPass(msg: string) {
  console.log(`\x1b[32m  PASS\x1b[0m ${msg}`);
}

function logFail(msg: string) {
  console.error(`\x1b[31m  FAIL\x1b[0m ${msg}`);
}

function logSection(msg: string) {
  console.log(`\n\x1b[1m${msg}\x1b[0m`);
}

function logInfo(msg: string) {
  console.log(`  \x1b[36mINFO\x1b[0m ${msg}`);
}

interface HarnessResult {
  name: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  error?: string;
}

function runHarness(cmd: string, label: string, cwd?: string): HarnessResult {
  const start = Date.now();
  log(`Running: ${cmd}`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      cwd: cwd || path.resolve(__dirname, '../..'),
    });
    const durationMs = Date.now() - start;
    return { name: label, passed: true, exitCode: 0, durationMs };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const e = err as { status?: number | null };
    const exitCode = e.status ?? 1;
    return {
      name: label,
      passed: false,
      exitCode,
      durationMs,
      error: exitCode === null ? 'ENOENT' : `exit ${exitCode}`,
    };
  }
}

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  return controller.signal;
}

async function isApiReachable(): Promise<boolean> {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  try {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
      signal: createTimeoutSignal(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function isWebReachable(): Promise<boolean> {
  const WEB_BASE_URL = process.env.VITE_WEB_BASE_URL || 'http://localhost:5173';
  try {
    const res = await fetch(WEB_BASE_URL, {
      signal: createTimeoutSignal(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function printBootInstructions() {
  console.log('');
  logFail('STACK NOT RUNNING — cannot proceed without live services.');
  console.log('');
  log('To boot the full stack:');
  log('  1. Start Docker:       docker compose -f infra/docker-compose.yml up -d');
  log('  2. Start API:          pnpm dev:api       (port 3000)');
  log('  3. Start web:         pnpm dev:web       (port 5173+)');
  log('  4. Reset DB:          pnpm seed:db -- --reset');
  log('  5. Run this harness:   pnpm meta:harness:phase23');
  console.log('');
  log('For Windows:');
  log('  pnpm dev:full:win  (boots Docker + all apps)');
  log('  pnpm seed:db -- --reset');
  log('  pnpm meta:harness:phase23');
  console.log('');
}

async function main() {
  log('Starting Phase 23 Full E2E Meta Harness...');
  log(`Database: ${process.env.DATABASE_URL ? '(configured)' : '(NOT configured)'}`);
  log(`API:     ${process.env.API_BASE_URL || 'http://localhost:3000/api'}`);
  log(`Web:     ${process.env.VITE_WEB_BASE_URL || 'http://localhost:5173'}`);

  const strict = process.argv.includes('--strict');
  const allResults: HarnessResult[] = [];

  // ── Preflight: check stack reachability ────────────────────────────────────
  console.log('');

  const [apiReachable, webReachable] = await Promise.all([isApiReachable(), isWebReachable()]);

  if (!apiReachable || !webReachable) {
    if (strict) {
      if (!apiReachable) {
        logFail(`API not reachable at ${process.env.API_BASE_URL || 'http://localhost:3000/api'}`);
      }
      if (!webReachable) {
        logFail(`Web not reachable at ${process.env.VITE_WEB_BASE_URL || 'http://localhost:5173'}`);
      }
      printBootInstructions();
      process.exit(1);
    }
    logInfo(`API reachable: ${apiReachable}, Web reachable: ${webReachable}`);
    logInfo('Running in non-strict mode — skipping live checks.');
    logInfo('Pass --strict to require live stack, or boot the stack first.');
    log('Phase 23 meta harness: SKIPPED (stack not running, non-strict mode)');
    process.exit(0);
  }

  logInfo('API and Web are reachable — running full E2E verification.');

  // ── Phase 22B Meta Harness (includes Phase 22A + Phase 20C/D/E/F) ─────────
  logSection('[Phase 22B Meta Harness — DB + API]');

  const phase22bResult = runHarness(
    'pnpm meta:harness:phase22b -- --strict --with-api',
    'phase22b-meta-harness'
  );
  allResults.push(phase22bResult);

  if (phase22bResult.passed) {
    logPass(`phase22b-meta-harness PASSED (${phase22bResult.durationMs}ms)`);
  } else {
    logFail(
      `phase22b-meta-harness FAILED (${phase22bResult.durationMs}ms) — ${phase22bResult.error}`
    );
    console.log('');
    logFail('Phase 22B meta-harness must pass before Phase 23 Playwright tests run.');
    console.log('');
    log('Phase 23 meta harness FAILED');
    process.exit(1);
  }

  // ── Playwright Full Vertical Slice ─────────────────────────────────────────
  logSection('[Playwright Full Vertical Slice — Phase 23 E2E]');

  // Run Playwright from the web app directory so playwright.config.ts is found.
  const webDir = path.resolve(__dirname, '../../apps/web');
  const playwrightResult = runHarness(
    'pnpm exec playwright test e2e/full-vertical-slice.spec.ts',
    'playwright-full-vertical-slice',
    webDir
  );
  allResults.push(playwrightResult);

  if (playwrightResult.passed) {
    logPass(`playwright-full-vertical-slice PASSED (${playwrightResult.durationMs}ms)`);
  } else {
    logFail(
      `playwright-full-vertical-slice FAILED (${playwrightResult.durationMs}ms) — ${playwrightResult.error}`
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n');
  logSection('=== Phase 23 Meta Harness Summary ===');

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;

  for (const r of allResults) {
    if (r.passed) {
      logPass(`${r.name}: PASSED (${r.durationMs}ms)`);
    } else {
      logFail(`${r.name}: FAILED (${r.durationMs}ms) — ${r.error}`);
    }
  }

  console.log('');
  const totalMs = allResults.reduce((sum, r) => sum + r.durationMs, 0);
  log(`Total: ${passed} passed, ${failed} failed, ${(totalMs / 1000).toFixed(1)}s`);

  if (failed > 0) {
    const failedNames = allResults
      .filter((r) => !r.passed)
      .map((r) => r.name)
      .join(', ');
    console.log('');
    logFail(`Phase 23 meta harness FAILED — ${failed} harness(es) failed: ${failedNames}`);
    process.exit(1);
  }

  logPass('Phase 23 meta harness: ALL HARNESSES PASSED');
  process.exit(0);
}

main();
