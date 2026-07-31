## 2026-07-31 15:55 — GPT-5

Reading the architecture before designing complex documentation examples →
the repository guidance had recently moved `ARCHITECTURE.md` from the root to
`docs/ARCHITECTURE.md`, so the previously valid path failed. Resolve instruction
links from the current `AGENTS.md` instead of relying on earlier workspace state.

## 2026-07-31 16:15 — GPT-5

Verifying the new `/examples` static Markdown artifact → Vocs flattened the
directory index to `assets/md/examples.md` instead of emitting
`assets/md/examples/index.md`, so the first output assertion used the wrong
path. Derive index-page artifact names from an actual Vocs build before adding
exact output checks.

## 2026-07-31 16:19 — GPT-5

Starting a focused Vocs preview to inspect failed browser interactions → port
4175 was already held by a long-lived preview process, so the new server exited
with `EADDRINUSE`. Check `lsof` first and reuse the existing server, or set a
task-specific `PLAYWRIGHT_DOCS_PORT` for isolated debugging.

## 2026-07-31 16:19 — GPT-5

Running a second ad-hoc Playwright probe through `node -e` → nested shell and
JavaScript quoting produced a syntax error before the probe ran. Prefer a
focused existing Playwright test (`-g`) over a dense inline script for repeatable
browser diagnostics.

## 2026-07-31 16:33 — GPT-5

Searching for `markdownFallback` and related implementations → the search
included a nonexistent root `examples` directory and `rg` exited with a path
error after returning useful matches. Derive search roots with `rg --files` or
use the actual `docs-site/src/pages/examples` path.

## 2026-07-31 16:34 — GPT-5

Checking docs-site TypeScript settings before extracting a shared helper → the
probe assumed a conventional `docs-site/tsconfig.json`, but this workspace uses
`docs-site/tsconfig.docs.json`. Discover config filenames before passing them
as explicit `rg` paths.

## 2026-07-31 16:36 — GPT-5

Verifying the shared Markdown fallback refactor → four content tests asserted
that link-node literals lived inside every wrapper, so behavior-preserving
extraction made them fail. Test the shared helper's link contract once and each
wrapper's source-path argument instead of duplicating structural assertions.

## 2026-07-31 16:37 — GPT-5

Re-running the repository check after updating content tests → three long
assertions missed Biome's multiline formatting and failed the otherwise clean
check. Apply the formatter's suggested wrapping before the full verification
pass.

## 2026-07-31 16:38 — GPT-5

Running the Vocs build before its Markdown audit → the build exceeded the
command's 30-second output window, and the orchestration discarded its session
ID while the process continued successfully. Preserve and poll long-running
command session IDs before starting dependent verification.

## 2026-07-31 17:10 — GPT-5

Applying the empty-select compatibility fix → a context-only patch matched the
similar date input handler and produced invalid syntax before the focused test
ran. Anchor patches to the surrounding function name when handlers share the
same expression shape.
