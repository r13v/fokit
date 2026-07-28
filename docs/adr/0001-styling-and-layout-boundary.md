# ADR 0001: Keep styling neutral with optional structural CSS

- Status: Accepted
- Date: 2026-07-28

## Context

The reference implementation relied on Tailwind grid classes, while Fokit
definitions must remain portable across CSS frameworks, design systems, and
page, modal, and sidebar containers.

## Decision

Fokit keeps controls and visual styling in application-owned form kits, stores
only finite layout intent in reusable definitions, and exposes a stable
`rootProps` and `data-*` protocol at structural DOM boundaries. Consumers may
explicitly import `fokit/layout.css` for low-specificity, container-responsive
grid and spacing behavior; the core never imports CSS and the stylesheet is not
a visual theme.

## Considered Options

- Hard-coded Tailwind classes would make one integration convenient but couple
  definitions to a CSS build pipeline and prevent design-system portability.
- A mandatory built-in theme would expand Fokit's UI compatibility surface and
  compete with application styles.
- A completely stylesheet-free package would preserve neutrality but make each
  consumer recreate the same responsive structure.

The optional structural layer preserves a headless integration boundary while
covering the small, repeated layout problem.

## Consequences

- Structural slots must spread mandatory `rootProps` onto one DOM root;
  `Section` must also place `layoutProps` on a descendant grid element.
- Public data attributes and CSS variables are versioned API.
- Definitions can use finite `columns` and `span` values plus a static,
  additive `className`, but do not store framework-specific layout classes.
- `fokit/layout.css` contains only grid, spacing, spans, and container-query
  rules. Controls, colors, typography, resets, and focus styling remain
  application responsibilities.
