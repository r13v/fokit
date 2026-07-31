## 2026-07-31 23:16 — Codex GPT-5

Running `npm test -- tests/package/workflows.test.ts` for a package contract test → the default Vitest projects exclude `tests/package`, so the command reported no test files. Use `npx vitest run --config vitest.package.config.ts tests/package/workflows.test.ts` for focused package tests.

## 2026-07-31 23:17 — Codex GPT-5

Running the required repository check after updating a workflow contract test → Biome rejected one long assertion that the focused test runner accepted. Format touched tests before the full check, or run Biome on the changed test first.

## 2026-07-31 23:17 — Codex GPT-5

Checking the edited GitHub Actions workflow beyond YAML parsing → `actionlint` is not installed in the workspace, so only the repository's parsed workflow contract tests were available. Add `actionlint` to the development toolchain if local GitHub expression validation is desired.

## 2026-07-31 23:26 — Codex GPT-5

Checking npm and GitHub name availability with a zsh loop → using `status` as a temporary variable failed because it is read-only in zsh. Use a task-specific name such as `http_code` for shell status values.

## 2026-07-31 23:32 — Codex GPT-5

Running the documentation typecheck after renaming the local package → `docs-site/node_modules` still exposed the file dependency under its old package name, so imports from `form-please` did not resolve. Reinstall docs dependencies with `npm ci --prefix docs-site` after changing the root package name.

## 2026-07-31 23:41 — Codex GPT-5

Rebuilding the Vocs site after reinstalling its renamed local package dependency → a partially populated Vite/Vocs cache let typechecking pass but made the final SSR stage fail to resolve `form-please`. Clear `docs-site/node_modules/.vite`, `docs-site/node_modules/.cache/vocs`, and `docs-site/dist` after a package rename before rebuilding.

## 2026-07-31 23:51 — Codex GPT-5

Removing generated-image chroma-key backgrounds with the installed imagegen helper → the documented `python` command was unavailable, while the system `python3` lacked Pillow. Use the bundled workspace Python runtime for image post-processing or document its exact executable path in the skill.

## 2026-07-31 23:52 — Codex GPT-5

Searching the updated brand copy with ripgrep → unescaped backticks inside a double-quoted zsh pattern tried to execute `form-please` as a command. Quote regular expressions containing backticks with single quotes.

## 2026-08-01 00:34 — Codex GPT-5

Adding a recovery-path contract test for the publish workflow → the YAML parser normalized step-level `if: ${{ ... }}` values to the inner expression, so the first assertion expected the wrong representation. Assert the parser's normalized `github.event_name == ...` value for step conditions.

## 2026-08-01 00:38 — Codex GPT-5

Opening the release-recovery pull request through the connected GitHub integration → PR creation returned `403 Resource not accessible by integration` even though repository reads worked. Fall back to the authenticated `gh` CLI for PR creation when the integration lacks write access.
