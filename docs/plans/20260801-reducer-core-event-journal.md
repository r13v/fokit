# Implement the Reducer Form Core and Optional Event Journal Features

## Overview

- Implement the accepted architecture in docs/proposal.md: a reducer-owned
  FormDocument, ephemeral runtime state, typed commands and immutable events,
  one synchronous Redux-style form middleware chain, deterministic replay,
  and optional history, persistence, and Redux DevTools entries.
- Keep an imperative FormInstance and FormStore command API as the primary
  interaction model, but change or remove current signatures and exports when
  that makes the accepted reducer architecture smaller or clearer. Application
  code may observe and transform typed transactions through middleware, but it
  must not receive raw event dispatch.
- Create every public React FormInstance through kit.createForm. Bind an
  existing form only through kit.useForm. Remove global createForm and useForm,
  and keep createFormStore only in form-please/core.
- Make kit.Form, kit.AutoForm, and ActionForm form-backed. Each component gets
  its rendering integration from the form's exact immutable kit snapshot.
  ActionForm does not accept a separate kit.
- Keep values and stable array-row identity in one atomic historical document.
  Keep baselines, touched paths, issues, validation, submission, context,
  runtime options, focus targets, and subscriptions outside history.
- Ship history, persistence, and Redux DevTools from isolated package subpaths
  without adding Redux or Redux DevTools runtime dependencies.

Acceptance criteria:

- Every committed document mutation reduces one immutable FormDocument whose
  values and row identity cannot diverge.
- Pure replay of the same checkpoint and event journal produces identical
  values and row identity, including nested arrays and generated row keys.
- Restore operations bypass beforeUpdate, afterUpdate, valuePolicy, automatic
  validation, itemDefault, schemas, and application mutation callbacks while
  still passing through the open application middleware chain.
- Restore reconciles ephemeral runtime state, makes captured validation and
  server results stale, publishes one coherent snapshot, and does not restore
  the dirty baseline or touched state.
- Middleware order, cancellation, replacement, nested dispatch, duplicate
  references, invalid results, asynchronous handlers, and pre-commit and
  post-commit errors follow docs/proposal.md.
- kit.createForm and kit.useForm are the only public React creation and binding
  methods. They enforce exact immutable kit-snapshot identity.
- kit.Form, kit.AutoForm, and ActionForm receive an existing form. Global
  createForm and useForm functions, KitForm and Submit values, UseFormOptions,
  and the main-entry createFormStore re-export are absent from generated
  declarations.
- History, persistence, and Redux DevTools use separate stable per-form handles
  and enforce their dependency and cardinality rules atomically at form
  creation.
- The existing main, core, React 19, and server build graphs cannot reach
  history, persistence, DevTools, codecs, or storage adapters.
- The documentation site is a self-contained user guide for every shipped
  public capability. It includes complete, copyable examples that use only
  public package imports.
- ESM, CommonJS, type, package, smoke, documentation, Biome, and Knip checks
  pass.

## Compatibility Policy — Breaking Redesign

**Backward compatibility is explicitly not required.** This implementation may
change or remove current public types, command signatures, notification details,
and React component props when the new architecture needs it. Do not add legacy
aliases, deprecated overloads, adapters, dual paths, or compatibility shims.

Preserve only the architectural contracts stated in this plan and the accepted
proposal. When an old behavior is intentionally retained, the task that retains
it must say so because the behavior still serves the new design, not because an
older consumer may depend on it.

## Context

Current implementation:

- src/core/form-store.ts defines FormStore, createFormStore, submission helpers,
  and the 2,009-line CoreFormStore coordinator. CoreFormStore currently owns
  values, baseline values, array-row state through MetadataState, issues,
  validation timers and abort controllers, submission state, context,
  subscriptions, focus targets, valuePolicy expansion, lifecycle hooks, and
  snapshot publication.
- CoreFormStore.#commitValueChanges in src/core/form-store.ts currently performs
  proposal creation, beforeUpdate replacement, value and metadata mutation,
  snapshot derivation, subscriber notification, afterUpdate, and validation
  scheduling in one method.
- src/core/transaction.ts already owns typed ValueChange normalization and
  applyValueChanges. Preserve these path and value contracts while moving
  document commits behind a reducer.
- src/core/array-state.ts currently stores keys, baselineKeys, and nextKeyIndex
  together in ArrayRowState. The implementation must separate historical
  current-row identity from the non-historical clean baseline.
- src/core/metadata.ts derives field and array metadata from values, baseline
  values, touched paths, and ArrayRowsState. It is the narrowest existing
  boundary for baseline row-key and touched-state reconciliation.
- src/core/issues.ts already centralizes immutable issue state, exposure,
  changed-path cleanup, and array-path reindexing.
- src/core/form-state.ts builds immutable public FormSnapshot values.
- src/core/validation.ts owns Standard Schema execution and result
  normalization; schemas and abortable work must remain effects outside pure
  reducers.
- src/react/form-instance.ts owns FormInstanceImpl, global createForm, runtime
  bindings, and classic submission attachment.
- src/react/use-form.ts implements the two global useForm forms: create from a
  normalized definition and bind an existing FormInstance.
- src/react/create-form-kit.tsx currently exposes controls, slots, extend,
  defineForm, Form, Submit, Fields, and AutoForm. It does not expose bound
  createForm or useForm.
- src/index.ts currently exports global createForm, useForm, KitForm, Submit,
  and createFormStore in addition to the kit-owned surface.
- src/react/auto-form.tsx currently accepts definition/defaultValues and creates
  a FormInstance through the definition-based global useForm overload.
- src/react19/action-form.tsx currently records edits during an Action by
  wrapping afterUpdate. This misses restore commits because accepted restore
  behavior suppresses afterUpdate.
- src/react19/action-form.tsx currently accepts kit, definition, and
  defaultValues and creates its own FormInstance.
- tsdown.config.ts and package.json expose only index, core, react19, and server.
  tests/package/build-output.test.ts and
  tests/package/package-metadata.test.ts encode that four-entry contract.
- vitest.config.ts currently includes src/core and src/server in the node
  project and src/react and src/react19 in the jsdom project.
- tests/fixtures/node-esm and tests/fixtures/node-cjs exercise published ESM and
  CommonJS entry points. scripts/verify-smoke-fixtures.mjs installs the packed
  package into those fixtures.
- docs/ARCHITECTURE.md describes the current implementation.
  docs/adr/0008-reducer-core-and-open-middleware.md records the accepted
  replacement decision.

Relevant tests and patterns:

- src/core/transaction.test.ts and src/core/value-policy.test.ts cover the
  present mutation proposal and lifecycle-hook behavior.
- src/core/array-state.test.ts includes a fast-check reference-model property
  test and nested-array row-key cases.
- src/core/reset.test.ts covers clean baseline, touched state, hook
  cancellation, and replacement.
- src/core/validation.test.ts covers stale asynchronous validation, aborts, and
  nested array issue reindexing.
- src/core/subscriptions.test.ts covers selector equality and no-op publication.
- src/react/hooks.test.tsx covers global external-form binding, Strict Mode, and
  concurrent-binding rejection.
- src/react19/result-sync.test.ts and src/react19/action-form.test.tsx cover
  Action staleness and pending-attempt behavior.
- tests/types/controls-and-kit.test.ts and tests/types/react-hooks.test.ts encode
  current FormKit, createForm, and useForm inference.
- tests/package/build-output.test.ts recursively checks built entry graphs, and
  tests/package/package-metadata.test.ts checks exact package exports.

Dependencies and environment:

- Node 24 or newer, TypeScript 6, Vitest 4, fast-check, React 18/19 peer
  compatibility, and Standard Schema are already available.
- No new runtime dependency is required. Redux and
  @redux-devtools/extension remain absent.
- Browser extension behavior is testable with an injected fake
  window.__REDUX_DEVTOOLS_EXTENSION__; no credential or installed extension is
  required for automated verification.

Project constraints:

- Read docs/ARCHITECTURE.md before changing module boundaries, public entries,
  form state, submission, or serialization.
- Reuse src/core/transaction.ts, src/core/array-state.ts, src/core/issues.ts,
  src/core/metadata.ts, and src/core/validation.ts before adding overlapping
  helpers.
- Keep changes surgical and match current immutable, frozen-object,
  null-prototype-map, canonical-path, and co-located-test conventions.
- Tests must encode the architectural reason for each boundary.
- Run npm run check and npm run knip before reporting implementation complete.
- For documentation-site work, follow docs-site/AGENTS.md. Load the STE skill
  before drafting or reviewing site text, and use its clarity mode for all
  authored English. Do not claim formal ASD-STE100 compliance.
- Preserve unrelated working-tree changes in CONTEXT.md, PAPERCUTS.md,
  docs-site/src/pages/index.mdx, docs/adr/0002-add-only-form-kit-extension.md,
  docs/adr/0008-reducer-core-and-open-middleware.md, and docs/proposal.md.

## Review Handoff

- Original request: turn docs/proposal.md into an executable implementation
  plan.
- Confirmed scope update: remove global React creation/binding APIs and use one
  exact-kit-owned FormInstance model across kit.Form, kit.AutoForm, and
  ActionForm. Backward compatibility is not required.
- Accepted source of truth: docs/proposal.md, status Accepted architecture;
  implementation pending, dated 2026-08-01.
- Selected approach: one master plan that follows the proposal's staged
  migration, with a passing verification gate after each stage. This keeps the
  new architecture runnable at each boundary and gives an executor explicit
  rollback and review boundaries without maintaining a parallel legacy path.
- Testing decision: characterization-first for the current document/runtime
  boundary, then test-first for pure reducers, middleware protocol, replay,
  journal validation, and serialization. React and package integration changes
  add tests in the same task as implementation.
- Rejected implementation approaches:
  - Do not keep direct mutation and add feature-specific hooks; it cannot give
    replay and optional features one authoritative commit boundary.
  - Do not make the core fully event sourced; forms without journal middleware
    must not retain checkpoints or exportable event records.
  - Do not embed row IDs into public values; primitive arrays and schema input
    must remain unchanged.
  - Do not add kit-level, definition-level, global, or dynamic middleware
    installation.
  - Do not create separate middleware systems for history, persistence, and
    DevTools.
  - Do not retain middleware-free global createForm or useForm alternatives.
  - Do not add definition-based AutoForm/ActionForm creation, kit.useCreateForm,
    an ActionForm kit prop, or global Form/AutoForm render components.
- Explicit non-goals:
  - Runtime state is not replayed or persisted.
  - No raw public event dispatch, general form disposal, general middleware
    cleanup, middleware preset, middleware bundle, or middleware mutation API.
  - No cross-tab synchronization, distributed conflict resolution, storage
    locking, compare-and-swap, server adapter implementation, or nuqs/TanStack
    Query runtime dependency.
  - No arbitrary Redux DevTools dispatch, skip, reorder, import, lock,
    persisted monitor state, or generated-test support.
  - No compatibility aliases for removed global createForm, useForm, KitForm,
    Submit, UseFormOptions, or the main-entry createFormStore re-export.
  - No backward-compatibility layer, deprecated alias, legacy event adapter, or
    dual old/new state path.
- Assumptions:
  - The accepted proposal resolves product and architecture choices; this plan
    does not reopen them.
  - FormDocument and transaction/event types required by public middleware are
    exported as read-only types, while RowIdentityState storage and mutation
    helpers remain package-private.
  - The repository stays dependency-free for Redux, storage, and codec
    frameworks.
  - Public API and type changes are allowed; expose only the smallest coherent
    surface required by the accepted architecture.
- Open questions: none.
- Hidden context: none; this plan is self-contained for a fresh executor.

## Development Approach

- Complete one task fully before moving to the next.
- Mark each checkbox immediately after the work and its task-specific tests
  pass.
- Implement the breaking architecture directly. Remove displaced paths when
  their replacement is verified; do not preserve old behavior or exports solely
  for compatibility, and do not combine the migration with unrelated cleanup.
- Add or update tests in every code-change task.
- Preserve a runnable main/core/React build at every task boundary.
- Update this plan before implementing any scope change discovered during
  execution.
- Do not rely on chat history; decisions and constraints must be recorded in
  this file.

## Testing Strategy

- Characterization tests identify existing values, dirty/touched, issues,
  validation, submission, array identity, hook, and publication behavior before
  internals move. They are evidence for deliberate decisions, not a blanket
  compatibility contract.
- Unit and fast-check tests cover pure document and runtime reducers.
- Core integration tests cover command normalization, live commits, restore
  reconciliation, middleware semantics, and publication ordering.
- React/jsdom tests cover exact kit ownership, form-only kit.useForm,
  form-backed components, Strict Mode, and React 19 Action changed-path
  tracking.
- Optional-entry unit tests cover history, persistence, codecs, storage
  scheduling, and fake Redux DevTools transport.
- Type tests cover middleware variance, kit.createForm inference, form-backed
  component props, removed root exports, feature handle typing, codec typing,
  and forbidden middleware configuration sites.
- Package tests and smoke fixtures cover ESM/CommonJS declarations, cross-entry
  capability identity, optional-entry isolation, and SSR-safe imports.
- Documentation tests and builds validate public examples.

Exact validation commands:

- Focused core: npx vitest run src/core
- Focused React: npx vitest run src/react src/react19
- Optional features: npx vitest run src/history src/persistence src/devtools
- All unit tests: npm run test
- Type contracts: npm run test:types
- Package artifacts: npm run test:package
- Consumer smoke fixtures: npm run test:smoke
- Package analyzers: npm run package:check
- Documentation content: npm run site:test
- Documentation types: npm run test:docs
- Documentation build/browser verification: npm run site:verify
- Full repository verification: npm run verify
- Mandatory final style/dead-code checks: npm run check and npm run knip

## Progress Tracking

- Mark completed items with [x] immediately.
- Add newly discovered implementation work with a + prefix and an exact file,
  reason, and verification command.
- Mark an impasse with BLOCKED: and record the exact failing command or missing
  decision.
- Keep this file synchronized with implementation and test results.

## What Goes Where

- Implementation Steps contain changes achievable in this repository.
- Post-Completion contains manual browser-extension and storage observation
  that supplements, but does not replace, automated verification.

## Implementation Steps

### Task 1: Characterize the Existing Boundary and Select the New Contract

**Why:** The reducer migration needs evidence about current state transitions
before replacing them. These tests identify useful invariants and make retained
behavior explicit without creating a general compatibility promise.

**Files:**

- Modify: src/core/form-store.test.ts
- Modify: src/core/array-state.test.ts
- Modify: src/core/reset.test.ts
- Modify: src/core/validation.test.ts
- Modify: src/core/subscriptions.test.ts
- Modify: src/core/value-policy.test.ts
- Modify: src/react19/result-sync.test.ts

- [x] Add a characterization case proving that values and nested array keys
  change coherently for append, insert, move, remove, setValues, unsetValue,
  batch, and reset.
- [x] Add a case proving that context/options replacement can trigger
  valuePolicy without resetting baseline, touched paths, or unrelated issues.
- [x] Keep context replacement and a resulting valuePolicy document change as
  two explicit transactions: publish the runtime-context snapshot first, then
  publish the effective document snapshot. This separation is part of the new
  event model, not a backward-compatibility shim.
- [x] Add reset cases distinguishing reset() to the existing clean baseline
  from reset(nextValues), including same-value resets and hook replacement.
- [x] Add validation cases proving that a newer value revision makes captured
  validation and server results stale.
- [x] Add subscription cases proving one coherent notification per committed
  state transition, the selected two-notification context/valuePolicy sequence,
  and no notification for true snapshot no-ops.
- [x] Add a React 19 result-sync case proving why effective committed paths,
  rather than requested paths or afterUpdate alone, determine Action result
  staleness.
- [x] Run npx vitest run src/core/form-store.test.ts
  src/core/array-state.test.ts src/core/reset.test.ts
  src/core/validation.test.ts src/core/subscriptions.test.ts
  src/core/value-policy.test.ts
  src/react19/result-sync.test.ts.

### Task 2: Introduce the Atomic Form Document and Pure Document Reducer

**Why:** Values and stable row identity need one historical source of truth
before middleware, replay, or persistence can observe commits safely.

**Files:**

- Create: src/core/form-model.ts
- Create: src/core/form-events.ts
- Create: src/core/form-reducer.ts
- Create: src/core/form-reducer.test.ts
- Modify: src/core/array-state.ts
- Modify: src/core/array-state.test.ts
- Modify: src/core/metadata.ts
- Modify: src/core/form-state.ts
- Modify: src/core/index.ts
- Modify: src/index.ts
- Create: tests/types/reducer-core.test.ts

- [x] Define read-only FormDocument<Input>, FormRuntimeState<Context>, and
  FormModel<Input, Context> in src/core/form-model.ts. FormDocument contains
  values and the private current RowIdentityState; runtime contains the clean
  baseline document and all non-historical state.
- [x] Split ArrayRowState in src/core/array-state.ts so current keys and
  nextKeyIndex belong to historical RowIdentityState while clean baseline keys
  are read from the runtime baseline document.
- [x] Define immutable DocumentCommittedEvent and DocumentRestoredEvent types
  in src/core/form-events.ts. Committed events carry sequence, source,
  normalized effective ValueChange values, logical RowIdentityChange values,
  and whether the clean baseline was preserved or replaced.
- [x] Make logical row-identity changes describe assigned keys and structural
  operations without exporting the internal row-state map/tree.
- [x] Remove the current public ArrayCommand, ArrayCommandChange, ArrayRowState,
  and ArrayRowsState exports from form-please and form-please/core. They expose
  displaced implementation details and receive no compatibility aliases. Add
  type assertions that only the new opaque document/event surface is public.
- [x] Implement a pure reduceFormDocument(document, event) in
  src/core/form-reducer.ts. It must not call schemas, itemDefault, valuePolicy,
  hooks, clocks, random generators, storage, focus, or application callbacks.
- [x] Rework metadata derivation to compare the current document with the
  runtime baseline document so moves retain per-row dirty identity without
  making baseline state historical.
- [x] Add reducer examples for set/unset and all array operations, including
  nested arrays and identity-only structural changes.
- [x] Add a fast-check property test comparing reducer results with the
  reference transaction/array model already used by
  src/core/array-state.test.ts.
- [x] Prove replaying the same event sequence twice yields deeply equal values,
  row keys, and next-key counters.
- [x] Reuse the existing value-cloning behavior so documents and reducer events
  detach Date and RegExp leaves from caller-owned values. Treat other opaque
  leaves as application-owned immutable identities rather than inventing a
  generic clone protocol.
- [x] Export only the document/event types needed by public middleware from
  src/core/index.ts and src/index.ts; keep RowIdentityState representation and
  mutation helpers out of generated declarations.
- [x] Run npx vitest run src/core/form-reducer.test.ts
  src/core/array-state.test.ts src/core/transaction.test.ts.
- [x] Run npm run typecheck.

### Task 3: Move Runtime Bookkeeping into Pure Runtime Reducers

**Why:** Validation, submission, issues, touch, context, and runtime options
must remain explicit and testable without entering the historical journal.

**Files:**

- Create: src/core/runtime-reducer.ts
- Create: src/core/runtime-reducer.test.ts
- Modify: src/core/form-model.ts
- Modify: src/core/form-events.ts
- Modify: src/core/issues.ts
- Modify: src/core/metadata.ts
- Modify: src/core/form-state.ts
- Modify: src/core/issues.test.ts
- Modify: src/core/validation.test.ts
- Modify: src/react/submission.test.tsx

- [x] Define discriminated validation and submission states with attempt IDs
  and document revisions in FormRuntimeState.
- [x] Define RuntimeReplacedEvent, ValidationStartedEvent,
  ValidationResolvedEvent, ValidationFailedEvent, SubmissionStartedEvent, and
  SubmissionFinishedEvent in src/core/form-events.ts. Also define explicit
  FieldTouchedEvent, FieldBlurredEvent, and IssuesChangedEvent variants so every
  state-changing public runtime command has a terminal event.
- [x] Implement pure runtime transitions for context/options replacement,
  touched/exposed paths, manual/server/schema issues, validation start/success/
  failure/staleness, submission start/finish, and clean-baseline replacement.
- [x] Make a forwarded blur commit FieldBlurredEvent even when touched/exposure
  reduction is an identity. The committed event closes an active history group
  and permits blur validation scheduling without publishing an unchanged form
  snapshot. Middleware cancellation suppresses the event, group closure, and
  automatic validation. True no-op touch and issue commands have no effects and
  may return cancelled without an event.
- [x] Keep AbortController, timers, Standard Schema execution, host-error
  reporting, focus, and callbacks outside runtime-reducer.ts.
- [x] Enforce the rule that successful transformed schema output
  never overwrites FormInput values.
- [x] Add tests for overlapping validation attempts, stale success and failure,
  submission attempt ordering, issue exposure, and reset-to-clean runtime
  state.
- [x] Add exhaustive event tests for touch, repeated blur, setErrors, and
  clearErrors, including identity reduction and the repeated-blur signal used
  by the core validation lifecycle.
- [x] Add tests proving runtime events never change FormDocument and document
  events do not implicitly restore runtime state.
- [x] Run npx vitest run src/core/runtime-reducer.test.ts
  src/core/validation.test.ts src/core/issues.test.ts
  src/react/submission.test.tsx.

### Task 4: Route Live Writes Through Reducers and Add the Internal Restore Path

**Why:** The store needs one reducer commit boundary before middleware and
optional features can be correct.

**Files:**

- Create: src/core/publication.ts
- Create: src/core/validation-lifecycle.ts
- Create: src/core/focus.ts
- Create: src/core/restore.test.ts
- Modify: src/core/form-store.ts
- Modify: src/core/form-store.test.ts
- Modify: src/core/reset.test.ts
- Modify: src/core/subscriptions.test.ts
- Modify: src/core/validation.test.ts
- Modify: src/core/array-state.test.ts

- [x] Make CoreFormStore own one FormModel rather than separate values,
  baseline, metadata, issue, context, and validation fields.
- [x] Convert setValue, setValues, unsetValue, array commands, batch, reset,
  context/options replacement, touch/blur, issue commands, validation, and
  submission bookkeeping into normalized events reduced by
  reduceFormDocument and the runtime reducer.
- [x] Keep transaction proposal, valuePolicy convergence, beforeUpdate, and
  effective change normalization in the coordinator before the reducer commit.
- [x] Extract selector subscription state and notification into
  src/core/publication.ts, validation timers/aborts/schema effects into
  src/core/validation-lifecycle.ts, and focus-target selection into
  src/core/focus.ts.
- [x] Add a package-private restoreDocument operation that accepts an immutable
  target FormDocument and origin. It must reduce one DocumentRestoredEvent
  without beforeUpdate, afterUpdate, valuePolicy, automatic validation,
  itemDefault, schemas, or mutation callbacks.
- [x] During restore, invalidate captured validation revisions, return changed
  values to unvalidated, remove stale server issues, reconcile touched/issues
  against row identity, preserve the clean baseline, and retain current
  context/options.
- [x] Implement the selected reset semantics: reset(nextValues) installs the
  actual committed document as the clean baseline; reset() proposes the stored
  baseline document as an ordinary undoable document transition; same-value
  reset still clears the required runtime state without creating a document
  event.
- [x] Derive the next snapshot before notifying and publish at most once per
  transition. Publish exactly once when the derived snapshot changed; a
  committed identity event such as repeated blur does not notify form
  subscribers.
- [x] Add restore tests for nested arrays, suppressed effects, baseline/touch
  preservation, stale validation/server results, metadata reconciliation, and
  one coherent subscriber snapshot.
- [x] Run npx vitest run src/core/restore.test.ts src/core/form-store.test.ts
  src/core/reset.test.ts src/core/subscriptions.test.ts
  src/core/validation.test.ts src/core/array-state.test.ts.

### Task 5: Add Typed Commands, Transactions, and the Synchronous Middleware Engine

**Why:** One open transaction chain is the public composition boundary for
application middleware and all first-party optional features.

**Files:**

- Create: src/core/form-commands.ts
- Create: src/core/form-transactions.ts
- Create: src/core/middleware.ts
- Create: src/core/middleware.test.ts
- Create: tests/types/middleware.test.ts
- Modify: src/core/form-events.ts
- Modify: src/core/form-store.ts
- Modify: src/core/index.ts
- Modify: src/index.ts

- [x] Define FormCommand<Input> families for value, array, reset, touch,
  validation, issues, and runtime replacement in src/core/form-commands.ts.
- [x] Define DocumentTransaction, RestoreTransaction, RuntimeTransaction,
  FormTransaction, FormDispatchResult, FormTransactionDispatch,
  FormMiddlewareApi, and FormMiddleware in src/core/form-transactions.ts and
  src/core/middleware.ts.
- [x] Keep imperative command results minimal: mutation commands return void and
  validation commands retain their necessary Promise results. Only middleware
  next(transaction) returns committed event or cancelled. This is the selected
  API, not a compatibility layer.
- [x] Compose core lifecycle behavior outermost, application/form middleware in
  declared order, and reducer event creation as the terminal dispatcher.
- [x] Freeze transactions, events, middleware arrays, and public snapshots.
- [x] Enforce synchronous next, at-most-once next, unchanged forwarding by
  default, non-Promise handlers/results, valid discriminated dispatch results,
  and actionable duplicate-reference errors.
- [x] Queue nested FormMiddlewareApi.dispatch commands FIFO and drain them only
  after the current transaction has completed commit/publication handling.
- [x] Abort and propagate pre-commit middleware errors without changing or
  publishing state.
- [x] When next has committed and later middleware throws or returns an invalid
  result, publish the committed snapshot exactly once before propagating the
  protocol error; never attempt rollback.
- [x] Capture the terminal committed result in the coordinator independently of
  whether it returns through every outer middleware frame. After middleware
  unwinding, run one package-private commit-finalization callback before form
  publication, including when an inner post-next handler threw. Task 7 attaches
  the lazy event timeline to this callback; do not add a second middleware
  chain.
- [x] Ensure middleware getSnapshot reads the effective pending committed
  snapshot after next, while form subscribers run only after middleware
  unwinding and guaranteed commit finalization.
- [x] Preserve lifecycle ordering for document updates:
  beforeUpdate, reducer commit, middleware post-next unwinding, guaranteed
  commit finalization, publication, afterUpdate, validation scheduling. Drain
  nested commands after finalization/publication and before rethrowing the
  original post-commit error.
- [x] Detach Date and RegExp leaves exposed through transactions, committed
  events, and middleware snapshots from the live FormDocument using the
  existing clone behavior. Do not introduce a general custom-value clone API.
- [x] Export public middleware/command/transaction/event types through
  form-please and form-please/core without exporting raw event dispatch.
- [x] Add unit tests for declared/reverse order, observation, cancellation,
  transaction replacement, reset/runtime/validation/restore visibility,
  nested dispatch, duplicates, next twice, Promise results, invalid results,
  and pre/post-commit errors. Put a commit observer both before and after a
  middleware that commits and then throws; finalization and publication must
  each occur exactly once in both orders.
- [x] Prove cancelling repeated blur prevents FieldBlurredEvent and automatic
  validation, while forwarding it permits both without an unchanged
  form-snapshot notification.
- [x] Add mutation-isolation tests proving that changing Date or RegExp values
  obtained from middleware cannot change the live document or committed event.
- [x] Add type tests for middleware Input/Context compatibility and command
  dispatch while proving FormStore and FormInstance have no raw dispatch
  method.
- [x] Run npx vitest run src/core/middleware.test.ts
  src/core/transaction.test.ts src/core/value-policy.test.ts.
- [x] Run npm run typecheck.

### Task 6: Make FormKit the Only React Creation and Binding Surface

**Why:** One kit-owned path prevents ambiguous form ownership and lets
middleware types and rendering resources use the exact immutable kit snapshot.

**Files:**

- Modify: src/react/create-form-kit.tsx
- Modify: src/react/form-instance.ts
- Modify: src/react/use-form.ts
- Modify: src/react/auto-form.tsx
- Modify: src/react/form.tsx
- Modify: src/react/create-form-kit.test.tsx
- Modify: src/react/auto-form.test.tsx
- Modify: src/react/form-data.test.tsx
- Modify: src/react/form.test.tsx
- Modify: src/react/hooks.test.tsx
- Modify: src/react/reset.test.tsx
- Modify: src/react/submission.test.tsx
- Modify: tests/types/controls-and-kit.test.ts
- Modify: tests/types/react-hooks.test.ts
- Modify: src/index.ts

- [x] Add typed kit.createForm(definition, options: CreateFormOptions) and
  kit.useForm(form, runtimeOptions: FormRuntimeOptions). These are the only
  public React creation and binding methods.
- [x] Replace UseFormOptions with CreateFormOptions. Include defaultValues,
  initial runtime options, and one immutable ordered middleware array. Keep
  FormRuntimeOptions limited to replaceable React binding options.
- [x] Give each assembled base or extended kit a private immutable descriptor
  with its exact identity token, controls, and slots. Attach that descriptor to
  every FormInstance created by kit.createForm without exposing a public
  descriptor accessor.
- [x] Extract the existing React binding lifecycle into package-private
  useFormBinding(form, runtimeOptions) in src/react/use-form.ts. Make
  kit.useForm verify exact kit ownership before it delegates to that hook.
- [x] Reject base/extended and sibling-kit mismatches in kit.useForm, kit.Form,
  and kit.AutoForm even when their controls and slots are structurally equal.
- [x] Make kit.AutoForm require form instead of definition/defaultValues. Bind
  its runtime options through the package-private binding hook, then render the
  existing form shell, error summary, fields, and children.
- [x] Keep kit.Form form-backed and kit-owned. Do not add global Form or
  AutoForm components, and do not add kit.useCreateForm or another hidden
  definition-based creation path.
- [x] Initialize middleware outer functions once per form and isolate their
  closure state when the same configured middleware reference is reused across
  forms.
- [x] Validate duplicate middleware references and initialize the complete
  chain atomically. If validation or initialization throws, return no form and
  publish no feature handle state.
- [x] Stage first-party external activation until every middleware outer
  function has initialized successfully and the selected form completes its
  first React binding. This is a private binding-finalization step used by
  DevTools, not a public cleanup or lifecycle API. A Strict Mode initializer
  that creates and discards a form must not create an external listener.
- [x] Remove global createForm, useForm, KitForm, and Submit value exports from
  form-please. Remove the main-entry createFormStore re-export, but keep
  createFormStore public from form-please/core. Remove UseFormOptions without
  aliases, deprecated overloads, or compatibility shims.
- [x] Keep FormProvider, useFormContext, useFormState, useField, useValue, and
  useArrayField public for headless composition.
- [x] Prove createFormKit, kit.extend, normalized definitions, and
  createFormStore do not accept or retain middleware.
- [x] Add runtime tests for exact kit ownership, base/extended mismatch,
  repeated configured middleware across forms, failed atomic creation, and
  stable Strict Mode binding. Prove AutoForm uses the supplied instance and
  never creates another form. Prove a discarded lazy initializer and a failed
  creation publish no staged feature state; Task 10 adds the real
  fake-extension listener checks.
- [x] Add type tests that infer schema input and context at kit.createForm,
  reject incompatible middleware, and accept only an exact-kit FormInstance at
  kit.useForm, kit.Form, and kit.AutoForm. Assert removed root values and
  UseFormOptions are absent while core createFormStore remains available.
- [x] Run npx vitest run src/react/create-form-kit.test.tsx
  src/react/auto-form.test.tsx src/react/form-data.test.tsx
  src/react/form.test.tsx src/react/hooks.test.tsx src/react/reset.test.tsx
  src/react/submission.test.tsx.
- [x] Run npm run test:types.

### Task 7: Add the Versioned Feature Protocol and Effective Commit Timeline

**Why:** Optional package entries and React 19 need document access and commit
observation without exposing public event dispatch or retaining a journal in
every form.

**Files:**

- Create: src/core/feature-protocol.ts
- Create: src/core/feature-protocol.test.ts
- Create: src/core/commit-timeline.ts
- Create: src/core/commit-timeline.test.ts
- Modify: src/core/form-store.ts
- Modify: src/react/form-instance.ts
- Modify: src/react19/action-form.tsx
- Modify: src/react19/action-form.test.tsx
- Modify: src/react19/result-sync.test.ts
- Modify: tests/types/controls-and-kit.test.ts

- [x] Define one package-private feature capability under a stable
  Symbol.for key and an explicit integer protocol version in
  src/core/feature-protocol.ts.
- [x] Expose package-private operations for reading the immutable current
  document, submitting a live restore, installing a clean baseline after a
  successful hydration/reset boundary, validating restored input through the
  form schema, advancing the per-form event-sequence floor, and subscribing to
  finalized FormEvent notifications.
- [x] Validate capability shape and protocol version without instanceof so
  ESM/CommonJS entry duplication cannot break identity. Throw an actionable
  incompatibility error before a feature initializes.
- [x] Implement a lazy commit timeline that attaches to Task 5's guaranteed
  coordinator finalization step and allocates listener state only when a
  consumer subscribes. Deliver every finalized FormEvent exactly once after
  middleware unwinding and before publication, even when an inner post-next
  middleware throws. It may report effective changed paths, but it must not
  retain checkpoints or an exportable journal.
- [x] Report effective changed schema paths for ordinary and restore commits,
  including array structural changes, after reducer normalization.
- [x] Change startActionSubmission to subscribe to effective document commits
  until finish, and remove the afterUpdate wrapper used for changed-path
  tracking in src/react19/action-form.tsx.
- [x] Make ActionForm require form and remove its kit, definition, and
  defaultValues props. Read controls and slots from the form's package-private
  immutable kit descriptor, and bind runtime options through useFormBinding.
  Do not add an overload, ActionForm middleware prop, or React 19 kit factory.
- [x] Prove Action tracking sees restore commits even though restore suppresses
  afterUpdate and still ignores runtime-only events. Render forms from base,
  extended, and sibling kits with their own controls and slots, and prove
  ActionForm always uses the descriptor owned by the supplied form.
- [x] Add type tests that infer ActionForm schema, context, controls, and slot
  options from form. Reject the removed kit, definition, and defaultValues
  props.
- [x] Prove forms with no timeline subscriber retain no event collection after
  commits.
- [x] Prove finalized-event listeners run exactly once with the feature before
  and after middleware that commits and then throws, and prove advancing the
  event-sequence floor makes the next live event strictly greater without
  changing the current document.
- [x] Run npx vitest run src/core/feature-protocol.test.ts
  src/core/commit-timeline.test.ts src/react19/action-form.test.tsx
  src/react19/result-sync.test.ts.
- [x] Run npm run test:types.

### Task 8: Implement History, Event Journals, and Deterministic Replay

**Why:** History is the first optional consumer of committed document events
and establishes checkpoint, replay, grouping, and live-restore semantics used
by persistence.

**Files:**

- Create: src/history/index.ts
- Create: src/history/journal.ts
- Create: src/history/history.ts
- Create: src/history/journal.test.ts
- Create: src/history/history.test.ts
- Create: tests/types/history.test.ts
- Modify: vitest.config.ts
- Modify: src/core/form-events.ts
- Modify: src/core/feature-protocol.ts
- Modify: src/react19/action-form.test.tsx

- [x] Define createHistoryMiddleware, HistoryFeature, HistoryHandle,
  HistorySnapshot, HistoryOperationResult, FormJournal, JournalCursor, and
  replayJournal exports under src/history/index.ts.
- [x] Make each configured history feature a FormMiddleware with
  feature.handle(form). Handle lookup uses exact feature reference, returns
  the same handle for repeated lookup, and throws for an unconfigured form.
- [x] Register first-party feature metadata so kit.createForm permits at most
  one history feature per form.
- [x] Record an initial versioned checkpoint and only committed document
  events from the guaranteed finalized-event timeline. Observe runtime events
  only when they affect grouping, such as FieldBlurredEvent; do not store them
  in the document journal. Ignore cancelled transactions.
- [x] Implement groups: consecutive control updates to the same path group
  until blur, path change, source change, structural action, batch boundary, or
  groupWindow expiration; groupWindow defaults to 750 milliseconds and zero
  disables time grouping.
- [x] Make one batch one group and one recorded DevTools restore one group.
- [x] Implement unlimited retention by default and finite group-count
  compaction. Fold the oldest closed groups into a new checkpoint without
  compacting an active group; the limit counts groups, not bytes.
- [x] Implement undo, redo, and seek against the latest checkpoint segment,
  including redo truncation after a new document edit.
- [x] Implement history.clear as complete journal replacement with the current
  document as checkpoint, without changing the dirty baseline.
- [x] Append checkpoints for successful reset(nextValues) and persistence
  hydration while retaining older exported segments; keep reset() to the
  existing baseline as an undoable group.
- [x] Implement pure replayJournal against reduceFormDocument. Replay must use
  recorded keys and never call itemDefault, middleware, hooks, schemas, clocks,
  timers, or application code.
- [x] Submit one live restore for undo, redo, seek, replay, and import.
  Reconcile cancellation as cancelled, unchanged target as applied,
  transformed document as transformed plus a normal new group, and unavailable
  or runtime-only results as unavailable without moving the cursor.
- [x] Implement synchronous in-memory export and asynchronous untrusted import.
  Validate journal version, event shapes, canonical paths, row identity,
  replayability, strictly increasing unique sequence numbers across checkpoint
  segments, and final schema input before replacing live journal state. After a
  successful unchanged restore, advance the core event-sequence floor above the
  imported maximum before replacing live journal state.
- [x] Keep history snapshot updates synchronous in guaranteed commit
  finalization before form publication so form subscribers observe coherent
  form/history snapshots even when an application middleware committed and then
  threw. Do not depend on ordinary reverse post-next unwinding.
- [x] Keep retained journal values isolated from public mutation. Clone Date
  and RegExp leaves when recording and again when exporting; document that File
  and other opaque leaves are application-owned immutable identities.
- [x] Add fake-clock tests for grouping and compaction; add nested-array replay,
  multi-checkpoint export, import rejection, transformed restore, cancelled
  restore, context-preserving undo, subscriber coherence, mutable-native export
  isolation, and high-sequence import followed by a live edit.
- [x] Prove a forwarded repeated blur closes the active group while a cancelled
  blur does not.
- [x] Put history before and after middleware that commits and then throws;
  assert the public command throws while history records one group and undo
  remains coherent in both orders.
- [x] Render the new form-backed ActionForm with a history-enabled form, restore
  while an Action is pending, and prove returned server results use the
  effective restored paths.
- [x] Add type tests for handle ownership, operation results, opaque cursors,
  generic input preservation, and absence from the main/core exports.
- [x] Extend the Vitest node project to include src/history tests.
- [x] Run npx vitest run src/history src/react19/action-form.test.tsx.
- [x] Run npm run typecheck.

### Task 9: Implement Persistence, Canonical Encoding, Codecs, and localStorage

**Why:** Persistence must serialize either the current document or an explicit
history journal without entering the core graph or allowing stale asynchronous
work to overwrite newer local state.

**Files:**

- Create: src/persistence/index.ts
- Create: src/persistence/persistence.ts
- Create: src/persistence/encoding.ts
- Create: src/persistence/codecs.ts
- Create: src/persistence/local-storage.ts
- Create: src/persistence/persistence.test.ts
- Create: src/persistence/encoding.test.ts
- Create: src/persistence/local-storage.test.ts
- Create: tests/types/persistence.test.ts
- Modify: vitest.config.ts
- Modify: src/core/feature-protocol.ts
- Modify: src/history/history.ts

- [x] Define createPersistenceMiddleware, PersistenceFeature,
  PersistenceHandle, PersistenceSnapshot, FormPersistenceAdapter,
  PersistenceCodec, createDateCodec, createFileCodec, and
  createLocalStorageAdapter exports in src/persistence/index.ts.
- [x] Implement the exact idle/restoring/active/conflict phase axis and
  idle/scheduled/saving/failed save axis from docs/proposal.md.
- [x] Keep construction idle. Implement restore(), start(), flush(), clear(),
  getSnapshot(), and subscribe() with the proposal's activation, retry, and
  suppression rules.
- [x] Register first-party metadata so kit.createForm permits one persistence
  feature, validates an explicitly configured history dependency by exact
  feature reference, and requires both references in the same chain.
- [x] Keep first-party behavior independent of middleware declaration order:
  the guaranteed finalized-event listener increments the document revision and
  schedules work synchronously, while the asynchronous save captures the
  coherent latest document/history snapshot after the current dispatch
  completes. A post-commit application error must not hide the revision.
- [x] Implement revisioned serialized save/remove operations and coalescing so
  completion of an older save cannot replace a newer revision or recreate data
  after clear() completes.
- [x] Detect a local document edit during restore, leave that edit untouched,
  enter inactive conflict, and perform no write. Let restore() from conflict
  choose stored state and start() choose current local state.
- [x] Use a default saveDelay of 500 milliseconds; restart it for each commit,
  make zero schedule an immediate asynchronous write, and make flush bypass the
  timer.
- [x] Make storage failure non-transactional: retain the form commit, expose
  failed save state, reject flush, invoke onError once per failed attempt, and
  retry the latest revision on the next commit or flush.
- [x] Define a versioned JSON envelope with protocol identifier, protocol
  version, application data version, mode document or history, and an encoded
  payload.
- [x] Encode values with structural nodes for scalar JSON, undefined, arrays,
  objects, and tagged codec payloads rather than a collision-prone magic
  object property. Reject cyclic or unsupported opaque leaves with the exact
  canonical value path.
- [x] Make codec tags non-empty and unique. Run asynchronous codec encode and
  decode explicitly; do not auto-detect Date, File, or application values
  without a registered codec.
- [x] Implement createDateCodec and an opt-in createFileCodec that stores
  base64 content, name, media type, and lastModified. Enforce a default
  10 MiB source-file limit before encoding.
- [x] Run application migration on untrusted JSON after envelope/protocol
  validation and before codec decoding and schema validation. Treat an
  unsupported library protocol as a hard error.
- [x] Validate canonical event paths, journal shapes, row-identity lengths,
  uniqueness, paths, counters, and final Standard Schema input before live
  restore. Use schema success only as validation; do not install transformed
  schema output.
- [x] In document mode persist the current FormDocument. In history mode persist
  the configured history feature's checkpoints, events, groups, and cursor.
- [x] On successful hydration, install the actual committed document as the
  clean baseline, clear live undo/redo, and append a history checkpoint.
  Respect cancelled, transformed, and runtime-only middleware outcomes. Install
  the baseline into the pending model during the same guaranteed finalization,
  before its single form publication; do not dispatch a second public runtime
  transaction.
- [x] Implement createLocalStorageAdapter(getStorage) without reading
  localStorage at import time, so SSR imports remain safe.
- [x] Add fake-adapter/fake-timer tests for activation, no-record restore,
  migration rewrite, clear suppression, coalescing, stale save completion,
  clear during an in-flight save, restore conflict, retry, history mode,
  high-sequence history hydration followed by a live edit, codecs, File limit,
  malformed envelopes, and schema transforms.
- [x] Put persistence before and after middleware that commits and then throws;
  assert the form commit is published, the public command throws, and the
  latest document revision is still scheduled exactly once in both orders.
- [x] Add type tests for adapter, codec, migration, feature dependency, and
  document/history modes.
- [x] Extend the Vitest node project to include src/persistence tests.
- [x] Run npx vitest run src/persistence.
- [x] Run npm run typecheck.

### Task 10: Implement the Constrained Redux DevTools Feature

**Why:** DevTools must inspect committed events and support bounded local time
travel without trusting serialized monitor state or expanding the typed command
boundary.

**Files:**

- Create: src/devtools/index.ts
- Create: src/devtools/devtools.ts
- Create: src/devtools/devtools.test.ts
- Create: tests/types/devtools.test.ts
- Modify: vitest.config.ts
- Modify: src/core/feature-protocol.ts

- [x] Define createDevToolsMiddleware, DevToolsFeature, DevToolsHandle, supported
  connection options, error callback, diagnostic state, and opaque revision
  token types in src/devtools/index.ts.
- [x] Connect directly through
  window.__REDUX_DEVTOOLS_EXTENSION__.connect without importing Redux or
  @redux-devtools/extension. Remain inert during SSR or when the extension is
  absent. Defer connect and subscribe until Task 6's first successful React
  binding finalization confirms that every middleware outer function
  initialized and that React retained the form.
- [x] If binding-time DevTools activation partially connects and then fails,
  unsubscribe and permanently disable that per-form connection. Report the
  diagnostic through onError without failing the binding. Do not add a general
  middleware cleanup hook.
- [x] Register first-party metadata so kit.createForm permits at most one
  DevTools feature per form.
- [x] Own the extension features option and reject actionCreators and
  enhancer-only options. Preserve official option defaults except autoPause,
  which defaults to true.
- [x] Send every committed FormEvent from the guaranteed finalized-event
  timeline, including runtime events, and no cancelled transaction. Send only
  values, logical row identity, and the reserved opaque revision token as state.
  A post-commit application error must not hide the event.
- [x] Apply stateSanitizer to the visible document projection before
  reattaching the reserved token. Never deserialize visible or exported
  extension state as a restore target.
- [x] Keep a per-form bounded token-to-immutable-FormDocument table based on
  maxAge plus initial and current committed baselines.
- [x] Support JUMP_TO_STATE, JUMP_TO_ACTION, RESET, and ROLLBACK through one
  live restore with origin devtools and history record. Support COMMIT only as
  a DevTools baseline change.
- [x] Disable arbitrary dispatch, skip, reorder, import, lock, persisted monitor
  state, and generated tests through the connection features contract.
- [x] Suppress echo of a successful DevTools restore already selected by the
  monitor. Let history record it as a new group and active persistence observe
  it as a normal commit.
- [x] On expired token, cancellation, or transformed restore, leave or accept
  the actual form result as specified, call extension.error, and reinitialize
  the monitor with the actual live document.
- [x] Treat connection, sanitizer, serialization, send, subscribe, and
  unsubscribe failures as diagnostics that cannot fail a form commit. Call
  onError and permanently disable the broken per-form connection.
- [x] Implement idempotent devTools.disconnect() that removes only that form's
  listener and permanently turns that middleware instance into a no-op.
- [x] Add a complete fake-extension test matrix for SSR, absent extension,
  options, event/state projection, runtime events, supported navigation,
  rejected monitor features, maxAge expiration, sanitizer token protection,
  cancellation/transformation resync, transport failures, and isolated
  disconnect. Include [devToolsFeature, throwingInitializer] and assert no
  listener remains after kit.createForm throws. In React Strict Mode, create a
  form in a lazy state initializer and prove the discarded form creates no
  listener while the retained and bound form creates exactly one.
- [x] Put DevTools before and after middleware that commits and then throws;
  assert the form command throws while the extension receives the committed
  event exactly once in both orders.
- [x] Add type tests for allowed and rejected connection options and stable
  per-form handle typing.
- [x] Extend the Vitest node project to include src/devtools tests.
- [x] Run npx vitest run src/devtools.
- [x] Run npm run typecheck.

### Task 11: Publish Optional Entries and Verify Build Isolation

**Why:** Optional features satisfy their cost and dependency contract only when
their runtime graphs, declarations, and capability protocol work from the
packed ESM and CommonJS package.

**Files:**

- Modify: tsdown.config.ts
- Modify: package.json
- Modify: tests/package/build-output.test.ts
- Modify: tests/package/package-metadata.test.ts
- Create: tests/package/optional-entries.test.ts
- Create: tests/types/optional-features.test.ts
- Modify: tests/fixtures/node-esm/index.mjs
- Modify: tests/fixtures/node-cjs/index.cjs
- Modify: tests/fixtures/node-cjs/index.cts
- Modify: scripts/verify-smoke-fixtures.mjs

- [x] Add history, persistence, and devtools build entries to tsdown.config.ts
  for ESM, CommonJS, declarations, declaration maps, and source maps.
- [x] Add package exports for form-please/history,
  form-please/persistence, and form-please/devtools with matching import,
  require, types, default, and declaration-format targets.
- [x] Extend package:check attw entry points to include all three optional
  subpaths.
- [x] Update exact export maps in package metadata/build tests and preserve
  use client only on the main and React 19 entries.
- [x] Assert built main declarations and runtime exports omit createForm,
  useForm, createFormStore, KitForm, and Submit. Assert form-please/core still
  exports createFormStore and form-please/react19 exports form-backed
  ActionForm and ActionSubmit.
- [x] Recursively assert that index, core, react19, and server built graphs do
  not import or contain history, persistence, DevTools, codec, or storage
  implementation modules.
- [x] Assert optional entries do not add Redux or
  @redux-devtools/extension to package metadata or built imports.
- [x] Load main plus each optional entry from built ESM and CommonJS targets,
  create feature-enabled forms through kit.createForm, retrieve handles, and
  prove the Symbol.for capability identity and version guard work in both
  formats.
- [x] Add a mixed-format package test that obtains a form from one module format
  and attempts feature capability access from the other; it must either
  interoperate at the matching protocol version or fail only with the explicit
  version error, never an instanceof or missing-symbol error.
- [x] Extend node ESM/CJS smoke fixtures to import each optional entry, exercise
  pure history replay and persistence encoding, and verify DevTools import is
  SSR-safe.
- [x] Update React 18, React 19, and Next.js fixtures to create forms through
  kit.createForm, bind existing forms where required, and render form-backed
  AutoForm and ActionForm without global constructors or a kit prop.
- [x] Add declaration tests for all public optional APIs from their subpaths and
  prove they are absent from the root, core, react19, and server namespaces.
- [x] Run npm run test:types.
- [x] Run npm run test:package.
- [x] Run npm run test:smoke.
- [x] Run npm run package:check.

### Task 12: Update Architecture, ADR, Proposal, and Website Documentation

**Why:** The maintained architecture and public documentation must describe the
new breaking API and optional feature boundaries that actually shipped. The
website must give users enough information and examples to adopt each public
capability without reading internal architecture documents or source code.

**Files:**

- Modify: docs/ARCHITECTURE.md
- Modify: docs/proposal.md
- Modify: docs/adr/0008-reducer-core-and-open-middleware.md
- Modify: README.md
- Modify: docs-site/vocs.config.ts
- Modify: docs-site/src/pages/index.mdx
- Modify: docs-site/src/pages/get-started.mdx
- Modify: docs-site/src/pages/api.mdx
- Modify: docs-site/src/pages/advanced.mdx
- Modify: docs-site/src/pages/guides/arrays.mdx
- Modify: docs-site/src/pages/guides/async-fields.mdx
- Modify: docs-site/src/pages/guides/conditional-fields.mdx
- Modify: docs-site/src/pages/guides/react-19-actions.mdx
- Modify: docs-site/src/pages/guides/styling.mdx
- Modify: docs-site/src/pages/guides/tutorial.mdx
- Modify: docs-site/src/pages/guides/validation.mdx
- Create: docs-site/src/pages/guides/history.mdx
- Create: docs-site/src/pages/guides/persistence.mdx
- Create: docs-site/src/pages/guides/devtools.mdx
- Modify: docs-site/src/components/interactive-lab.client.tsx
- Modify: docs-site/src/components/overview-demo.client.tsx
- Modify: docs-site/src/components/overview-demo.tsx
- Modify: docs-site/src/snippets/basic-form.tsx
- Modify: docs-site/src/snippets/async-multiselect.tsx
- Modify: docs-site/src/snippets/transaction-hooks.tsx
- Modify: docs-site/src/snippets/lab-profile-form.tsx
- Modify: docs-site/src/snippets/complex-campaign-builder.tsx
- Modify: docs-site/src/snippets/complex-learning-cohort.tsx
- Modify: docs-site/src/snippets/complex-makerspace-launch.tsx
- Modify: docs-site/src/snippets/complex-membership-ladder.tsx
- Modify: docs-site/src/snippets/complex-research-grant.tsx
- Modify: docs-site/src/snippets/complex-studio-policies.tsx
- Create: docs-site/src/snippets/history.tsx
- Create: docs-site/src/snippets/persistence-local-storage.tsx
- Create: docs-site/src/snippets/persistence-nuqs.ts
- Create: docs-site/src/snippets/persistence-tanstack-query.ts
- Create: docs-site/src/snippets/devtools.tsx
- Modify: docs-site/tests/content.test.mjs
- Modify: docs-site/tests/build-output.test.mjs

- [ ] Before editing docs-site, read docs-site/AGENTS.md and load the STE skill.
  Use STE clarity mode for every new or changed site paragraph, heading, callout,
  and procedure. Keep API names, imports, code, paths, and other technical
  literals unchanged.
- [ ] Update docs/ARCHITECTURE.md to map the final core reducer/runtime/effect
  modules and each optional entry graph. Retain React/core/server isolation.
- [ ] Update ADR 0008 with the implemented feature-protocol identifier,
  package-entry ownership, and any final module names while preserving its
  accepted decision.
- [ ] Change docs/proposal.md status from implementation pending to implemented
  only after Tasks 1 through 11 and their validation commands pass.
- [ ] Update README.md with the minimal kit.createForm middleware example and
  links to the three optional feature guides. Use form-backed AutoForm in the
  primary example. State plainly that this release is a breaking redesign and
  does not ship compatibility aliases.
- [ ] Make the website the complete user-facing source for the new
  capabilities. Users must not need README.md, docs/proposal.md, ADRs, or source
  code to learn required imports, prerequisites, defaults, constraints,
  results, errors, recovery actions, limitations, and feature interactions.
- [ ] Document exact public signatures and examples for commands, transactions,
  events, middleware, CreateFormOptions, FormRuntimeOptions, kit.createForm,
  kit.useForm, feature.handle(form), history operations, persistence state and
  operations, adapters, codecs, migration, hydration, and DevTools connection
  and disconnect in docs-site/src/pages/api.mdx.
- [ ] Document one React ownership model throughout the site: create through
  kit.createForm, bind an existing form through kit.useForm, and pass form to
  kit.Form, kit.AutoForm, or ActionForm. Show lazy React state for a
  component-local instance. Explain exact base/extended/sibling kit ownership.
- [ ] Document ActionForm without kit, definition, or defaultValues props. Show
  that it gets controls and slots from form. Remove examples and API references
  for global createForm, global useForm, KitForm, root Submit, UseFormOptions,
  and main-entry createFormStore.
- [ ] Document createFormStore only as an advanced React-free API from
  form-please/core. Keep FormProvider, useFormContext, and granular hooks in the
  headless composition documentation.
- [ ] Document middleware order, cancellation/replacement authority, synchronous
  constraints, guaranteed finalized-event delivery, nested dispatch, repeated
  blur semantics, restore limitations, and the application-owned immutability
  rule for File and other opaque leaves in docs-site/src/pages/advanced.mdx.
- [ ] Add focused guides for undo, redo, seek, replay, journal import and export,
  local persistence, migration, hydration, and constrained Redux DevTools time
  travel. Each guide must explain when to use the feature, how to configure it,
  what state it owns, what it does not restore, and how failures appear.
- [ ] Give each guide a small first-use example and one detailed end-to-end
  example. The detailed example must include setup, normal use, important edge
  behavior, error handling, cleanup when applicable, and the expected result.
  Reuse snippets between pages instead of maintaining duplicate programs.
- [ ] Provide complete, copyable physical snippets for localStorage, nuqs
  query-string transport, TanStack Query server transport, history, and
  DevTools. Each snippet must use public form-please package imports and must
  type-check against the built public declarations. nuqs and TanStack Query
  remain application-owned example dependencies.
- [ ] Review all new and changed website text with the STE skill after the
  technical content is complete. Use one term for each concept, explicit
  actors and conditions, active voice, and one independent action per
  procedural step. Report the result as STE-style text, not verified strict
  ASD-STE100 text.
- [ ] Extend the existing canonical page, snippet, and build-output assertions
  for the new guides. Assert the required feature sections, public imports,
  snippet type-checks, generated Markdown, search content, and llms-full.txt
  output. Do not add a second documentation manifest or test framework.
- [ ] Run npm run site:test.
- [ ] Run npm run test:docs.
- [ ] Run npm run site:verify.

### Task 13: Verify Acceptance Criteria and Close the Plan

**Why:** This change crosses core state, public APIs, package boundaries,
serialization, and documentation; completion requires all layers to agree.

**Files:**

- Modify during completion: docs/plans/20260801-reducer-core-event-journal.md
- Move after every check passes:
  docs/plans/20260801-reducer-core-event-journal.md to
  docs/plans/completed/20260801-reducer-core-event-journal.md

- [ ] Verify the new public command, event, middleware, React, and optional-entry
  type suites are internally coherent. Verify removed legacy array-state,
  global createForm/useForm functions, KitForm/root Submit values,
  UseFormOptions, main-entry createFormStore, and ActionForm creation APIs are
  absent from generated declarations.
- [ ] Verify kit.Form and kit.AutoForm reject a form from another exact kit
  snapshot. Verify ActionForm uses the supplied form's controls and slots
  without accepting a kit prop.
- [ ] Verify values and nested row identity stay atomic across live commits,
  reset, undo, redo, seek, import, hydration, and DevTools navigation.
- [ ] Verify baselines, touch, issues, validation/submission state, context,
  focus, and subscriptions are not historical.
- [ ] Verify replay and restore execute none of the prohibited effects while
  the live restore still traverses application middleware.
- [ ] Verify stale validation and persistence work cannot update a newer
  revision.
- [ ] Verify middleware and feature handle state is isolated per form and all
  cardinality/dependency failures are atomic.
- [ ] Verify forms without optional middleware retain no journal/checkpoint
  state and existing entry graphs cannot reach optional code.
- [ ] Verify the website covers every new public capability, and each optional
  feature has a minimal example, a detailed example, API details, limitations,
  error handling, and cleanup guidance where applicable.
- [ ] Verify all website examples use public package imports, type-check against
  built declarations, and remain understandable without internal repository
  documents. Complete the STE clarity review before the site verification gate.
- [ ] Run npm run check.
- [ ] Run npm run test.
- [ ] Run npm run test:types.
- [ ] Run npm run test:browser.
- [ ] Run npm run test:package.
- [ ] Run npm run test:smoke.
- [ ] Run npm run package:check.
- [ ] Run npm run site:verify.
- [ ] Run npm run knip.
- [ ] Run npm run verify as the final aggregate repository gate.
- [ ] Record all commands and results in this plan.
- [ ] Move this plan to docs/plans/completed only after every acceptance
  criterion and required command passes.

## Technical Details

### State and baseline invariants

- FormDocument<Input> is the only historical aggregate. Its values and private
  RowIdentityState commit in one reduceFormDocument call.
- FormRuntimeState<Context> owns the clean baseline document, touched paths,
  issues/exposure, validation/submission state, context/options, derived UI
  cache, and non-historical metadata inputs.
- Public FormSnapshot exposes FormInput<Schema> values;
  synthetic keys never enter schema validation, FormData, submission output,
  resolver reads, or public values.
- Reset with supplied values replaces the clean baseline only after the
  effective transaction commits. Reset without supplied values proposes the
  stored baseline document and preserves that baseline.
- Context replacement preserves history. A valuePolicy document commit caused
  by new context is a normal document event under the new current context.

### Command-to-publication flow

1. A public imperative API or FormMiddlewareApi.dispatch submits a typed
   FormCommand.
2. Core lifecycle code normalizes/batches it, resolves valuePolicy, and invokes
   beforeUpdate where permitted.
3. The resulting immutable FormTransaction enters application/form middleware
   in declared order.
4. The terminal dispatcher creates the effective immutable FormEvent, reduces
   FormModel, and derives the pending FormSnapshot.
5. Synchronous application middleware post-next work unwinds in reverse stack
   order until it completes or throws.
6. The coordinator runs lazy finalized-event listeners exactly once from the
   captured terminal result, even when the committed result did not return
   through every outer middleware frame.
7. First-party history, persistence, DevTools, and hydration-baseline
   bookkeeping completes against the pending model.
8. The coordinator publishes the pending snapshot once when it changed. A
   committed identity event such as repeated blur may finalize without a form
   notification. Any captured post-commit error remains pending.
9. afterUpdate and automatic-validation scheduling run only for eligible normal
   live document commits or committed blur events.
10. Nested middleware dispatches drain FIFO after finalization/publication and
    before the captured post-commit error is rethrown.

### Restore and operation results

- RestoreTransaction carries the immutable target document, origin undo, redo,
  replay, hydrate, or devtools, and history policy skip or record.
- Middleware may forward, cancel, or replace restore like any transaction.
- Core restore reduction never runs beforeUpdate, afterUpdate, valuePolicy,
  itemDefault, schemas, automatic validation, or mutation callbacks.
- History/persistence compare the committed reducer event/document with the
  requested target: exact document is applied, no commit is cancelled,
  different document is transformed, and absence of an eligible target is
  unavailable.

### React form ownership and rendering

- kit.createForm is the only public React FormInstance constructor.
  CreateFormOptions contains defaultValues, initial runtime options, and the
  immutable middleware array.
- kit.useForm is the only public React binding hook. It accepts an existing form
  plus FormRuntimeOptions and returns the same form after an exact-kit check.
- Each FormInstance retains one package-private immutable descriptor containing
  its exact kit identity, controls, and slots. A base kit and each result of
  kit.extend have different identities.
- kit.Form and kit.AutoForm validate the supplied form against their bound kit.
  AutoForm binds runtime options and renders the supplied instance; it does not
  create an instance from a definition.
- ActionForm reads the supplied form's private descriptor and binds the same
  instance. Its public props contain form, Action-specific inputs, runtime
  options, and native form props, but no kit, definition, or defaultValues.
- Component-local code creates a form once, such as with lazy React state.
  There is no kit.useCreateForm or definition-based useForm overload.
- The main entry does not export createForm, useForm, createFormStore, KitForm,
  or Submit values, and it does not export UseFormOptions. The core entry keeps
  createFormStore. Headless providers and granular hooks remain public.

### Feature capability protocol

- Use a globally stable Symbol.for key plus an integer protocol version. Do not
  use class identity across entry points.
- Optional entries read only the package-private capability attached to a
  FormInstance created through kit.createForm.
- Core owns one monotonic per-form event-sequence allocator. Successful history
  import or history-mode hydration may only raise its floor through the
  package-private capability; sequence state is not historical and is never
  restored downward.
- Protocol mismatch fails during atomic form/feature initialization with the
  expected and received versions.
- The core exposes no public raw restore or event dispatch method.

### History format and grouping

- FormJournal is an in-memory typed structure with a library format version,
  checkpoint segments, immutable committed document events, group boundaries,
  and cursor tokens.
- Sequence numbers define event order. Timestamps may close groups but never
  affect replay. Imports require strict uniqueness and monotonicity across all
  retained checkpoint segments, and the next live event is greater than the
  imported maximum.
- Array events store assigned row keys and logical structural changes.
- Export may contain Date, File, and custom leaves. Date and RegExp values are
  detached from retained journal state; File and other opaque leaves are
  application-owned immutable identities. JSON encoding belongs only to
  persistence.
- Import validates away from the live form and swaps journal state only after
  validation and an unchanged successful live restore.

### Persistence envelope

- The envelope contains a protocol identifier, library protocol version,
  application data version, mode, and structural encoded payload.
- Structural encoded nodes distinguish scalar JSON, undefined, array, object,
  and codec tag/payload without reserving a user-object property name.
- Migration receives untrusted JSON before codec decoding. Decoded input is
  validated through Standard Schema without installing transformed output.
- Persistence observes document revisions synchronously but performs adapter
  load/save/remove and codecs asynchronously.

### Redux DevTools

- Visible state is values, logical row identity, and a reserved opaque revision
  token only.
- Exact restore targets come from an in-memory token table, never from visible
  monitor JSON.
- Runtime events remain inspectable actions even when visible document state is
  unchanged.
- Supported monitor navigation becomes one normal live restore. Unsupported
  monitor capabilities remain disabled at connection time.

### Package graph

- Existing entries: src/index.ts, src/core/index.ts, src/react19/index.ts, and
  src/server/index.ts.
- New entries: src/history/index.ts, src/persistence/index.ts, and
  src/devtools/index.ts.
- The main entry owns createFormKit and kit-owned React APIs. The core entry
  alone exports createFormStore. The React 19 entry owns form-backed ActionForm
  and ActionSubmit without importing React 19 code into the main entry.
- Main/core/React 19/server may expose shared public middleware types from core,
  but they must not import optional feature implementations.
- Optional entries may import package-private core protocol modules. They must
  not require React, Redux, storage frameworks, or the Redux DevTools package.

## Rollback

- Before release, revert completed tasks in reverse order and restore the four
  current package entries. Do not keep a dormant compatibility implementation
  in the shipped code.
- A package rollback after application adoption must be coordinated with the
  application because removed or changed exports intentionally have no aliases.
- Persistence rollback does not delete stored envelopes. Applications must
  ignore, migrate, or explicitly clear their configured keys before an older
  application version can reuse them.
- History state is in memory and disappears with the form. DevTools listeners
  must disconnect on feature failure or page teardown; failed form creation may
  not leave an unreachable listener.

## Post-Completion

Manual verification:

- In a browser with Redux DevTools installed, create two forms with separate
  DevTools features, confirm their timelines remain isolated, navigate one
  form, commit its monitor baseline, and disconnect it without affecting the
  other.
- In a browser with localStorage, restore a saved form containing nested arrays
  and a registered Date codec, reload, verify stable row identity and clean
  baseline, then edit and confirm delayed autosave and flush behavior.
- Exercise application middleware that cancels and transforms history and
  DevTools restores, and confirm the visible form, history snapshot,
  persistence status, and DevTools monitor resynchronize to the actual commit.
- Follow the website documentation from a clean user perspective. Copy the
  history, persistence, and DevTools examples into small applications, then
  confirm that the documented results, failure states, and cleanup behavior
  match the shipped APIs.

External systems:

- No credential, server deployment, storage migration, or third-party package
  publication is part of implementation.
- Publishing the npm version and documentation site remains a separate release
  workflow after this plan is completed and reviewed.
