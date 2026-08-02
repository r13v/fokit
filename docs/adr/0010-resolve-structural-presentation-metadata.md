# ADR 0010: Resolve structural presentation metadata

- Status: Accepted
- Date: 2026-08-02

ADR 0001 kept layout finite and portable, but its static `className`, `span`,
and `columns` metadata forces applications to repeat form conditions outside
the UI definition. Field, section, and array `className` and `span`, plus
section `columns`, therefore accept the existing synchronous UI resolver
contract as well as static values.

Section columns resolve before child spans. A resolver result outside the
property's public finite type throws `TypeError`; a numeric span that exceeds
the resolved parent column count also throws. Existing static values and
defaults remain unchanged.

Paths, controls, node kinds, children, render components, value policies, and
array item defaults remain static because changing them would alter topology,
typing, serialization, or commands rather than presentation. Arbitrary
`data-*` attributes do not become a core node property; applications pass
typed resolvable data through `slotOptions` and map it onto DOM attributes in
their structural slots.

Tailwind and other framework-specific classes remain an application-owned
escape hatch. Documentation examples use complete literal class sets so build
tools can discover them, while portable definitions can continue to rely on
finite `columns` and `span` values.

This decision supersedes only ADR 0001's consequence that `className` is
static. Its headless ownership boundary, optional structural CSS, and stable
DOM protocol remain in force.

