# Unreleased changes

Use this file as the source for the next GitHub Release notes. Remove or move
the entries only when that release is published.

## Added

- Object-scoped `defineForm(schema).fragment(scope, nodes)` authoring with
  relative paths and resolver dependencies.
- Resolver-driven `visible`, `disabled`, and `readOnly` state for render nodes,
  plus `RenderNodeProps` for applying effective interaction state.
- `validatePaths(paths)` and `focusFirstError(paths?)` for application-owned
  staged workflows.
- Path/value-correlated `ValueChange<Input>` and `extendValueChanges(...)` for
  dependent `beforeUpdate` transactions.
- Command and explicit-validation access to typed schema paths that do not have
  generated UI nodes.

## Migration notes

- `ValueChange<Input>` now checks each `set` value against its selected path.
  Existing hooks that paired a path with an incompatible value now fail type
  checking. Use `extendValueChanges(event, additions)` when a hook should keep
  the initiating changes and append dependent ones.
- `validate(path)` and `validatePaths(paths)` return ancestor, exact, and
  descendant issues that overlap the requested paths. A pathless form-level
  issue remains in raw errors but does not match a non-empty path subset; give
  stage-specific refinements a canonical owning path.
- Render components receive `{ disabled, readOnly }`. Components with no props
  remain valid, but interactive custom content must apply these flags to its
  commands and DOM accessibility state.
- Fragment scopes must be definitely present, non-null object paths. Optional
  or nullable objects should keep absolute definition nodes so their resolver
  and control types preserve parent absence.
- Context-free fragments may be used in context-aware definitions. Use
  `fragment.withContext<Context>()` when a fragment actually requires context.
  Explicit section and render IDs remain global across fragment scopes.

