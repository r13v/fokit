# Product IDEAS

This document records product directions that are worth investigating. It is
not a release commitment or an implementation plan. Any change to public entry
points, form state, submission, serialization, or module boundaries must first
be reconciled with [ARCHITECTURE.md](ARCHITECTURE.md).

## Typed reusable form fragments

**Status:** Planned for design.

Let an application define a typed group of UI nodes once and place it at
different schema input paths, including inside generated arrays. Typical
examples are addresses, contact details, money ranges, and date ranges.

- [ ] Design the smallest API that preserves schema paths, control options,
      form-kit ownership, context, slots, and grid types.
- [ ] Support an explicit path prefix or field mapping without runtime schema
      introspection.
- [ ] Verify nested fragments and fragments inside object-array items.
- [ ] Compare the API with plain typed functions and ship a helper only when it
      removes meaningful application code.

Success means a fragment remains ordinary application-owned form structure,
with no independent state, validation, or lifecycle.

## Product workflow recipes

**Status:** Planned as application-owned recipes first.

Provide complete, typechecked patterns for workflows that repeatedly surround
product forms:

- [ ] Multi-step forms with conditional steps, current-step validation,
      progress, and navigation to the first invalid step.
- [ ] Review and confirmation screens that reuse the same definition and
      design-system vocabulary.
- [ ] Unsaved-change navigation guards that compose with draft persistence.
- [ ] Server issue mapping and multiple submit intents such as save draft,
      publish, and save-and-close.

Keep the first versions as copyable application code. Promote a pattern into a
public helper or optional entry only after several real forms demonstrate a
stable shared contract.

## Form Please Devtools

**Status:** Planned for discovery.

Create development-only diagnostics for Form Please behavior that React Hook
Form tooling cannot explain:

- [ ] Inspect the resolved UI tree and current visibility, disabled, read-only,
      layout, and control selection.
- [ ] Show schema issues together with rendered and hidden field paths.
- [ ] Trace managed updates, middleware changes or cancellation, and dependent
      patches.
- [ ] Inspect managed history and persistence phase, conflicts, and failures.

Do not duplicate generic React Hook Form value, dirty, touched, or subscription
inspection. Devtools must remain absent from production bundles unless an
application imports them explicitly.

## Visual form builder

**Status:** Discovery candidate, not committed.

A full drag-and-drop/no-code builder could materially shorten form creation,
but it introduces a product and architecture decision that must not be hidden
inside one blended implementation.

Choose one direction before implementation:

1. **Code-generating visual editor.** It renders the application's real form
   kit and exports an editable TypeScript `defineForm` definition. TypeScript
   remains the source of truth, which fits the current code-first architecture.
2. **Runtime no-code platform.** It stores and executes serializable form
   definitions for non-developer authors. This requires a new source of truth,
   versioned serialization, migrations, safe expression or plugin boundaries,
   and a deliberate answer for code-only resolvers and render nodes.

- [ ] Identify the primary author: product developer, designer, operations
      specialist, or another non-developer role.
- [ ] Decide whether the output is TypeScript code or a durable runtime format.
- [ ] Prototype authoring with the application's actual controls and slots,
      rather than a parallel generic component library.
- [ ] Test whether custom product logic retains a clear escape hatch without
      making the common path depend on handwritten React.
- [ ] Write a separate architecture proposal before committing to the runtime
      no-code direction.

Do not begin with drag-and-drop mechanics. First prove that the chosen source
of truth, ownership model, and generated result make a real product form faster
to ship and maintain.
