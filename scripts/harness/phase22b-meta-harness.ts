#!/usr/bin/env tsx
/**
 * scripts/harness/phase22b-meta-harness.ts
 *
 * Meta-harness aggregator for Phase 22B Production-Path Test Suite.
 *
 * Orchestrates:
 *   - Phase 22A meta-harness (always): runs phase22a + phase20c/20d/20e/20f
 *   - Phase 22B API harness (conditional): runs when --with-api is passed
 *     or when API_BASE_URL is reachable
 *
 * DB-only mode (no --with-api flag): runs Phase 22A meta-harness only.
 * This is the correct CI-safe mode.
 *
 * Live API mode (--with-api flag): also runs Phase 22B API production-path checks.
 * This requires the full stack to be booted.
 *
 * Usage:
 *   npx tsx scripts/harness/phase22b-meta-harness.ts
 *   npx tsx scripts/harness/phase22b-meta-harness.ts --strict
 *   npx tsx scripts/harness/phase22b-meta-harness.ts --strict --with-api
 *   pnpm meta:harness:phase22b
 *   pnpm meta:harness:phase22b -- --strict --with-api
 */

import { execSync } from 'child_process';
import { config as loadEnv } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  loadEnv({ path: rootEnv });
}

const LOG_PREFIX = '[phase22b-meta]';

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

function runHarness(cmd: string, label: string, env?: Record<string, string>): HarnessResult {
  const start = Date.now();
  log(`Running: ${cmd}`);
  try {
    execSync(cmd, {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    const durationMs = Date.now() - start;
    return { name: label, passed: true, exitCode: 0, durationMs };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const e = err as { status?: number };
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
  // Harness uses API_BASE_URL (prefix-included). Frontend uses VITE_API_BASE_URL (host-only).
  // These are different conventions — do NOT fall back from one to the other.
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

async function main() {
  log('Starting Phase 22B Meta Harness...');
  log(`Database: ${process.env.DATABASE_URL ? '(configured)' : '(NOT configured)'}`);

  const strict = process.argv.includes('--strict');
  const withApi = process.argv.includes('--with-api');

  // Determine if we should try the API harness
  const apiReachable = await isApiReachable();
  const shouldRunApiHarness = withApi || apiReachable;

  if (shouldRunApiHarness) {
    logInfo(`API appears reachable — Phase 22B API harness will run.`);
    if (withApi) logInfo(`--with-api flag explicitly set.`);
    if (apiReachable && !withApi)
      logInfo(`(auto-detected, override with --with-api to suppress warning)`);
  } else {
    logInfo(`API not reachable — Phase 22B API harness will be skipped.`);
    logInfo(`Pass --with-api to attempt anyway, or start the stack first.`);
  }

  const allResults: HarnessResult[] = [];

  // ── Phase 22A Meta Harness (always runs if DB is available) ────────────────
  {
    logSection('[Phase 22A Meta Harness]');

    if (!process.env.DATABASE_URL) {
      if (strict) {
        logFail('DATABASE_URL not configured — STRICT mode requires database connection.');
        process.exit(1);
      }
      logInfo('DATABASE_URL not configured — Phase 22A meta-harness will be skipped.');
      logInfo('For full Phase 22B verification:');
      logInfo('  1. Start Docker: docker compose -f infra/docker-compose.yml up -d');
      logInfo('  2. Reset DB:    pnpm seed:db -- --reset');
      logInfo('  3. Run harness: pnpm meta:harness:phase22b');
    } else {
      // Run Phase 22A meta-harness via pnpm exec
      const phase22aMeta = runHarness('pnpm meta:harness:phase22a', 'phase22a-meta-harness');
      allResults.push(phase22aMeta);
      if (phase22aMeta.passed) {
        logPass(`phase22a-meta-harness PASSED (${phase22aMeta.durationMs}ms)`);
      } else {
        logFail(
          `phase22a-meta-harness FAILED (${phase22aMeta.durationMs}ms) — ${phase22aMeta.error}`
        );
      }
    }
  }

  // ── Phase 22B API Harness (only if API is reachable) ───────────────────────
  if (shouldRunApiHarness) {
    logSection('[Phase 22B API Harness]');

    const apiResult = runHarness('pnpm harness:phase22b:api', 'phase22b-production-path-api-check');
    allResults.push(apiResult);

    if (apiResult.passed) {
      logPass(`phase22b-api-harness PASSED (${apiResult.durationMs}ms)`);
    } else {
      logFail(`phase22b-api-harness FAILED (${apiResult.durationMs}ms) — ${apiResult.error}`);
    }
  } else {
    logSection('[Phase 22B API Harness]');
    logInfo('Skipped — API not reachable and --with-api not set.');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n');
  logSection('=== Phase 22B Meta Harness Summary ===');

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
    logFail(`Phase 22B meta harness FAILED — ${failed} harness(es) failed: ${failedNames}`);
    process.exit(1);
  }

  logPass('Phase 22B meta harness: ALL HARNESSES PASSED');
  process.exit(0);
}

main();
