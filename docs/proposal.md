# Reducer Form Core with an Optional Event Journal

- Status: Accepted architecture; implementation pending
- Last updated: 2026-08-01
- Scope: React form ownership, core state, middleware, history, deterministic
  replay, persistence, and Redux DevTools

## Outcome

Form Please will use:

- a reducer-owned form document containing values and array row identity;
- ephemeral runtime state for validation, submission, metadata, context, focus,
  and subscriptions;
- typed commands and immutable events;
- pure reducers;
- one open Redux-style middleware chain configured for each `kit.createForm`;
- optional event journal, history, persistence, and Redux DevTools middleware
  from package subpath exports;
- separate per-form handles for history, persistence, and Redux DevTools;
- pure reducer replay followed by one live restore transaction.

The imperative `FormInstance` API remains the primary command API. Application
code does not receive public raw event dispatch.

Every public React `FormInstance` is created through `kit.createForm`. The main
entry does not export global `createForm`, global `useForm`, or
`createFormStore`. The React-free store constructor remains available from
`form-please/core`. Public middleware configuration belongs only to
`kit.createForm`; `createFormKit`, `kit.extend`, and normalized definitions do
not accept or retain middleware.

All public React form containers are form-backed. `kit.Form`, `kit.AutoForm`,
and `ActionForm` receive an existing form. They do not create one from a
definition. `ActionForm` does not receive a separate kit.

This is an intentional breaking redesign. Removed functions, components, and
types do not receive deprecated aliases, overloads, or compatibility shims.

## Historical scope

History, undo, redo, event journals, persistence checkpoints, and replay cover
only:

- schema-owned input values;
- stable array row identity.

They do not restore:

- baseline values;
- touched state;
- schema, server, or manual issues;
- validation or submission state;
- runtime context or runtime options;
- focus targets or subscriptions.

Replay always reconstructs the recorded historical document exactly. Undo,
redo, hydration, and seek then submit that document as a restore transaction
through the same open middleware chain as every other transition. If
application middleware forwards it unchanged, the live document is restored
exactly. Full middleware freedom is authoritative: middleware may also cancel
or replace a restore, so exact live restoration is conditional on the installed
chain.

Core restore handling does not run:

- `beforeUpdate`;
- `afterUpdate`;
- `valuePolicy`;
- automatic validation;
- application mutation callbacks.

Public subscribers still receive one coherent snapshot after restore.

A history checkpoint roots the current undo and redo stacks. Creating one does
not by itself change the dirty baseline. When history is installed, persistence
hydration installs a loaded document as the clean baseline, clears undo and
redo, and records a checkpoint. `reset(nextValues)` does the same with the
supplied baseline. `reset()` to the existing baseline remains undoable for
values and row identity; non-historical touched and issue state is not
recovered by undo.

Runtime context is never historical. Context replacement preserves the current
undo and redo stacks by default, including when the new context causes
`valuePolicy` to commit a document event. Undo restores a historical document
under the current context and does not rerun `valuePolicy`.
Changing the logical document represented by a form is explicit: applications
create a new form, call `reset(nextValues)`, restore persistence, or call
`history.clear()`. History does not infer document identity from runtime
context.

## State model

The historical source of truth is one atomic aggregate:

```ts
type FormDocument<Input> = {
	readonly values: Input
	readonly rowIdentity: RowIdentityState
}
```

`values` is the source of truth for application data. `rowIdentity` is the
source of truth for stable field-array identity. One reducer commits both so
their lengths, ordering, nested paths, and unique row keys cannot diverge.

Row identity stays outside public values because:

- public values must remain exactly `FormInput<Schema>`;
- arrays may contain primitives and opaque values that cannot carry IDs;
- synthetic IDs must not appear in validation or submitted data;
- wrapping every value as `{ id, value }` would require projection throughout
  paths, hooks, resolvers, schemas, serialization, and controls.

The internal representation of `RowIdentityState` is private. Event and
persistence formats record logical identity transitions rather than exposing
an internal map or tree.

The full model combines the historical document with ephemeral runtime state:

```ts
type FormModel<Input, Context> = {
	readonly document: FormDocument<Input>
	readonly runtime: FormRuntimeState<Context>
}
```

Runtime state uses explicit reducer transitions but is not retained in the
historical event journal.

## Commands, transactions, events, and reducers

Commands request work. Transactions are normalized candidates processed by
middleware. Events are immutable facts produced only when a transaction reaches
the reducer and commits.

```ts
type FormCommand<Input> =
	| SetValueCommand<Input>
	| SetValuesCommand<Input>
	| UnsetValueCommand<Input>
	| ArrayCommand<Input>
	| ResetCommand<Input>
	| TouchCommand
	| ValidateCommand
	| ReplaceRuntimeCommand

type FormTransaction<Input, Context> =
	| DocumentTransaction<Input>
	| RestoreTransaction<Input>
	| RuntimeTransaction<Context>

type FormEvent<Input, Context> =
	| DocumentCommittedEvent<Input>
	| DocumentRestoredEvent<Input>
	| RuntimeReplacedEvent<Context>
	| ValidationStartedEvent
	| ValidationResolvedEvent
	| ValidationFailedEvent
	| SubmissionStartedEvent
	| SubmissionFinishedEvent
```

Commands and transactions are not replayed. The terminal dispatcher converts
the effective transaction into an event and reduces it. A document event
records the effective changes after normalization, `valuePolicy`,
`beforeUpdate`, and middleware transformation.

```ts
type FormDocumentEvent<Input> = {
	readonly sequence: number
	readonly source: UpdateSource
	readonly changes: readonly ValueChange<Input>[]
	readonly rowIdentityChanges: readonly RowIdentityChange[]
}
```

Sequence numbers determine event order. Timestamps may be diagnostic metadata
but cannot affect replay.

Array events contain their assigned stable row keys. Replay never calls
`itemDefault` or generates a different key for an already recorded event.

Document reducers are pure. Validation and submission concurrency are modeled
with discriminated runtime states and reducer transitions. Schema execution,
timers, abort controllers, focus, storage, and application callbacks remain
effects around the reducers.

## Middleware

### One open chain

The store has one Redux-style chain. The core lifecycle middleware is outermost,
form middleware follows in declared order, and pure reducers are the terminal
dispatch target.

```text
public form command / middleware api.dispatch(command)
  -> core lifecycle middleware
       normalize / batch / valuePolicy / beforeUpdate
  -> FormTransaction
  -> form middleware in array order
  -> create committed FormEvent and run pure reducers
  <- post-next middleware work in reverse order
  <- publish one coherent snapshot
  <- afterUpdate and validation scheduling
```

For a document update, the observable lifecycle is:

```text
beforeUpdate -> reducer commit -> history/persistence -> publish -> afterUpdate
```

History and persistence perform synchronous bookkeeping after
`next(transaction)` and before publication. Persistence only queues
asynchronous storage work during dispatch; dispatch never waits for storage.

### Public contract

The middleware API is Redux-shaped but typed to form transactions and results:

```ts
type FormMiddleware<Input, Context> = (
	api: FormMiddlewareApi<Input, Context>,
) => (
	next: FormTransactionDispatch<Input, Context>,
) => (
	transaction: FormTransaction<Input, Context>,
) => FormDispatchResult<Input, Context>

type FormMiddlewareApi<Input, Context> = {
	readonly getSnapshot: () => FormSnapshot<Input, Context>
	readonly dispatch: (command: FormCommand<Input>) => void
}

type FormDispatchResult<Input, Context> =
	| {
			readonly status: "committed"
			readonly event: FormEvent<Input, Context>
	  }
	| { readonly status: "cancelled" }
```

`next(transaction)` returns only whether a reducer commit occurred and its
committed event. Middleware reads snapshots through `getSnapshot()` when it
needs them. Existing public form commands retain their current return
contracts.

Middleware may observe, cancel, or replace every transaction, including reset,
runtime, validation, and restore transactions. There are no reserved
non-transformable actions. History records the committed event from the reducer
result, not the transaction received by an outer middleware.

`FormInstance` and `FormStore` do not expose raw `dispatch(event)`. Application
middleware can dispatch typed commands through `FormMiddlewareApi`.

### Protocol rules

- `next` is synchronous and called at most once.
- Middleware normally returns the result from `next` unchanged.
- A middleware handler is not `async`; it launches asynchronous work after its
  synchronous `next` call.
- Events and snapshots are read-only.
- Nested `api.dispatch` calls return `void` and are queued FIFO until the
  current transaction publishes.
- Duplicate middleware references and invalid dispatch results produce
  actionable development errors.
- A middleware error before the reducer commit aborts the transaction and
  propagates to the caller.
- Once the reducer commits, a later middleware error cannot roll state back.
  The core still publishes the committed snapshot before propagating the error.
- Built-in middleware must not depend on reverse post-next ordering.

## Form-kit integration

Middleware is configured as an immutable ordered array for each
`kit.createForm` call. Each Redux-shaped middleware outer function is invoked
once and owns state isolated to that form:

```ts
import { createFormKit } from "form-please"
import { createHistoryMiddleware } from "form-please/history"
import {
	createLocalStorageAdapter,
	createPersistenceMiddleware,
} from "form-please/persistence"

const historyFeature = createHistoryMiddleware({
	limit: Infinity,
	groupWindow: 750,
})
const persistenceFeature = createPersistenceMiddleware({
	adapter: createLocalStorageAdapter(() => localStorage),
	codecs,
	key: `checkout:${draftId}`,
	version: 3,
	migrate,
	saveDelay: 500,
	history: historyFeature,
})

const kit = createFormKit({ controls })
const form = kit.createForm(definition, {
	defaultValues,
	middleware: [historyFeature, persistenceFeature],
})

const history = historyFeature.handle(form)
const persistence = persistenceFeature.handle(form)
```

`FormKit` gains the only public React creation and binding methods:

- `kit.createForm(definition, options: CreateFormOptions)`;
- `kit.useForm(form, runtimeOptions: FormRuntimeOptions)`.

`kit.createForm` freezes and validates the supplied middleware snapshot, then
initializes form-local state for the new form. History records from the initial
document. Persistence has its complete immutable configuration but remains
operationally idle until `restore()` or `start()`.

Middleware outer initialization must not acquire external resources. React
Strict Mode may invoke a lazy component-local form initializer more than once
and discard an instance. The DevTools browser connection therefore starts only
after the form completes its first successful React binding. A discarded or
never-bound form does not create a DevTools listener.

`kit.useForm` accepts an existing form created by that exact kit snapshot and
binds its runtime options. A form created by a base kit does not belong to an
extended kit, or vice versa, even when their controls and slots happen to be
structurally equal. A mismatched kit fails explicitly at runtime.

`CreateFormOptions` contains initial values, initial runtime options, and the
immutable middleware array. `FormRuntimeOptions` contains only options that a
React binding may replace. The public `UseFormOptions` type is removed with the
definition-based `useForm` overload.

Each form retains one package-private immutable kit descriptor. The descriptor
contains the exact kit identity, controls, and slots. `kit.Form` and
`kit.AutoForm` reject a form owned by another base, extended, or sibling kit.
`kit.AutoForm` accepts `form`, binds its runtime options, and renders the full
form. It does not accept `definition` or `defaultValues`.

`ActionForm` remains a separate `form-please/react19` export so React 19 stays
outside the main entry graph. It accepts `form`, Action-specific props, and
runtime options. It reads controls and slots from the form's private kit
descriptor. It does not accept `kit`, `definition`, or `defaultValues`.

The main entry does not export global `createForm`, `useForm`, `KitForm`, or
`Submit` values. It also does not re-export `createFormStore`. `kit.Form`,
`kit.AutoForm`, `kit.Fields`, and `kit.Submit` are the public rendering surface.
`FormProvider`, `useFormContext`, and granular state and field hooks remain
available for headless composition.

The library does not provide `kit.useCreateForm` or another hidden
definition-based creation path. A component-local form creates its instance
once, such as through lazy React state, and passes that instance to form
components.

Middleware is not configured by `createFormKit`, `kit.extend`, or the form
definition. A kit stays a reusable controls-and-slots capability; each created
form declares its own runtime policy at the point where its definition, input,
context, and options are known.

The initial API has no public dynamic middleware installation. Middleware is
either present in the `kit.createForm` call or absent for the form's complete
lifetime.
History and persistence handles do not expose pause, resume, stop, or dispose.
The DevTools handle has the narrowly scoped `disconnect()` described below.

Feature configuration belongs to the configured middleware returned by
`createHistoryMiddleware(options)`, `createPersistenceMiddleware(options)`, or
`createDevToolsMiddleware(options)`.
The same configured feature may be reused in multiple `kit.createForm` calls;
each invocation still creates fresh cursors, queues, status, and handle state.
After creation, `feature.handle(form)` retrieves the typed handle owned by that
exact form. It does not configure, activate, or mutate middleware. Calling it
for a form whose creation chain did not contain that exact feature reference is
an actionable development error. Repeated calls with the same form return the
same handle. Using one feature in several forms remains safe because its
per-form state is isolated. Repeating the same middleware reference within one
form is an actionable development error.

The chain accepts plain middleware and handle-bearing middleware features; both
use the single `FormMiddleware` contract above. Middleware may carry input and
context requirements. Because it is supplied to `kit.createForm`, that call
checks it directly against the specific definition and runtime context without
specializing the reusable kit. Generic history, persistence, DevTools, logging,
and analytics middleware imposes no application-specific requirement.

One form may contain at most one first-party history feature, one first-party
persistence feature, and one first-party DevTools feature. Multiple histories
cannot keep independent cursors coherent after one performs a restore.
Multiple persistence owners make restore authority ambiguous; applications
that need fan-out use a composite adapter. Multiple DevTools connections would
duplicate events and could issue competing monitor commands. These cardinality
limits do not restrict application-defined middleware.

When persistence is configured with `history: historyFeature`, `kit.createForm`
validates that both exact feature references occur in the same chain. Their
relative order does not change first-party behavior; application middleware
continues to follow the declared Redux order.

Feature-option validation, dependency and cardinality validation, and
middleware initialization are part of atomic form creation. Any failure makes
`kit.createForm` throw without returning a partially initialized form or
publishing a handle. An application may reuse the configured feature in a later
creation attempt.

The library adds no middleware preset or bundle API. Applications may reuse
configured features or wrap `kit.createForm` in an application-level helper.
`createFormKit` and `kit.extend` remain limited to controls and slots.

The middleware protocol has no cleanup hook and forms have no `dispose`
lifecycle. Middleware initialization must not start long-lived work.
Application middleware owns external subscriptions and cancellation; effects
started for a transaction must have an application-owned bounded lifecycle.

The Redux DevTools feature is the one first-party exception: connecting to the
browser extension necessarily owns a long-lived listener, so its handle exposes
an explicit idempotent `disconnect()` scoped to that form's connection. This
does not add a general middleware cleanup or form-disposal protocol.

Executable middleware is not stored inside normalized form definitions.

## Redux DevTools

Redux DevTools integration ships from `form-please/devtools` and is installed
explicitly as per-form middleware:

```ts
import { createDevToolsMiddleware } from "form-please/devtools"

const devToolsFeature = createDevToolsMiddleware({ name: "Checkout" })
const form = kit.createForm(definition, {
	defaultValues,
	middleware: [devToolsFeature],
})
const devTools = devToolsFeature.handle(form)

devTools.disconnect()
```

The first successful kit.useForm, kit.AutoForm, or ActionForm binding activates
the browser connection. Calling feature.handle(form) does not activate it.

The optional entry talks directly to
`window.__REDUX_DEVTOOLS_EXTENSION__.connect`. It has no Redux or
`@redux-devtools/extension` runtime dependency, does not enter existing package
graphs, and becomes a no-op during SSR or when the browser extension is absent.
Installation is explicit; Form Please does not infer a production or
development environment for the application.

The integration uses the extension's `init`, `send`, `subscribe`, `unsubscribe`,
and `error` methods. It supports inspection plus a deliberately constrained
monitor protocol:

- `JUMP_TO_STATE`, `JUMP_TO_ACTION`, `RESET`, and `ROLLBACK` may restore a form
  document;
- `COMMIT` changes only the Redux DevTools instance baseline;
- monitor pause and export remain available;
- arbitrary action dispatch, skip, reorder, import, lock, persisted monitor
  state, and generated tests are disabled.

These restrictions preserve the form's typed command boundary and avoid
pretending that edited, reordered, or imported Redux lifted state is a valid
Form Please event journal.

`createDevToolsMiddleware` accepts the compatible Redux DevTools connection
options `name`, `latency`, `maxAge`, `trace`, `traceLimit`, `serialize`,
`actionSanitizer`, `stateSanitizer`, `actionsAllowlist`, `actionsDenylist`,
`predicate`, and `autoPause`, plus an integration-specific `onError`. The
integration owns the `features` option and does not accept `actionCreators` or
enhancer-only options. Official defaults are retained except that `autoPause`
defaults to `true`, minimizing work while the monitor is closed.

Every committed `FormEvent`, including runtime events, is sent as the DevTools
action. Cancelled transactions have no committed event and are not sent. The
DevTools state is deliberately limited to a versioned diagnostic projection:

```ts
type DevToolsFormState<Input> = {
	readonly values: Input
	readonly rowIdentity: LogicalRowIdentity
	readonly $formPlease: {
		readonly revision: DevToolsRevisionToken
	}
}
```

Runtime validation, submission, touched, issues, context, focus, and
subscriptions are not included in state because DevTools navigation does not
restore them. Runtime events remain inspectable as actions whose document state
may be unchanged. The logical row-identity projection is versioned and does not
expose the core's private storage representation.

Exact time travel does not deserialize the visible extension state. The
middleware keeps a per-form in-memory table from opaque revision tokens to the
original immutable `FormDocument`. The table retains only document revisions
reachable through the configured `maxAge` window, plus the initial and current
DevTools committed baselines. It is independent of the history feature and
requires no persistence codecs.

`stateSanitizer` applies to the visible document projection before the reserved
`$formPlease` token is reattached. `serialize` and sanitizers therefore control
what the extension displays or exports without changing the exact in-memory
restore target. Date, File, and custom values can be restored within the active
page connection even when their displayed representation is lossy. Tokens do
not survive reload or import, which is why persisted monitor state and import
are unsupported.

A supported navigation command resolves its token and submits one normal live
restore transaction with `origin: "devtools"`. It passes through the complete
open middleware chain. An unchanged commit becomes a new history group,
truncates any redo branch, and is observed by active persistence like any other
live document commit. The DevTools middleware suppresses echoing that restore
event because the monitor already points at its target. DevTools `COMMIT`
updates only the monitor's committed baseline; it does not create a form
history checkpoint or change the dirty baseline.

An unknown or expired token leaves the form unchanged, reports the mismatch
through the extension's `error()` method, and calls `init()` with the actual
live document. The same resynchronization occurs when application middleware
cancels or transforms a DevTools restore. Resetting the monitor timeline is
deliberate: it cannot remain pointed at a document the form did not commit. A
committed transformed document is still handled normally by history and
persistence.

Extension connection, serialization, or transport failures are diagnostic and
never fail or roll back a form commit. The integration calls `onError` when
provided and permanently disconnects a connection that can no longer be used.
This is a first-party middleware policy: application middleware continues to
follow the general error propagation rules.

`devTools.disconnect()` removes the listener for that form instance, is safe to
repeat, and permanently turns that middleware instance into a no-op. It does
not disconnect other forms or expose reconnect, pause, or resume lifecycle.

The integration follows the official extension contracts documented in:

- [Redux DevTools API methods](https://github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Methods.md);
- [Redux DevTools connection arguments](https://github.com/reduxjs/redux-devtools/blob/main/extension/docs/API/Arguments.md).

## History and deterministic replay

History ships from `form-please/history`. Its implementation is absent from the
main and core entry graphs unless the subpath is imported.

The history handle is separate from the form:

```ts
history.getSnapshot()
history.subscribe(listener)
history.undo()
history.redo()
history.seek(index)
history.clear()
history.export()
await history.import(log)
```

The live history snapshot is deliberately local to the latest checkpoint:

```ts
type HistorySnapshot = {
	readonly canUndo: boolean
	readonly canRedo: boolean
	readonly index: number
	readonly length: number
}
```

`index` ranges from `0`, the latest checkpoint document, through `length`, the
latest retained group. Live seek accepts that index. It does not expose journal
sequence numbers or checkpoint identity.

Navigation methods return a small feature-specific outcome:

```ts
type HistoryOperationResult =
	| "applied"
	| "unavailable"
	| "cancelled"
	| "transformed"
```

`history.clear()` discards the complete retained journal, clears undo and redo,
and records the current document as its new checkpoint. History has no paused
or disposed state.

The event journal contains a versioned initial checkpoint, every ordered
committed document event, and later checkpoints. Hydration and
`reset(nextValues)` append a checkpoint; they do not erase earlier journal
entries. Undo, redo, and live seek operate only after the latest checkpoint.
Export retains every currently stored checkpoint segment. A history group is
one undo/redo unit containing one or more events.

Consecutive control updates to the same schema path are grouped until a blur,
path change, source change, structural action, or configurable time boundary.
`groupWindow` defaults to 750 milliseconds; `0` disables time-based grouping.
`form.batch()` forms one group. A recorded Redux DevTools restore forms one
group of its own. Exported history records group and checkpoint boundaries.

History retains an unlimited number of groups by default (`limit: Infinity`).
This also means retaining every committed document event, including individual
control edits inside a group, for the lifetime of the form. Applications may
opt into a finite limit. A finite limit counts closed groups across the complete
retained journal. When it is exceeded, the oldest groups are folded into a new
checkpoint and their individual events and superseded checkpoints are
discarded. The active group is compacted only after it closes. The limit bounds
groups, not bytes.

A new document edit after undo truncates the redo branch. Undo, redo, seek,
import, and replay do not append recursive user events.

Replay reconstructs a target `FormDocument` using the same pure document
reducers as live commits. It does not execute live middleware, hooks, schemas,
timers, defaults, or application code.

`replayJournal(journal, cursor)` accepts an opaque `JournalCursor` from that
exported journal and may target any retained checkpoint segment without
changing a live form. Live `seek(index)` remains bounded by the latest
checkpoint.

The live store then receives one restore transaction whose successful reducer
commit produces an event:

```ts
type DocumentRestoredEvent<Input> = {
	readonly type: "document/restored"
	readonly document: FormDocument<Input>
	readonly origin: "undo" | "redo" | "replay" | "hydrate" | "devtools"
	readonly history: "skip" | "record"
}
```

Undo, redo, replay, and hydration use `history: "skip"` and reconcile their
cursor or checkpoint explicitly. Redux DevTools navigation uses
`history: "record"` so the history cursor cannot diverge from the live
document.

The restore transaction has no special authority over application middleware.
Middleware may forward, cancel, or replace it. History reconciles against the
actual dispatch result:

- cancellation leaves the document and cursor unchanged;
- an unchanged target moves the cursor;
- a transformed document commit becomes a normal new history group from the
  previous live document and truncates the redo branch;
- a runtime-only commit does not count as a successful document restore.

The operation reports which outcome occurred. Deterministic replay guarantees
the reconstructed target, while the installed middleware chain determines the
live result.

`history.export()` synchronously returns a typed in-memory
`FormJournal<Input>`. It may contain Date, File, or custom values and is not a
serialized storage format. `history.import()` treats its input as untrusted,
validates and replays it away from the live store, validates the final input
through the schema, and replaces the current journal only after an unchanged
successful restore. Persistence history mode alone owns JSON encoding and
codecs.

## Persistence

Persistence ships from `form-please/persistence`. It uses middleware for commit
observation and a separate per-form handle for asynchronous operations:

```ts
await persistence.restore()
await persistence.start()
await persistence.flush()
await persistence.clear()
persistence.getSnapshot()
persistence.subscribe(listener)
```

The persistence handle exposes two explicit state-machine axes:

```ts
type PersistenceSnapshot = {
	readonly phase: "idle" | "restoring" | "active" | "conflict"
	readonly save:
		| { readonly status: "idle" }
		| { readonly status: "scheduled" }
		| { readonly status: "saving" }
		| { readonly status: "failed"; readonly error: unknown }
}
```

Construction leaves persistence idle: it observes revisions but does not write.
`restore()` loads a persisted document as the clean baseline and then enables
autosave. When history is installed, restore also clears undo and redo and
records a checkpoint. `start()` skips loading and enables autosave for the
form's remaining lifetime. Hydration is explicit; persistence has no paused,
stopped, or disposed state.

If middleware transforms hydration into a different committed document, that
actual document becomes the clean baseline and history checkpoint, persistence
activates, and the transformation is reported. A cancellation or runtime-only
result leaves persistence inactive.

`start()` immediately queues the current document. A successful `restore()`
with no stored record does the same. A loaded record is written back immediately
only when application migration changed its format. `clear()` removes the
stored record and suppresses rewriting the current revision; the next document
commit queues a new save.

Calling `start()` while active is a no-op. Calling `restore()` while active is
an error. From conflict, `start()` chooses local state and `restore()` retries
stored state. Calling `flush()` again after a failed save retries the latest
revision immediately.

The default persistence payload is the current `FormDocument`. Supplying a
configured history feature to `createPersistenceMiddleware` opts into history
mode, which stores the checkpoints, committed event journal, group boundaries,
and cursor. Both exact feature references must be present in the same form's
middleware chain. Persistence never discovers history implicitly.

### Adapter

Storage adapters are application-extensible and asynchronous:

```ts
type FormPersistenceAdapter = {
	load(key: string): Promise<JsonValue | undefined>
	save(key: string, value: JsonValue): Promise<void>
	remove(key: string): Promise<void>
}
```

The library ships only a localStorage adapter. Documentation provides
application-owned adapter examples for:

- the supplied localStorage adapter;
- URL query-string state through nuqs;
- server persistence through TanStack Query, optionally using `FormData` as the
  request transport for the JSON envelope.

Writes are revisioned, serialized, and coalesced. Completion of an older save
cannot overwrite a newer revision. A restore that started before a newer local
edit never overwrites that edit, enters an inactive conflict state, and does not
write. Calling `restore()` again explicitly chooses stored state; calling
`start()` explicitly chooses current local state.

Autosave uses a configurable `saveDelay` of 500 milliseconds by default. Each
new document revision restarts the delay; `0` enables immediate writes and
`flush()` bypasses the delay.

Ordering and stale-work protection apply only inside one persistence handle.
Cross-tab synchronization, multi-form coordination, server conflict detection,
merging, locking, and compare-and-swap are application adapter concerns. Two
handles using one key may overwrite each other according to adapter semantics;
the library treats that as an application configuration error.

Storage failures never cancel a form commit. The persistence handle exposes the
failure, `flush()` rejects, and a later commit retries saving the latest
revision. An optional `onError` callback runs once for each failed attempt.

### Format and codecs

The canonical format is a versioned JSON envelope. `FormData` is not a
persistence format because it cannot preserve exact structured input types; a
server adapter may use it only as transport for the encoded envelope. The
envelope preserves supported JSON values and `undefined`. Unsupported opaque
leaves fail with an actionable value path.

Date, File, and application-specific values use explicitly registered tagged
async codecs. Codec tags are stable and unique. The opt-in File codec stores
content as base64 plus name, media type, and last-modified metadata. Its
configurable size limit defaults to 10 MiB. This is portable but increases
payload size and remains unsuitable for large files or small localStorage
quotas.

Persisted data is untrusted. The library envelope carries a persistence
protocol version and an application-defined data version. An unsupported
library protocol is a hard error. An application-version mismatch requires an
application migration; persistence does not attempt best-effort decoding or
retain old reducers. Migration receives untrusted JSON before codecs and schema
validation run.

Before restore, persistence validates:

1. envelope and library protocol version;
2. application version or migration result;
3. event shapes and canonical value paths;
4. row-identity lengths, uniqueness, paths, and counters;
5. final input values through the form's Standard Schema contract.

Successful schema output does not replace stored input values when the schema
transforms input into a different submission output.

## Runtime reconciliation after restore

A document restore commit also makes non-historical runtime state safe:

- captured validation attempts become stale and cannot install results;
- changed values return to an unvalidated status;
- stale server issues cannot attach to the restored revision;
- touched state and baselines are not restored;
- path-owned metadata and issues are reconciled with stable row identity;
- React 19 Action tracking observes effective changed paths even though
  `afterUpdate` is suppressed;
- subscribers receive one final snapshot;
- automatic validation is not scheduled.

## Package boundaries

The npm package exposes:

- existing main, core, React 19, and server entries;
- `form-please/history`;
- `form-please/persistence`;
- `form-please/devtools`.

The main entry exposes kit-owned React creation and rendering. It does not
export global `createForm`, `useForm`, `createFormStore`, `KitForm`, or `Submit`
values. The core entry continues to export `createFormStore`. The React 19 entry
exports form-backed `ActionForm` and `ActionSubmit`.

The main, core, React 19, and server entry graphs do not import history,
persistence, DevTools integration, codecs, or storage adapters. Optional
features integrate through public middleware types plus versioned
package-private capabilities for row-identity checkpoints and document
restore.

Cross-entry capability identity must remain stable in ESM and CommonJS builds.
An incompatible feature/core protocol version fails explicitly.

When no event-journal middleware is installed, the core does not retain history
checkpoints or materialize exportable event records. The live `FormDocument`,
not an event journal, remains the source of truth.

## Target module responsibilities

`src/core/form-store.ts` becomes a facade and coordinator instead of owning all
domain logic. The implementation separates:

- form model and snapshots;
- commands and events;
- pure document reducers;
- runtime state-machine reducers;
- middleware composition and dispatch;
- transaction proposal and `valuePolicy` expansion;
- subscriptions and publication;
- validation and submission effects;
- focus integration;
- event journal, history, replay, persistence, DevTools integration, and codecs
  in their optional entry trees.

Existing focused modules such as transaction, array state, issues, metadata,
and UI resolution remain the initial extraction boundaries where their current
contracts fit.

`src/react/create-form-kit.tsx` owns public React form creation, exact kit
checks, and bound render components. `src/react/form-instance.ts` owns the
private immutable kit descriptor. `src/react/use-form.ts` keeps only the shared
package-private binding hook used by kit.useForm, AutoForm, and ActionForm.
`src/react19/action-form.tsx` consumes the descriptor without accepting a kit
prop.

## Implementation sequence

1. Add characterization tests for the document/runtime boundary and restore
   consequences.
2. Introduce `FormDocument`, `FormModel`, typed events, and pure document
   reducers without changing public behavior.
3. Move validation and submission bookkeeping into explicit runtime reducers.
4. Route all document writes through the reducer.
5. Add the synchronous middleware engine and protocol guards.
6. Make `kit.createForm` and `kit.useForm` the only public React creation and
   binding API. Add exact kit ownership and form-backed `kit.Form` and
   `kit.AutoForm`.
7. Add the lazy timeline capability, make `ActionForm` form-backed, and move
   Action tracking to effective reducer commits.
8. Implement history handles, undo, redo, seek, import/export, and replay.
9. Implement persistence handles, JSON encoding, codecs, and localStorage.
10. Implement the Redux DevTools middleware and constrained monitor protocol.
11. Add package entry points and ESM/CJS/type/build isolation tests.
12. Update `docs/ARCHITECTURE.md` and ADR 0008, then publish API documentation
    and adapter examples.

## Verification

- Generated declarations expose only the new kit-owned React creation and
  form-backed component API. Removed global constructors, binding overloads,
  render components, and `UseFormOptions` are absent.
- `createFormStore` remains available from `form-please/core` and is absent from
  the main entry.
- `kit.Form` and `kit.AutoForm` reject forms from another kit snapshot.
  `ActionForm` renders from the form's private kit descriptor without a kit
  prop.
- A form discarded by React Strict Mode creates no DevTools listener. The
  retained form creates one listener after its first successful binding.
- Reducer property tests compare against the current transaction model.
- Replaying the same checkpoint and log produces identical values and row
  identity.
- Nested arrays preserve row keys across all mutations and restore operations.
- Core hooks, policies, schemas, and defaults do not run during replay or
  restore; application middleware still wraps the live restore.
- Baselines and touched state are not restored.
- Stale validation and persistence work cannot update a newer revision.
- Middleware order, cancellation, replacement, errors, nested dispatch, and
  protocol violations are covered by tests.
- Nested middleware dispatch publishes later transactions in FIFO order after
  the current transaction.
- Form and history snapshots are coherent when subscribers run.
- A post-reducer middleware error cannot leave committed state unpublished.
- Pure replay reconstructs an exact target, and middleware transformation or
  cancellation of its live restore is reflected in the operation result.
- Optional history, persistence, and Redux DevTools code is unreachable from
  existing entry graphs unless imported.
- Redux DevTools is inert without its optional entry and cannot use unsupported
  monitor commands to bypass typed form commands.
- DevTools sends only committed events and historical document state; runtime
  state is never presented as restorable.
- DevTools jumps restore the exact in-memory document for retained tokens,
  preserve history and persistence coherence, and resynchronize the monitor
  after cancellation, transformation, or an expired token.
- Extension transport failures and `disconnect()` cannot fail a form commit or
  affect another form's DevTools instance.
- `npm run check` and `npm run knip` pass together with relevant unit, type,
  build, package, and smoke suites.

## Documentation impact

Before implementation is complete, `docs/ARCHITECTURE.md`, ADR 0008, and the
public documentation site must describe the accepted ownership, middleware,
history, replay, persistence, and package-boundary contracts above.
