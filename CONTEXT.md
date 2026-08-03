# Form, Please

Form, Please is a code-first React form integration that connects a Standard
Schema input to a typed UI definition while TanStack Form owns form state.

## Language

**Schema input path**: A TanStack Form deep key that addresses a value in the
Standard Schema input.
_Avoid_: Registered path, server field name

**Rendered field path**: A schema input path represented by a visible generated
field or array node.
_Avoid_: Registered path, every schema path

**Form kit**: The immutable controls, slots, and grid integration returned by
`createFormKit`.
_Avoid_: Mutable kit, extension chain

**Form definition**: A Standard Schema and recursive typed UI tree normalized
by one exact form kit.
_Avoid_: Form binding, inferred schema UI

**Form binding**: The thin integration returned by `kit.useForm` that contains
`form.api`, the fixed definition, runtime context, and interaction flags.
_Avoid_: Form store, Form Please runtime instance

**TanStack form API**: The state-owning API exposed as `form.api`, including
`Field`, `FormGroup`, `Subscribe`, validation, and array operations.
_Avoid_: Form Please command API

**UI resolver**: A synchronous function that receives the complete deeply
readonly schema input and runtime context, then returns one derived UI property.
_Avoid_: Computed field, async resolver

**Control**: A registered typed adapter between one schema value and one
interactive React component.
_Avoid_: Field definition, serializer

**Slot**: An application- or preset-owned component that renders structural
field, section, array, error, or submit markup.
_Avoid_: Control, inferred layout

**Form kit grid scale**: The finite numeric layout vocabulary shared by section
column counts and numeric child spans.
_Avoid_: CSS grid implementation, global column range

**Resource state**: A pending, successful, or failed state of application-owned
asynchronous data supplied through values or runtime context.
_Avoid_: Form request, form cache

**Transformed submit output**: The Standard Schema output produced by the
second parse after TanStack Form accepts the same input during submit.
_Avoid_: Cached validation result, editable form state

**Material UI preset**: The Form, Please-owned integration exported from
`form-please/preset-mui` with Material UI controls, slots, and a 12-column grid.
_Avoid_: Application-owned Material UI adapter
