## 2026-08-01 11:35 — Codex

Updating the context example's code fence → a broad patch matched the page's
first identical fence instead. Anchor documentation patches to the section
heading or include unique surrounding text.

## 2026-08-01 11:42 — Codex

Searching for `form-store` consumers → the command included a nonexistent
singular `test` directory and made `rg` exit with an error despite useful
results from `tests`. Use `src tests docs` or discover roots with `rg --files`
before a cross-tree search.

## 2026-08-01 11:47 — Codex

Running the docs preview verification → Playwright's web server repeatedly
logged `pathname must start with basePath: /brand/form-please-logo.png` even
though all 15 tests passed. Route the brand asset through the configured base
path or suppress the expected request noise.

## 2026-08-01 14:02 — Codex

Revising the Redux-like architecture section → the patch expected an earlier
heading variant and failed verification. Inspect the current section before
applying a large documentation patch, or anchor it to exact nearby text.

## 2026-08-01 14:32 — Codex

Reviewing the rewritten proposal in two adjacent `sed` ranges → the shared
boundary line appeared twice and looked like a duplicated Markdown fence. Use
non-overlapping ranges or numbered output before patching an apparent boundary
duplicate.

## 2026-08-01 16:29 — Codex

Checking proposal terminology with `rg` → an unquoted shell argument contained
Markdown backticks, so zsh tried to execute the enclosed word as a command.
Quote search patterns that contain backticks instead of embedding them directly
in the command string.

## 2026-08-01 18:03 — Codex

Reading the accepted proposal, architecture map, store, and package tests in
parallel → the combined tool output was truncated and hid entire middle
sections. Keep parallel discovery calls below the aggregate output budget or
split large source files into focused, non-overlapping reads.
