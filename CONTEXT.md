# Fokit

Fokit is a code-first form context that connects schema-owned values to a
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
