# Outcomes from complex examples

The six production-shaped examples exposed the following library and
documentation gaps. This file records the accepted outcome of that design
work; it is no longer an open roadmap list.

## Definitions and composition

### Object-scoped definition fragments — implemented

`kit.defineForm(schema).fragment(scope, nodes)` scopes typed field and array
paths plus resolver dependencies to a definitely present, non-null, non-array
object path. Context-aware fragments use `.fragment.withContext<Context>()`.
The authoring boundary is erased before normalization, so the runtime tree
still contains only field, section, array, and render nodes. Array items keep
their existing relative `children` contract, and explicit node IDs remain
global to the complete definition.

### Resolver-driven render nodes — implemented

Render nodes now accept `visible`, `disabled`, and `readOnly`. Invisible nodes
unmount; mounted components receive effective `{ disabled, readOnly }` props.
The component remains responsible for applying those flags to arbitrary DOM
and commands. Render nodes still own no field, accessibility, or serialization
contract.

### Schema paths without UI registration — implemented

Typed value commands, `beforeUpdate` replacement changes, and explicit path
validation accept canonical schema paths independently of UI registration.
Array structure commands still require an array node for `itemDefault` and row
metadata. Generated metadata and `ActionForm` serialization still require real
nodes and serializing controls; no headless field or `commandPaths` API was
added.

## Transactions

### Input-aware changes — implemented

`BeforeUpdateEvent<Input, Context>` and `UpdateEvent<Input, Context>` expose
`ValueChange<Input>[]`. Set changes preserve path/value correlation, and the
`beforeUpdate` replacement return uses the same input-aware type.

### Minimal composition helper — implemented

`extendValueChanges(event, additions)` appends typed dependent changes and
returns `undefined` for an empty addition list. Separate set/unset builders were
not added because the helper removes the repeated ceremony without creating a
larger transaction DSL.

## Async workflows

### Async field ownership recipe — documented

The `/guides/async-fields` guide covers TanStack Query requests, cancellation,
selected-label hydration, loading, request errors, and submission errors for
custom controls and render nodes. Fokit continues to own typed selected values,
not network state; no query adapter was added.

### Loaded baselines — documented

Loaded create/edit forms use three explicit patterns: mount after data is
available, remount by product identity with `key`, or call
`form.reset(loadedValues)` to replace an existing baseline. `AutoForm` does not
reset on changing object identity and gained no instance escape hatch.

## Multi-stage forms

### Path-subset validation and focus — implemented

`validatePaths(paths)` runs the complete Standard Schema once, returns only
issues that overlap one or more typed paths, and exposes that subset without
hiding issues exposed by earlier interactions. Pathless form issues remain in
the raw result but do not belong to a non-empty subset.
`focusFirstError(paths?)` focuses the first mounted visible editable field in
the optional subset, then the mounted summary, and reports whether focus moved.
`validate(path)` remains separate because segment-array `PathInput` would make
a single overloaded array argument ambiguous. No wizard engine was added.
