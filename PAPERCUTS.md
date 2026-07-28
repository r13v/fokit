## 2026-07-28 16:12 — GPT-5

Checking existing source and test files for Task 1A → `rg --files src tests scripts` failed because `scripts/` does not exist yet, despite package scripts referencing a later smoke-fixture helper. A future task should add the script or defer the package command until the helper exists.

## 2026-07-28 16:18 — GPT-5

Inspecting Standard Schema declarations for Task 2 → `rg` over `node_modules/@standard-schema/spec -g '*.d.ts'` returned no matches because declarations live under `dist/`, so direct declaration-file inspection was needed. A package-aware helper or searching `dist/**/*.d.ts` first would avoid the false miss.
