# Phase 23 — Code Review

**Phase:** 23-Full-E2E-Demo
**Review Date:** 2026-05-05
**Reviewer:** Claude (automated + manual)

---

## Scope of Review

Files changed during Phase 23:

- `apps/web/e2e/full-vertical-slice.spec.ts` (new)
- `scripts/harness/phase23-full-e2e-check.ts` (new)
- `docs/demo/DEMO-CHECKLIST.md` (new)
- `docs/demo/README-DEMO.md` (updated)
- `README.md` (updated)
- `apps/web/playwright.config.ts` (bug fix)
- `.env` (added VITE_WEB_BASE_URL)
- `package.json` (added meta:harness:phase23 script)

---

## Review Findings

### Severity: Informational — Config fix for baseURL fallback

**File:** `apps/web/playwright.config.ts`

**Finding:** `playwright.config.ts` originally computed `baseURL` from `process.env.VITE_WEB_BASE_URL` without a fallback. When the env var was undefined, the URL construction `http://${host}:${port}` produced `http://undefined:undefined`.

**Fix applied:** Added explicit fallback to static string `'http://localhost:5173'` when env var is absent.

**Assessment:** Correct fix. The fallback to port 5173 (vs 5174) is a known local variable — the `.env` file was updated to include `VITE_WEB_BASE_URL=http://localhost:5174` and the config handles the undefined case gracefully. No risk of silent mismatch in CI since Playwright manages the web server there.

---

### Severity: Informational — Harness path resolution

**File:** `scripts/harness/phase23-full-e2e-check.ts`

**Finding:** The harness uses `__dirname` for path resolution (`.env` loading, working directory detection). This works correctly when run via `pnpm exec tsx`.

**Assessment:** Standard pattern. No issues found.

---

### Severity: Informational — .env file modification

**File:** `.env`

**Finding:** Added `VITE_WEB_BASE_URL=http://localhost:5174` to `.env`.

**Assessment:** This is a local development convenience variable only — it is NOT used by CI (which uses Playwright's built-in web server management). It does not change production behavior. Acceptable.

---

### Severity: Informational — Playwright spec had unused visibility checks (fixed in patch)

**File:** `apps/web/e2e/full-vertical-slice.spec.ts`

**Finding (original):** Tests used `lockedVisible` and `succeededVisible` as variables but never asserted them, meaning tests could pass without the canonical LOCKED/SUCCEEDED text being visible.

**Fix applied in patch:** Replaced unused variables with direct `expect().toBeVisible()` assertions:

- `await expect(page.getByText('LOCKED', { exact: false }).first()).toBeVisible()`
- `await expect(page.getByText('SUCCEEDED', { exact: false }).first()).toBeVisible()`
- Added assertions for evaluation metric labels: Precision, Recall, F1, Mean IoU, TP, Prediction overlay

**Assessment:** Tests now prove the browser actually renders seeded canonical data. Assertion strength improved from passive observation to active proof.

---

### Severity: None — Demo documentation

**File:** `docs/demo/DEMO-CHECKLIST.md`, `docs/demo/README-DEMO.md`

**Assessment:** Documentation is accurate and actionable. The README honestly notes that demo GIF/video is not committed (instructions provided) which matches the v1.1 completion criteria. Demo checklist covers all 9 steps of the manual demo path.

---

### Severity: None — README cleanup

**File:** `README.md`

**Assessment:** All stale phase status language removed. Testing section now includes Phase 23 harness commands. Demo section points to actual demo docs. Implementation status table reflects Phase 23 complete.

---

## Security Findings

None. No security-sensitive changes in this phase.

---

## Regression Assessment

**No regression introduced.** The phase:

- Does not modify any business logic
- Does not change any API routes
- Does not alter any database schema
- Does not add new environment variables that affect production
- Composes existing Phase 22A/22B harnesses (no duplication or weakening)
- Preserves all existing tests and harnesses

---

## Recommendation

**APPROVED — no blockers.** All Phase 23 deliverables meet acceptance criteria. Ready for commit.
