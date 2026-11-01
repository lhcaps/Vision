# Phase 22A — Fixture & Test Infrastructure Review

## Code Review Findings

### Severity: Informational

**Fixture contract (`scripts/fixtures/visionflow-fixtures.ts`):**

- Constants are `as const` — no accidental mutation
- Exported as a typed `FixtureIds` for TypeScript consumers
- Does not duplicate seed logic — imports nothing, only exports facts
- `metricsHash` is not stored in the fixture contract — it is computed dynamically from the full report payload via `computeEvaluationMetricsHash()`. Verification is done via Check 15 in the harness.

**Fixture harness (`scripts/harness/phase22a-fixture-infrastructure-check.ts`):**

- Imports `FIXTURE_IDS` from `../fixtures/visionflow-fixtures` — all canonical IDs come from the fixture contract, not hard-coded literals
- Uses `PrismaClient` with `log: []` — no noisy output
- Strict mode: exits 1 if DATABASE_URL absent — correct for CI
- All checks are read-only — no mutations
- Prisma disconnects in finally blocks — correct
- Check 9 (pipeline model reference): defensive — handles missing `yolo_onnx` node gracefully
- Check 15 (row vs JSON consistency): uses `Math.abs(r.iouThreshold - mjIou) < 0.001` for floating-point comparison — appropriate
- 18 DB integrity checks + strict-mode preflight (not counted in the 18)
- Inline Phase 20D/20E/20F equivalence checks — avoids exec overhead while maintaining harness coverage

**Meta-harness (`scripts/harness/phase22a-meta-harness.ts`):**

- Uses `execSync` with `stdio: 'inherit'` — harnesses print directly to CI log — good visibility
- Exit code captured from caught error — `status` field, not `signal`
- No shell hiding — failures surface clearly
- Does not shell to Docker or long-running services — correct
- Runs in sequence (not parallel) — correct because harnesses share the same DB

**CI wiring (`.github/workflows/ci.yml`):**

- `harness:phase22a` added after `seed:db -- --reset` in both db-harness and migration-chain — correct placement
- Existing phase20c/20d/20e/20f all preserved — no weakening
- DATABASE_URL set for each harness step — correct
- No Docker Compose added — correct (PostgreSQL service is sufficient for fixture harness)

**package.json:**

- Scripts use `--strict` flag — correct for CI
- Both `harness:phase22a` and `meta:harness:phase22a` added

## Testing

- Phase 22A fixture harness was run with a seeded database and passed all 18 checks
- Meta-harness runs all 5 harnesses (phase22a + phase20c/20d/20e/20f) in sequence
- No phase20 harness was weakened or removed

## Recommendations for Phase 22B

1. ✅ Phase 22A harness already imports `FIXTURE_IDS` from `scripts/fixtures/visionflow-fixtures.ts`
2. Use `pnpm harness:phase22a` as a prerequisite in CI before running production-path tests
3. When creating integration tests, reset the DB with `seed:db -- --reset` to ensure fixture IDs are stable
4. Phase 22B smoke commands and test fixtures can use IDs from `FIXTURE_IDS` directly

## Conclusion

Phase 22A delivers on its goal: deterministic fixture infrastructure that is minimal, correct, and non-disruptive. The fixture contract is the single source of truth for canonical IDs, and the harness validates them against the live database. No product code was changed. No harnesses were weakened. The phase sets a clean foundation for Phase 22B production-path tests.
