## 2026-07-28 16:12 — GPT-5

Checking existing source and test files for Task 1A → `rg --files src tests scripts` failed because `scripts/` does not exist yet, despite package scripts referencing a later smoke-fixture helper. A future task should add the script or defer the package command until the helper exists.

## 2026-07-28 16:18 — GPT-5

Inspecting Standard Schema declarations for Task 2 → `rg` over `node_modules/@standard-schema/spec -g '*.d.ts'` returned no matches because declarations live under `dist/`, so direct declaration-file inspection was needed. A package-aware helper or searching `dist/**/*.d.ts` first would avoid the false miss.

## 2026-07-28 16:26 — GPT-5

Searching the spec for Task 3A context → an `rg` query containing markdown backticks reached zsh unescaped, so the shell tried to execute `defaultValues`. Quote search patterns that include backticks or run a narrower `rg` query first.

## 2026-07-28 16:46 — GPT-5

Typechecking Task 4 store types → embedding recursive `FieldPath<FormInput<Schema>>` across the whole generic store interface triggered TS2589. Keep the broad store runtime surface on `PathInput` and add command-specific path typing in the later transaction/type-test slice.

## 2026-07-28 16:54 — GPT-5

Running Task 5A validation → `npm run check` failed only on Biome import ordering and formatting after the transaction edits. Running the existing `npm run check:fix` resolved it, but a pre-check formatter hook would avoid the read-only check detour.

## 2026-07-28 17:08 — GPT-5

Implementing Task 5C array state → a large `apply_patch` mixed new files and several form-store hunks, then failed on a stale interface context. Smaller patches by file avoid losing the whole edit.

## 2026-07-28 17:21 — GPT-5

Wiring Task 6A array issue reindexing → an `apply_patch` hunk missed the current `#runArrayCommand` body after earlier edits. Patch narrow function-local hunks after rereading the exact target block.

## 2026-07-28 17:39 — GPT-5

Validating Task 7 server code → focused Vitest and tsdown build passed, but `npm run typecheck` caught tuple/literal/test type issues in the new files. Keep typecheck in the local loop when adding typed public APIs, even if the task's focused command list omits it.

## 2026-07-28 17:50 — GPT-5

Writing Task 8 type-only React hook assertions → Biome's hook rule rejected module-scope hook calls and underscore-prefixed harness functions. Put type assertions inside an unrendered PascalCase component and reference it with `void ComponentName`.
