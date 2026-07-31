Read AGENTS.md.

Project map:
- `src/core` owns the React-free form definition, store, path, transaction,
  validation, array, and resolved-UI logic.
- `src/react` owns React 18-compatible rendering, controls, slots, hooks,
  native FormData parity, and classic submit behavior.
- `src/react19` owns the isolated React 19 Action adapter. Do not import it from
  the main package.
- `src/server` owns FormData normalization, safe path parsing, Standard Schema
  validation, and `FormResult` transport types.
- `docs-site` is an English-only Vocs static documentation site published to
  GitHub Pages. Authored pages live in `docs-site/src/pages`; checked snippets
  live in `docs-site/src/snippets`.

Conventions:
- Keep the core and server entries free of React runtime imports.
- Keep `form-please/react19` declarations unreachable from the main package so React
  18 consumers can install the package.
- Control registries stay explicit. Use `nativeControls` as the shipped
  unstyled native baseline, compose it with custom `defineControl` entries, and
  never infer controls from schemas.
- `createFormKit` requires `controls` but accepts omitted or partial `slots`;
  omitted slots resolve from `createDefaultSlots()`.
- Default slots are accessible structural fallback markup, not a theme, and do
  not import `form-please/layout.css`.
- Use `parseFormData` for server Action boundaries instead of
  `Object.fromEntries`.

Verification:
- Run `npm run check` and `npm run knip` before reporting work done.
- `npm run verify` is the full package gate. `npm run site:verify` covers the
  docs-site build and browser suite.
- `npm run test:docs` builds the package and typechecks `docs-site` with its
  docs-local TypeScript compiler.
- `npm run site:verify` runs docs source tests, docs typecheck, a local-preview
  Vocs build, Markdown/output audits, Playwright docs E2E, and a final
  production-base Vocs build for the deployable artifact.
- Docs-site uses docs-only `vocs`, `waku`, `vite`, and `typescript@5.9.3`; do
  not add these to the published Form, Please package.
