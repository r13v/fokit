# Styling and layout

Fokit ships optional structural CSS, not a visual theme. Applications own
colors, typography, borders, spacing rhythm, and control styling.

Import the layout file explicitly:

```ts
import "fokit/layout.css"
```

The JavaScript entries do not import CSS.

## What the CSS does

The stylesheet uses low-specificity `:where(...)` rules in `@layer fokit`.
It reads Fokit data attributes and provides:

- stacked form, section, field, array, and array-item structure;
- section grid layout;
- one, two, three, and four effective columns through container queries at
  `40rem` and `64rem`;
- span handling, including `span: "full"`;
- independent nested containers.

## Custom properties

Only these variables are public:

```css
.profile-form {
	--fokit-column-gap: 1rem;
	--fokit-row-gap: 0.75rem;
	--fokit-stack-gap: 0.75rem;
	--fokit-array-item-gap: 0.75rem;
}
```

Fokit does not define colors, fonts, borders, shadows, focus rings, or control
appearance.

## Data attributes

Generated forms and slots expose stable attributes such as:

- `data-fokit-node="form"`
- `data-fokit-node="field"`
- `data-fokit-node="section"`
- `data-fokit-node="array"`
- `data-fokit-layout="grid"`
- `data-fokit-columns="1" | "2" | "3" | "4"`
- `data-dirty`, `data-touched`, `data-invalid`, `data-disabled`,
  `data-readonly`, `data-validating`

Boolean data attributes are omitted when false.

## Styling boundary

Use Fokit's structural attributes for layout selectors, then style your design
system classes normally. Do not depend on internal DOM order beyond the slot
props you render yourself.

Deferred styling work stays outside v1: themes, CSS-in-JS adapters, generated
tokens, animation presets, and component libraries.
