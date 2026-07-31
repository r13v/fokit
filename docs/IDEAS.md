# Library ideas from complex examples

These are observations from building the six production-shaped documentation
examples. They are prompts for design work, not accepted roadmap items.

## Native controls

### Let `select` represent an unset enum

The research-grant identity branch initially modeled its representation as an
optional enum. `nativeControls.select` does not accept `string | undefined`, so
the example needed a domain-level `"none"` member solely to render an empty
choice. Consider an explicit empty-option contract that maps `""` to
`undefined` while keeping the submitted value and control type safe.

### Add a native time control

The studio policy editor stores opening exceptions as `HH:mm` strings. The
native text control's supported `type` union excludes `time`, so the example
uses text inputs with placeholders. A `time` control or a carefully expanded
native text type would preserve browser semantics without requiring a custom
control.

## Definitions and composition

### Provide a typed fragment helper for repeated deep sections

The membership ladder repeats the same section shape at four deep object paths,
and the makerspace and cohort examples repeat four conditional offer sections.
A normal generic function can lose the correlation between an array path and
its relative child paths; authors must preserve template-literal types manually.
Explore a public fragment/builder helper that scopes children to a concrete
object or array path without weakening path inference.

### Allow render nodes to use standard resolvers

Render nodes currently carry only `id` and `component`. Conditional bespoke UI
must either sit inside a visible section or subscribe to values and return
`null`. Supporting `visible`, `disabled`, or `readOnly` on render nodes would
make them behave consistently with the rest of a definition while preserving
their explicit component boundary.

### Let bespoke UI declare command-only paths

The grant registry render node initially called `form.setValue()` for a schema
path that had no field node or resolver dependency. The call was accepted by
TypeScript but failed at runtime with `Unknown field path`; adding a read-only
field node registered the path. Consider a headless field node, a render-node
`paths` declaration, or command typing that reflects the normalized
definition's registered paths. Bespoke controls should not need a visible field
solely to make a schema path commandable.

## Transactions

### Keep `beforeUpdate` changes input-aware

`BeforeUpdateEvent<Input, Context>` exposes `changes` as the unparameterized
`ValueChange[]`. Examples that append dependent changes therefore lose the
typed path information available on `ValueChange<Input>`. Consider carrying
`Input` into `changes` and the callback return type, or expose a typed helper for
extending the incoming transaction.

### Add small transaction construction helpers

The branching examples repeatedly copy `event.changes`, append `set`/`unset`
objects, and compare lengths to decide between the replacement and `undefined`.
Helpers such as `extendChanges(event, additions)` or typed `setChange` and
`unsetChange` constructors could remove ceremony without hiding the atomic
transaction model.

## Async workflows

### Document a first-class async field recipe

The registry search and cohort-title suggestions work through render nodes,
while the existing async multiselect uses a custom control. A focused recipe or
small adapter contract for TanStack Query-backed suggestions would clarify
loading, cancellation, selected-label caching, server errors, and which state
belongs outside the form. This should remain an integration pattern rather than
making Fokit own network state.

### Make loaded baselines ergonomic in generated forms

Several examples wait for queries before mounting `AutoForm`; the campaign
builder remounts by key when switching between create and edit baselines. The
lower-level `useForm` plus `form.reset(nextValues)` path is explicit but more
ceremonial. Consider an `AutoForm` escape hatch that exposes its instance or a
documented loaded-baseline component pattern without treating every new object
identity as a reset.

## Multi-stage forms

### Expose validation helpers for a path subset

The makerspace example correctly builds its wizard from ordinary values,
resolver visibility, and render nodes instead of requiring a wizard engine.
What remains awkward is validating and focusing only the fields owned by the
current stage before advancing. A public path-subset validation/focus primitive
could improve wizards and accordions without adding workflow state to Fokit.
