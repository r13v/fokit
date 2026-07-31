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

## 2026-07-31 17:18 — GPT-5

Starting the documented Playwright docs preview → `vocs preview` ignored the
forwarded `--port 4175` argument, chose its own port, and made Playwright time
out before running tests. Set `PORT` explicitly in the preview environment, or
update `playwright.docs.config.ts` to pass the port through that variable.

## 2026-07-31 17:21 — GPT-5

Running focused docs E2E after `npm run site:build` → the build used production
origin and root routes while Playwright probes a local `/fokit/`, so readiness
and client hydration failed in separate attempts. Build with matching
`BASE_URL` and `BASE_PATH` before invoking the docs E2E config directly, or add
a focused script that wires all three preview environment variables.

## 2026-07-31 17:58 — GPT-5

Carrying the full path/value-correlated `ValueChange<Input>` union through
generic store and React option types → TypeScript hit excessive instantiation
depth in otherwise small fixtures and then lost unrelated hook inference.
Keep the correlated public type concrete at consumer boundaries while using a
wide runtime hook shape inside generic implementations, or redesign the path
union to defer expansion.

## 2026-07-31 18:39 — GPT-5

Checking fragment-brand variance with the TypeScript compiler API → the root
TypeScript 7 package exposes only its native CLI/version surface, so
`createCompilerHost` was unavailable. Use the docs workspace's TypeScript 5.9
compiler API for in-memory semantic checks until the native package exposes a
compatible API.

## 2026-07-31 18:48 — GPT-5

Updating the accepted contracts across architecture, specification, and site
guides in one patch → one stale architecture paragraph caused the complete
multi-file patch to be rejected. Split cross-document edits into smaller
patches after reading each exact paragraph, especially when earlier formatting
passes may have changed line wrapping.

## 2026-07-31 18:55 — GPT-5

Adding fragment coverage to the packed React 18 fixture → TypeScript 5.4 hit
its instantiation-depth limit while a mapped `DefinitionFragmentPath` inferred
an otherwise small object scope. Express the path filter as a distributive
conditional helper so older consumer compilers evaluate one path at a time.

## 2026-07-31 20:37 — GPT-5

Adding the transaction-hooks guide and snippet in one patch → one wrapped MDX
line missed its diff marker, so `apply_patch` rejected the complete patch.
Split new files into separate patches or validate every wrapped added line.

## 2026-07-31 20:39 — GPT-5

Checking the new guide's contract text → a content-test regexp assumed one
physical line, but normal MDX wrapping split the sentence. Match whitespace
with `\s+` when a prose assertion can cross formatted lines.

## 2026-07-31 20:40 — GPT-5

Building the docs site after adding a guide → Vocs rejected nine pre-existing
`twoslash` fences in `advanced.mdx` and `api.mdx` because they contain
pseudo-signatures or undeclared JSX. Mark pseudocode as text or make each
example self-contained before using `twoslash`.

## 2026-07-31 22:21 — GPT-5

Running the required repository check after a documentation-only architecture
session → Biome reported the unrelated `readOptionalFile` helper in
`tests/package/release-contract.test.ts` as unused. Remove the stale helper or
restore its intended caller so clean checks do not retain a warning.

## 2026-07-31 22:23 — GPT-5

Trying to verify only the changed glossary, ADR, and papercut Markdown files →
Biome ignores all three paths and exits with `No files were processed`. Use
the repository-wide check plus `git diff --check`, or add a dedicated Markdown
lint command for documentation-only changes.
