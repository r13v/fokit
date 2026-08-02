## 2026-08-02 16:48 — Codex

Reading Grill's relative `CONTEXT-FORMAT.md` reference → resolved it against
the skills parent directory instead of the directory containing `SKILL.md`, so
the first `sed` call failed. Resolve skill-relative references from the selected
skill's directory.

## 2026-08-02 16:49 — Codex

Adding an explicit form ID to a new React test → a context-only patch matched
an earlier `AutoForm` with the same props, so the test still used a generated
ID and failed. Include a nearby unique child when patching repeated JSX blocks.

## 2026-08-02 16:51 — Codex

Inspecting the documentation stylesheet during implementation → assumed it
lived under `src/styles`, but this Vocs site keeps `_root.css` under
`src/pages`. Use `rg --files docs-site/src | rg 'css$'` before addressing site
styles by convention.

## 2026-08-02 16:55 — Codex

Type-checking the docs immediately after changing the library's public types →
the docs resolved the stale built declarations from the local `form-please`
dependency and still treated `className` as static. Build the root package
before running the docs type-check (`npm run test:docs` already does this).

## 2026-08-02 17:01 — Codex

Manually exercising the Vocs build at `/guides/styling` → the page rendered
server HTML, but client demos could not hydrate because an ad hoc build omitted
the preview `BASE_URL` and requested its client bundle from the production
GitHub Pages origin. Use both preview variables from `site:verify:preview`
(`BASE_URL` and `BASE_PATH`) before running local browser tests.

## 2026-08-02 17:04 — Codex

Running the required Biome check after implementation → four touched files had
line wrapping that did not match the repository formatter. Apply Biome to the
touched files before the final repository-wide check.

## 2026-08-02 17:07 — Codex

Adding Tailwind through CSS-only imports → Biome rejected `@custom-variant`
until its Tailwind parser was enabled, while Knip's existing CSS compiler only
reported the font import and marked Tailwind unused. Teach both existing gates
about the actual CSS syntax/import instead of ignoring the dependency.

## 2026-08-02 17:03 — Codex

Updating the confirmed grid-scale glossary term during concurrent implementation
→ the patch context had already been replaced, so the first narrow patch did not
apply. Re-read shared documentation immediately before patching it.

## 2026-08-02 17:14 — Codex

Running package, package-test, and smoke verification in parallel → all three
commands rebuilt and cleaned the shared `dist`, so one build lost `layout.css`
during its copy step. Run verification commands that invoke `npm run build`
sequentially, even when their later checks are otherwise independent.
