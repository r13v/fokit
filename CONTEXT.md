# Form, Please

Form, Please is a code-first form context that connects schema-owned values to a
typed UI definition without making application workflows part of the library.

## Language

**Schema path**: A canonical dot path that addresses a value allowed by the
form schema input, whether or not that value has generated UI.
_Avoid_: Registered path, field path when no field node exists

**Rendered field path**: A schema path represented by a field or array node in
the UI definition and therefore eligible for generated rendering and metadata.
_Avoid_: Registered path, schema path

**Definition fragment**: A reusable authoring scope whose relative nodes and
resolver dependencies are bound to one definitely present object schema path
and erased during definition normalization.
_Avoid_: Subform, nested form, fragment node

**Form kit snapshot**: An immutable controls, slots, and grid-scale integration
returned by `createFormKit` or `kit.extend`. A base kit and each extension are
different snapshots.
_Avoid_: Kit configuration, mutable kit

**TanStack form kit snapshot**: An immutable controls, slots, and grid-scale
integration returned by `form-please/tanstack`. It owns only TanStack form
definitions created through that exact snapshot.
_Avoid_: Form kit snapshot, TanStack adapter configuration

**TanStack form definition**: A schema and typed UI definition normalized by
one exact TanStack form kit snapshot. It is not interchangeable with a form
definition owned by the original runtime.
_Avoid_: Portable form definition, Form instance

**TanStack form API**: The React-bound TanStack Form object returned by a
TanStack form kit snapshot. It remains the public runtime API instead of being
hidden behind a Form Please form instance facade.
_Avoid_: Form instance, TanStack form store

**Shadcn form-kit adapter**: An application-owned Form, Please integration that
maps the canonical form-kit control and slot contracts onto one supported
shadcn component base.
_Avoid_: Shadcn preset, bundled shadcn kit, shadcn component library

**Material UI preset**: A Form, Please-owned integration exported from
`form-please/preset-mui` that creates form kit snapshots with canonical control
and slot contracts mapped onto Material UI components.
_Avoid_: Material adapter, application-owned Material UI kit

**Form kit grid scale**: The finite numeric layout vocabulary owned by one form
kit snapshot and shared by section column counts and numeric child spans.
_Avoid_: Grid capability, global column range, CSS grid settings

**Form instance**: The imperative state and command owner created by one exact
form kit snapshot.
_Avoid_: Form store, form definition

**Form command**: A typed request to perform work against one form instance.
_Avoid_: Event, committed change

**Form transaction**: A normalized candidate transition that middleware may
forward, replace, or cancel before it becomes a committed fact.
_Avoid_: Event, action

**Form event**: An immutable fact produced when a form transaction reaches the
reducer and commits.
_Avoid_: Command, proposal, candidate event

**Form event journal**: An optional ordered record of committed form document
events used by history, replay, or persistence; it is not the live form's
source of truth.
_Avoid_: Event store, event-sourced core

**Form middleware**: A Redux-shaped function passed to `kit.createForm`; its
outer initialization runs once and owns state isolated to the created form.
_Avoid_: Middleware factory layer, shared middleware state

**Form middleware feature**: A configured form middleware whose typed,
form-owned handle is retrieved after creation with `feature.handle(form)`.
_Avoid_: Feature setup, shared feature handle

**DevTools document projection**: The diagnostic representation of historical
form values and logical row identity sent to Redux DevTools; it is not a full
runtime snapshot or persistence format.
_Avoid_: Form snapshot, persisted form

**DevTools revision token**: An opaque per-form key embedded in a DevTools
document projection and resolved through a bounded in-memory document cache for
exact local time travel.
_Avoid_: Serialized form document, history cursor

**History checkpoint**: A complete recorded form document that roots replay and
marks a boundary that undo and redo cannot cross. Creating a checkpoint does
not by itself change the form's dirty baseline.
_Avoid_: History epoch, dirty baseline

**History group**: One undo or redo unit containing one or more consecutive form
events.
_Avoid_: Event, transaction

**Loaded baseline**: Complete schema input loaded asynchronously and installed
as the clean comparison point for one form instance.
_Avoid_: Async defaults, initial data

**Path subset**: One or more schema path subtrees selected for issue exposure,
validation results, or error focus while the complete schema is still checked.
_Avoid_: Partial validation, field validation

**Async control data**: Remotely loaded options, suggestions, or labels used by
a control while the form continues to own only its typed value.
_Avoid_: Async field

**Resource state**: The current pending, successful, or failed state of
application-owned asynchronous data supplied to a form through runtime context.
_Avoid_: Promise state, form loading state

**Asynchronous UI resolution**: Evaluation in which a UI resolver returns a
Promise instead of a resolved property value.
_Avoid_: Async field, async control data

**Async definition node**: A field, section, array, or render node whose
definition itself becomes available asynchronously.
_Avoid_: Async field, asynchronous UI resolution

**Resolvable structural presentation metadata**: A structural node's
application-owned class or finite grid layout intent when it can be static or
synchronously derived without changing the UI definition tree.
_Avoid_: Dynamic UI structure, dynamic definition
