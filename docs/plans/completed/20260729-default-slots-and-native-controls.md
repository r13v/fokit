# Default Slots, Native Controls, and Vocs Documentation

## Overview

Fokit will gain an accessible, unstyled baseline that lets a user render a
working generated form without first implementing five structural slots or
wrapping common native HTML controls. Its public documentation will move from
the bespoke bilingual SPA and duplicated English Markdown guides to one
English, Markdown-first Vocs site.

The feature has two composable parts:

- `createDefaultSlots()` creates all five structural slots. It uses English
  action labels by default and accepts optional i18n overrides.
- `nativeControls` is an explicit registry of common controls backed by native
  HTML elements.

`createFormKit` will continue to require an explicit control registry, because
controls define value and FormData semantics. Its `slots` option will become
optional and partial. Omitted slots resolve to the English default slots.

The shortest supported setup will be:

```tsx
const kit = createFormKit({
	controls: nativeControls,
})
```

A localized or customized setup will be:

```tsx
const kit = createFormKit({
	controls: {
		...nativeControls,
		money: moneyControl,
	},
	slots: {
		...createDefaultSlots({
			i18n: {
				arrayAdd: "Добавить",
				arrayRemove: ({ position }) => `Удалить элемент ${position}`,
				arrayMoveUp: ({ position }) => `Поднять элемент ${position}`,
				arrayMoveDown: ({ position }) => `Опустить элемент ${position}`,
			},
		}),
		Field: CustomField,
	},
})
```

Acceptance criteria:

- `createFormKit({ controls })` produces a kit with all five resolved slots.
- A caller can override any subset of slots.
- `createDefaultSlots()` renders accessible semantic HTML, preserves every
  required Fokit prop, and has no visual theme or automatic stylesheet import.
- Default slot action labels are English.
- Every i18n entry accepts either a string or a function that receives
  action-specific data and returns a string.
- `nativeControls` provides typed native controls for text, textarea, select,
  checkbox, number, date, and single-file values.
- Native controls preserve Fokit's input, metadata, disabled, read-only,
  required, blur, value-update, and FormData contracts.
- Existing fully custom kits remain source-compatible.
- Public types and package output expose the complete supported API.
- The bespoke documentation SPA is replaced by a Vocs 2 site whose authored
  public content lives in English Markdown/MDX.
- Every TypeScript and TSX code block is either checked by Vocs' built-in
  Shiki Twoslash pipeline or included from a real `.ts`/`.tsx` file covered by
  `docs-site/tsconfig.docs.json`; unexpected TypeScript diagnostics fail the
  build.
- Vocs' built-in rich Twoslash renderer provides type hovers and supports
  `// ---cut---` for compiler-only setup.
- Twoslash runs only during Vocs generation. TypeScript and Twoslash are not
  added to the published Fokit package or loaded as a browser-side compiler.
- Vocs Markdown/MDX pages are the canonical public English documentation for
  the new baseline, customization, i18n, and native FormData limitations.
- `README.md`, `docs/SPEC.md`, the styling ADR, and the retained Russian
  repository tutorial agree with the new public API.
- Russian documentation content, locale switching, locale persistence, and
  locale-prefixed canonical routes are removed from the documentation site.
- Vocs exposes clean locale-free path routes and contains no redirects or
  compatibility handling for old locale-prefixed hashes.
- The Interactive Fokit Lab uses the shipped `nativeControls` and
  `createDefaultSlots({ i18n })` instead of local control and slot
  implementations.
- `npm run verify` passes, including the project-required `npm run check` and
  `npm run knip`.
- `npm run site:verify` passes source-content tests, docs-site TypeScript
  checks, the Vocs build, Markdown audit, generated-output assertions, and
  Interactive Fokit Lab E2E coverage in that order.

## Context

Files and components involved:

- `src/react/create-form-kit.tsx`
  - `FormKitSlots`
  - `CreateFormKitOptions`
  - `createFormKit`
  - the current `assertSlots` runtime requirement
- `src/react/slots.ts`
  - public props for `Field`, `Section`, `Array`, `ArrayItem`, and
    `ErrorMessage`
- `src/react/control.tsx`
  - `ControlProps`
  - `ControlDefinition`
  - `defineControl`
- `src/react/hidden-inputs.tsx`
  - native and serialized FormData behavior for visible, hidden, and disabled
    controls
- `src/index.ts`
  - public React exports
- `examples/form-kit.tsx`
  - existing reference implementations for text, select, checkbox, and all
    five structural slots
- `src/react/create-form-kit.test.tsx`
  - currently asserts that every slot is required
- `src/react/accessibility.test.tsx`
  - existing generated-form accessibility coverage
- `src/react/form-data.test.tsx`
  - native, hidden, number, date, checkbox, and file FormData patterns
- `tests/types/controls-and-kit.test.ts`
  - public control and kit type inference
- `docs/SPEC.md`
  - currently states that all five slots are required and rejects a silent
    built-in structural fallback
- `docs/adr/0001-styling-and-layout-boundary.md`
  - requires application-owned visual styling and optional structural CSS
- `README.md`, `docs/getting-started.md`, `docs/controls.md`,
  `docs/tutorial.md`, and `docs/tutorial.ru.md`
  - current onboarding requires users to implement controls and slots first
- `docs-site/src/content.js`, `docs-site/src/content.test.mjs`,
  `docs-site/src/routing.mjs`, `docs-site/src/routing.test.mjs`,
  `docs-site/src/app.jsx`, `docs-site/src/main.jsx`,
  `docs-site/src/examples.js`, `docs-site/src/lab.jsx`,
  `docs-site/src/styles.css`, `docs-site/index.html`, and
  `docs-site/vite.config.mjs`
  - bespoke English/Russian Vite SPA, hash router, handwritten syntax
    highlighter, and local lab implementation to remove
- `docs-site/vocs.config.ts`
  - new single source for title, English navigation, GitHub Pages base path,
    static rendering, dead-link checks, theme, and repository links
- `docs-site/src/pages/**/*.mdx`
  - new canonical English public documentation
- `docs-site/src/pages/_root.css`
  - minimal Fokit brand variables and Interactive Lab presentation on top of
    Vocs rather than a replacement documentation design system
- `docs-site/src/components/interactive-lab.tsx` and
  `docs-site/src/components/interactive-lab.client.tsx`
  - Vocs MDX wrapper and interactive client implementation
- `docs-site/src/snippets/form-kit.tsx`,
  `docs-site/src/snippets/basic-form.tsx`, and
  `docs-site/src/snippets/server-action.ts`
  - canonical complete, copyable, TypeScript-checked examples included by Vocs
    code fences
- `docs-site/tests/content.test.mjs` and
  `docs-site/tests/build-output.test.mjs`
  - focused source-level checks for required pages, removed locale/router
    infrastructure, API-export discoverability, and the typed-code-block
    invariant
  - post-build checks for agent-readable Markdown and indexing artifacts
- `docs-site/package.json` and `docs-site/package-lock.json`
  - migrate scripts and dependencies from a hand-built Vite SPA to Vocs
- `docs-site/tsconfig.docs.json`
  - TypeScript 5.9 semantic checking for complete snippets, the Vocs
    configuration, and docs-site TS/TSX components
- `knip.json` and `.gitignore`
  - teach repository gates about Vocs TS/TSX/MDX/CSS sources and ignore Vocs'
    generated cache
- `docs-site/AGENTS.md`
  - update stale hash-routing and translation-parity instructions for the
    confirmed English-only Vocs architecture
- `tests/browser/docs-site.spec.ts`
  - migrate route, navigation, code-block, Twoslash, and Interactive Lab E2E
    coverage to Vocs
- `README.md`, `docs/getting-started.md`, `docs/controls.md`,
  `docs/styling.md`, `docs/react19-actions.md`, and `docs/tutorial.md`
  - migrate public English guidance into Vocs and remove duplicate guide files
    after content parity is verified
- `docs/SPEC.md`, `docs/adr/0001-styling-and-layout-boundary.md`,
  `docs/releasing.md`, and `docs/tutorial.ru.md`
  - remain repository documents; the Russian tutorial stays out of the public
    site

Related patterns:

- `examples/form-kit.tsx` already implements production-shaped text, select,
  checkbox, and structural slot examples.
- Slot roots must spread `rootProps` exactly once. `Section` must place
  `layoutProps` around its children. Field labels, descriptions, controls, and
  errors must preserve the supplied accessibility props.
- A control value type participates in compile-time path compatibility.
  `string | undefined`, `number | undefined`, `boolean`, and
  `File | undefined` therefore cannot be replaced by a single unknown-valued
  generic control.
- Native FormData keeps numbers and dates as strings, omits unchecked
  checkboxes, and preserves `File` objects. Server coercion remains a schema
  responsibility.
- `fokit/layout.css` is opt-in structural CSS. The main entry must not import
  it.

Dependencies:

- No new dependency in the published `fokit` package.
- Replace the bespoke site dependencies with documentation-only
  `vocs@2.7.2`, `waku@1.0.0-beta.6`, `vite@8.1.5`,
  `typescript@5.9.3`, `@types/react@19.2.17`, and
  `@types/react-dom@19.2.3`, while retaining React 19, Zod, Fokit, and the
  Newsreader font needed by the lab and light brand customization.
- Use the Shiki and `@shikijs/twoslash` integration shipped by Vocs. Do not
  install a second direct Shiki/Twoslash major alongside it.
- The separate documentation TypeScript pin is required: the repository uses
  TypeScript 7.0.2, whose native-preview package does not expose `ts.sys`;
  Vocs' Twoslash pipeline requires the TypeScript compiler API. TypeScript
  5.9.3 is the docs-only compiler for Twoslash, while the root remains on
  TypeScript 7.0.2.
- React 18 and React 19 compatibility must be preserved.
- The React-free `fokit/core` and `fokit/server` entries must not import React
  or the new components.

Relevant commands:

- Focused tests: `npm test -- src/react/default-slots.test.tsx`
- Focused tests: `npm test -- src/react/native-controls.test.tsx`
- Kit tests: `npm test -- src/react/create-form-kit.test.tsx`
- Accessibility tests: `npm test -- src/react/accessibility.test.tsx`
- FormData tests: `npm test -- src/react/form-data.test.tsx`
- Type tests: `npm run test:types`
- Documentation types: `npm run test:docs`
- Documentation-site content tests: `npm run site:test`
- Vocs agent-output audit: `npm run test:markdown --prefix docs-site`
- Vocs production build: `BASE_PATH=/fokit npm run site:build`
- Complete documentation-site verification: `npm run site:verify`
- Package verification: `npm run package:check`
- Package aggregate verification: `npm run verify`
- Mandatory project checks: `npm run check` and `npm run knip`

Project constraints:

- Keep changes surgical and follow existing React and TypeScript style.
- Read immediate callers and public exports before changing contracts.
- Tests must encode the intended accessibility, i18n, value, and FormData
  semantics.
- When conflicting patterns are found, choose one explicitly and document why.
- Record non-duplicate workflow friction in `PAPERCUTS.md`.

## Review Handoff

Original request:

- Add default structural slots so users can start without implementing all
  five slots.
- Make English the default slot language.
- Allow every i18n entry to be either a string or a function receiving data.
- Add a reusable native HTML control registry.
- Do not add `createNativeFormKit`.
- Require complete Markdown and documentation-site coverage.
- Migrate the Interactive Fokit Lab to the shipped native controls and default
  slots.
- Remove Russian documentation from the website while retaining required
  English website documentation.
- Replace the custom documentation SPA with Vocs and migrate all public
  English documentation to Vocs Markdown/MDX pages.
- Use Vocs' built-in Shiki and `@shikijs/twoslash` integration with its rich
  hover renderer, semantic checking, and compiler-only cut regions.
- Present the complete agreement and implementation approach for confirmation
  before production implementation begins.

Key decisions:

- Keep one factory: `createFormKit`.
- Keep controls explicit through `controls: nativeControls`.
- Make `slots` optional and partial; resolve omitted slots from
  `createDefaultSlots()` using English messages.
- Export `createDefaultSlots`, its i18n types, `nativeControls`, and the native
  control option types from `fokit`.
- Keep all defaults unstyled and do not import `fokit/layout.css`
  automatically.
- Treat default slots as an accessibility baseline, not as a design-system
  theme.
- Treat native controls as an opt-in registry, not as silently merged controls.
- Keep control selection explicit in form definitions; do not infer controls
  from Standard Schema.
- Prefix every array-action i18n key with `array`.
- Treat Vocs pages, repository technical documentation, and the Interactive
  Fokit Lab migration as required deliverables, not optional follow-up.
- Make Vocs the canonical source for public English documentation. Keep
  `README.md` as a concise package entry point and keep `docs/SPEC.md`,
  `docs/adr/`, `docs/releasing.md`, and `docs/tutorial.ru.md` as repository
  documents.
- Remove the duplicated public English guides from `docs/` only after their
  content and links are represented in Vocs.
- Make the public site English-only: remove Russian content, locale switching,
  locale persistence, and locale-dependent component props.
- Replace hash routes with Vocs path routes such as `/get-started` and `/api`.
  Do not preserve or redirect old locale-prefixed hashes.
- Configure Vocs with `renderStrategy: "full-static"`, `basePath: "/fokit"` in
  production, `baseUrl: "https://r13v.github.io/fokit"`, and
  `checkDeadlinks: true` for GitHub Pages.
- Use ordinary Vocs fenced code blocks for shell and static source. Mark every
  inline TypeScript/TSX block with `twoslash`, add compiler-only setup above
  `// ---cut---`, and use explicit expected-error annotations only when an
  error is the lesson.
- Move the three canonical complete programs from `examples/` to
  `docs-site/src/snippets/` so Vocs physical includes and
  `docs-site/tsconfig.docs.json` consume exactly the same source files.
- Use Vocs' built-in rich Twoslash renderer. The Vocs 2.7.2 integration is
  built on `@shikijs/twoslash` 3.x; do not install a parallel 4.x Shiki stack
  or replace Vocs' renderer with a custom pipeline.
- Preserve the recognizable Fokit green palette and Newsreader headings with
  minimal Vocs variables in `_root.css`; do not recreate the removed custom
  documentation shell.

Explicit non-goals:

- No `createNativeFormKit`.
- No visual theme, colors, typography, borders, or component-library styling
  shipped by the Fokit library.
- No automatic CSS import.
- No automatic control selection from schema metadata.
- No radio group, checkbox group, multi-select, or multiple-file control in
  this change.
- No server-side type decoding based on the React control registry.
- No new Fokit runtime dependency or design-system adapter.
- No runtime Shiki, Twoslash, or TypeScript dependency in the published Fokit
  package.
- No browser-side compiler, CDN type acquisition, custom Shiki/Twoslash
  pipeline, or external code-sandbox dependency.
- No deletion of `docs/tutorial.ru.md`; Russian Markdown documentation is
  separate from the English-only documentation site decision.
- No backward compatibility for old documentation-site locale-prefixed hashes.

Confirmed public details:

- The public i18n keys are `arrayAdd`, `arrayRemove`, `arrayMoveUp`, and
  `arrayMoveDown`.
- `arrayAdd` function data is `{ label }`, where `label` is the array label
  `ReactNode | undefined`.
- Array-item function data is `{ index, position }`, where `index` is zero-based
  and `position` is one-based.
- Functions return strings; default slots use the resolved string as visible
  button content.
- The first native registry contains `text`, `textarea`, `select`, `checkbox`,
  `number`, `date`, and `file`.

Hidden context: none. This plan is self-contained for a fresh executor.

## Development Approach

- Testing approach: write or update the focused failing test for each public
  contract before implementing that contract.
- Complete each task fully before moving to the next.
- Make small, focused changes.
- Every code-change task includes new or updated tests.
- All focused tests for a task must pass before starting the next task.
- Update this plan if confirmed scope changes during implementation.
- Do not rely on chat history; decisions and constraints must be recorded here
  before execution.

## Testing Strategy

- Type tests verify optional and partial slots, full resolved `kit.slots`,
  native control names, control option inference, and value/path
  compatibility.
- DOM tests verify semantic output and all five default slot contracts.
- Accessibility tests verify labels, descriptions, error relationships,
  focusable error roots, button names, disabled states, and read-only guards.
- Interaction tests verify add, remove, move, change, blur, and reset behavior.
- FormData tests verify visible and preserved values for every native control
  and document cases that intentionally follow browser semantics. Read-only
  select, checkbox, and file tests compare both store state and actual
  `new FormData(form)` after attempted pointer and keyboard edits.
- Package tests verify all new values and types are available from the public
  `fokit` entry in both ESM and CJS builds.
- The TypeScript 5.9 compiler pinned in `docs-site` runs
  `tsc --project tsconfig.docs.json` there and verifies every complete snippet,
  Vocs config file, and docs-site TS/TSX component.
- Vocs builds semantically check every `ts` and `tsx` fence marked
  `twoslash`; unexpected diagnostics fail the build.
- Documentation source tests verify the required Vocs page map, English
  navigation/frontmatter, removed locale infrastructure, public-export
  discoverability, and that every TypeScript code block is covered by
  Twoslash or a checked physical include. Vocs itself owns dead-link checks.
- `vocs markdown-audit` verifies custom MDX components provide meaningful
  machine-readable output for `.md`, `llms.txt`, and `llms-full.txt`.
- Documentation E2E tests verify that the Interactive Fokit Lab uses the
  shipped native controls and default slots without losing behavior, and that
  Vocs navigation, clean path routes, search, code copy, and rich Twoslash
  output work under the `/fokit` base path.
- Final verification commands: `npm run verify` and `npm run site:verify`.

## Progress Tracking

- Mark completed tasks with `[x]` when their focused verification passes.
- Record only confirmed scope changes or blockers in this plan.

## Implementation Steps

### Task 1: Define and test the default-slot i18n contract

**Why:** The message contract must be stable before components consume it, and
function arguments must expose useful data without leaking internal objects.

**Files:**

- Create: `src/react/default-slots.tsx`
- Create: `src/react/default-slots.test.tsx`

- [x] Write failing tests for English fallback, mixed string/function
      overrides, action data, one-based `position`, and factory isolation
      across calls.
- [x] Add `DefaultSlotI18nValue<Data> = string | ((data: Readonly<Data>) =>
      string)`.
- [x] Add public data types for the add action and array-item actions.
- [x] Add `DefaultSlotsI18n` with `arrayAdd`, `arrayRemove`, `arrayMoveUp`, and
      `arrayMoveDown`.
- [x] Define complete English defaults.
- [x] Implement synchronous message resolution for strings and functions.
- [x] Merge a partial `i18n` object over the English defaults without mutating
      either input.
- [x] Run `npm test -- src/react/default-slots.test.tsx`.

### Task 2: Implement the five accessible default slots

**Why:** Users need a safe working structural baseline, while custom kits must
retain complete control over markup.

**Files:**

- Modify: `src/react/default-slots.tsx`
- Modify: `src/react/default-slots.test.tsx`
- Modify: `src/react/accessibility.test.tsx`

- [x] Extend the DOM and accessibility tests first for all five slot contracts,
      callbacks, conditional content, disabled states, ARIA relationships, and
      error focus props.
- [x] Implement default `Field`, `Section`, `Array`, `ArrayItem`, and
      `ErrorMessage` components using their public slot props.
- [x] Spread each `rootProps` object on exactly one root.
- [x] Preserve `labelProps`, `descriptionProps`, `layoutProps`, controls,
      errors, issue messages, and all action callbacks.
- [x] Render default error messages with `role="alert"` while preserving the
      supplied focus and identification props.
- [x] Render native `button type="button"` elements for add, remove, move up,
      and move down.
- [x] Respect `canAdd`, `disabled`, `readOnly`, `canMoveUp`, and `canMoveDown`
      when disabling actions.
- [x] Resolve English or caller-provided i18n values during render.
- [x] Keep markup unstyled and free of imported CSS.
- [x] Run `npm test -- src/react/default-slots.test.tsx
      src/react/accessibility.test.tsx`.

### Task 3: Make default slots the `createFormKit` fallback

**Why:** The default components only remove onboarding friction when omitted
slots resolve automatically, while partial overrides should remain concise.

**Files:**

- Modify: `src/react/create-form-kit.tsx`
- Modify: `src/react/create-form-kit.test.tsx`
- Modify: `tests/types/controls-and-kit.test.ts`
- Modify: `tests/types/definitions.test.ts`

- [x] Replace the old missing-slot rejection test with failing omitted-slot and
      partial-override tests; add type tests for omitted, partial, and fully
      custom slots before changing the implementation.
- [x] Change `CreateFormKitOptions.slots` to optional
      `Partial<FormKitSlots>`.
- [x] Resolve slots once per kit by merging `createDefaultSlots()` with the
      provided partial overrides.
- [x] Preserve a fully resolved `FormKitSlots` object in `kit.slots`.
- [x] Pass only the resolved slots to `createFieldsComponent` and
      `createAutoFormComponent`.
- [x] Keep a runtime assertion after merging so explicit invalid JavaScript
      values such as `Field: undefined` fail descriptively.
- [x] Verify existing custom kits compile and behave unchanged.
- [x] Run `npm test -- src/react/create-form-kit.test.tsx`.
- [x] Run `npm run test:types`.

### Task 4A: Implement text-like native controls

**Why:** Default slots remove structural boilerplate, but a first form still
requires control wrappers. The text-like controls share genuine native
`readOnly` semantics and can be implemented and verified as one focused unit.

**Files:**

- Create: `src/react/native-controls.tsx`
- Create: `src/react/native-controls.test.tsx`
- Modify: `src/react/form-data.test.tsx`

- [x] Write failing component, interaction, and FormData tests for `text`,
      `textarea`, `number`, and `date` before implementing them.
- [x] Define `NativeTextType` as the closed text-like union `"text" | "email"
      | "password" | "search" | "tel" | "url"`; declaration-test that
      checkbox, file, hidden, number, date, and button types are rejected.
- [x] Implement `text` for `string | undefined` with `NativeTextType`,
      placeholder, and autocomplete options.
- [x] Implement `textarea` for `string | undefined` with placeholder,
      autocomplete, and rows options.
- [x] Implement `number` for `number | undefined`, mapping an empty input to
      `undefined` and never writing `NaN`; support min, max, step, and
      placeholder options.
- [x] Implement `date` for `string | undefined` using the native `YYYY-MM-DD`
      representation with optional min and max.
- [x] Pass the native `readOnly` attribute to all four controls so they remain
      focusable and successful FormData controls while rejecting edits.
- [x] Preserve input identity, described-by metadata, invalid state, blur,
      disabled, required, and supported native options.
- [x] Add native serializers for hidden or disabled value preservation.
- [x] Run `npm test -- src/react/native-controls.test.tsx
      src/react/form-data.test.tsx`.

### Task 4B: Implement choice and single-file native controls

**Why:** Select, checkbox, and file inputs do not support the HTML `readOnly`
attribute. Their non-editable behavior and native submission contracts must be
explicit rather than approximated by silently disabling every element.

**Files:**

- Modify: `src/react/native-controls.tsx`
- Modify: `src/react/native-controls.test.tsx`
- Modify: `src/react/form-data.test.tsx`
- Modify: `src/react/reset.test.tsx`

- [x] Write failing interaction and actual `new FormData(form)` tests for
      `select`, `checkbox`, and `file`, including transitions into read-only
      state, before implementing them.
- [x] Implement `select` for `string` with typed string options and disabled
      option support; do not inject an implicit placeholder option.
- [x] Implement `checkbox` for `boolean` with native checked/unchecked
      FormData behavior.
- [x] Keep read-only select and checkbox controls enabled and named so they
      remain successful controls. Expose `aria-readonly`, prevent pointer and
      keyboard value changes, and guard `onChange`; the controlled value must
      remain unchanged.
- [x] Implement a single `file` control for `File | undefined` with optional
      `accept`; keep the native input uncontrolled and select only the first
      file.
- [x] For a read-only file input, keep the currently selected native file and
      successful-control status, expose `aria-readonly`, block click,
      Enter/Space activation, and drop before the picker or drop mutation, and
      guard `onChange`. Verify the store value and actual `FormData` stay
      unchanged after each attempted user edit.
- [x] Document that a file field starts as `undefined`: browsers do not allow a
      `File` default value to hydrate an uncontrolled input. A file selected
      before the field becomes read-only remains the submitted native file.
- [x] Add serializers for select and checkbox where hidden or disabled value
      preservation is possible. Do not add a file serializer.
- [x] Preserve and test `input.id`, `input.name`, `input.ref`,
      `input["aria-describedby"]`, `meta.invalid` as `aria-invalid`, blur,
      disabled, required, and every supported option for select, checkbox, and
      file. Include disabled serialization, file ref/reset, and focus behavior.
- [x] Assert that hidden or disabled file fields are rejected by classic and
      Action submission compatibility checks because their `File` value cannot
      be represented by hidden inputs.
- [x] Freeze the exported `nativeControls` registry and its control
      definitions consistently with `defineControl`.
- [x] Test and document native protocol differences: visible unchecked
      checkboxes are absent, and visible number/date entries are strings.
- [x] Run `npm test -- src/react/native-controls.test.tsx
      src/react/form-data.test.tsx src/react/reset.test.tsx`.

### Task 5: Export and declaration-test the public API

**Why:** Users must be able to compose defaults from the supported package
entry with complete type inference in React 18 and React 19 projects.

**Files:**

- Modify: `src/index.ts`
- Create: `tests/types/native-defaults.test.ts`
- Modify: `tests/fixtures/react18-vite/src/main.tsx`
- Modify: `tests/fixtures/react19-vite/src/main.tsx`
- Modify: `tests/fixtures/node-esm/index.mjs`
- Modify: `tests/fixtures/node-cjs/index.cjs`
- Modify: `tests/fixtures/node-cjs/index.cts`

- [x] Write failing public declaration and built-export tests before adding the
      root exports.
- [x] Export `createDefaultSlots`, `DefaultSlotI18nValue`,
      `DefaultSlotsI18n`, action data types, `nativeControls`,
      `NativeTextType`, `NativeTextOptions`, `NativeTextareaOptions`,
      `NativeSelectOptions`, `NativeSelectOption`, `NativeNumberOptions`,
      `NativeDateOptions`, and `NativeFileOptions` from `fokit`.
- [x] Keep the new React API out of `fokit/core` and `fokit/server`.
- [x] Verify control-name inference and each native control's compatible path
      value types.
- [x] Declaration-test the closed `NativeTextType` union and reject non-text
      input types.
- [x] Verify mixed custom/native registries preserve literal control names and
      options.
- [x] Extend the existing packed-package ESM runtime and CJS runtime/typecheck
      fixtures; verify both module systems expose `createDefaultSlots` and
      `nativeControls`, and that the CJS declaration condition exposes
      representative option/i18n types.
- [x] Verify React 18 and React 19 package fixtures can build a kit with
      `nativeControls` and omitted slots.
- [x] Run `npm run test:types`.
- [x] Run `npm run test:package`.
- [x] Run `npm run test:smoke`.

### Task 6: Update repository contracts and retained Markdown

**Why:** This feature intentionally reverses the current documented requirement
that every kit provide five slots, so all authoritative guidance must describe
one consistent boundary. Repository contracts must agree with the public Vocs
documentation without retaining a second English tutorial set.

**Files:**

- Modify: `README.md`
- Modify: `docs/SPEC.md`
- Modify: `docs/adr/0001-styling-and-layout-boundary.md`
- Modify: `docs/tutorial.ru.md`

- [x] Replace the statement that all five slots are required with the new
      English-default, partial-override behavior.
- [x] Clarify that default slots are unstyled accessible markup, not a visual
      theme, and that `fokit/layout.css` remains opt-in.
- [x] Document `createDefaultSlots({ i18n })`, string/function messages,
      function data, partial locale fallback, and slot composition.
- [x] Document `nativeControls`, their exact value types and options, and
      explicit registry composition with custom controls.
- [x] Document native FormData and schema-coercion requirements for number,
      date, checkbox, optional string, and file fields.
- [x] Update the ADR to distinguish an unstyled semantic fallback from the
      still-rejected mandatory visual theme.
- [x] Keep `README.md` concise: show the shortest
      `createFormKit({ controls: nativeControls })` setup and retain links to
      the specification, ADR, release process, and Russian repository tutorial.
      Defer clean Vocs-page and snippet-path rewrites to Task 8E, after those
      destinations exist.
- [x] Update `docs/tutorial.ru.md` for the new APIs, but keep its current
      example paths until Task 8D creates the canonical snippets. Do not expose
      the tutorial in Vocs navigation or content.
- [x] Run `npm run check` before the documentation-site migration.

### Task 7A: Replace the bespoke documentation shell with Vocs

**Why:** Establish the maintained Markdown-first shell before changing
repository-wide verification and deployment plumbing.

**Files:**

- Modify: `docs-site/package.json`
- Unchanged: `docs-site/package-lock.json` (no dependency changes)
- Create: `docs-site/vocs.config.ts`
- Create: `docs-site/src/pages/index.mdx`
- Create: `docs-site/src/pages/_root.css`
- Create: `docs-site/tests/content.test.mjs`
- Modify: `docs-site/AGENTS.md`
- Delete: `docs-site/index.html`
- Delete: `docs-site/vite.config.mjs`
- Delete: `docs-site/src/app.jsx`
- Delete: `docs-site/src/content.test.mjs`
- Delete: `docs-site/src/examples.js`
- Delete: `docs-site/src/main.jsx`
- Delete: `docs-site/src/routing.mjs`
- Delete: `docs-site/src/routing.test.mjs`
- Delete: `docs-site/src/styles.css`

- [x] Write the replacement shell/content assertions first. They must fail
      against the bespoke SPA and describe the minimum Vocs shell.
- [x] Replace the site scripts with `dev: "vocs dev"`, `build: "vocs build"`,
      `preview: "vocs preview"`, `test: "node --test
      tests/content.test.mjs"`, and `test:markdown: "vocs markdown-audit"`.
- [x] Install the exact docs-only dependencies listed in Context and remove
      dependencies used only by the deleted custom SPA.
- [x] Configure `title`, description, repository social link, `baseUrl`,
      environment-driven `basePath`, `renderStrategy: "full-static"`,
      `checkDeadlinks: true`, English navigation, light/dark GitHub code
      themes, and `editLink` in `docs-site/vocs.config.ts`.
- [x] Keep the production base path `/fokit` without a trailing slash.
- [x] Do not enable Vocs MCP, feedback, dynamic OG, or API routes. Intentionally
      omit a custom `ogImageUrl`; the deployable output must contain no API
      route, server entry, function artifact, or dynamic OG URL.
- [x] Create a minimal English landing page and minimal brand variables so the
      new Vocs shell builds before content migration.
- [x] Replace stale docs-site guidance with English-only Vocs, clean-route,
      static-hosting, physical-snippet, and public-package-import rules.
- [x] Remove the bespoke SPA entry, hash router, and handwritten syntax
      highlighter from the build. Keep `docs-site/src/content.js` temporarily
      as an unreferenced migration source until Task 8E proves content parity.
- [x] Run `npm run site:test`.
- [x] Run `BASE_PATH=/fokit npm run site:build`.

### Task 7B: Add docs TypeScript and generated-output gates

**Why:** Physical snippets, Vocs components, and static artifacts need
repository gates that use the docs-compatible compiler without making package
verification depend on docs-site installation.

**Files:**

- Modify: `docs-site/package.json`
- Modify: `docs-site/package-lock.json`
- Create: `docs-site/tests/build-output.test.mjs`
- Move: `tsconfig.docs.json` to `docs-site/tsconfig.docs.json`
- Modify: `package.json`
- Move: `knip.json` to `knip.config.js`
- Modify: `.gitignore`

- [x] Write failing docs-type and generated-output assertions before changing
      the verification configuration.
- [x] Add docs scripts `typecheck: "tsc --project tsconfig.docs.json"` and
      `test:output: "node --test tests/build-output.test.mjs"`.
- [x] Change the moved config to `extends: "../tsconfig.json"` and include
      `vocs.config.ts`, `src/components/**/*.ts`,
      `src/components/**/*.tsx`, `src/snippets/**/*.ts`, and
      `src/snippets/**/*.tsx`. Run it with the TypeScript 5.9 compiler pinned
      in `docs-site`.
- [x] Update root `test:docs` to build Fokit and invoke the docs-site
      `typecheck` script.
- [x] Keep root `verify` package-only by removing `test:docs` from that
      aggregate. Documentation remains mandatory through `site:verify`, which
      every CI, publish, and Pages path runs after installing docs dependencies.
- [x] Update root `site:verify` to run, in order: `site:test`, `test:docs`, the
      Vocs build with `BASE_PATH=/fokit`, the Markdown audit,
      generated-output tests, and E2E tests.
- [x] Update Knip configuration so the docs workspace scans `vocs.config.ts` and
      `src/**/*.{ts,tsx,mdx,css}` in addition to its scripts; verify the exact
      patterns are supported by the installed Knip version. Use
      `knip.config.js` because the CSS compiler requires a function.
- [x] Add `docs-site/.vocs/` to `.gitignore`; Vocs' filesystem Twoslash cache
      and other generated state must remain uncommitted.
- [x] Make the initial generated-output test assert `index.md`, `llms.txt`,
      `llms-full.txt`, `sitemap.xml`, and `robots.txt`, plus the absence of API,
      server/function, and dynamic OG artifacts.
- [x] Run `npm run test:docs`, `npm run site:test`,
      `BASE_PATH=/fokit npm run site:build`, and
      `npm run test:output --prefix docs-site`.
- [x] Run `npm run check` and `npm run knip`.

### Task 7C: Integrate Vocs with browser tests and GitHub workflows

**Why:** The deployment boundary must prove that docs dependencies are
installed and all site gates pass before `docs-site/dist` is uploaded.

**Files:**

- Modify: `playwright.docs.config.ts`
- Modify: `.github/workflows/pages.yml`
- Modify: `tests/package/ci-workflow.test.ts`
- Modify: `tests/package/workflows.test.ts`

- [x] Add failing workflow assertions first for CI, publish, and Pages:
      docs dependencies must be installed before `site:verify`, and Pages may
      upload only after that command succeeds.
- [x] Remove the preview `--base` CLI override from
      `playwright.docs.config.ts`; use the base path baked into the Vocs build.
- [x] Keep all workflows on `docs-site/dist` and remove the redundant trailing
      slash `BASE_PATH` override from the Pages workflow.
- [x] Preserve the existing package-only `verify` ordering in primary CI and
      publish; assert the independent docs job/publish step installs
      `docs-site` before running the mandatory `site:verify`.
- [x] Run `npm run test:package`.
- [x] Do not run the complete `site:verify` until Task 9 migrates its E2E
      expectations to Vocs; Tasks 7A–8E use their focused site gates.

### Task 8A: Lock the Vocs page map and migration inventory

**Why:** The old guides must not be deleted until every source section has an
explicit destination and the canonical page/navigation shell exists.

**Files:**

- Create: `docs-site/src/pages/get-started.mdx`
- Create: `docs-site/src/pages/api.mdx`
- Create: `docs-site/src/pages/types.mdx`
- Create: `docs-site/src/pages/advanced.mdx`
- Create: `docs-site/src/pages/faqs.mdx`
- Create: `docs-site/src/pages/guides/controls.mdx`
- Create: `docs-site/src/pages/guides/styling.mdx`
- Create: `docs-site/src/pages/guides/react-19-actions.mdx`
- Create: `docs-site/src/pages/guides/tutorial.mdx`
- Modify: `docs-site/src/pages/index.mdx`
- Modify: `docs-site/vocs.config.ts`
- Modify: `docs-site/tests/content.test.mjs`

- [x] Confirm the old-section-to-new-page inventory in “Documentation content
      parity map” below before writing or deleting content.
- [x] Extend source tests first for the complete route list, English
      `title`/`description` frontmatter, and sidebar discoverability.
- [x] Create every canonical page shell and add every route to the English
      Vocs navigation.
- [x] Keep source checks narrow: required paths/frontmatter, absence of
      locale/hash routing from the active Vocs config and pages, and API-export
      discoverability. Add the typed code-fence invariant with the snippet
      migration in Task 8D. Do not build a second Markdown parser.
- [x] Run `npm run site:test`.

### Task 8B: Migrate the landing and core reference pages

**Why:** The main product explanation and API reference should become useful
and reviewable before the longer guides move.

**Files:**

- Modify: `docs-site/src/pages/index.mdx`
- Modify: `docs-site/src/pages/get-started.mdx`
- Modify: `docs-site/src/pages/api.mdx`
- Modify: `docs-site/src/pages/types.mdx`
- Modify: `docs-site/src/pages/advanced.mdx`
- Modify: `docs-site/src/pages/faqs.mdx`
- Modify: `docs-site/tests/content.test.mjs`

- [x] Add failing destination-heading/export-discoverability assertions for
      every section group listed for Get started, API, Types, Advanced, and
      FAQs before migrating the content.
- [x] Migrate the English landing, get-started, API, types, advanced, and FAQ
      sections from `docs-site/src/content.js` and the mapped repository
      guides; do not copy Russian page variants.
- [x] Update onboarding for `nativeControls`, omitted English default slots,
      partial slot overrides, `createDefaultSlots({ i18n })`, array-prefixed
      message keys, and native FormData caveats.
- [x] Preserve the complete public boundary and FAQ coverage recorded in the
      parity map rather than reducing the site to navigation labels.
- [x] Run `npm run site:test`.
- [x] Run `BASE_PATH=/fokit npm run site:build` and treat Twoslash or dead-link
      diagnostics as failures.

### Task 8C: Migrate the public English guides

**Why:** Controls, styling, React 19 Actions, and the tutorial are independent
review units and must reach parity before their old Markdown sources disappear.

**Files:**

- Modify: `docs-site/src/pages/guides/controls.mdx`
- Modify: `docs-site/src/pages/guides/styling.mdx`
- Modify: `docs-site/src/pages/guides/react-19-actions.mdx`
- Modify: `docs-site/src/pages/guides/tutorial.mdx`
- Modify: `docs-site/tests/content.test.mjs`

- [x] Add failing destination-heading assertions for each mapped guide before
      migrating it.
- [x] Migrate every English section from `docs/controls.md`,
      `docs/styling.md`, `docs/react19-actions.md`, and `docs/tutorial.md` into
      its mapped Vocs guide.
- [x] Reconcile tutorial steps that formerly required local controls and all
      five slots with the new native/default baseline while retaining custom
      composition as an advanced path.
- [x] Keep `fokit/layout.css` opt-in and keep React 18/19 submission boundaries
      explicit.
- [x] Run `npm run site:test`.
- [x] Run `BASE_PATH=/fokit npm run site:build`.

### Task 8D: Make every displayed TypeScript example executable

**Why:** Inline lessons and complete programs need complementary checks:
Twoslash for rich inline examples and the docs TypeScript compiler for physical
includes.

**Files:**

- Create: `docs-site/src/snippets/form-kit.tsx`
- Create: `docs-site/src/snippets/basic-form.tsx`
- Create: `docs-site/src/snippets/server-action.ts`
- Modify: `docs-site/src/pages/**/*.mdx`
- Modify: `docs-site/tests/content.test.mjs`
- Modify: `docs-site/tsconfig.docs.json`

- [x] Extend the source tests first so every inline `ts`/`tsx` fence requires
      `twoslash`, while every physical include must resolve inside
      `docs-site/src/snippets/` and be covered by the docs TypeScript config.
- [x] Copy the three complete programs from `examples/` into the canonical
      snippet paths without deleting the originals yet.
- [x] Include complete files or named regions through Vocs physical includes
      such as `// [!include ~/snippets/form-kit.tsx]`; never paste a second copy
      of a complete program into MDX.
- [x] Mark every inline `ts` and `tsx` fence with `twoslash`. Use
      `// @jsx: react-jsx`, virtual files, external package types, and
      `// ---cut---` where required to keep the visible lesson concise while
      compiling a complete program.
- [x] Do not use `@noErrors` to hide a broken documentation example. Use
      `// @errors: <code>` only on a page intentionally teaching that exact
      error.
- [x] Run `npm run test:docs`, `npm run site:test`, and
      `BASE_PATH=/fokit npm run site:build`.

### Task 8E: Delete superseded public guides and example copies

**Why:** Vocs becomes canonical only after objective parity has passed; deletion
is the final migration step, not the mechanism used to discover missing
content.

**Files:**

- Modify: `README.md`
- Modify: `docs/tutorial.ru.md`
- Modify: `docs-site/tests/content.test.mjs`
- Delete: `docs/getting-started.md`
- Delete: `docs/controls.md`
- Delete: `docs/styling.md`
- Delete: `docs/react19-actions.md`
- Delete: `docs/tutorial.md`
- Delete: `docs-site/src/content.js`
- Delete: `examples/form-kit.tsx`
- Delete: `examples/basic-form.tsx`
- Delete: `examples/server-action.ts`

- [x] Verify every row in the parity map against its destination page and
      confirm all destination-heading tests pass before deleting a source.
- [x] Add failing assertions for the superseded paths and known old
      locale/hash-router symbols, then delete the duplicated English guides
      and old example copies.
- [x] Do not reject Cyrillic mechanically: English prose, navigation, and
      metadata are required, but localization examples may legitimately
      contain non-English message strings.
- [x] Update `README.md` and `docs/tutorial.ru.md` to use clean Vocs links and
      the canonical `docs-site/src/snippets/` paths.
- [x] Run `npm run site:test`, `npm run test:docs`, and
      `BASE_PATH=/fokit npm run site:build`.

### Task 9: Embed the Interactive Fokit Lab as a Vocs client component

**Why:** The live lab remains valuable, but it should be a focused MDX client
component using shipped Fokit primitives rather than owning the entire
documentation application.

**Files:**

- Create: `docs-site/src/components/interactive-lab.tsx`
- Create: `docs-site/src/components/interactive-lab.client.tsx`
- Modify: `docs-site/src/pages/get-started.mdx`
- Modify: `docs-site/src/pages/_root.css`
- Modify: `docs-site/tests/build-output.test.mjs`
- Delete: `docs-site/src/lab.jsx`
- Modify: `tests/browser/docs-site.spec.ts`

- [x] Rewrite the lab E2E expectations and generated Markdown fallback
      assertion first; confirm they fail before replacing the old lab.
- [x] Move only the lab's form definition, default values, result display, and
      interaction-specific UI into `interactive-lab.client.tsx`; add
      `"use client"` because it uses hooks and browser events.
- [x] Remove all local `defineControl` wrappers and configure the kit with
      `controls: nativeControls`.
- [x] Remove all five local slot implementations and configure the kit with
      `slots: createDefaultSlots({ i18n })`.
- [x] Map English Lab copy to `arrayAdd`, `arrayRemove`, `arrayMoveUp`, and
      `arrayMoveDown`; use `{ position }` functions for row-specific accessible
      names.
- [x] Remove Russian Lab copy, Russian country options, locale props, and
      locale-dependent memoization.
- [x] Export a server-side wrapper from `interactive-lab.tsx` with a `toMarkdown`
      representation that explains the browser-only lab and includes the
      equivalent shortest setup, so `vocs markdown-audit` passes.
- [x] Import the wrapper into `get-started.mdx` and preserve validation,
      conditional fields, reset, classic submit, array add/move/remove, and
      native FormData behavior.
- [x] Style only the lab through a scoped root class, public
      `data-fokit-node`/`data-fokit-layout` attributes, state attributes, and
      native descendants in `_root.css`; keep general navigation, typography,
      search, and code UI owned by Vocs.
- [x] Rewrite documentation E2E URLs and assertions for clean Vocs paths under
      `/fokit`, and remove all locale/hash/localStorage assertions.
- [x] Preserve lab behavior coverage and add assertions for Vocs sidebar
      navigation, direct deep links, code copy, a rich Twoslash hover, static
      `llms.txt`, and responsive navigation.
- [x] Extend generated-output assertions to cover `get-started.md` and confirm
      the lab fallback is meaningful in `get-started.md`, `llms.txt`, and
      `llms-full.txt`.
- [x] Run `npm run site:verify`.

### Task 10: Verify acceptance criteria and package quality

- [x] Verify `createFormKit({ controls: nativeControls })` renders a working
      English form.
- [x] Verify custom i18n can mix strings and functions.
- [x] Verify a partial custom slot object replaces only specified slots.
- [x] Verify a fully custom existing kit retains its DOM and behavior.
- [x] Verify native controls work with classic submission and their documented
      FormData representations.
- [x] Verify Vocs pages contain the public API, customization path, i18n
      contract, native FormData caveats, all migrated public English guides,
      and no Russian content.
- [x] Verify the old SPA, language switcher, Russian page map, saved-locale
      behavior, hash router, and handwritten highlighter are absent.
- [x] Verify canonical site URLs are clean Vocs paths under `/fokit`, with no
      compatibility handling for old locale-prefixed hashes.
- [x] Verify every inline TS/TSX block is Twoslash-checked and every complete
      physical example is included by `docs-site/tsconfig.docs.json`.
- [x] Verify Vocs produces static HTML, `index.md`, at least one nested page
      such as `get-started.md`, `llms.txt`, `llms-full.txt`, `sitemap.xml`, and
      `robots.txt` without a server runtime.
- [x] Verify the Interactive Fokit Lab imports `nativeControls` and
      `createDefaultSlots`, with no local control or slot implementations.
- [x] Verify no JavaScript entry imports CSS automatically.
- [x] Run `npm run verify` once as the final package aggregate; it must still
      include the mandatory `npm run check` and `npm run knip` gates.
- [x] Run `npm run site:verify` once as the final documentation aggregate; it
      must include docs TypeScript, generated-output, Markdown-audit, and E2E
      gates.
- [x] Run `git diff --check`.

### Task 11: Final documentation and plan completion

- [x] Reconcile `docs/SPEC.md` explicitly against the finalized default-slot,
      native-control, read-only/FormData, and documentation-routing contracts;
      do not add unrelated discoveries.
- [x] Record non-duplicate workflow friction in `PAPERCUTS.md`.
- [x] Confirm no implementation task expanded into visual theming, schema
      inference, group controls, or server registry coupling.
- [x] Move this plan to
      `docs/plans/completed/20260729-default-slots-and-native-controls.md`.

## Technical Details

### Default-slot types

The proposed public types are:

```ts
export type DefaultSlotI18nValue<Data> =
	| string
	| ((data: Readonly<Data>) => string)

export type DefaultArrayAddI18nData = {
	readonly label?: ReactNode
}

export type DefaultArrayItemI18nData = {
	readonly index: number
	readonly position: number
}

export type DefaultSlotsI18n = {
	readonly arrayAdd: DefaultSlotI18nValue<DefaultArrayAddI18nData>
	readonly arrayRemove: DefaultSlotI18nValue<DefaultArrayItemI18nData>
	readonly arrayMoveUp: DefaultSlotI18nValue<DefaultArrayItemI18nData>
	readonly arrayMoveDown: DefaultSlotI18nValue<DefaultArrayItemI18nData>
}

export function createDefaultSlots(options?: {
	readonly i18n?: Partial<DefaultSlotsI18n>
}): FormKitSlots
```

English defaults:

```ts
{
	arrayAdd: "Add item",
	arrayRemove: ({ position }) => `Remove item ${position}`,
	arrayMoveUp: ({ position }) => `Move item ${position} up`,
	arrayMoveDown: ({ position }) => `Move item ${position} down`,
}
```

The factory resolves missing locale entries against these English values. It
does not mutate or globally register a locale.

### Slot resolution

`createFormKit` will resolve slots once:

```ts
const slots = Object.freeze({
	...createDefaultSlots(),
	...options.slots,
})
```

Every kit receives its own resolved object. Existing fully custom slot objects
continue to replace all defaults. `kit.slots` exposes the resolved set for
inspection and composition.

### Native control semantics

- `text`: `string | undefined`; an empty DOM value is `""`, while an absent
  stored value renders as an empty input. Its configurable type is limited to
  `"text" | "email" | "password" | "search" | "tel" | "url"`.
- `textarea`: the same value behavior as `text`.
- `select`: `string`; options are explicit, and Fokit does not invent an empty
  option.
- `checkbox`: `boolean`; checked submits `"true"`, unchecked follows native
  absence semantics while visible.
- `number`: `number | undefined`; empty becomes `undefined`; valid changes use
  `valueAsNumber`; `NaN` is never stored.
- `date`: `string | undefined`; the value is a calendar date string, not a
  JavaScript `Date`, so no timezone conversion occurs.
- `file`: `File | undefined`; the browser owns the displayed value; reset uses
  the existing form-level file clearing behavior.

Text, textarea, number, and date use the native `readOnly` attribute. Select
and checkbox remain enabled, named, and controlled while read-only; their
interaction handlers prevent pointer/keyboard changes and their `onChange`
guards retain the controlled value, so native FormData still sees the current
successful control. A read-only file input remains enabled and named, exposes
`aria-readonly`, and blocks picker activation and drop before the browser can
replace its current native selection. Tests assert both store state and actual
`new FormData(form)` after attempted edits.

File inputs always start with `undefined`; a stored `File` cannot hydrate a
browser file input. A file selected before read-only is enabled remains the
native submitted value. Hidden or disabled file fields are rejected by
submission compatibility checks because the registry intentionally provides
no file serializer.

The control registry does not infer schema coercion. Documentation and tests
must show that native server submissions contain browser protocol values and
that the application schema remains responsible for producing its desired
domain output.

### Documentation content parity map

This inventory is the deletion gate for Task 8E:

| Existing English source | Required Vocs destination |
| --- | --- |
| `docs-site/src/content.js`: Get started | `/get-started` |
| `docs-site/src/content.js`: API | `/api` |
| `docs-site/src/content.js`: Types | `/types` |
| `docs-site/src/content.js`: Advanced | `/advanced` |
| `docs-site/src/content.js`: FAQs | `/faqs` |
| `docs/getting-started.md`: install, imports, first form | `/get-started` |
| `docs/getting-started.md`: context, visibility, transactions, submission, FormData, product boundary | `/advanced` with onboarding links from `/get-started` |
| `docs/controls.md`: control contract and FormData modes | `/guides/controls` with API type links to `/api` and `/types` |
| `docs/controls.md`: slots and kit creation | `/guides/controls` updated for default slots and partial overrides |
| `docs/styling.md`: stylesheet, variables, data attributes, boundary | `/guides/styling` |
| `docs/react19-actions.md`: client form, server action, transport, failures | `/guides/react-19-actions` |
| `docs/tutorial.md`: all numbered steps and product boundary | `/guides/tutorial`, revised to start from shipped defaults |
| `examples/form-kit.tsx` | `docs-site/src/snippets/form-kit.tsx` |
| `examples/basic-form.tsx` | `docs-site/src/snippets/basic-form.tsx` |
| `examples/server-action.ts` | `docs-site/src/snippets/server-action.ts` |

For the five `docs-site/src/content.js` rows, Task 8B must preserve and assert
these English section groups:

- Get started: installation; first form; control/slot ownership; generated
  rendering; schema validation; native submission.
- API: entry-point boundaries; `useForm`; `createFormKit`; `defineControl`;
  granular hooks; `FormInstance`; React-free core; `parseFormData`;
  `ActionForm`/`ActionSubmit`.
- Types: input/output; definitions and UI nodes; instance/options;
  control inference; structural slot props; snapshot/issues; paths;
  result types.
- Advanced: accessibility; generated/manual composition; reactive
  dependencies; hidden values; array identity; untrusted FormData; Actions;
  structural layout; public-boundary testing.
- FAQs: form-hook comparison; controlled behavior; schema support; complete
  defaults; component-library integration; hidden fields; reset; server
  errors; React 18/19; rerenders; absence of a built-in theme.

The Russian half of `docs-site/src/content.js`, locale UI/state, and
locale-prefixed hash routes intentionally have no destination. They are
deleted. `docs/tutorial.ru.md` remains a repository-only document and is not a
Vocs source.

### Vocs documentation architecture

`docs-site/vocs.config.ts` owns the public documentation shell:

```ts
import { defineConfig } from "vocs/config"

export default defineConfig({
	basePath: process.env.BASE_PATH ?? "/",
	baseUrl: "https://r13v.github.io/fokit",
	checkDeadlinks: true,
	renderStrategy: "full-static",
	title: "Fokit",
	sidebar: [
		{ text: "Get started", link: "/get-started" },
		{ text: "API", link: "/api" },
		{ text: "Types", link: "/types" },
		{ text: "Advanced", link: "/advanced" },
		{ text: "FAQs", link: "/faqs" },
	],
})
```

The final sidebar also contains the migrated controls, styling, React 19
Actions, and tutorial pages. The production build receives
`BASE_PATH=/fokit`; local development uses `/`. Vocs owns clean path routing,
page metadata, search, mobile navigation, previous/next navigation, syntax
highlighting, static generation, and agent-readable Markdown. No application
code parses or stores a locale.

Vocs' current rich Twoslash renderer is the selected hover UI. It is built on
`@shikijs/twoslash` and already integrated with Vocs' Shiki pipeline and CSS.
The implementation must not add a parallel direct `@shikijs/twoslash@4` or
`shiki@4` dependency to a Vocs 2.7.2 site that ships Shiki 3.x.

Inline API lessons use:

````md
```tsx twoslash
// @jsx: react-jsx
import { createFormKit, nativeControls } from "fokit"

// ---cut---
const kit = createFormKit({
	controls: nativeControls,
})
```
````

Complete source files use Vocs physical includes and remain covered by ordinary
`tsc`:

````md
```tsx
// [!include ~/snippets/form-kit.tsx]
```
````

The invariant is exhaustive: every displayed `ts` or `tsx` fence must either
contain the `twoslash` meta flag or consist of a checked physical include from
`docs-site/src/snippets/`. Vocs build errors, dead links, unexpected Twoslash
diagnostics, `vocs markdown-audit` failures, and `tsconfig.docs.json` errors are
all release blockers. Physical includes, the Vocs config, and docs components
are checked by `docs-site/tsconfig.docs.json` before the Vocs build runs.

## Post-Completion

No external service, credential, custom domain, or manual deployment is
required. GitHub Actions continues to deploy `docs-site/dist` to GitHub Pages.

Manual verification:

- Open the documentation lab and confirm an English form can be rendered from
  `nativeControls` without custom slots.
- Confirm the Vocs header contains no language switcher and all generated links
  use clean paths under `/fokit`.
- Inspect the Interactive Fokit Lab source and confirm it uses
  `nativeControls` and `createDefaultSlots({ i18n })`, with no local native
  control or structural slot implementations.
- Tab through field, array, and error actions to confirm accessible names and
  focus behavior.
- Hover and keyboard-focus a rich Twoslash target and confirm its type
  information is readable.
- Open `/fokit/llms.txt`, `/fokit/llms-full.txt`, and a page's `.md` form and
  confirm the Interactive Lab has a meaningful non-interactive representation.

Potential future work, explicitly outside this implementation:

- Radio groups.
- Checkbox groups.
- Multiple select.
- Multiple files.
- Packaged locale objects.
- A visual theme or design-system adapters.
