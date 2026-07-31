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
