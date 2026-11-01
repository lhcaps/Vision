# CI audit — VisionFlow Studio

Observed 2026-11-02. Source baseline: `7801ba9bfd71a7c8e35d988d2029c556cac1ca47` on Windows. A later local commit contains the path-test and audit changes described below. No push or hosted rerun was performed.

## Hosted baseline

The latest [CI run 27837664959](https://github.com/lhcaps/Vision/actions/runs/27837664959) and [E2E run 27837664958](https://github.com/lhcaps/Vision/actions/runs/27837664958) both ran against the baseline SHA and failed. Job and step metadata was retrieved with `gh run view --json jobs,conclusion,headSha,url`. Attempts to obtain either run's full failed logs with `gh run view --log-failed` returned HTTP 410, so the exact hosted traceback is unavailable.

| Job                                                                                         | Hosted observation                                                                                        |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Lint, Type Check, Test, Migration Chain                                                     | Passed at baseline SHA, not at the later local commit.                                                    |
| [Pytest](https://github.com/lhcaps/Vision/actions/runs/27837664959/job/82389433788)         | Failed at `python -m pytest tests/ -v`.                                                                   |
| [Format Check](https://github.com/lhcaps/Vision/actions/runs/27837664959/job/82389433809)   | Failed at `pnpm format:check`.                                                                            |
| [DB Harness](https://github.com/lhcaps/Vision/actions/runs/27837664959/job/82389550250)     | Failed at `pnpm harness:phase22a` after `db:push` and seed; cause unknown without logs or a reproduction. |
| Build                                                                                       | Skipped because upstream jobs failed. A build step in a different job is not a successful Build job.      |
| [Playwright E2E](https://github.com/lhcaps/Vision/actions/runs/27837664958/job/82389343510) | Failed at `pnpm test:e2e`; cause unknown without logs or a reproduction.                                  |

Migration Chain uses `prisma migrate deploy` while DB Harness uses `db:push`; this is an observed workflow difference, not a demonstrated cause of the failure. A previous successful CI run on a different SHA is not evidence for this baseline.

## Local reproduction and change

- `py -3.11 -m pytest tests/ -v -p no:cacheprovider` from `apps/cv-worker`, with `PYTHONDONTWRITEBYTECODE=1`: baseline **FAIL**, 43 passed / 1 failed / 1 skipped. The relative model-path test assumed the checkout path contained the case-sensitive string `Vision`, which this worktree did not.
- The absolute-path test used a Windows drive path and expected Windows separators even though the hosted runner is Linux. `PurePosixPath('D:/tmp/custom/path.onnx').is_absolute()` returns `False`. This demonstrates a platform mismatch in the test; the expired hosted logs prevent claiming it was the observed hosted failure.
- Changed only the two existing tests: assert the full expected repository-relative path and use pytest's platform-native absolute `tmp_path`. The path contract remains checked; no application code or CI gate was weakened.
- Same suite after the change, `py -3.11 -m pytest tests/ -q -rs -p no:cacheprovider`: **44 passed, 1 skipped**. The skip requires a seeded MinIO source image. Local Python was 3.11.9 with pytest 9.0.3 and other preinstalled packages, not the pinned CI dependency set (pytest 8.3.5); this result is not equivalent to a CI run.
- `pnpm install --frozen-lockfile --ignore-scripts --store-dir <local ignored cache>`: **PASS**, pnpm 10.32.1. Lifecycle scripts were explicitly disabled, so this is not a full install/build verification.
- `pnpm format:check`: **FAIL**, Prettier 3.8.3 reported style issues in 456 files. The output includes application code and tracked agent/planning material; no bulk formatting or ignore rules were applied. Re-run and triage before considering a focused formatting change.
- `docker version --format '{{.Server.Version}}'`: **FAIL**, local Docker daemon unavailable. DB Harness and E2E were not run, and no database or service was modified.

## Remaining work

Reproduce the Python suite on Linux with `requirements-dev.txt` pinned dependencies, run the full format gate after a scoped formatting strategy, reproduce the DB Harness with a disposable database and inspect the failing assertion, and run E2E with isolated infrastructure. Preserve every check and report actual results. A hosted success requires a new authorized push and a run at that exact SHA.
