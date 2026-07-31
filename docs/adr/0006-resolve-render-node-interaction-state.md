# ADR 0006: Resolve render-node interaction state

- Status: Accepted
- Date: 2026-07-31

## Context

ADR 0003 introduced render nodes as an opaque React escape hatch with a
no-prop component. This prevents bespoke content from using the same derived
visibility and inherited disabled or read-only state as neighboring generated
nodes. Applications must duplicate resolver conditions inside the component,
and a disabled section cannot communicate its state to the bespoke controls it
contains.

## Decision

Render nodes accept the standard `visible`, `disabled`, and `readOnly`
resolvers. Effective state inherits through the definition tree. Invisible
render nodes are not mounted; mounted components receive resolved `disabled`
and `readOnly` props.

Core continues to carry the component as an opaque generic value and never
imports or invokes React. The React component owns applying the supplied flags
to its arbitrary DOM and commands; Fokit cannot enforce that behavior across
an opaque component boundary. Existing components may ignore the new props.

## Considered Options

- Supporting only `visible` would provide conditional mounting but leave
  inherited interaction state inconsistent inside disabled or read-only
  sections.
- Keeping the no-prop contract would force components to repeat resolver logic
  through form subscriptions and would not identify their parent interaction
  state directly.
- Automatically guarding every command issued by a render component would
  require implicit command ownership that the form instance cannot reliably
  infer.

## Consequences

- Render components can follow the same conditional and interaction policy as
  structural nodes without becoming field nodes.
- The component boundary stays explicit: Fokit supplies state, while the
  component remains responsible for accessibility and disabled/read-only DOM
  behavior.
- ADR 0003 remains authoritative for opaque core transport and placement; its
  no-prop and no interaction-state consequences are replaced by this decision.
