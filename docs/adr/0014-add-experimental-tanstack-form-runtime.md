# ADR 0014: Add an experimental TanStack Form runtime

- Status: Accepted
- Date: 2026-08-02

## Context

Form, Please currently owns both its typed schema-to-UI authoring model and a
custom reducer-based form runtime. An alternative runtime can reduce the amount
of form-state machinery owned by the project, but emulating the existing
`FormInstance` and optional features on top of TanStack Form would recreate the
same maintenance burden behind a compatibility facade.

## Decision

Add a React-only experimental entry point at `form-please/tanstack`. It
coexists with the original runtime and treats `@tanstack/react-form` as an
optional peer dependency, so applications that do not import the entry point
do not install or load TanStack Form for the original runtime.

The entry point reuses the existing form-kit authoring model: typed control and
slot registries, kit-owned grid scales, `defineForm`, field, section, array and
render nodes, synchronous resolvers, and runtime context. A TanStack form
definition belongs to the exact TanStack form kit snapshot that created it and
is not interchangeable with a definition from the original runtime.

Each kit exposes `kit.useForm`, backed by TanStack's ordinary `useForm`, and
returns the Form, Please integration object used by the generated components.
Context-bound TanStack components remain available as `kit.tf.Field`,
`kit.tf.FormGroup`, and `kit.tf.Subscribe`; they do not compete with the Form,
Please component namespace. The integration does not use TanStack
`createFormHook`, add a standard-runtime `FormInstance` facade, or initially
expose imperative form creation. Runtime context, disabled and read-only flags,
and callbacks are reactive hook options; a definition remains fixed while its
`formId` remains fixed. Default-value updates follow TanStack semantics.

Kits expose `Form`, `Fields`, `Submit`, and `AutoForm`. Generated controls keep
the existing `ControlProps` and normalized `FormIssue` contracts. The TanStack
entry's `defineControl` makes `formData` optional with `mode: "none"` as its
default while continuing to accept existing control definitions. Hidden fields
preserve their values, and `valuePolicy: "unset"` is rejected rather than
partially emulated.

The definition's Standard Schema is authoritative. Validation begins on submit
and revalidates on change after a failed attempt. Generated fields expose
schema issues after touch or a submit attempt; invalid submission focuses the
first visible invalid generated field. Successful submission parses
the schema a second time and calls `onSubmit` with the transformed `value`, raw
`input`, TanStack `form`, and submit `meta`. This deliberate double parse avoids
owning a cache for transformed async results.

Generated arrays use TanStack's index-based identity and operations. The first
version does not promise preservation of row-local DOM or component state
across reorder. Native form rendering prevents the browser default and calls
`form.handleSubmit`; browser `FormData`, progressive enhancement, React
Actions, server adapters, middleware, history, persistence, and the original
DevTools protocol are outside this runtime's initial scope.

## Considered Options

- Replacing the original core or matching its public API would make the new
  runtime a migration instead of an independent experiment.
- Hiding TanStack behind a new Form Please instance would reduce direct
  dependency exposure but require another command, state, and lifecycle facade.
- Using `createFormHook` would introduce a second design-system binding model
  beside the existing named control registry.
- Sharing normalized definition objects across runtimes would weaken exact kit
  ownership and make divergent runtime capabilities implicit.
- Stable array-row identity, `valuePolicy: "unset"`, transformed-output caching,
  and native `FormData` could improve parity but would rebuild substantial
  custom runtime behavior before the alternative has proven useful.

## Consequences

- Applications can compare runtimes without changing the original package
  behavior or abandoning the existing schema-driven authoring vocabulary.
- Consumers may use `kit.tf` for manual TanStack fields, form groups, and
  subscriptions; those APIs and their custom error values are intentionally
  visible.
- The entry point is explicitly experimental because its public types expose a
  versioned third-party API and its product boundary must be validated in real
  forms before stabilization.
- Initial limitations—double schema parsing, index-based array identity, no
  hidden-value removal, and no server or optional-feature integrations—are
  visible product constraints rather than silent compatibility gaps.
