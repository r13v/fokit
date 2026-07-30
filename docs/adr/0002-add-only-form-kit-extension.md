# ADR 0002: Extend form kits with add-only snapshots

- Status: Accepted
- Date: 2026-07-30

## Context

Applications may share one product form kit while a single form needs an
additional control or a local structural slot. Rebuilding the complete kit
manually is possible, but it does not express compatibility or prevent a local
control from silently replacing an existing contract.

## Decision

Every form kit exposes `extend`, which creates an independent snapshot by
adding controls and partially replacing resolved slots. Control names are
add-only and collisions fail in TypeScript and at runtime. Definitions retain
the complete structural registry requirement of the kit that created them, so
a base definition works with an extension while an extended definition does
not work with its base or a sibling missing a required control name. Siblings
with the same complete registry contract remain compatible.

## Considered Options

- Reassembling a kit with `createFormKit` and object spreads provides no
  explicit compatibility boundary or collision protection.
- Last-write-wins control replacement can silently reinterpret field options,
  rendering, and `FormData` serialization in an existing definition.
- Tracking only the controls actually used by each definition would improve
  portability but substantially complicate inference and public types.

## Consequences

- Extensions may be chained and may change only slots, only controls, or both.
- `extend({})` is invalid, while inherited resolved slots remain unchanged
  unless explicitly replaced.
- A definition that must remain portable is created by the lowest common base
  kit.
- TypeScript cannot generate a fresh nominal identity for each `extend` call;
  compatibility follows the complete known registry contract instead.
- Widening a registry to `ControlDefinitionRegistry` erases known-name
  protection, so runtime collision and unknown-control checks become
  authoritative.
- Explicitly erasing a definition or form instance's registry type also erases
  this compile-time protection; runtime unknown-control checks remain.
