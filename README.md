# Form, Please

<p align="center">
  <img src="docs-site/public/brand/form-please-logo.png" alt="Form, Please logo: Hermes Conrad holding a 'Form, Please' coffee mug" width="220" />
</p>

Form, Please turns a Standard Schema and a UI definition into a working
React form with typed output. It handles state, validation, and submission while
your application keeps control of components, markup, styling, and product logic.

Start with native controls or bring your own design system.

Form, Please supports React 18 and React 19.

## Install

Install `form-please` in an existing React application:

```sh
npm install form-please zod
```

`react` and `react-dom` are peer dependencies. Form, Please accepts any Standard
Schema implementation. This example uses Zod.

To use the optional Material UI preset, install its peer dependencies:

```sh
npm install @mui/material @emotion/react @emotion/styled
```

## Create a form

```tsx
import type { FormMiddleware } from "form-please"
import { nativeFormKit as kit } from "form-please/preset-native"
import { z } from "zod"

const contactSchema = z.object({
	email: z.string().email("Enter a valid email"),
})

const contactForm = kit.defineForm(contactSchema, {
	ui: [
		{
			kind: "field",
			path: "email",
			control: "text",
			label: "Email",
			options: { type: "email" },
		},
	],
})

const logTransactions: FormMiddleware<{ email: string }, unknown> =
	() => (next) => (transaction) => {
	console.log(transaction.type)
	return next(transaction)
}

export function ContactForm() {
	const form = kit.useCreateForm(contactForm, {
		defaultValues: { email: "" },
		middleware: [logTransactions],
	})

	return (
		<kit.AutoForm
			form={form}
			onSubmit={({ value }) => console.log(value.email)}
		>
			<kit.Submit>Send</kit.Submit>
		</kit.AutoForm>
	)
}
```

Form, Please validates the form with `contactSchema`. The submit handler receives the
schema output after successful validation.

Larger definitions can compose typed `UiNode` arrays with absolute paths.
Render nodes can derive visibility and receive inherited `disabled` and
`readOnly` state. Imperative workflows can validate typed path groups with
`validatePaths(...)` and focus the first displayed issue with
`focusFirstError(...)` without adding a wizard engine.

`onSubmit` can return `void` or `Promise<void>`. If it returns a promise, Form, Please
waits for the promise and keeps the form in its submitting state. `kit.Submit`
stays disabled until the promise settles. Form, Please does not reset the form after
success. Call `form.reset(...)` when saved values must become the new baseline.

Register `slots.Submit` when a design-system button needs different markup.
The slot receives owned `buttonProps`, `isSubmitting`, and the immutable
current input `values`; schema transformation still happens only during
validation and submission.

## Responsibility boundary

Form, Please owns the form store, update pipeline, validation lifecycle, structural
rendering, and native form integration.

You choose the schema and control registry. Your application owns visual
components, styling, data loading, storage transport, authorization, server
retention, and conflict policy. When configured, Form, Please owns draft
encoding, migration, hydration, and save scheduling. A form definition selects
registered controls by name. It does not embed a design system.

## Package entry points

| Import | Purpose |
| --- | --- |
| `form-please` | React form-kit construction, generated forms, hooks, and shared types |
| `form-please/core` | React-free stores, definitions, paths, UI resolution, and value helpers |
| `form-please/default-slots` | Accessible structural slot factory and localization types |
| `form-please/native-controls` | Native HTML control factory and option types |
| `form-please/preset-native` | Ready native form kit with accessible English default slots |
| `form-please/preset-mui` | Material UI 9 controls, structural slots, and a 12-column grid |
| `form-please/server` | Bounded `FormData` parsing and Standard Schema validation |
| `form-please/react19` | `ActionForm` and `ActionSubmit` for React 19 |
| `form-please/history` | Optional history, event journals, and deterministic replay |
| `form-please/persistence` | Optional persistence, codecs, and local storage adapter |
| `form-please/devtools` | Optional constrained Redux DevTools integration |
| `form-please/layout.css` | Optional structural grid and spacing CSS |

The main JavaScript entry does not import CSS. Import the structural stylesheet
when you need it:

```ts
import "form-please/layout.css"
```

## Stable defaults

- `createFormKit` requires a complete slot registry.
- Form kits default to the finite `[1, 2, 3, 4]` grid scale. Pass `grid` to
  integrate another design-system vocabulary; custom values need
  application-owned structural CSS or slots.
- `createDefaultSlots()` provides unstyled semantic markup and English array
  action labels.
- Validation defaults are `mode: "submit"`, `revalidateMode: "change"`, and
  `asyncDebounceMs: 0`.
- `parseFormData` defaults are `maxEntries: 1_000`, `maxPathLength: 1_024`,
  `maxDepth: 32`, and `maxArrayIndex: 10_000`.

Apply request, multipart, file-count, and file-size limits before you call
`parseFormData`.

## Agent skill

Install the Form, Please skill with [skills](https://github.com/vercel-labs/skills):

```sh
npx skills add r13v/form-please --skill form-please
```

## Documentation

- [LLM documentation index](https://r13v.github.io/form-please/llms.txt)
- [Full documentation for LLMs](https://r13v.github.io/form-please/llms-full.txt)
- [Get started](https://r13v.github.io/form-please/get-started)
- [Build a production form](https://r13v.github.io/form-please/guides/tutorial)
- [Validation and errors](https://r13v.github.io/form-please/guides/validation)
- [Async fields](https://r13v.github.io/form-please/guides/async-fields)
- [React 19 Actions](https://r13v.github.io/form-please/guides/react-19-actions)
- [History and journals](https://r13v.github.io/form-please/guides/history)
- [Persistence](https://r13v.github.io/form-please/guides/persistence)
- [Redux DevTools](https://r13v.github.io/form-please/guides/devtools)
- [API reference](https://r13v.github.io/form-please/api)
- [Architecture map](docs/ARCHITECTURE.md)
- [Styling boundary](docs/adr/0001-styling-and-layout-boundary.md)
- [Architecture decisions](docs/adr/)

Canonical, typechecked examples live in
[`form-kit.tsx`](docs-site/src/snippets/form-kit.tsx),
[`basic-form.tsx`](docs-site/src/snippets/basic-form.tsx), and
[`server-action.ts`](docs-site/src/snippets/server-action.ts).

## Kudos

Kudos to [Evgeniy Ivaha](https://github.com/ivahaev) for the idea and the
example implementation.
