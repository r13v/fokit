# Implement Fokit v1

## Overview

Implement the complete Fokit v1 npm library described by
`docs/SPEC.md`. Fokit is a code-first, schema-validated form library with a
React-free core, generated React forms, application-owned controls and slots,
granular subscriptions, safe `FormData` parsing, an optional React 19 Action
adapter, and opt-in structural CSS.

The implementation must deliver all public subpaths:

- `fokit`;
- `fokit/core`;
- `fokit/react19`;
- `fokit/server`;
- `fokit/layout.css`.

It must also deliver a bilingual tutorial and interactive documentation site,
deploy that site to GitHub Pages, and publish reviewed GitHub Releases to npm
through the repository's trusted `publish.yml` workflow.

Implementation proceeds as dependency-ordered vertical slices. Each task starts
with a failing test for the contract being added, implements the smallest code
that passes, and runs its focused checks before the next task begins.

Completion means:

- all public APIs and behavioral rules in `docs/SPEC.md` are implemented;
- the main package works with React 18 and React 19;
- React 19-only APIs are unreachable from main-package declarations;
- `fokit/core` and `fokit/server` contain no React runtime import;
- schema input and output types are inferred through Standard Schema;
- paths, transactions, validation, arrays, rendering, submission, reset, error
  exposure, and server parsing follow the specification;
- generated forms meet the documented DOM, ARIA, class, data-attribute, and
  `FormData` contracts;
- ESM, CommonJS, declarations, CSS, and every export survive `npm pack`;
- all unit, property, type, DOM, browser, package, React 18, React 19, and Next.js
  smoke tests pass;
- the English and Russian tutorials lead from installation to a working form,
  and the interactive site exercises Fokit's built public package exports;
- GitHub Pages deploys the tested `docs-site/dist` artifact at
  `https://r13v.github.io/fokit/`;
- a maintainer-selected version newer than `0.0.1` is published by
  `publish.yml` through npm OIDC, without a stored npm token or permitting an
  already-published version;
- a clean consumer installs that exact version from npm and builds the
  tutorial's first form;
- `npm run verify` succeeds from a clean install.

## Context

### Repository state

- `docs/SPEC.md` is the normative v1 product and API specification.
- `docs/adr/0001-styling-and-layout-boundary.md` is the accepted styling ADR.
- `README.md` currently announces the specification but not an implemented
  package.
- Task 1 has established the TypeScript/build/test package foundation;
  remaining implementation starts at Task 1A.
- `package.json` is currently version `0.0.1`, while `package-lock.json` still
  records `0.0.0`. Reconcile that mismatch with npm before any release, and do
  not reset the package to the earlier scaffold version.
- npm already contains the public `fokit@0.0.1` package. Its trusted publisher
  is configured for `r13v/fokit` and the exact workflow filename
  `publish.yml`, with npm publish and staged-publish permissions.
- There is no `docs-site/`, GitHub Pages workflow, or npm publication workflow
  yet.
- `/Users/user/Projects/ecsplain/docs-site` is the local product reference for
  the tutorial site's information architecture and interaction quality. Fokit
  must be implemented independently and must not copy reference source.
- The reference's OpenAI Sites worker and `.openai/hosting.json` are not
  relevant: Fokit targets GitHub Pages only.
- `biome.json`, `knip.json`, and `lefthook.yml` already exist.
- `AGENTS.md` requires `npm run check` and `npm run knip` before completion.
- `CLAUDE.md` delegates repository guidance to `AGENTS.md`.
- The user-owned `fokit-0.0.1.tgz` and unrelated working-tree changes must be
  preserved and not rewritten as part of this implementation.

### Selected implementation approach

- Scope: the complete v1 specification, not a core-only MVP.
- Sequencing: dependency-ordered vertical slices, with a usable and tested
  contract at the end of every task.
- Testing: strict TDD for behavior and public types. Toolchain bootstrapping is
  verified immediately but does not require a synthetic failing behavior test.
- Package manager: npm and the committed `package-lock.json`.
- Bundler: `tsdown`, with explicit entries and dual ESM/CommonJS output.
- Unit/integration runner: Vitest.
- Test environments: Node for core/server and jsdom with React Testing Library
  for React integration.
- Browser layout verification: Playwright Chromium.
- Property/fuzz testing: fast-check.
- Package validation: publint and `@arethetypeswrong/cli`.
- Standard Schema types: regular dependency on `@standard-schema/spec`,
  imported with `import type`; no schema implementation is a runtime
  dependency.
- Root development runtime: current React 19.
- Compatibility fixtures: React `18.3.1` with TypeScript `5.4.5`, and React
  `19.2.8` with the repository's current TypeScript release.
- Declaration routing: each JavaScript subpath uses nested `import` and
  `require` conditions. The `types` condition inside `import` points to
  `dist/*.d.ts`; the `types` condition inside `require` points to
  `dist/*.d.cts`. A final top-level `default` points to the ESM JavaScript
  file.
- Package analysis: Are the Types Wrong runs the `node16` profile against the
  four JavaScript entry points only. CSS resolution is verified separately by
  package assertions and the Vite fixture.
- Documentation: a separate `docs-site/` npm package using Vite, React, plain
  JavaScript/JSX, hash routes, and complete English/Russian content.
- Documentation hosting: GitHub Pages project site under `/fokit/`; no custom
  domain or server runtime.
- Release publication: stable GitHub Releases trigger npm trusted publishing
  from `.github/workflows/publish.yml`.

### Tooling references

- tsdown supports ESM/CommonJS output, declarations, explicit entries, external
  dependencies, and package validation:
  <https://tsdown.dev/guide/how-it-works>.
- Rolldown entry directives and `"use client"` behavior are documented at
  <https://rolldown.rs/in-depth/directives>.
- Standard Schema publishes its public types through
  `@standard-schema/spec`: <https://standardschema.dev/schema>.
- Vitest CLI runs in watch mode unless `run` is explicit:
  <https://vitest.dev/guide/cli>.
- Vitest projects allow Node and jsdom suites to run in one invocation:
  <https://vitest.dev/guide/projects.html>.
- TypeScript supports condition-specific declaration targets for ESM and
  CommonJS package exports:
  <https://www.typescriptlang.org/docs/handbook/modules/reference.html#example-explicit-types-condition>.
- publint can validate a packed tarball:
  <https://publint.dev/docs/cli>.
- npm trusted publishing requires an exact GitHub workflow filename, an
  OIDC-capable GitHub-hosted runner, `id-token: write`, Node `22.14.0` or newer,
  and npm CLI `11.5.1` or newer:
  <https://docs.npmjs.com/trusted-publishers/>.
- GitHub Pages custom workflows use the Pages configuration, artifact upload,
  and deployment actions with `pages: write` and `id-token: write`:
  <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>.

### Dependency policy

Runtime dependencies:

- `@standard-schema/spec@1.1.0` as a type-only public dependency.

Peer dependencies:

- `react: ^18.0.0 || ^19.0.0`;
- `react-dom: ^18.0.0 || ^19.0.0`.

Development dependencies added to the existing tools:

- React `19.2.8` and React DOM `19.2.8`;
- `@types/react@19.2.17` and `@types/react-dom@19.2.3`;
- `tsdown@0.22.14`;
- `vitest@4.1.10` and `jsdom@30.0.0`;
- `@testing-library/react@16.3.2`;
- `@testing-library/user-event@14.6.1`;
- `fast-check@4.9.0`;
- `@playwright/test@1.62.0`;
- `publint@0.3.22`;
- `@arethetypeswrong/cli@0.18.5`;
- `zod@4.4.3` only as a Standard Schema test implementation.

The separate `docs-site/package.json` uses exact versions:

- React and React DOM `19.2.8`;
- `@phosphor-icons/react@2.1.10`;
- `@vitejs/plugin-react@6.0.4`;
- `vite@8.1.5`;
- `zod@4.4.3`;
- `fokit: "file:.."`, built by the root script before the site starts or
  builds.

Do not add a state manager, class-name helper, middleware framework, schema
adapter, CSS-in-JS library, ID package, or form library dependency.

### Commands established by this plan

`package.json` must expose these non-interactive commands:

- `npm run build` — build all JavaScript, declaration, and CSS entries;
- `npm run check` — read-only Biome check;
- `npm run check:fix` — apply Biome fixes;
- `npm run typecheck` — typecheck source and test configuration;
- `npm run test` — run Vitest unit and DOM tests once;
- `npm run test:watch` — run Vitest in watch mode;
- `npm run test:types` — build, then compile public API type tests;
- `npm run test:browser` — run Playwright layout/browser tests;
- `npm run test:package` — build and run packed-output assertions;
- `npm run test:smoke` — pack the library and build all consumer fixtures;
- `npm run package:check` — build, run publint, and run Are the Types Wrong;
- `npm run test:docs` — compile documentation examples without emitting;
- `npm run site:dev` — build Fokit, then start the docs-site Vite server;
- `npm run site:build` — build Fokit, then build the static docs site;
- `npm run site:test` — run docs-site content and routing tests;
- `npm run site:test:e2e` — run the docs-site Playwright suite;
- `npm run site:verify` — test, build, and browser-test the docs site;
- `npm run knip` — find unused files, exports, and dependencies;
- `npm run verify` — run the complete release-equivalent local suite.

## Review Handoff

- Original request: create a complete implementation plan for the new Fokit
  library defined by `docs/SPEC.md`, then extend it with an approachable
  tutorial, an interactive site modeled on the quality bar of the local
  ECSplain docs site, GitHub Pages deployment, and npm publication from
  `publish.yml`.
- Key decisions:
  - implement the whole v1;
  - use TDD;
  - own the store and renderer rather than wrapping another form library;
  - support React 18 and React 19 from the first release;
  - keep React 19 Actions in `fokit/react19`;
  - use server-first validation for Action submission;
  - ship optional structural CSS, never an automatic theme;
  - emit ESM and CommonJS with declarations;
  - route ESM consumers to `.d.ts` and CommonJS consumers to `.d.cts` through
    condition-specific declaration targets;
  - run core/server tests under Node and React tests under jsdom;
  - use strict canonical dot paths and bounded safe `FormData` parsing;
  - keep the docs site as a separate bilingual Vite/React package with hash
    routing and a real Fokit-powered learning lab;
  - deploy the static artifact at the GitHub Pages project path `/fokit/`;
  - publish the maintainer-selected v1 version only from a reviewed stable
    GitHub Release with an exact `v<package version>` tag.
- Explicit non-goals:
  - migration or compatibility APIs;
  - TanStack Form or React Hook Form wrappers;
  - a custom validation language;
  - schema-to-UI inference;
  - remote JSON form definitions;
  - a visual builder or visual theme;
  - middleware/plugin/effects pipelines;
  - wizards, autosave, async option loading, devtools, or React Native;
  - a generated API-reference system, documentation CMS, analytics, custom
    domain, or OpenAI Sites worker;
  - executing React 19 server Actions inside the static GitHub Pages site;
  - automatic version bumps, changelog generation, prerelease channels, or
    publication from branch pushes.
- Open questions: confirm the EN/RU scope before Task 15A if the maintainer now
  wants an English-only launch. This plan defaults to both languages because
  the requested local reference is bilingual and the requester is
  Russian-speaking; removing one locale is a deliberate scope reduction, not
  an implementation detail.
- Assumptions:
  - GitHub Actions is the intended CI provider because the repository remote is
    GitHub;
  - the repository remains public and GitHub Pages is configured to deploy from
    GitHub Actions;
  - Chromium is sufficient for automated layout verification; cross-browser
    manual checks remain post-completion;
  - complete English and Russian coverage is required, matching the local
    reference's language model;
  - the npm trusted publisher shown by the maintainer remains bound to
    `r13v/fokit` and `publish.yml`, with no GitHub Environment constraint;
  - maintainers choose and commit versions and create the corresponding GitHub
    Release explicitly; Task 15G makes that approval a blocking release gate
    and the workflow validates and publishes the approved release;
  - independently implement behavior; do not copy unlicensed local reference
    source.
- Hidden context: none. This plan is self-contained for a fresh executor.

## Development Approach

- Use red-green-refactor for every behavioral or type contract:
  1. add one focused failing runtime or declaration test;
  2. run it and confirm the expected failure;
  3. add the minimum implementation;
  4. run the focused test;
  5. refactor only after it passes.
- Complete each task fully before moving to the next.
- Every code-change task includes new or updated tests in the same task.
- Tests explain why behavior matters, especially around hidden fields,
  transactions, stale validation, reset baselines, Action races, and hostile
  `FormData`.
- Preserve public immutability and module boundaries instead of exposing
  internal mutable objects for test convenience.
- Prefer plain functions and small modules. Introduce an abstraction only when
  at least two concrete callers require the same behavior.
- Keep React-free algorithms under `src/core/` and server-only parsing under
  `src/server/`.
- Do not add a second controlled/uncontrolled state model.
- Update this plan immediately when implementation discoveries change scope.
- Do not rely on chat history; record new decisions in this file and, for
  architectural changes, in `docs/adr/`.

## Testing Strategy

### Test locations

- Colocated core tests: `src/core/*.test.ts`.
- Colocated React tests: `src/react/*.test.tsx`.
- React 19 tests: `src/react19/*.test.{ts,tsx}`.
- Server tests: `src/server/*.test.ts`.
- Public type tests: `tests/types/*.test.ts` compiled with `tsc --noEmit`.
- Packed output tests: `tests/package/*.test.ts`.
- Browser layout tests: `tests/browser/*.spec.ts`.
- Docs-site unit tests: `docs-site/src/*.test.mjs`.
- Docs-site browser tests: `tests/browser/docs-site.spec.ts`.
- Consumer fixtures: `tests/fixtures/*`.

### Test levels

- Unit tests cover paths, cloning/equality, UI resolution, state derivation,
  transactions, validation, issue exposure, and safe parsing.
- Vitest's `node` project runs core and server tests without DOM globals.
- Vitest's `jsdom` project runs React 18/19 integration tests with
  `tests/setup.ts`.
- Property tests generate canonical and hostile paths, nested updates, array
  operations, and malicious `FormData` names.
- Type tests cover inference, complete `defaultValues`, definition- and
  command-level optional-only unset, invalid controls, deep partial updates,
  relative array paths, context requirements, and subpath isolation.
- DOM tests cover subscriptions, render counts, controls, slots, arrays,
  accessibility, focus, reset, native `FormData`, SSR, hydration, and Strict
  Mode.
- Browser tests cover CSS container-query tiers, spans, variables, the
  one-column fallback, and docs-site routing, locale, keyboard focus,
  responsive navigation, and the live form.
- Package tests inspect built directives, exports, side effects, declaration
  reachability, CSS isolation, release metadata, and both workflow contracts.
- Docs-site content tests require every curriculum lesson in both English and
  Russian, validate hash-route helpers, and reject broken lesson links.
- Smoke fixtures install the actual `.tgz` and build with React 18, React 19,
  Next.js, ESM Node, and typed/runtime CommonJS Node.
- Unit, DOM, and browser commands fail when their configured test set is empty.

### Required final commands

```sh
npm ci
npm ci --prefix docs-site
npx playwright install chromium
npm run verify
npm run site:verify
npm pack --dry-run
git diff --check
```

## Progress Tracking

- Mark completed items with `[x]` immediately after their focused tests pass.
- Add newly discovered tasks with a `+` prefix under the affected task.
- Record blockers with a `BLOCKED:` prefix and the exact failing command.
- Keep this plan synchronized with the implementation.
- Do not mark a task complete while its required tests are failing.

## What Goes Where

- Implementation Steps contain repository work plus the explicitly requested
  maintainer-gated GitHub Pages and npm release actions in Task 15G.
- Post-Completion contains external settings and manual
  cross-browser/accessibility/release work that cannot be completed from the
  repository.
- Deferred features remain in `docs/SPEC.md`; do not turn them into unchecked
  implementation tasks.

## Implementation Steps

### Task 1: Establish the package, build, and test foundation

**Why:** Every later TDD slice needs deterministic builds, non-watch test
commands, public entry points, and package metadata matching the specification.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `biome.json`
- Modify: `knip.json`
- Modify: `lefthook.yml`
- Replace: `src/index.ts`
- Create: `LICENSE`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `tsdown.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.package.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `src/core/index.ts`
- Create: `src/react19/index.ts`
- Create: `src/server/index.ts`
- Create: `src/layout.css`
- Create: `tests/package/package-metadata.test.ts`

- [x] Replace the `npm init` metadata with the initial private-development
  version `0.0.0`, `type: "module"`, MIT license, `files: ["dist"]`,
  `sideEffects: ["**/*.css"]`, the peer ranges from `docs/SPEC.md`, and exact
  conditional exports for `.`, `./core`, `./react19`, `./server`,
  `./layout.css`, and `./package.json`. The package is now publicly released as
  `0.0.1`; later tasks must preserve or intentionally advance that version,
  never reset it to `0.0.0`.
- [x] Add the selected dependencies and regenerate `package-lock.json` with
  npm; do not manually edit lockfile package records.
- [x] Add the initial build, check, type, test, package, smoke, and verification
  commands without watch mode or source mutation. Task 15A adds `test:docs` to
  `npm run verify` when compiled examples exist.
- [x] Make `npm run check` read-only and move mutations to `npm run check:fix`.
- [x] Make `npm run test` use `vitest run`; retain watch behavior only in
  `npm run test:watch`.
- [x] Configure strict TypeScript with `jsx: "react-jsx"`,
  `moduleResolution: "Bundler"`, `verbatimModuleSyntax`, DOM libraries, and
  `noEmit` for normal typechecking.
- [x] Configure tsdown entries named `index`, `core`, `react19`, and `server`,
  copy `layout.css` into `dist`, and configure dual `esm`/`cjs` output,
  declarations, source maps, dependency externalization, clean `dist`, and
  strict entry signatures.
+ [x] Copy `layout.css` instead of treating it as a direct entry: Rolldown
  removed direct CSS-entry support, and routing it through a synthetic
  JavaScript entry would publish undocumented `layout.js` artifacts.
- [x] Put `"use client"` at the top of `src/index.ts` and
  `src/react19/index.ts`; do not add it to core or server entries.
- [x] Create minimal entry modules without product behavior so the build can
  prove filenames and directive boundaries.
- [x] Add the MIT license text to `LICENSE`.
- [x] Write `tests/package/package-metadata.test.ts` first to assert package
  name, version, license, peer ranges, closed exports, CSS side effects, and
  absence of legacy scaffold fields.
- [x] Run `npm run build` and confirm `dist/index.js`, `dist/index.cjs`,
  `dist/core.js`, `dist/core.cjs`, `dist/react19.js`, `dist/react19.cjs`,
  `dist/server.js`, `dist/server.cjs`, declarations, and `dist/layout.css`
  exist. Sourcemaps are enabled; tsdown does not emit `.map` files for the
  intentionally empty chunks and will emit them once implementation exists.
- [x] Run `npm run test:package`, `npm run check`, `npm run typecheck`, and
  `npm run knip` before Task 1A.

### Task 1A: Correct declaration routing and test-environment foundations

**Why:** Task 1 exposed two release-blocking bootstrap mismatches: CommonJS
consumers resolve ESM declarations, and core/server tests currently receive
jsdom globals despite the DOM-free package contract.

**Files:**

- Modify: `package.json`
- Modify: `docs/SPEC.md`
- Modify: `knip.json`
- Modify: `vitest.config.ts`
- Modify: `tests/package/package-metadata.test.ts`

- [x] Update the four JavaScript subpath exports in `package.json` and the
  normative package example in `docs/SPEC.md` to nested `import` and `require`
  objects. Use `index.d.ts`/`index.js` and `index.d.cts`/`index.cjs` for `"."`;
  `core.d.ts`/`core.js` and `core.d.cts`/`core.cjs` for `"./core"`;
  `react19.d.ts`/`react19.js` and `react19.d.cts`/`react19.cjs` for
  `"./react19"`; and `server.d.ts`/`server.js` and
  `server.d.cts`/`server.cjs` for `"./server"`. Paths are under `./dist/`.
  Keep `types` first inside each nested condition and retain the ESM `.js`
  target as each subpath's final top-level `default`.
- [x] Extend `tests/package/package-metadata.test.ts` first so the old
  top-level declaration routing fails and all four subpaths must point ESM and
  CommonJS consumers to their matching declaration formats.
- [x] Change `npm run package:check` to run
  `attw --pack . --profile node16 --entrypoints . ./core ./react19 ./server`
  after build and publint. Do not ignore `false-esm`, `false-cjs`, or
  `no-resolution`; CSS is intentionally outside ATTW and remains covered by
  package and Vite tests.
- [x] Configure a named inline Vitest `node` project that includes
  `src/core/**/*.test.ts` and `src/server/**/*.test.ts` with
  `environment: "node"`. Task 8 adds the `react` project immediately before
  the first React test is created.
- [x] Remove Vitest's bootstrap-only `passWithNoTests` setting. Task 2 creates
  the first Node-project test before invoking `npm run test`.
- [x] Keep Knip passing while the React test setup is staged by ignoring
  `tests/setup.ts` and the future React test dependencies until Task 8 wires
  the React project back into Vitest.
- [x] Run `npm run build`, `npm run test:package`,
  `npm run package:check`, `npm run typecheck`, `npm run check`, and
  `npm run knip` before Task 2.

### Task 2: Implement Standard Schema types and canonical deep paths

**Why:** Every definition, store command, issue, subscription, and `FormData`
entry depends on one safe runtime and compile-time path model.

**Files:**

- Create: `src/core/standard-schema.ts`
- Create: `src/core/path-types.ts`
- Create: `src/core/path.ts`
- Create: `src/core/path.test.ts`
- Create: `tests/types/core-paths.test.ts`
- Modify: `src/core/index.ts`

- [x] Write failing type tests for `FormInput`, `FormOutput`, `FieldPath`,
  `ArrayFieldPath`, `PathValue`, relative array paths, optional paths, literal
  unions, and array indexes.
- [x] Write failing runtime and fast-check tests for canonical paths such as
  `address.city` and `contacts.0.value`.
- [x] Test rejection of brackets, empty segments, dotted property names,
  numeric object keys, signed/zero-padded indexes, `__proto__`, `prototype`,
  `constructor`, and top-level `__fokit`.
- [x] Implement public Standard Schema aliases using
  `@standard-schema/spec` type imports.
- [x] Implement TypeScript 5.4-compatible recursive path utilities without
  widening valid literal paths to `string`.
- [x] Implement a single runtime path parser that returns immutable normalized
  segments and is reused by every later runtime entry point.
- [x] Implement path formatting, ancestor/equality/descendant overlap checks,
  and bounded index parsing without object traversal.
- [x] Export only the documented public path and schema types/functions from
  `src/core/index.ts`.
- [x] Run `npm run build`,
  `npm run test -- --project node src/core/path.test.ts`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 3A.

### Task 3A: Implement immutable value operations and dirty equality

**Why:** Store snapshots and transactions need one acyclic, structurally
shared value model before definitions or state are added.

**Files:**

- Create: `src/core/value.ts`
- Create: `src/core/value.test.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests for structural cloning, structural sharing, deep get,
  set, unset, deep partial merge, and documented dirty equality.
- [x] Add error tests for cyclic input and invalid traversal without mutating
  the original value.
- [x] Implement primitives with `Object.is`, arrays/plain objects recursively,
  `Date` timestamps, and identity semantics for other non-plain values.
- [x] Export only the documented value utilities required by later public core
  APIs.
- [x] Run
  `npm run test -- --project node src/core/value.test.ts`,
  `npm run typecheck`, `npm run check`, and `npm run knip` before Task 3B.

### Task 3B: Define and validate React-free form definitions

**Why:** The store and renderer need one normalized, typed definition whose
control metadata remains independent of React components.

**Files:**

- Create: `src/core/computed.ts`
- Create: `src/core/control-types.ts`
- Create: `src/core/ui-types.ts`
- Create: `src/core/definition.ts`
- Create: `src/core/definition.test.ts`
- Modify: `src/core/index.ts`

- [x] Write failing runtime tests for duplicate paths/IDs, bad IDs, unknown
  controls, invalid spans/columns, invalid relative paths, and invalid
  `valuePolicy`.
- [x] Define React-free control registry metadata, `FormDataEntrySpec`,
  `ControlFormData`, field/section/array nodes, layout enums, and
  `computed(dependencies, resolver)`.
- [x] Keep computed resolvers synchronous, explicitly dependent, typed by
  context, and unable to access form commands.
- [x] Implement definition normalization and immutable indexing by node ID and
  canonical path.
- [x] Run
  `npm run test -- --project node src/core/definition.test.ts`,
  `npm run typecheck`, `npm run check`, and `npm run knip` before Task 3C.

### Task 3C: Resolve computed and inherited UI state

**Why:** Transactions and rendering need deterministic pure UI resolution
before the store starts reacting to context and value changes.

**Files:**

- Create: `src/core/resolve-ui.ts`
- Create: `src/core/resolve-ui.test.ts`
- Modify: `src/core/computed.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests for labels, descriptions, options, required state,
  layout, context, and inherited visible/disabled/read-only precedence.
- [x] Implement `resolveUi` as a synchronous, React-free operation over a
  normalized definition, input values, and read-only context.
- [x] Test that computed resolvers rerun only when a declared dependency or
  runtime-context reference changes.
- [x] Test that unrelated value changes reuse resolved computed results.
- [x] Run
  `npm run test -- --project node src/core/resolve-ui.test.ts`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 4.

### Task 4: Implement the external store, snapshots, subscriptions, and metadata

**Why:** React and imperative APIs need one stable, cached, immutable source of
truth with granular selectors.

**Files:**

- Create: `src/core/form-state.ts`
- Create: `src/core/metadata.ts`
- Create: `src/core/form-store.ts`
- Create: `src/core/form-store.test.ts`
- Create: `src/core/subscriptions.test.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests for construction from complete `defaultValues`,
  stable store identity, cached snapshots, and immutable state reads.
- [x] Write render-independent selector tests proving unrelated path listeners
  are not notified and equality defaults to `Object.is`.
- [x] Implement `FormState` with values, form/field issues, dirty/touched
  aggregates, validating/submitting flags, validation status, and submit count.
- [x] Keep baseline values and internal field/array metadata outside submitted
  form data.
- [x] Implement `getValues`, `getValue`, `subscribe`, focus/ref registration,
  touch/blur metadata, and post-commit listener notification.
- [x] Ensure context replacement reevaluates UI without becoming form data,
  dirty state, or a normal value update.
- [x] Test context replacement with no resulting `valuePolicy` change and
  assert values, baseline, dirty state, and update-hook counts are unchanged.
- [x] Ensure `defaultValues` and schema/definition identity are fixed for one
  instance; later record data must use reset or a new instance.
- [x] Test listener unsubscribe, custom equality, no-op commits, and
  mutation attempts against returned snapshots.
- [x] Run
  `npm run test -- --project node src/core/form-store.test.ts src/core/subscriptions.test.ts`,
  `npm run typecheck`, `npm run check`, and `npm run knip` before Task 5A.

### Task 5A: Implement atomic value transactions, hooks, and batches

**Why:** Every value-changing command needs one observable mutation boundary
before reset, arrays, validation, or React controls are layered on top.

**Files:**

- Create: `src/core/transaction.ts`
- Create: `src/core/transaction.test.ts`
- Create: `tests/types/commands.test.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/form-state.ts`
- Modify: `src/core/index.ts`

- [x] Write failing runtime and type tests for `setValue`, deep `setValues`,
  optional-only `unsetValue`, ordered overlap, no-op transactions, and batches.
- [x] Implement ordered transaction normalization with last-overlap-wins
  semantics and one atomic commit.
- [x] Test `beforeUpdate` accept/cancel/replace behavior, replacement
  normalization, nested-command rejection, and thrown-hook semantics.
- [x] Test `onUpdate` once per commit, post-commit exception behavior, nested
  follow-up transactions, and no calls for metadata-only updates.
- [x] Implement nested batches as one outer transaction and abort the entire
  uncommitted batch when a command or callback throws.
- [x] Add fast-check state-machine tests comparing random set/unset/batch
  sequences with a simple reference model.
- [x] Run
  `npm run test -- --project node src/core/transaction.test.ts`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 5B.

### Task 5B: Implement reset and visibility-driven value policies

**Why:** Baseline replacement and automatic hidden-field unsets must reuse the
transaction boundary without introducing loops or partial reset metadata.

**Files:**

- Create: `src/core/reset.test.ts`
- Create: `src/core/value-policy.test.ts`
- Modify: `src/core/transaction.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/form-state.ts`

- [x] Write failing tests for same-value reset, new baseline reset,
  cancellation, replacement-baseline semantics, and update-hook call counts.
- [x] Implement reset so changed values pass through the transaction pipeline,
  successful committed values become the baseline, and cancelled resets apply
  no reset metadata.
- [x] Expand visibility-driven `valuePolicy` changes to stability before
  `beforeUpdate`, and include all effective changes in `onUpdate`.
- [x] Test that invisible `valuePolicy: "unset"` fields converge without
  update loops and that a context-only visibility change creates one separate
  `source: "valuePolicy"` transaction.
- [x] Leave source-specific issue clearing to Task 6A, where the issue model is
  introduced; reset dirty/touched/submission metadata here.
- [x] Run
  `npm run test -- --project node src/core/reset.test.ts src/core/value-policy.test.ts`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 5C.

### Task 5C: Implement array commands and stable row metadata

**Why:** Arrays require deterministic row identity and atomic index
normalization before React bindings and issue reindexing are added.

**Files:**

- Create: `src/core/array-state.ts`
- Create: `src/core/array-state.test.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/metadata.ts`
- Modify: `src/core/index.ts`
- Modify: `tests/types/commands.test.ts`

- [x] Write failing runtime and type tests for append, insert, remove, and move
  with complete/cloned `itemDefault` values.
- [x] Implement deterministic per-store row keys and reindex dirty/touched
  row metadata by stable key without adding keys to submitted values.
- [x] Add explicit rejection tests for malformed runtime paths, non-array
  targets, sparse/out-of-range indexes, and invalid move destinations.
- [x] For every rejected array command, assert values and metadata are
  unchanged, no subscriber is notified, and neither update hook is called.
- [x] Add fast-check array-command sequences against a simple value/key
  reference model.
- [x] Run
  `npm run test -- --project node src/core/array-state.test.ts`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 6A.

### Task 6A: Implement issue storage, exposure, clearing, and reindexing

**Why:** Source ownership and display exposure need a complete model before
schema validation starts replacing issues asynchronously.

**Files:**

- Create: `src/core/issues.ts`
- Create: `src/core/issues.test.ts`
- Modify: `src/core/form-state.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/array-state.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests for raw errors versus `displayErrors`,
  overlap-based exposure, submit exposure, immediate manual/server exposure,
  and invisible-owner summary routing metadata.
- [x] Implement atomic manual/server source replacement, `setErrors`,
  `clearErrors`, edit-driven stale server clearing, reset clearing, and no
  value-update hooks for error-only commits.
- [x] Map unsupported Standard Schema issue paths to form-level issues without
  attempting unsafe traversal.
- [x] Test that insert/move preserve and reindex manual issues and exposure by
  row key; removal drops row metadata.
- [x] Test that edits and array operations clear overlapping server issues,
  including form-level server issues, without clearing manual issues.
- [x] Run
  `npm run test -- --project node src/core/issues.test.ts src/core/array-state.test.ts`,
  `npm run typecheck`, `npm run check`, and `npm run knip` before Task 6B.

### Task 6B: Implement Standard Schema validation and async race handling

**Why:** Standard Schema must remain the only validity authority while
validation scheduling and stale-result rules remain deterministic.

**Files:**

- Create: `src/core/validation.ts`
- Create: `src/core/validation.test.ts`
- Modify: `src/core/issues.ts`
- Modify: `src/core/form-state.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests with synchronous, asynchronous, transforming, and
  throwing Standard Schemas.
- [x] Implement full-schema validation for submit, blur, change,
  `validate()`, and `validate(path)`.
- [x] Return `ValidationResult<FormOutput<S>>` from full validation and only
  path-subtree issues from path validation; never replace input with output.
- [x] Implement default `mode: "submit"`, `revalidateMode: "change"`, and
  change-only `asyncDebounceMs`.
- [x] Test latest-result-wins, abort-when-possible, debounce cancellation,
  non-debounced blur/imperative/submit, and `isValidating` timing.
- [x] Keep submit-snapshot validation authoritative for that attempt while
  preventing stale results from updating current issues/status after edits.
- [x] Test that insert/move preserve and reindex still-displayable schema
  issues by row key after validation; removal drops the removed row's issues.
- [x] Restore pending state and retain previous issues after unexpected schema
  exceptions; reject imperative/submit promises and report automatic
  validation exceptions to the host.
- [x] Run
  `npm run test -- --project node src/core/validation.test.ts src/core/issues.test.ts`,
  `npm run typecheck`, `npm run check`, and `npm run knip` before Task 7.

### Task 7: Implement the safe server and FormData protocol

**Why:** React 19 Actions and native parity require one bounded,
prototype-safe normalization and validation path.

**Files:**

- Create: `src/server/protocol.ts`
- Create: `src/server/normalize-form-data.ts`
- Create: `src/server/normalize-form-data.test.ts`
- Create: `src/server/parse-form-data.ts`
- Create: `src/server/parse-form-data.test.ts`
- Create: `src/core/form-result.ts`
- Modify: `src/server/index.ts`
- Modify: `src/core/control-types.ts`
- Modify: `src/core/index.ts`

- [x] Write failing tests for dot objects, explicit indexed arrays, repeated
  names, empty/single/multiple arrays, checkbox absence, strings, and `File`.
- [x] Implement exact repeated markers named `__fokit.array` whose values are
  canonical array paths.
- [x] Reject unknown reserved metadata, duplicate markers, sparse indexes,
  mixed indexed/repeated collections, scalar/nested collisions, and malformed
  paths.
- [x] Build intermediate objects with null prototypes and reject prototype
  mutation segments before allocation.
- [x] Enforce defaults: 1,000 entries, 1,024-character path, depth 32, and
  maximum array index 10,000.
- [x] Return one form-level `source: "server"` /
  `code: "invalid_form_data"` issue on structural failure, with no partial
  value.
- [x] Validate normalized values through Standard Schema and expose
  `ParseResult<FormOutput<S>>`, `SubmissionIssue`, `FormResult`, and
  `reply(additionalIssues)`.
- [x] Keep serializable `SubmissionIssue`/`FormResult` transport types in
  `src/core/form-result.ts`; re-export them publicly only from
  `src/server/index.ts` so React 19 can share the type without a
  `src/react19/ -> src/server/` dependency.
- [x] Add fast-check hostile-name and structural-collision properties proving
  no prototype pollution or sparse allocation.
- [x] Assert `src/server/` and built `fokit/server` import neither React nor
  controls.
- [x] Run
  `npm run test -- --project node src/server/normalize-form-data.test.ts src/server/parse-form-data.test.ts`,
  `npm run build`, `npm run check`, and `npm run knip` before Task 8.

### Task 8: Implement React form instances and granular hooks

**Why:** React needs stable adapters over the tested core without moving state
ownership into React.

**Files:**

- Create: `src/react/form-context.tsx`
- Create: `src/react/use-external-selector.ts`
- Create: `src/react/use-form.ts`
- Create: `src/react/hooks.ts`
- Create: `src/react/hooks.test.tsx`
- Create: `tests/types/react-hooks.test.ts`
- Modify: `vitest.config.ts`
- Modify: `src/index.ts`

- [x] Add the named inline Vitest `react` project before writing its first
  test. Include `src/react/**/*.test.{ts,tsx}` and
  `src/react19/**/*.test.{ts,tsx}`, use `environment: "jsdom"`, and load
  `tests/setup.ts`; keep `passWithNoTests` disabled.
- [x] Write failing DOM tests for stable `useForm` identity, latest option
  callbacks, context replacement, and unmount cleanup.
- [x] Implement `useSyncExternalStore` adapters with cached client and server
  snapshots and selector equality.
- [x] Implement `useValue`, `useField`, `useArrayField`, and `useFormState`
  with an explicit typed form instance.
- [x] Prove with render counters that one path update does not rerender
  unrelated hooks or controls.
- [x] Expose field and array metadata exactly as specified, including direct
  array issues and stable row items.
- [x] Implement guarded focus and mounted ref registration.
- [x] Test SSR/hydration snapshot equivalence, deterministic initialization,
  and no lifecycle-hook calls during Strict Mode render replay.
- [x] Add type tests for value inference, selector inference, array item types,
  equality functions, and invalid paths.
- [x] Add positive and negative type tests proving `useForm` requires a
  complete `FormInput<S>` for `defaultValues`; reject missing required
  properties while accepting optional properties that are absent.
- [x] Ensure only React 18 APIs/types are reachable from `src/index.ts`.
- [x] Run
  `npm run test -- --project react src/react/hooks.test.tsx`,
  `npm run test:types`, `npm run build`, `npm run check`, and `npm run knip`
  before Task 9.

### Task 9: Implement controls, form kits, manual forms, and native shells

**Why:** Applications need a typed design-system boundary before generated
rendering can be built.

**Files:**

- Create: `src/react/control.tsx`
- Create: `src/react/slots.ts`
- Create: `src/react/create-form-kit.tsx`
- Create: `src/react/form.tsx`
- Create: `src/react/submit.tsx`
- Create: `src/react/form.test.tsx`
- Create: `src/react/create-form-kit.test.tsx`
- Create: `src/react/test-kit.tsx`
- Create: `tests/types/controls-and-kit.test.ts`
- Create: `tests/types/definitions.test.ts`
- Modify: `src/index.ts`

- [x] Write failing type tests for `defineControl`, control options/context,
  path-to-control compatibility, literal unions, nullable members, and
  rejection of `any`/`unknown` control values.
- [x] Prove at compile time that a context-aware control cannot be used by a
  form whose context does not satisfy the control requirement.
- [x] Prove through the public `kit.defineForm` API that
  `valuePolicy: "unset"` is accepted for optional or `undefined`-capable paths
  and rejected for required paths.
- [x] Implement `ControlProps`, resolved options/context, native input IDs,
  names, refs, ARIA description links, and raw/displayed meta.
- [x] Implement `createFormKit` with all five required slots and curried
  context-aware `defineForm`.
- [x] Export public slot prop types, `FokitStyle`, CSS-variable names, and
  structural root contracts.
- [x] Implement `kit.Form` as a native `noValidate` form with safe prop
  passthrough, owned handlers, deterministic `useId` prefixing, and form-root
  data attributes.
- [x] Implement `kit.Submit` as an unstyled native submit button combining
  consumer disabled state with form disabled/submitting state.
- [x] Ensure application design-system submit buttons still work because the
  form handler guards disabled and duplicate submissions.
- [x] Test class/style/ARIA/data passthrough and rejection of attempts to
  replace owned `action`, `onSubmit`, `onReset`, or `noValidate`.
- [x] Run
  `npm run test -- --project react src/react/form.test.tsx src/react/create-form-kit.test.tsx`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 10A.

### Task 10A: Render generated fields, sections, errors, and accessibility state

**Why:** Base generated rendering should be correct and accessible before
arrays and serialization add their own behavior.

**Files:**

- Create: `src/react/fields.tsx`
- Create: `src/react/auto-form.tsx`
- Create: `src/react/error-summary.tsx`
- Create: `src/react/auto-form.test.tsx`
- Create: `src/react/accessibility.test.tsx`
- Modify: `src/react/create-form-kit.tsx`
- Modify: `tests/types/controls-and-kit.test.ts`
- Modify: `src/index.ts`

- [x] Write failing tests that render field, section, and error-message slots
  from a definition, with workflow children after generated nodes.
- [x] Implement `kit.Fields` and `kit.AutoForm` over the same form instance.
- [x] Add public type tests proving `kit.AutoForm` also requires complete
  `defaultValues`.
- [x] Resolve computed visible/disabled/read-only/required/options/context
  values with inherited state and declared dependencies only.
- [x] Pass mandatory `rootProps` to exactly one slot root and `layoutProps` to
  the section grid descendant without hidden wrappers.
- [x] Render direct field errors locally and form-level/unowned invisible
  issues in the summary with a guarded fallback focus target.
- [x] Implement labels, descriptions, deterministic IDs, `aria-describedby`,
  `aria-invalid`, and public state/layout data attributes.
- [x] Test that boolean data attributes disappear when false and
  `data-invalid` follows displayed rather than merely stored issues.
- [x] Run
  `npm run test -- --project react src/react/auto-form.test.tsx src/react/accessibility.test.tsx`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 10B.

### Task 10B: Render generated arrays with stable item behavior

**Why:** Array slots and row actions need focused verification over the stable
core row-key model.

**Files:**

- Create: `src/react/array-field.tsx`
- Create: `src/react/array-field.test.tsx`
- Modify: `src/react/fields.tsx`
- Modify: `src/react/auto-form.tsx`
+ Modify: `src/react/control.tsx`
+ Modify: `src/core/form-store.ts`

- [x] Write failing tests that render array and array-item slots with direct
  array errors and no duplicated child-field issues.
- [x] Implement generated arrays with cloned `itemDefault`, stable React keys,
  and relative item paths.
- [x] Pass guarded add/remove/move actions and correct `canAdd`,
  `canMoveUp`, and `canMoveDown` state to application slots.
- [x] Prove row identity and field subscriptions survive append, insert,
  remove, and move without rerendering unrelated rows.
- [x] Test disabled/read-only guards and fallback rendering for an empty array.
+ [x] Allow scoped generated fields to use their resolved UI metadata, and allow
  removed array-row refs to unregister after their paths leave current values.
- [x] Run
  `npm run test -- --project react src/react/array-field.test.tsx`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 10C.

### Task 10C: Implement hidden serialization and native FormData parity

**Why:** Classic submission and React 19 Actions require one SSR-capable
serialization path that matches the safe server protocol.

**Files:**

- Create: `src/react/hidden-inputs.tsx`
- Create: `src/react/form-data.test.tsx`
- Modify: `src/react/auto-form.tsx`
- Modify: `src/react/create-form-kit.tsx`
- Modify: `src/index.ts`

- [x] Write failing tests for native, hidden, and unavailable control modes;
  resolved options/context; array markers; and hidden-mode editor names.
- [x] Implement serializers as synchronous pure functions whose entries render
  as hidden inputs during SSR and client rendering.
- [x] Assert serializer output normalizes through `parseFormData` to the same
  schema output as classic controlled submission.
- [x] Serialize preserved fields under invisible/disabled subtrees without
  rendering visual slots; omit unset fields.
- [x] Add DOM parity tests for empty arrays, repeated values, absent
  checkboxes, numbers, dates, read-only/disabled fields, and files.
- [x] Run
  `npm run test -- --project react src/react/form-data.test.tsx`,
  `npm run test:types`, `npm run check`, and `npm run knip` before Task 11.

### Task 11: Implement classic React 18 submission, reset, and imperative submit

**Why:** The base package must provide complete, race-safe submission without
requiring React 19.

**Files:**

- Create: `src/react/submission.ts`
- Create: `src/react/submission.test.tsx`
- Create: `src/react/reset.test.tsx`
- Modify: `src/react/form.tsx`
- Modify: `src/react/submit.tsx`
- Modify: `src/react/use-form.ts`

- [ ] Write failing tests for disabled submit, submit count, pending state,
  complete validation, invalid focus, valid transformed output, and captured
  input/`FormData`.
- [ ] Capture input, native `FormData`, and submitter synchronously before
  pending state changes rendered controls.
- [ ] Validate the captured snapshot; suppress stale issue installation after
  later edits while preserving that attempt's callback decision.
- [ ] Share one in-flight promise across concurrent native and imperative
  submits.
- [ ] Restore pending state in `finally`, propagate unexpected errors, and
  never reset automatically.
- [ ] Implement `form.submit(): Promise<void>` through mounted
  `requestSubmit()` and reject clearly when no form is mounted.
- [ ] Intercept native reset after hydration and call `form.reset()`; preserve
  browser reset behavior before hydration.
- [ ] Focus the first visible/enabled/editable invalid field or the first
  summary issue; keep focus calls guarded when no target exists.
- [ ] Test same-value reset, new baseline reset, hook cancellation/replacement,
  file input clearing, and custom native reset buttons.
- [ ] Run
  `npm run test -- --project react src/react/submission.test.tsx src/react/reset.test.tsx`,
  then `npm run test -- --project react`, `npm run check`, and `npm run knip`
  before Task 12.

### Task 12: Implement optional structural CSS and real-browser layout tests

**Why:** The package promises portable responsive structure without importing
CSS or imposing a visual theme.

**Files:**

- Replace: `src/layout.css`
- Create: `tests/browser/layout.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `tests/package/package-metadata.test.ts`

- [ ] Write failing browser tests for one, two, and four effective columns at
  the specified container widths.
- [ ] Implement low-specificity `:where(...)` rules in `@layer fokit` for
  grid, gaps, stack spacing, array-item spacing, numeric spans, and full spans.
- [ ] Use container queries at `40rem` and `64rem`; do not add viewport media
  queries or JavaScript measurement.
- [ ] Expose only `--fokit-column-gap`, `--fokit-row-gap`,
  `--fokit-stack-gap`, and `--fokit-array-item-gap`.
- [ ] Test CSS-variable overrides, nested independent containers, span
  clamping, full rows, and the one-column result with container-query rules
  removed.
- [ ] Assert the stylesheet contains no colors, typography, control styling,
  reset, or Tailwind dependency.
- [ ] Assert importing the JavaScript main entry does not load CSS and explicit
  `fokit/layout.css` remains in a consumer build.
- [ ] After `tests/browser/layout.spec.ts` exists, remove the bootstrap-only
  `--pass-with-no-tests` flag from `npm run test:browser` so missing browser
  tests fail locally and in CI.
- [ ] Run `npm run build`, `npm run test:browser`,
  `npm run test:package`, `npm run check`, and `npm run knip` before Task 13.

### Task 13: Implement the isolated React 19 Action adapter

**Why:** React 19 consumers need progressive Actions without weakening React
18 compatibility or duplicating the core store.

**Files:**

- Create: `src/react19/action-form.tsx`
- Create: `src/react19/action-submit.tsx`
- Create: `src/react19/result-sync.ts`
- Create: `src/react19/action-form.test.tsx`
- Create: `src/react19/result-sync.test.ts`
- Modify: `src/react19/index.ts`
- Modify: `src/core/form-result.ts`

- [ ] Write failing tests proving the supplied Action remains directly on the
  native form and `ActionForm` does not wrap, prevent, prevalidate, or replay a
  valid submission.
- [ ] Implement server-first submit behavior while retaining client blur/change
  validation feedback.
- [ ] Record hydrated attempts and typed snapshots, reflect `useFormStatus`
  pending state into Fokit, and block only disabled or already-pending
  submissions.
- [ ] Test both hydrated and pre-hydration attempts, including the documented
  no-snapshot limitation for invalid raw values.
- [ ] Implement unstyled `ActionSubmit` with native button props, Fokit state,
  and `useFormStatus`.
- [ ] Guard the subpath with a descriptive React 19 compatibility error;
  structure imports so React 18 does not fail first on a missing named export.
- [ ] Apply error results once, avoid duplicate submit-count increments, expose
  errors, and run the documented focus fallback.
- [ ] Import the shared result contract from `src/core/form-result.ts` with
  `import type`; do not duplicate it or add a React-to-server source edge.
- [ ] Filter returned schema/server issues against edits made while pending and
  schedule current schema validation when a submitted schema result is stale.
- [ ] Implement success retention, `reset: "defaults"`, and
  `reset: "submitted"` including pending edits and pre-hydration no-snapshot
  behavior.
- [ ] Throw a descriptive compatibility error before dispatch for active
  `mode: "none"` values or preserved invisible/disabled native controls without
  serializers.
- [ ] Propagate Action exceptions to React; do not synthesize validation
  issues.
- [ ] Assert the built React 19 entry has `"use client"` and is the only entry
  importing `useActionState`/`useFormStatus`.
- [ ] Run
  `npm run test -- --project react src/react19/action-form.test.tsx src/react19/result-sync.test.ts`,
  `npm run build`, `npm run test:package`, `npm run check`, and `npm run knip`
  before Task 14A.

### Task 14A: Verify packed exports, declarations, and module boundaries

**Why:** Source tests cannot prove that npm consumers receive matching ESM/CJS
files, declarations, directives, and runtime boundaries.

**Files:**

- Create: `tests/package/build-output.test.ts`
- Modify: `tests/package/package-metadata.test.ts`
- Modify: `vitest.package.config.ts`

- [ ] Write failing packed-output tests for every JavaScript export target,
  condition-specific declaration target, CSS side effect, `"use client"`
  directive, and forbidden React import.
- [ ] Assert every nested `import.types` target exists as `.d.ts` and every
  nested `require.types` target exists as `.d.cts`; no JavaScript subpath may
  fall back to a declaration with the opposite module kind.
- [ ] Assert the packed tarball excludes source, tests, fixtures, plans, and
  local references while retaining `dist`, `README.md`, `LICENSE`, and
  `package.json`.
- [ ] Run `publint --strict` and the exact ATTW command established in Task 1A;
  treat any JavaScript-entry `FalseESM`, `FalseCJS`, or resolution failure as a
  blocker.
- [ ] Run `npm run build`, `npm run test:package`,
  `npm run package:check`, `npm run check`, and `npm run knip` before Task 14B.

### Task 14B: Build packed-tarball consumer fixtures

**Why:** Real consumers must resolve and execute the packed package across
React versions, bundlers, Next.js, ESM, CommonJS, and TypeScript 5.4.

**Files:**

- Create: `scripts/verify-smoke-fixtures.mjs`
- Create: `tests/fixtures/react18-vite/package.json`
- Create: `tests/fixtures/react18-vite/package-lock.json`
- Create: `tests/fixtures/react18-vite/tsconfig.json`
- Create: `tests/fixtures/react18-vite/vite.config.ts`
- Create: `tests/fixtures/react18-vite/index.html`
- Create: `tests/fixtures/react18-vite/src/main.tsx`
- Create: `tests/fixtures/react19-vite/package.json`
- Create: `tests/fixtures/react19-vite/package-lock.json`
- Create: `tests/fixtures/react19-vite/tsconfig.json`
- Create: `tests/fixtures/react19-vite/vite.config.ts`
- Create: `tests/fixtures/react19-vite/index.html`
- Create: `tests/fixtures/react19-vite/src/main.tsx`
- Create: `tests/fixtures/next-react19/package.json`
- Create: `tests/fixtures/next-react19/package-lock.json`
- Create: `tests/fixtures/next-react19/tsconfig.json`
- Create: `tests/fixtures/next-react19/next-env.d.ts`
- Create: `tests/fixtures/next-react19/app/layout.tsx`
- Create: `tests/fixtures/next-react19/app/page.tsx`
- Create: `tests/fixtures/next-react19/app/client-form.tsx`
- Create: `tests/fixtures/node-esm/package.json`
- Create: `tests/fixtures/node-esm/package-lock.json`
- Create: `tests/fixtures/node-esm/index.mjs`
- Create: `tests/fixtures/node-cjs/package.json`
- Create: `tests/fixtures/node-cjs/package-lock.json`
- Create: `tests/fixtures/node-cjs/tsconfig.json`
- Create: `tests/fixtures/node-cjs/index.cts`
- Create: `tests/fixtures/node-cjs/index.cjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Build and pack once to a temporary directory from
  `scripts/verify-smoke-fixtures.mjs`; never write tarball paths into committed
  fixture manifests.
- [ ] Copy each fixture to a fresh temporary directory, run `npm ci`, install
  the absolute generated `.tgz` with `npm install --no-save`, run its declared
  typecheck/build/runtime commands, and delete the directory in `finally`.
- [ ] Make the React 18 fixture use React/React DOM `18.3.1`,
  `@types/react@18.3.31`, `@types/react-dom@18.3.7`, and TypeScript `5.4.5`.
  Import every main-entry API and reject any reachable React 19 symbol.
- [ ] Make the React 19 fixture use React/React DOM `19.2.8` and current
  TypeScript/types. Import all main APIs and `fokit/react19`.
- [ ] Make the Next.js `16.2.12` fixture import `fokit/core` in a Server
  Component and `fokit`/`fokit/react19` in a `"use client"` component.
- [ ] Make the Node ESM fixture import and execute `fokit/core` and
  `fokit/server`.
- [ ] Make the Node CommonJS fixture typecheck `index.cts` with
  TypeScript `5.4.5`, `module: "NodeNext"`, and
  `moduleResolution: "NodeNext"`; prove resolution through the
  `require.types` `.d.cts` targets, and execute `index.cjs` against
  `fokit/core` and `fokit/server`.
- [ ] Verify the Vite fixture without CSS import emits no Fokit CSS, while the
  fixture with `fokit/layout.css` emits the structural stylesheet.
- [ ] Run `npm run test:smoke`, `npm run package:check`, `npm run check`, and
  `npm run knip` before Task 14C.

### Task 14C: Add release-equivalent CI and remove bootstrap exemptions

**Why:** CI must enforce the same fail-closed suite used locally, and temporary
bootstrap allowances must not weaken final dependency checks.

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `knip.json`

- [ ] Configure GitHub Actions on Node 20 and Node 22 with npm cache, `npm ci`,
  Chromium installation, `npm run verify`, and `npm pack --dry-run`.
- [ ] Ensure CI does not publish, mutate source, or require credentials.
- [ ] Remove bootstrap `ignoreDependencies` entries for
  `@standard-schema/spec`, `@testing-library/user-event`, `fast-check`, and
  `zod`; retain an exemption only if Knip still cannot see a real use and
  document that concrete reason beside it.
- [ ] Run `npm run test:types`, `npm run test:package`,
  `npm run test:smoke`, `npm run package:check`, `npm run check`, and
  `npm run knip` before Task 15A.

### Task 15A: Complete public documentation, tutorials, and copyable examples

**Why:** A public form library is incomplete if consumers cannot install it,
build a kit, define a form, choose submission mode, or understand the styling
boundary. The tutorial must lead a first-time reader to a useful result before
introducing the full contract.

**Files:**

- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tsconfig.docs.json`
- Create: `docs/getting-started.md`
- Create: `docs/controls.md`
- Create: `docs/styling.md`
- Create: `docs/react19-actions.md`
- Create: `docs/tutorial.md`
- Create: `docs/tutorial.ru.md`
- Create: `examples/basic-form.tsx`
- Create: `examples/form-kit.tsx`
- Create: `examples/server-action.ts`

- [ ] Update README from “planned” to implemented v1 status, explicitly
  identify the existing `fokit@0.0.1` as a pre-implementation placeholder, and
  link both tutorials. Do not claim npm availability or link a live site until
  Task 15G verifies the new release and Pages deployment.
- [ ] Document installation, React peers, Standard Schema compatibility,
  package subpaths, and explicit CSS import.
- [ ] Write equivalent English and Russian long-form tutorials that get a new
  user from install to a working schema, application-owned controls, all five
  slots, `AutoForm`, validation, and classic submission in no more than 15
  minutes.
- [ ] Continue both tutorials with conditional fields and `valuePolicy`,
  arrays and stable row identity, manual composition and subscriptions,
  `FormData`/server parsing, React 19 Actions, styling/layout, testing, and
  package boundaries.
- [ ] Provide copyable reference controls and all five structural slots,
  including accessible label/error wiring and class/root prop preservation.
- [ ] Document `dynamicOptions` as computed `options` backed by runtime context.
- [ ] Document visible/disabled/read-only/value-policy behavior and
  `beforeUpdate`/`onUpdate` with one deterministic transaction example.
- [ ] Document React 18 classic submission separately from server-first React
  19 Actions.
- [ ] Document FormData serializer requirements and Action compatibility
  failures.
- [ ] Keep deferred features clearly out of v1 and update `docs/SPEC.md` only
  for a concrete implementation-discovered contract clarification; add that
  file to the task only when the clarification exists. Apply the same rule to
  the accepted styling ADR.
- [ ] Create `tsconfig.docs.json` for `examples/**/*.ts` and
  `examples/**/*.tsx`, add `npm run test:docs`, and include it in
  `npm run verify` so copyable examples cannot drift.
- [ ] Run `npm run test:docs`, `npm run check`, and `npm run knip` before
  Task 15B.

### Task 15B: Establish the docs package, curriculum, and routing

**Why:** Content and URL behavior are the stable foundation for the visual
shell and live lab. Keeping this slice data-first makes locale parity and
broken navigation cheap to test.

**Files:**

- Create: `docs-site/AGENTS.md`
- Create: `docs-site/.npmrc`
- Create: `docs-site/package.json`
- Create: `docs-site/package-lock.json`
- Create: `docs-site/index.html`
- Create: `docs-site/vite.config.mjs`
- Create: `docs-site/src/content.js`
- Create: `docs-site/src/examples.js`
- Create: `docs-site/src/routing.mjs`
- Create: `docs-site/src/content.test.mjs`
- Create: `docs-site/src/routing.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `knip.json`

- [ ] Write Node tests first that fail if the curriculum or an internal link is
  missing, EN/RU lesson sets diverge, a full example has no executable source,
  or route parsing/fallback behavior breaks.
- [ ] Create a separate private Vite/React package with its own lockfile and
  `dev`, `build`, `preview`, and `test` scripts. Set `"private": true`, use the
  exact docs-site dependencies from this plan, `fokit: "file:.."`, and `.npmrc`
  settings `fund=false` and `audit=false`.
- [ ] Record durable local decisions in `docs-site/AGENTS.md`: EN/RU parity
  unless the maintainer resolves the open question differently, hash routes,
  static GitHub Pages hosting, actual Fokit public exports in the lab, and no
  OpenAI Sites worker or hosting manifest.
- [ ] Configure `base: process.env.BASE_PATH ?? "/"`, output to
  `docs-site/dist`, dedupe React/React DOM, and allow raw imports from the root
  `examples/` directory without opening unrelated filesystem paths.
- [ ] Add root `site:dev`, `site:build`, and `site:test` commands. Dev/build
  must build Fokit before invoking Vite; site tests invoke the docs package's
  Node suite.
- [ ] Configure Knip for the private docs package, including Vite config,
  source, Node tests, raw example imports, and package dependencies before
  running the task gate.
- [ ] Define a compact curriculum with 10 lesson IDs and equivalent EN/RU
  content: `overview`, `first-form`, `controls-and-slots`,
  `validation-and-conditions`, `arrays`, `manual-composition`,
  `classic-submit`, `server-form-data`, `react19-actions`, and
  `styling-testing-boundaries`.
- [ ] Make `examples/**/*` the only source for full copyable programs. Import
  those files as raw text into `docs-site/src/examples.js`; the Markdown
  tutorials link to the same files and may use only short illustrative
  fragments. `test:docs` remains the compiler for every full example.
- [ ] Implement hash routes in the form `#/en/overview` and `#/ru/overview`.
  Routing precedence is valid hash locale, then saved locale, then English;
  normalize an invalid lesson independently to `overview`. Persist locale and
  update document language/title without server rewrites.
- [ ] Test missing and malformed hashes with no saved locale and with saved
  Russian locale, plus every previous/next and cross-locale route.
- [ ] Run `npm ci --prefix docs-site`, `npm run site:test`,
  `npm run site:build`, `npm run check`, and `npm run knip` before Task 15C.

### Task 15C: Build and browser-test the tutorial shell

**Why:** The navigation and reading experience should reach the ECSplain
reference's clarity without copying its implementation or adding ancillary
features that a ten-lesson launch does not need.

**Files:**

- Create: `docs-site/src/main.jsx`
- Create: `docs-site/src/App.jsx`
- Create: `docs-site/src/styles.css`
- Create: `playwright.docs.config.ts`
- Create: `tests/browser/docs-site.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `knip.json`

- [ ] Write failing Playwright tests first for direct hash entry, fallback
  routes, locale switching/persistence, previous/next navigation, copy
  feedback, external links, and desktop/mobile navigation.
- [ ] Build the reference-inspired shell: Fokit brand/header, GitHub link,
  locale switch, grouped curriculum, lesson hero, copyable example pane,
  takeaways/notes, previous/next controls, and a responsive sidebar/drawer.
  Defer search and persistent progress until the ten-lesson launch shows a real
  need.
- [ ] Render full code blocks only from `examples.js`; keep lesson prose and
  small fragments in `content.js` so there is one executable source for every
  copyable program.
- [ ] Configure the docs Playwright server against an already-built production
  output with `BASE_PATH=/fokit/` and base URL
  `http://127.0.0.1:<port>/fokit/`; fail when no site tests are found.
- [ ] Add root `site:test:e2e` and `site:verify` commands. `site:verify` runs
  content tests, creates one production build, then previews and tests that
  same `dist` rather than rebuilding behind Playwright.
- [ ] Test narrow and wide layouts, drawer dismissal, logical tab order,
  visible focus, focus movement after lesson navigation, and readable code
  overflow without horizontal page scrolling.
- [ ] Run `npm run site:verify`, `npm run check`, and `npm run knip` before
  Task 15D.

### Task 15D: Add the real Fokit learning lab and CI coverage

**Why:** The tutorial becomes useful when readers can change a form and see the
same state and `FormData` contracts explained by the lessons.

**Files:**

- Create: `docs-site/src/Lab.jsx`
- Modify: `docs-site/src/App.jsx`
- Modify: `docs-site/src/styles.css`
- Modify: `tests/browser/docs-site.spec.ts`
- Modify: `.github/workflows/ci.yml`

- [ ] Extend the browser suite first with failing tests for validation,
  conditional unset, array add/move/remove, reset, classic submission, and
  inspector parity with native `FormData`.
- [ ] Build one real Fokit-powered profile/account lab using the built public
  exports, Zod, application-owned controls, all five slots, `AutoForm`,
  conditional company data with `valuePolicy`, and a contacts array.
- [ ] Add a focused inspector for current values, dirty/touched state, exposed
  issues, and native `FormData`/array markers. Keep the React 19 lesson
  copyable and tested, but do not fake a server Action on static Pages.
- [ ] Capture wide and narrow Playwright screenshots as CI artifacts and
  perform a qualitative design QA against the ECSplain reference: information
  hierarchy, density, navigation clarity, code/lab balance, responsive
  behavior, and a distinct Fokit visual identity. Do not add pixel-diff
  coupling to the reference. Upload the Playwright report/screenshots from the
  docs CI job with `actions/upload-artifact@v4`.
- [ ] Add a dedicated docs-site job to `ci.yml`: build the root package,
  install the docs-site lockfile, install Chromium, and run
  `npm run site:verify`. Keep the root library matrix independent so site
  failures are easy to diagnose.
- [ ] Run `npm run site:verify`, `npm run verify`, `npm run check`, and
  `npm run knip` before Task 15E.

### Task 15E: Deploy the verified site to GitHub Pages

**Why:** A local tutorial is not a public documentation experience. Pages must
deploy the exact browser-tested artifact with the repository subpath configured
at build time.

**Files:**

- Create: `.github/workflows/pages.yml`
- Create: `tests/package/workflows.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

- [ ] Write failing package/workflow assertions first for the Pages triggers,
  permissions, action versions, `/fokit/` build base, verification command,
  artifact path, job dependency, and deployment environment.
- [ ] Change package `homepage` to `https://r13v.github.io/fokit/` and extend
  package metadata tests so later release work cannot silently restore the
  README anchor URL.
- [ ] Configure `pages.yml` for pushes to `main` and manual dispatch, with
  `contents: read`, `pages: write`, `id-token: write`, and a `pages`
  concurrency group that cancels superseded deployments.
- [ ] Use GitHub-hosted `ubuntu-latest`, `actions/checkout@v6`,
  `actions/setup-node@v6` with Node 24, `actions/configure-pages@v5`,
  `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`.
- [ ] In the build job, install root and docs-site lockfiles plus Chromium,
  then run `BASE_PATH=/fokit/ npm run site:verify`. Upload only the resulting,
  already browser-tested `docs-site/dist`; do not run a second build.
- [ ] Put deployment in a separate job that needs the build, targets the
  `github-pages` environment, and records the URL from the deploy action.
- [ ] Do not add `.openai/hosting.json`, a worker, redirects, a custom-domain
  `CNAME`, or copied ECSplain build output.
- [ ] Run `npm run test:package`, `npm run site:verify`, `npm run check`, and
  `npm run knip` before Task 15F.

### Task 15F: Configure trusted npm publication in `publish.yml`

**Why:** npm already trusts the exact `publish.yml` identity. The repository
must be ready to use that short-lived OIDC path instead of adding a long-lived
npm secret; selecting and creating the next release remains a maintainer
decision.

**Files:**

- Create: `.github/workflows/publish.yml`
- Create: `scripts/verify-release.mjs`
- Create: `tests/package/release-contract.test.ts`
- Create: `docs/releasing.md`
- Modify: `tests/package/workflows.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Regenerate `package-lock.json` through npm if its root version does not
  match `package.json`; never hand-edit lockfile version records.
- [ ] Write failing release-contract and workflow tests first for mismatched
  tags/lockfiles/repositories, an existing registry version, prereleases,
  missing OIDC permissions, credential interpolation, incomplete release
  verification, registry not-found, outage, authentication, timeout, and
  malformed-response outcomes.
- [ ] Implement a unit-testable release guard that requires the event tag to be
  exactly `v${package.json.version}`, package and root lockfile versions to
  match, the version to be nonzero/stable, repository metadata to normalize to
  `https://github.com/r13v/fokit`, and `npm view fokit@<version> version` to
  confirm that the version is not already published. Inject the registry
  lookup in unit tests; treat only npm's package-version-not-found response as
  available and fail closed on network/auth/registry errors.
- [ ] Trigger `publish.yml` only for `release: types: [published]`, and skip
  prereleases. Use `ubuntu-latest`, `contents: read`, `id-token: write`, a
  non-cancelling release concurrency group, `actions/checkout@v6`, and
  `actions/setup-node@v6` with Node 24, the npm registry URL, and package
  manager cache disabled.
- [ ] Do not define `NPM_TOKEN`, `NODE_AUTH_TOKEN`, an npm secret, or a GitHub
  Environment unless the npm trusted-publisher configuration is changed to
  match it. Do not pass `--provenance`; npm trusted publishing supplies
  provenance automatically for this public package/repository.
- [ ] Run the release guard, `npm ci`,
  `npx playwright install --with-deps chromium`, `npm run verify`,
  `npm ci --prefix docs-site`, `npm run site:verify`, and
  `npm pack --dry-run` before `npm publish --access public`.
- [ ] Document the maintainer flow in `docs/releasing.md`: choose a version
  newer than the already-published `0.0.1`, update `package.json` and the
  lockfile together, run the full local checks, merge, then create a stable
  GitHub Release tagged exactly `v<version>`.
- [ ] Keep version choice, release notes, and GitHub Release creation as
  explicit maintainer actions in Task 15G; do not add automatic bumping or
  branch-push publication.
- [ ] Run `npm run test:package`, `npm run verify`,
  `npm run site:verify`, `npm run check`, and `npm run knip` before Task 15G.

### Task 15G: Release v1 and verify the public installation

**Why:** The existing `fokit@0.0.1` package predates the implementation. The
documentation cannot be considered generally available until its install
command resolves to the tested library.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `docs/releasing.md`
- Modify: `docs-site/src/content.js`

- [ ] `BLOCKED — MAINTAINER INPUT:` ask the maintainer to select the next
  stable semantic version newer than `0.0.1`; do not infer whether the first
  complete release should be `0.0.2`, `0.1.0`, or `1.0.0`.
- [ ] Update `package.json` and `package-lock.json` together through npm, then
  update README/site release messaging and installation examples for that
  version. Add or update metadata/content tests before changing the copy.
- [ ] Run the full clean-install commands under “Required final commands” and
  confirm the release guard accepts the selected tag while its registry lookup
  still reports the version as unpublished.
- [ ] Deliver Tasks 1–15G as one reviewed release PR, merge it to `main`, and
  wait for `ci.yml` and `pages.yml`. If branch protection or Pages settings
  require maintainer action, record the exact blocker instead of bypassing
  checks.
- [ ] Verify `https://r13v.github.io/fokit/` plus one EN and one RU deep hash
  route. Confirm the deployed page contains the selected version and the
  production assets load from `/fokit/`.
- [ ] Create the stable GitHub Release with the exact selected `v<version>`
  tag, wait for `publish.yml`, and require the workflow's verification,
  dry-run pack, OIDC publish, and provenance steps to succeed. Never fall back
  to a local/token-based publish.
- [ ] In a fresh temporary consumer outside the repository, run
  `npm install fokit@<version>` from the public registry, compile/build the
  first-form example, import `fokit/layout.css`, and execute one
  `fokit/core`/`fokit/server` smoke assertion.
- [ ] Verify npm shows the selected version as public with the expected
  repository, homepage, MIT license, and provenance; verify the old `0.0.1`
  remains historical rather than the documentation target.
- [ ] Run `npm run check`, `npm run knip`, and `git diff --check` before
  Task 16.

### Task 16: Verify all acceptance criteria and close the plan

**Why:** The work is complete only when source, declarations, packed artifacts,
consumer environments, tutorials, workflows, and repository hygiene agree.

- [ ] Start from a clean dependency state with `npm ci`.
- [ ] Install site dependencies from their lockfile with
  `npm ci --prefix docs-site`.
- [ ] Install the browser once with `npx playwright install chromium`.
- [ ] Run `npm run verify` and `npm run site:verify`; fix every failure.
- [ ] Run `npm pack --dry-run` and inspect that only `dist`, `README.md`,
  `LICENSE`, and `package.json` public artifacts are included.
- [ ] Confirm the main declaration graph compiles under the React 18 fixture
  without React 19 symbols.
- [ ] Confirm `fokit/core` and `fokit/server` execute in Node without loading
  React.
- [ ] Confirm the main entry loads no CSS and explicit layout import survives
  Vite tree shaking.
- [ ] Confirm all behaviors listed under `docs/SPEC.md` “Testing requirements”
  map to at least one named automated test.
- [ ] Confirm Vitest has distinct `node` and `react` projects, and neither
  Vitest nor Playwright is configured to pass when no tests are found.
- [ ] Confirm `knip.json` has no undocumented bootstrap dependency exemptions.
- [ ] Confirm every CommonJS JavaScript export resolves its `.d.cts`
  declaration in the Node CommonJS type fixture.
- [ ] Confirm every curriculum lesson exists in English and Russian, both
  tutorials reach a working form, and every full copyable program comes from a
  compiled file under `examples/`.
- [ ] Inspect `docs-site/dist/index.html` and built assets under the `/fokit/`
  base; serve the production output and enter a deep hash route directly.
- [ ] Confirm `pages.yml` uploads only `docs-site/dist` and `publish.yml`
  contains no npm credential secret or branch-push trigger.
- [ ] Confirm the live GitHub Pages URL serves the tested deployment after the
  workflow reaches `main`.
- [ ] Confirm npm serves the maintainer-selected version with provenance and a
  fresh consumer builds the first tutorial form from the registry package.
- [ ] Confirm package and root lockfile versions match and the release guard
  rejects mismatched tags, prereleases, `0.0.0`, and versions already present
  on npm.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short` and verify user-owned unrelated changes were not
  overwritten or staged by the implementation.
- [ ] Mark every completed task in this plan.
- [ ] Move this file to
  `docs/plans/completed/20260728-implement-fokit-v1.md`.

## Technical Details

### Required source boundaries

Use this dependency direction:

```text
src/core/      -> @standard-schema/spec types only
src/server/    -> src/core/, Web FormData/File APIs
src/react/     -> src/core/, React 18 APIs
src/react19/   -> src/core/, src/react/, React 19 APIs
src/index.ts   -> public React 18-safe re-exports
src/layout.css -> no JavaScript import edge
```

Forbidden edges:

- `src/core/` to React, React DOM, browser DOM nodes, or `src/react/`;
- `src/server/` to React, React DOM, controls, or `src/react/`;
- `src/index.ts` to `src/react19/`;
- any JavaScript entry to `src/layout.css`;
- definition objects to application React components or executable effects.

### Store invariants

- One external store owns all input values and metadata.
- Store values are `FormInput<S>`; successful validation yields
  `FormOutput<S>`.
- Snapshots are immutable, cached, and structurally shared.
- Consumers must not mutate snapshots or non-plain retained values.
- All value mutations pass through one synchronous transaction.
- `beforeUpdate` sees the complete proposed change including `valuePolicy`;
  `onUpdate` observes one committed change.
- Row keys are deterministic store metadata, never submitted values.
- Validation output never overwrites input values.
- `validationStatus` applies only to the current value snapshot.
- Server issues clear according to overlapping edits; manual issues persist
  until explicit clear/reset.
- Reset updates both values and baseline and clears documented metadata.

### Path and parser invariants

- Canonical paths use dots and canonical decimal array indexes.
- Brackets, numeric object keys, empty segments, dangerous prototype segments,
  dots in property names, and top-level `__fokit` are rejected.
- Runtime commands, issues, subscriptions, definitions, serializers, and
  server parsing call the same path parser.
- `FormData` normalization never assigns through a normal prototype-bearing
  intermediate object.
- Structural failures are all-or-nothing.
- Limits are checked before allocating deep or sparse structures.
- Primitive-looking values remain strings until Standard Schema validation.
- `File` values stay `File`.

### React invariants

- React components/hooks live behind `"use client"` entries.
- Store creation and computed resolution do not call lifecycle hooks during
  render.
- Server and first client snapshots are semantically equal.
- Each hook subscribes to the smallest required slice.
- `meta.invalid` is exactly `displayErrors.length > 0`.
- Generated forms use `noValidate`; native attributes remain semantic/style
  hints.
- Fokit owns form handlers and documented data attributes.
- Slots own DOM presentation but must spread mandatory props.
- Invisible nodes render no visual slot.
- Error summary owns exposed issues with no visible owner.
- Disabled/read-only values remain in store, validation, and submission unless
  explicitly unset.

### Submission invariants

- Classic submission captures input and `FormData` before pending UI changes.
- Concurrent classic submissions share one promise.
- Unexpected errors propagate after pending state restoration.
- React 19 Actions stay native and server-first.
- Action results are serializable and contain only schema/server submission
  issues.
- Edits during pending Actions make returned issues stale under the documented
  rules.
- `reset: "submitted"` updates the baseline without discarding later edits.
- Full pre-hydration invalid raw-value rehydration remains a documented
  non-goal.

### Package invariants

- `fokit` and `fokit/react19` built entries retain `"use client"`.
- `fokit/core` and `fokit/server` do not contain `"use client"` or React
  imports.
- ESM uses `.js`; CommonJS uses `.cjs`.
- Nested `import.types` conditions point to emitted `.d.ts` files; nested
  `require.types` conditions point to emitted `.d.cts` files.
- CSS is marked side-effectful but imported only through `fokit/layout.css`.
- Package and root lockfile versions match, and `homepage` points to the Pages
  site.
- The tarball contains no local reference implementation, tests, fixtures,
  plans, docs-site files, or source files.

### Documentation-site invariants

- `docs-site` is a private package with its own committed lockfile.
- The site uses built Fokit public exports; it does not import `src/` internals.
- Hash routes work on a static host without redirects or a server fallback.
- Route locale precedence is explicit: hash, saved preference, then English.
- English and Russian have the same lesson IDs and navigation graph.
- Full copyable programs have one executable source under `examples/`; the
  tutorials and site do not maintain competing copies.
- `BASE_PATH=/fokit/` affects asset URLs without being baked into local
  development.
- Search and persistent course progress are deferred until the compact launch
  curriculum demonstrates a need.

### Deployment and release invariants

- `pages.yml` browser-tests one production `dist` and uploads that same
  directory.
- `publish.yml` is the exact npm trusted-publisher filename and runs only for a
  newly published stable GitHub Release.
- Publishing uses a GitHub-hosted runner, `id-token: write`, supported
  Node/npm versions, and no long-lived npm credential.
- The release tag, package version, lockfile version, and GitHub repository
  identity agree before publish.
- An npm registry lookup rejects an already-published version before the
  release suite does expensive work.
- Version selection and GitHub Release creation remain human decisions; branch
  pushes never publish the package.

## Post-Completion

### Manual verification

- Test the reference form with keyboard-only navigation and at least one screen
  reader.
- Inspect the structural stylesheet in a narrow sidebar, modal, and full page.
- Check current Chrome, Firefox, and Safari; automated CI covers Chromium only.
- Run one real application integration using its own controls and slots rather
  than only the repository test kit.
- Recheck the deployed site with a screen reader in both locales.

### External system updates

- Confirm the GitHub repository license display recognizes `LICENSE` as MIT.
- Configure branch protection to require the CI workflow.
- If the first Pages run reports that GitHub Actions is not the selected Pages
  source, enable it in repository settings and rerun `pages.yml`.
- After one successful OIDC publish, consider npm's most restrictive
  token-access setting and revoke any obsolete automation tokens.
