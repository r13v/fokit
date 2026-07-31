# ADR 0003: Carry React render nodes opaquely through core

- Status: Accepted
- Date: 2026-07-30

The opaque core boundary remains accepted. ADR 0006 replaces this record's
no-prop and no disabled/read-only consequences with resolved render-node
interaction state.

## Context

Generated forms sometimes need a form-local preview, command, or other
arbitrary React content at an exact position in the UI tree. Treating that
content as a field would weaken the field contract, while moving the complete
tree into React would break the React-free core boundary.

## Decision

The UI tree has a separate `render` node with a required ID and an opaque
component. Core normalizes and resolves the component as a generic payload
without importing or invoking React; the React renderer alone mounts it.
Render nodes are allowed at the root and inside sections, but not inside array
rows. ADR 0006 defines their resolver-driven interaction state and React props.

## Considered Options

- `field.render` would make a field no longer guarantee one typed path, control
  metadata, accessible field structure, or `FormData` behavior.
- A parallel React-only tree would duplicate ordering and section nesting and
  could drift from the core definition.
- Registering named renderers in the kit would preserve portability but remove
  the intended form-local escape hatch.

## Consequences

- Render nodes use public form hooks when they need values and receive the
  interaction props defined by ADR 0006.
- They have no automatic path, label, errors, layout, accessibility, command
  ownership, or serialization behavior.
- `ActionForm` renders them but excludes them from compatibility analysis; any
  successful controls they render are application-owned.
- Definitions containing component references are React-only and cannot cross
  a serializable React Server Components boundary.
