## 2026-08-01 01:39 — GPT-5

Inspecting a historical GitHub Actions job log with `gh run view --job --log` → every line was labeled `UNKNOWN STEP`, so filtering the log by step name returned nothing. Use the Actions jobs API for step boundaries and timestamps, then inspect the raw log only for command-level gaps.

## 2026-08-01 01:45 — GPT-5

Encoding a literal GitHub Actions concurrency expression in a workflow contract test → Biome treated the embedded `${{ ... }}` as a suspicious template placeholder inside a normal string. Build each dollar-prefixed expression fragment separately, as the existing matrix assertion does.

## 2026-08-01 01:46 — GPT-5

Running the docs preview validation with `CI=true` → an existing Vocs preview process for this workspace had already occupied port 4175 for over 30 minutes, and Playwright correctly refused to reuse it in CI mode. Validate on an alternate `PLAYWRIGHT_DOCS_PORT` with the build's `BASE_URL` changed to the same port, or stop the known preview process first.

## 2026-08-01 01:47 — GPT-5

Running docs Playwright tests against the Vocs preview → all tests passed, but the preview server repeatedly logged `pathname must start with basePath` for `/favicon.ico` and `/brand/form-please-logo.png`. The recently added root-relative asset URLs should likely include the configured `/form-please` base path or use Vocs-aware asset resolution.

## 2026-08-01 01:50 — GPT-5

Checking the modified GitHub Actions workflows → `actionlint` is not installed in the workspace environment. The repository's YAML parsing and exact workflow contract tests cover the changes, but adding `actionlint` to local tooling would catch GitHub expression/schema mistakes earlier.
