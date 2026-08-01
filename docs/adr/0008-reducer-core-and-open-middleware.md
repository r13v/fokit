# ADR 0008: Use a reducer core and open middleware chain

- Status: Accepted
- Date: 2026-08-01

## Context

The current form store combines document mutation, runtime lifecycle,
validation, submission, subscriptions, and extension hooks in one coordinator.
Undo, redo, persistence, event journals, and deterministic replay need a stable
commit boundary without making every runtime concern historical or coupling
optional features to the core entry point.

## Decision

The live source of truth is one atomic `FormDocument` containing schema input
values and stable array-row identity. Validation, submission, issues, touched
state, context, focus, and subscriptions remain ephemeral runtime state. Typed
commands become normalized transactions, one synchronous Redux-style
middleware chain may observe, cancel, or replace any transaction, and pure
reducers produce immutable committed events.

The library does not depend on Redux and does not expose raw event dispatch.
Each `kit.createForm` call receives an immutable ordered snapshot of
Redux-shaped middleware after the form's definition and types are known. Each
middleware outer function initializes isolated state for that form; there is no
additional factory layer. A configured first-party feature exposes
`feature.handle(form)` to retrieve its typed, form-owned handle after creation;
handle retrieval does not configure or activate middleware. Optional event
journal, history, persistence, and Redux DevTools integrations live behind
`form-please/history`, `form-please/persistence`, and
`form-please/devtools` exports. Replay applies
recorded document events to a checkpoint without effects. Its live restore
still passes through the open chain, so exact visible restoration is guaranteed
only when application middleware forwards the restore unchanged.

Every public React `FormInstance` is created by `kit.createForm`. The main entry
does not export global `createForm` or `useForm` functions. `kit.useForm` accepts
only an existing form created by that exact immutable kit snapshot and binds
runtime options to it. The React-free `createFormStore` constructor remains
available only from `form-please/core`.

Each form retains a package-private immutable reference to its kit identity,
controls, and slots. `kit.Form` and `kit.AutoForm` accept only `form` and reject
a form owned by a different kit snapshot. `ActionForm` also accepts only `form`
and obtains its rendering integration from that private reference, so it does
not accept `kit`, `definition`, or `defaultValues`. The main entry does not
export direct `KitForm` or `Submit` component alternatives; headless form
context and state hooks remain public.

## Considered Options

- Keeping direct mutations plus specialized lifecycle hooks would minimize the
  initial refactor but leave history, persistence, and replay coupled to store
  internals and to one another.
- Closed feature-specific plugin points would preserve stronger core
  invariants but prevent applications from composing cross-cutting behavior in
  one familiar ordered chain.
- A fully event-sourced core would always retain an event log and rebuild the
  live projection from it, imposing journal, checkpoint, retention, and
  migration costs even when optional history is not installed.
- Event-sourcing all runtime state would additionally retain transient
  validation, network, focus, and subscription concerns that users did not ask
  undo to restore.
- Embedding row IDs in public values would create one physical tree but would
  change schema input, submission data, primitive arrays, and every path-based
  API.
- Kit-level middleware would make a reusable controls-and-slots kit inherit the
  input, context, and runtime policy of every form created through it.
- Definition-level middleware would store executable runtime policy inside a
  reusable normalized UI definition.
- A separate `feature.setup(form, options)` phase would permit commits before a
  feature becomes active and duplicate configuration already expressible in
  `kit.createForm`.
- A separate middleware-factory layer would add another initialization function
  beyond the familiar Redux `api => next => transaction` contract without
  adding a lifecycle that the accepted design needs.
- Keeping middleware-free global `createForm` and `useForm` functions would
  create a second construction and binding model that bypasses exact kit
  ownership.
- Letting `useForm` or `kit.AutoForm` create a form from a definition would hide
  form ownership inside React rendering. Adding `kit.useCreateForm` would make
  that second lifecycle explicit but would still enlarge the public API.
- Passing both `kit` and `form` to `ActionForm` would permit contradictory
  owners. Binding `ActionForm` to a kit through another factory would add an
  unnecessary React 19 integration layer.
- Global `Form` and `AutoForm` components would duplicate the kit-bound render
  components. Direct root `KitForm` and `Submit` exports would preserve the same
  alternate composition path under different names.
- Multiple first-party histories cannot keep independent cursors coherent when
  one restores the live document. Multiple persistence owners make restore
  authority ambiguous; fan-out belongs in an application adapter.
- Multiple DevTools features would duplicate the same committed events and
  allow competing monitor commands for one form.

## Consequences

- Values and row identity commit and replay atomically without leaking
  synthetic IDs into application data.
- The live document remains authoritative; the optional event journal is not
  an event store and carries no cost when its feature is absent. When present,
  it may retain multiple checkpoint segments for audit and replay even though
  live navigation is limited to the latest segment.
- Optional history, persistence, and Redux DevTools code remains outside
  existing entry graphs until explicitly imported.
- Application middleware has full Redux-style authority over every normalized
  transaction, including reset, runtime, validation, and restore, while command
  normalization, invariant checks, event creation, reducers, and publication
  remain core-owned.
- `kit.createForm` checks domain middleware against the specific form without
  constraining the reusable kit; cross-cutting middleware remains generic.
- A `FormInstance` has one immutable kit owner. A base kit, an extended kit, and
  sibling kits cannot create or bind interchangeable forms even when their
  controls and slots are structurally equal.
- Component-local forms must create their instance once, for example with lazy
  React state, and then pass that instance to form components. The library does
  not provide a second definition-based creation hook.
- `kit.Form`, `kit.AutoForm`, and `ActionForm` share one form-backed component
  model. Only `ActionForm` remains a separate component export because React 19
  stays outside the main package entry graph.
- Applications that need the React-free engine import `createFormStore` from
  `form-please/core`; the main React entry teaches only kit-owned form creation.
- First-party history and persistence features are limited to one each per
  form, and the DevTools feature is also limited to one. Feature lookup is by
  exact reference, returns stable per-form handles, and does not introduce a
  setup lifecycle.
- Runtime context is not a history identity signal. Applications cross a
  logical-document boundary explicitly by creating a form, resetting values,
  restoring persistence, or clearing history.
- Middleware validation and initialization are atomic with form creation; no
  partially initialized form is returned after an error.
- Redux DevTools uses a constrained optional integration rather than emulating
  every Redux enhancer feature. It can inspect committed form events and accept
  supported document-navigation commands, but cannot dispatch arbitrary
  actions, reorder or skip events, or import lifted Redux state.
- Its displayed state contains only a diagnostic historical-document
  projection. Opaque revision tokens resolve through a bounded per-form memory
  table, allowing exact local restoration without treating serialized or
  sanitized monitor state as trusted form input.
- DevTools navigation is a normal recorded live restore: application
  middleware may cancel or transform it, history remains coherent, and active
  persistence observes the committed document. A mismatch resets the monitor
  to the actual live document.
- The DevTools handle alone exposes an idempotent per-form `disconnect()`
  because the browser connection owns a long-lived listener. This is not a
  general middleware cleanup or form-disposal lifecycle.
- Application middleware can deliberately weaken exact live restore; dispatch
  results expose what actually committed.
- The Redux-like contract has no middleware cleanup hook or form-disposal
  lifecycle; long-lived external resources remain application-owned.
- Core lifecycle hooks become compatibility middleware around the reducer,
  while reducers remain free of schemas, timers, storage, focus, and callbacks.
- Adopting this boundary requires a substantial internal migration and updates
  to the public API documentation and architecture map before release.

## Implemented protocol and modules

The implemented feature protocol uses version `1` and the shared capability
key `Symbol.for("form-please.feature-capability")`. The capability is defined
in `src/core/feature-protocol.ts` and is not a public package export.
Structural validation allows optional entries loaded through ESM and CommonJS
to use the same form capability without `instanceof` coupling.

The reducer boundary is implemented by `src/core/form-model.ts`,
`src/core/form-reducer.ts`, and `src/core/runtime-reducer.ts`. Commands,
transactions, events, middleware coordination, finalized commit delivery, and
snapshot publication live in their corresponding `src/core` modules.

Package entries own optional behavior as follows:

- `form-please/history` owns checkpoints, groups, journals, cursors, import,
  export, navigation, and pure replay.
- `form-please/persistence` owns canonical envelopes, codecs, migration,
  hydration, save scheduling, adapters, and optional history persistence.
- `form-please/devtools` owns the constrained Redux DevTools connection and its
  bounded revision-token table.

The existing `form-please`, `form-please/core`, `form-please/react19`, and
`form-please/server` entry graphs do not reach these optional modules.
