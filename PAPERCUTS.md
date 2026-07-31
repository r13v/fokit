## 2026-07-31 13:49 — Codex

Opening the Vocs Agent Support documentation with the web reader → the reader rejected the site's raw Markdown response as an unsupported content type. Fetching the page with `curl` worked; the reader could treat `text/markdown` as readable text.

## 2026-07-31 13:50 — Codex

Running the required repository check after a README-only change → `npm run check` was blocked by eight pre-existing Biome errors in `docs-site/src/snippets/async-multiselect.tsx`. Fix or isolate that snippet so unrelated documentation edits can pass the repository gate.

## 2026-07-31 13:46 — GPT-5

Installing the documentation-only TanStack Query and icon dependencies → npm
reported unrelated transitive packages with unapproved install scripts. The
install completed; review the repository's npm `allowScripts` policy if this
warning should become actionable instead of informational.

## 2026-07-31 13:54 — GPT-5

Starting the Vocs preview with the usual Vite safety flag → `vocs preview`
rejected `--strictPort` even though it accepts host and port. Start the preview
without that flag and verify the selected port from its startup output.

## 2026-07-31 14:03 — GPT-5

Checking the new live docs example in the in-app browser → the static Vocs
preview rendered the page but did not hydrate the example in that tab and
reported no console error; the same example worked interactively through
`vocs dev`. Prefer the dev server for local interaction QA when preview
hydration cannot be observed, and keep the production build as a separate gate.

## 2026-07-31 14:04 — GPT-5

Applying the visual adjustment and papercut entry together → the patch failed
because its expected papercut wording differed from the file. Split unrelated
patches or re-read the target tail immediately before appending.

## 2026-07-31 14:18 — GPT-5

Updating the guide, styles, wrapper, and tests in one patch → a wrapped MDX
sentence did not match the expected context, so the entire patch was rejected.
Patch prose-heavy files separately after reading them with line numbers.

## 2026-07-31 14:09 — GPT-5

Hot-reloading the example after adding `@floating-ui/react` → Vite optimized
the new dependency, invalidated the mixed component/control module, and the
SSR process then reported a duplicate-React-style invalid hook call. Restart
the Vocs dev server after adding hook-based dependencies instead of trusting
that optimizer HMR cycle.

## 2026-07-31 14:13 — GPT-5

Re-reading the Product Design QA instructions → the guessed
`references/design-qa.md` path did not exist because Design QA is a nested
skill with its own `SKILL.md`. Locate plugin references with `rg --files`
before assuming their directory layout.

## 2026-07-31 14:14 — GPT-5

Stopping the Vocs preview after browser QA → the server had logged repeated
base-path errors for browser requests to `/favicon.ico`. Serve or rewrite the
favicon under `/fokit`, or make the preview handler ignore root favicon
requests, to keep local logs clean.
