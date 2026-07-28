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
- `npm run verify` succeeds from a clean install.

## Context

### Repository state

- `docs/SPEC.md` is the normative v1 product and API specification.
- `docs/adr/0001-styling-and-layout-boundary.md` is the accepted styling ADR.
- `README.md` currently announces the specification but not an implemented
  package.
- `src/index.ts` currently contains only `console.log("Hello, World!")`.
- `package.json` is an `npm init` scaffold. It currently says version `1.0.0`,
  license `ISC`, CommonJS, and references `vitest` without installing it; these
  values are not the intended package contract.
- There is no TypeScript configuration, build configuration, test
  configuration, public implementation, or CI workflow.
- `biome.json`, `knip.json`, and `lefthook.yml` already exist.
- `AGENTS.md` requires `npm run check` and `npm run knip` before completion.
- `CLAUDE.md` delegates repository guidance to `AGENTS.md`.
- User-owned staged additions under `.agents/`, `AGENTS.md`, and `CLAUDE.md`
  must be preserved and not rewritten as part of this implementation.

### Selected implementation approach

- Scope: the complete v1 specification, not a core-only MVP.
- Sequencing: dependency-ordered vertical slices, with a usable and tested
  contract at the end of every task.
- Testing: strict TDD for behavior and public types. Toolchain bootstrapping is
  verified immediately but does not require a synthetic failing behavior test.
- Package manager: npm and the committed `package-lock.json`.
- Bundler: `tsdown`, with explicit entries and dual ESM/CommonJS output.
- Unit/integration runner: Vitest.
- DOM environment: jsdom with React Testing Library.
- Browser layout verification: Playwright Chromium.
- Property/fuzz testing: fast-check.
- Package validation: publint and `@arethetypeswrong/cli`.
- Standard Schema types: regular dependency on `@standard-schema/spec`,
  imported with `import type`; no schema implementation is a runtime
  dependency.
- Root development runtime: current React 19.
- Compatibility fixtures: React `18.3.1` with TypeScript `5.4.5`, and React
  `19.2.8` with the repository's current TypeScript release.

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
- publint can validate a packed tarball:
  <https://publint.dev/docs/cli>.

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
- `npm run knip` — find unused files, exports, and dependencies;
- `npm run verify` — run the complete release-equivalent local suite.

## Review Handoff

- Original request: create a complete implementation plan for the new Fokit
  library defined by `docs/SPEC.md`.
- Key decisions:
  - implement the whole v1;
  - use TDD;
  - own the store and renderer rather than wrapping another form library;
  - support React 18 and React 19 from the first release;
  - keep React 19 Actions in `fokit/react19`;
  - use server-first validation for Action submission;
  - ship optional structural CSS, never an automatic theme;
  - emit ESM and CommonJS with declarations;
  - use strict canonical dot paths and bounded safe `FormData` parsing.
- Explicit non-goals:
  - migration or compatibility APIs;
  - TanStack Form or React Hook Form wrappers;
  - a custom validation language;
  - schema-to-UI inference;
  - remote JSON form definitions;
  - a visual builder or visual theme;
  - middleware/plugin/effects pipelines;
  - wizards, autosave, async option loading, devtools, or React Native;
  - automated npm publication in this implementation.
- Open questions: none. `docs/SPEC.md` and this plan contain the v1 decisions.
- Assumptions:
  - GitHub Actions is the intended CI provider because the repository remote is
    GitHub;
  - Chromium is sufficient for automated layout verification; cross-browser
    manual checks remain post-completion;
  - npm-name ownership and actual `npm publish` remain manual external steps;
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
- React 19 tests: `src/react19/*.test.tsx`.
- Server tests: `src/server/*.test.ts`.
- Public type tests: `tests/types/*.test.ts` compiled with `tsc --noEmit`.
- Packed output tests: `tests/package/*.test.ts`.
- Browser layout tests: `tests/browser/*.spec.ts`.
- Consumer fixtures: `tests/fixtures/*`.

### Test levels

- Unit tests cover paths, cloning/equality, UI resolution, state derivation,
  transactions, validation, issue exposure, and safe parsing.
- Property tests generate canonical and hostile paths, nested updates, array
  operations, and malicious `FormData` names.
- Type tests cover inference, invalid controls, optional-only unset, deep
  partial updates, relative array paths, context requirements, and subpath
  isolation.
- DOM tests cover subscriptions, render counts, controls, slots, arrays,
  accessibility, focus, reset, native `FormData`, SSR, hydration, and Strict
  Mode.
- Browser tests cover CSS container-query tiers, spans, variables, and the
  one-column fallback.
- Package tests inspect built directives, exports, side effects, declaration
  reachability, and CSS isolation.
- Smoke fixtures install the actual `.tgz` and build with React 18, React 19,
  Next.js, ESM Node, and CommonJS Node.

### Required final commands

```sh
npm ci
npx playwright install chromium
npm run verify
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

- Implementation Steps contain only work achievable in this repository.
- Post-Completion contains npm ownership, publication, and manual
  cross-browser/accessibility work.
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

- [x] Replace the `npm init` metadata with version `0.0.0`, `type: "module"`,
  MIT license, `files: ["dist"]`, `sideEffects: ["**/*.css"]`, the peer ranges
  from `docs/SPEC.md`, and exact conditional exports for `.`, `./core`,
  `./react19`, `./server`, `./layout.css`, and `./package.json`.
- [x] Add the selected dependencies and regenerate `package-lock.json` with
  npm; do not manually edit lockfile package records.
- [x] Add every command listed under “Commands established by this plan” and
  make `npm run verify` invoke the full release-equivalent suite without watch
  mode or source mutation.
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

- [ ] Write failing type tests for `FormInput`, `FormOutput`, `FieldPath`,
  `ArrayFieldPath`, `PathValue`, relative array paths, optional paths, literal
  unions, and array indexes.
- [ ] Write failing runtime and fast-check tests for canonical paths such as
  `address.city` and `contacts.0.value`.
- [ ] Test rejection of brackets, empty segments, dotted property names,
  numeric object keys, signed/zero-padded indexes, `__proto__`, `prototype`,
  `constructor`, and top-level `__fokit`.
- [ ] Implement public Standard Schema aliases using
  `@standard-schema/spec` type imports.
- [ ] Implement TypeScript 5.4-compatible recursive path utilities without
  widening valid literal paths to `string`.
- [ ] Implement a single runtime path parser that returns immutable normalized
  segments and is reused by every later runtime entry point.
- [ ] Implement path formatting, ancestor/equality/descendant overlap checks,
  and bounded index parsing without object traversal.
- [ ] Export only the documented public path and schema types/functions from
  `src/core/index.ts`.
- [ ] Run `npm run build`, `npm run test -- src/core/path.test.ts`,
  `npm run test:types`, and `npm run check` before Task 3.

### Task 3: Implement immutable values, definitions, computed UI, and UI resolution

**Why:** The store needs immutable value operations and a validated,
React-independent definition before state or rendering can be correct.

**Files:**

- Create: `src/core/value.ts`
- Create: `src/core/value.test.ts`
- Create: `src/core/computed.ts`
- Create: `src/core/control-types.ts`
- Create: `src/core/ui-types.ts`
- Create: `src/core/definition.ts`
- Create: `src/core/definition.test.ts`
- Create: `src/core/resolve-ui.ts`
- Create: `src/core/resolve-ui.test.ts`
- Create: `tests/types/definitions.test.ts`
- Modify: `src/core/index.ts`

- [ ] Write failing tests for structural cloning, structural sharing, deep get,
  set, unset, deep partial merge, and documented dirty equality.
- [ ] Cover primitives with `Object.is`, arrays/plain objects recursively,
  `Date` timestamps, non-plain identity, and cyclic-value rejection.
- [ ] Define React-free control registry metadata, `FormDataEntrySpec`,
  `ControlFormData`, field/section/array nodes, layout enums, and computed
  values.
- [ ] Write failing definition tests for duplicate paths/IDs, bad IDs, unknown
  controls, invalid spans/columns, invalid relative paths, and invalid
  `valuePolicy`.
- [ ] Implement `computed(dependencies, resolver)` with explicit dependencies,
  synchronous pure resolution, typed context, and no form-command access.
- [ ] Implement definition normalization and immutable indexing by node ID and
  canonical path.
- [ ] Implement `resolveUi` for labels, descriptions, options, inherited
  visible/disabled/read-only state, required state, layout, and context.
- [ ] Test that computed values rerun only when one of their declared
  dependencies or runtime context changes.
- [ ] Ensure a schema issue path outside the canonical grammar can later be
  retained as a form-level issue without unsafe traversal.
- [ ] Run focused core tests, `npm run test:types`, `npm run check`, and
  `npm run knip` before Task 4.

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

- [ ] Write failing tests for construction from complete `defaultValues`,
  stable store identity, cached snapshots, and immutable state reads.
- [ ] Write render-independent selector tests proving unrelated path listeners
  are not notified and equality defaults to `Object.is`.
- [ ] Implement `FormState` with values, form/field issues, dirty/touched
  aggregates, validating/submitting flags, validation status, and submit count.
- [ ] Keep baseline values and internal field/array metadata outside submitted
  form data.
- [ ] Implement `getValues`, `getValue`, `subscribe`, focus/ref registration,
  touch/blur metadata, and post-commit listener notification.
- [ ] Ensure context replacement reevaluates UI without becoming form data,
  dirty state, or a normal value update.
- [ ] Ensure `defaultValues` and schema/definition identity are fixed for one
  instance; later record data must use reset or a new instance.
- [ ] Test listener unsubscribe, custom equality, no-op commits, and
  mutation attempts against returned snapshots.
- [ ] Run focused store tests, `npm run typecheck`, `npm run check`, and
  `npm run knip` before Task 5.

### Task 5: Implement transactions, hooks, reset, arrays, and value policies

**Why:** All value changes must share one atomic and observable mutation
boundary before validation or React controls are added.

**Files:**

- Create: `src/core/transaction.ts`
- Create: `src/core/transaction.test.ts`
- Create: `src/core/array-state.ts`
- Create: `src/core/array-state.test.ts`
- Create: `src/core/value-policy.test.ts`
- Create: `tests/types/commands.test.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/form-state.ts`
- Modify: `src/core/index.ts`

- [ ] Write failing tests for typed `setValue`, deep `setValues`, optional-only
  unset, reset, batch, append, insert, remove, and move.
- [ ] Implement ordered transaction normalization with last-overlap-wins
  semantics and one atomic commit.
- [ ] Expand visibility-driven `valuePolicy` changes to stability before
  `beforeUpdate`, and include effective changes in `onUpdate`.
- [ ] Test `beforeUpdate` accept/cancel/replace behavior, replacement
  revalidation, nested-command rejection, and thrown-hook semantics.
- [ ] Test `onUpdate` once per commit, post-commit exception behavior, nested
  follow-up transactions, and no calls for error/metadata-only updates.
- [ ] Implement nested batches as one outer transaction; abort the entire
  uncommitted batch on an exception.
- [ ] Implement deterministic per-store row keys, complete/cloned
  `itemDefault`, and row-key metadata reindexing.
- [ ] Clear overlapping server issues on edits and array operations while
  preserving/reindexing manual and displayed schema metadata as specified.
- [ ] Implement reset baseline replacement, same-value metadata reset,
  cancellation, replacement-baseline semantics, and hook call counts.
- [ ] Test that invisible `valuePolicy: "unset"` fields converge without
  update loops.
- [ ] Add fast-check state-machine tests comparing random command sequences
  with a simple reference model.
- [ ] Run focused transaction/array tests, `npm run test:types`,
  `npm run check`, and `npm run knip` before Task 6.

### Task 6: Implement validation, issues, exposure, and async race handling

**Why:** Standard Schema must remain the only validity authority while UI
errors follow deterministic interaction and stale-result rules.

**Files:**

- Create: `src/core/issues.ts`
- Create: `src/core/validation.ts`
- Create: `src/core/validation.test.ts`
- Create: `src/core/issues.test.ts`
- Modify: `src/core/form-state.ts`
- Modify: `src/core/form-store.ts`
- Modify: `src/core/index.ts`

- [ ] Write failing tests with synchronous, asynchronous, transforming, and
  throwing Standard Schemas.
- [ ] Implement full-schema validation for submit, blur, change,
  `validate()`, and `validate(path)`.
- [ ] Return `ValidationResult<FormOutput<S>>` from full validation and only
  path-subtree issues from path validation; never replace input with output.
- [ ] Implement default `mode: "submit"`, `revalidateMode: "change"`, and
  change-only `asyncDebounceMs`.
- [ ] Test latest-result-wins, abort-when-possible, debounce cancellation,
  non-debounced blur/imperative/submit, and `isValidating` timing.
- [ ] Keep submit-snapshot validation authoritative for that attempt while
  preventing stale results from updating current issues/status after edits.
- [ ] Implement raw errors versus `displayErrors`, overlap-based exposure,
  submit exposure, manual/server immediate exposure, and invisible-owner
  summary routing metadata.
- [ ] Implement atomic source replacement, manual/server `setErrors`,
  `clearErrors`, edit-driven stale server clearing, and reset clearing.
- [ ] Map unsupported Standard Schema issue paths to form-level issues.
- [ ] Restore pending state and retain previous issues after unexpected schema
  exceptions; reject imperative/submit promises and report automatic
  validation exceptions to the host.
- [ ] Run focused validation/issue tests, `npm run typecheck`,
  `npm run check`, and `npm run knip` before Task 7.

### Task 7: Implement the safe server and FormData protocol

**Why:** React 19 Actions and native parity require one bounded,
prototype-safe normalization and validation path.

**Files:**

- Create: `src/server/protocol.ts`
- Create: `src/server/normalize-form-data.ts`
- Create: `src/server/normalize-form-data.test.ts`
- Create: `src/server/parse-form-data.ts`
- Create: `src/server/parse-form-data.test.ts`
- Create: `src/server/form-result.ts`
- Modify: `src/server/index.ts`
- Modify: `src/core/control-types.ts`
- Modify: `src/core/index.ts`

- [ ] Write failing tests for dot objects, explicit indexed arrays, repeated
  names, empty/single/multiple arrays, checkbox absence, strings, and `File`.
- [ ] Implement exact repeated markers named `__fokit.array` whose values are
  canonical array paths.
- [ ] Reject unknown reserved metadata, duplicate markers, sparse indexes,
  mixed indexed/repeated collections, scalar/nested collisions, and malformed
  paths.
- [ ] Build intermediate objects with null prototypes and reject prototype
  mutation segments before allocation.
- [ ] Enforce defaults: 1,000 entries, 1,024-character path, depth 32, and
  maximum array index 10,000.
- [ ] Return one form-level `source: "server"` /
  `code: "invalid_form_data"` issue on structural failure, with no partial
  value.
- [ ] Validate normalized values through Standard Schema and expose
  `ParseResult<FormOutput<S>>`, `SubmissionIssue`, `FormResult`, and
  `reply(additionalIssues)`.
- [ ] Add fast-check hostile-name and structural-collision properties proving
  no prototype pollution or sparse allocation.
- [ ] Assert `src/server/` and built `fokit/server` import neither React nor
  controls.
- [ ] Run focused server/property tests, `npm run build`,
  `npm run check`, and `npm run knip` before Task 8.

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
- Modify: `src/index.ts`

- [ ] Write failing DOM tests for stable `useForm` identity, latest option
  callbacks, context replacement, and unmount cleanup.
- [ ] Implement `useSyncExternalStore` adapters with cached client and server
  snapshots and selector equality.
- [ ] Implement `useValue`, `useField`, `useArrayField`, and `useFormState`
  with an explicit typed form instance.
- [ ] Prove with render counters that one path update does not rerender
  unrelated hooks or controls.
- [ ] Expose field and array metadata exactly as specified, including direct
  array issues and stable row items.
- [ ] Implement guarded focus and mounted ref registration.
- [ ] Test SSR/hydration snapshot equivalence, deterministic initialization,
  and no lifecycle-hook calls during Strict Mode render replay.
- [ ] Add type tests for value inference, selector inference, array item types,
  equality functions, and invalid paths.
- [ ] Ensure only React 18 APIs/types are reachable from `src/index.ts`.
- [ ] Run focused React tests, `npm run test:types`, `npm run build`,
  `npm run check`, and `npm run knip` before Task 9.

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
- Modify: `src/index.ts`

- [ ] Write failing type tests for `defineControl`, control options/context,
  path-to-control compatibility, literal unions, nullable members, and
  rejection of `any`/`unknown` control values.
- [ ] Prove at compile time that a context-aware control cannot be used by a
  form whose context does not satisfy the control requirement.
- [ ] Implement `ControlProps`, resolved options/context, native input IDs,
  names, refs, ARIA description links, and raw/displayed meta.
- [ ] Implement `createFormKit` with all five required slots and curried
  context-aware `defineForm`.
- [ ] Export public slot prop types, `FokitStyle`, CSS-variable names, and
  structural root contracts.
- [ ] Implement `kit.Form` as a native `noValidate` form with safe prop
  passthrough, owned handlers, deterministic `useId` prefixing, and form-root
  data attributes.
- [ ] Implement `kit.Submit` as an unstyled native submit button combining
  consumer disabled state with form disabled/submitting state.
- [ ] Ensure application design-system submit buttons still work because the
  form handler guards disabled and duplicate submissions.
- [ ] Test class/style/ARIA/data passthrough and rejection of attempts to
  replace owned `action`, `onSubmit`, `onReset`, or `noValidate`.
- [ ] Run focused form/kit tests, `npm run test:types`, `npm run check`, and
  `npm run knip` before Task 10.

### Task 10: Implement generated AutoForm rendering, slots, arrays, and hidden serialization

**Why:** Automatic rendering is Fokit's primary differentiation and must share
the same store and controls as manual composition.

**Files:**

- Create: `src/react/fields.tsx`
- Create: `src/react/auto-form.tsx`
- Create: `src/react/error-summary.tsx`
- Create: `src/react/array-field.tsx`
- Create: `src/react/hidden-inputs.tsx`
- Create: `src/react/auto-form.test.tsx`
- Create: `src/react/accessibility.test.tsx`
- Create: `src/react/form-data.test.tsx`
- Modify: `src/react/create-form-kit.tsx`
- Modify: `src/index.ts`

- [ ] Write failing tests that render field, section, array, array-item, and
  error-message slots from a definition.
- [ ] Implement `kit.Fields` and `kit.AutoForm` over the same form instance,
  with workflow children rendered after generated nodes.
- [ ] Resolve computed visible/disabled/read-only/required/options/context
  values with inherited state and declared dependencies only.
- [ ] Pass mandatory `rootProps` to exactly one slot root and `layoutProps` to
  the section grid descendant without hidden wrappers.
- [ ] Render direct field/array errors locally and form-level/unowned invisible
  issues in the summary; provide fallback summary focus.
- [ ] Implement labels, descriptions, deterministic IDs, `aria-describedby`,
  `aria-invalid`, and public state/layout data attributes.
- [ ] Test that boolean state data attributes exist only when applicable,
  disappear when false, and that `data-invalid` follows displayed rather than
  merely stored issues.
- [ ] Implement generated arrays with cloned `itemDefault`, stable React keys,
  guarded add/remove/move actions, and relative item paths.
- [ ] Implement native/hidden/none control serialization, resolved
  options/context in serializers, array markers, and no duplicate editor names
  for hidden-mode controls.
- [ ] Assert serializer hidden inputs are present in SSR output and normalize
  to the same schema output as classic client submission.
- [ ] Serialize preserved fields under invisible/disabled subtrees without
  rendering visual slots; omit unset fields.
- [ ] Add DOM parity tests for empty arrays, repeated values, absent
  checkboxes, numbers, dates, read-only/disabled fields, and files.
- [ ] Run focused AutoForm/accessibility/FormData tests,
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
- [ ] Run focused submission/reset tests, the full React test suite,
  `npm run check`, and `npm run knip` before Task 12.

### Task 12: Implement optional structural CSS and real-browser layout tests

**Why:** The package promises portable responsive structure without importing
CSS or imposing a visual theme.

**Files:**

- Replace: `src/layout.css`
- Create: `tests/browser/layout.spec.ts`
- Modify: `playwright.config.ts`
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
- Modify: `src/server/form-result.ts`

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
- [ ] Run focused React 19 tests, `npm run build`,
  `npm run test:package`, `npm run check`, and `npm run knip` before Task 14.

### Task 14: Verify declarations, packed exports, consumer builds, and CI

**Why:** Source tests cannot prove that npm consumers receive the correct
files, peers, declarations, directives, and runtime boundaries.

**Files:**

- Create: `tests/package/build-output.test.ts`
- Create: `scripts/verify-smoke-fixtures.mjs`
- Create: `tests/fixtures/react18-vite/package.json`
- Create: `tests/fixtures/react18-vite/tsconfig.json`
- Create: `tests/fixtures/react18-vite/vite.config.ts`
- Create: `tests/fixtures/react18-vite/index.html`
- Create: `tests/fixtures/react18-vite/src/main.tsx`
- Create: `tests/fixtures/react19-vite/package.json`
- Create: `tests/fixtures/react19-vite/tsconfig.json`
- Create: `tests/fixtures/react19-vite/vite.config.ts`
- Create: `tests/fixtures/react19-vite/index.html`
- Create: `tests/fixtures/react19-vite/src/main.tsx`
- Create: `tests/fixtures/next-react19/package.json`
- Create: `tests/fixtures/next-react19/tsconfig.json`
- Create: `tests/fixtures/next-react19/next-env.d.ts`
- Create: `tests/fixtures/next-react19/app/layout.tsx`
- Create: `tests/fixtures/next-react19/app/page.tsx`
- Create: `tests/fixtures/next-react19/app/client-form.tsx`
- Create: `tests/fixtures/node-esm/package.json`
- Create: `tests/fixtures/node-esm/index.mjs`
- Create: `tests/fixtures/node-cjs/package.json`
- Create: `tests/fixtures/node-cjs/index.cjs`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.package.config.ts`

- [ ] Write failing packed-output tests for every export target, declaration
  target, CSS side effect, directive, and forbidden React import.
+ [ ] Reconcile the SPEC's single top-level `"types"` condition with
  `dist/*.d.cts` for CommonJS, and configure ATW so the intentional CSS export
  and closed Node 10 resolution do not hide real JavaScript entry failures.
  `npm run package:check` currently reports `FalseESM` for all CJS entries and
  `NoResolution` for the CSS and Node 10 paths.
- [ ] Build and pack once to a temporary directory from
  `scripts/verify-smoke-fixtures.mjs`; never write tarball paths into committed
  fixture manifests.
- [ ] For each fixture, copy it to a fresh temporary directory, run its exact
  dependency install, install the absolute generated `.tgz` with
  `npm install --no-save`, run typecheck/build, and delete the temporary
  directory in `finally`.
- [ ] Make the React 18 fixture use React/React DOM `18.3.1`,
  `@types/react@18.3.31`, `@types/react-dom@18.3.7`, and TypeScript `5.4.5`.
- [ ] Make the React 19 fixture use React/React DOM `19.2.8` and current
  TypeScript/types. Import all main APIs and `fokit/react19`.
- [ ] Make the Next.js `16.2.12` fixture import `fokit/core` in a Server
  Component and `fokit`/`fokit/react19` in a `"use client"` component.
- [ ] Make Node ESM and CommonJS fixtures import/require `fokit/core` and
  `fokit/server` and execute a small parse/path assertion.
- [ ] Verify the Vite fixture without CSS import emits no Fokit CSS, while the
  fixture with `fokit/layout.css` emits the structural stylesheet.
- [ ] Run `publint --strict` and `attw --pack .` against built package metadata.
- [ ] Configure GitHub Actions on Node 20 and Node 22 with npm cache, `npm ci`,
  Chromium installation, `npm run verify`, and `npm pack --dry-run`.
- [ ] Ensure CI does not publish, mutate source, or require credentials.
- [ ] Run `npm run test:types`, `npm run test:package`,
  `npm run test:smoke`, `npm run package:check`, `npm run check`, and
  `npm run knip` before Task 15.

### Task 15: Complete public documentation and copyable examples

**Why:** A public form library is incomplete if consumers cannot install it,
build a kit, define a form, choose submission mode, or understand the styling
boundary.

**Files:**

- Modify: `README.md`
- Modify: `docs/SPEC.md`
- Modify: `docs/adr/0001-styling-and-layout-boundary.md`
- Create: `docs/getting-started.md`
- Create: `docs/controls.md`
- Create: `docs/styling.md`
- Create: `docs/react19-actions.md`
- Create: `examples/basic-form.tsx`
- Create: `examples/form-kit.tsx`
- Create: `examples/server-action.ts`

- [ ] Update README from “planned” to implemented v1 status without claiming an
  npm release that has not happened.
- [ ] Document installation, React peers, Standard Schema compatibility,
  package subpaths, and explicit CSS import.
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
  for implementation-discovered clarifications, never silently.
- [ ] Compile example files in `tsconfig.json` or a dedicated documentation
  typecheck so docs cannot drift.
- [ ] Run example typechecking, Markdown linting, `npm run check`, and
  `npm run knip` before Task 16.

### Task 16: Verify all acceptance criteria and close the plan

**Why:** The work is complete only when source, declarations, packed artifacts,
consumer environments, docs, and repository hygiene agree.

- [ ] Start from a clean dependency state with `npm ci`.
- [ ] Install the browser once with `npx playwright install chromium`.
- [ ] Run `npm run verify` and fix every failure.
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
- Conditional export declarations point to emitted `.d.ts` files.
- CSS is marked side-effectful but imported only through `fokit/layout.css`.
- The tarball contains no local reference implementation, tests, fixtures,
  plans, or source files.

## Post-Completion

### Manual verification

- Test the reference form with keyboard-only navigation and at least one screen
  reader.
- Inspect the structural stylesheet in a narrow sidebar, modal, and full page.
- Check current Chrome, Firefox, and Safari; automated CI covers Chromium only.
- Run one real application integration using its own controls and slots rather
  than only the repository test kit.

### External system updates

- Reserve or confirm ownership of the `fokit` npm package name.
- Confirm the GitHub repository license display recognizes `LICENSE` as MIT.
- Configure branch protection to require the CI workflow.
- Publish only after manual review of `npm pack --dry-run`, versioning, and npm
  authentication; publication is not part of this implementation plan.
