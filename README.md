# Fokit

Fokit turns a Standard Schema and a typed UI definition into a React form. It
keeps form state, validation, rendering, and `FormData` behavior in one
contract.

Use Fokit when you want reusable typed form definitions without binding them
to a visual theme. Fokit does not infer UI from a schema, provide a form
builder, or style application controls.

Fokit supports React 18 and React 19.

## Install

Install Fokit in an existing React application:

```sh
npm install fokit zod
```

`react` and `react-dom` are peer dependencies. Fokit accepts any Standard
Schema implementation. This example uses Zod.

## Create a form

```tsx
import { createFormKit, nativeControls } from "fokit"
import { z } from "zod"

const contactSchema = z.object({
	email: z.string().email("Enter a valid email"),
})

const kit = createFormKit({
	controls: nativeControls,
})

const contactForm = kit.defineForm(contactSchema)({
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

export function ContactForm() {
	return (
		<kit.AutoForm
			definition={contactForm}
			defaultValues={{ email: "" }}
			onSubmit={({ value }) => console.log(value.email)}
		>
			<kit.Submit>Send</kit.Submit>
		</kit.AutoForm>
	)
}
```

Fokit validates the form with `contactSchema`. The submit handler receives the
schema output after successful validation.

`onSubmit` can return `void` or `Promise<void>`. If it returns a promise, Fokit
waits for the promise and keeps the form in its submitting state. `kit.Submit`
stays disabled until the promise settles. Fokit does not reset the form after
success. Call `form.reset(...)` when saved values must become the new baseline.

## Responsibility boundary

Fokit owns the form store, update pipeline, validation lifecycle, structural
rendering, and native form integration.

You choose the schema and control registry. Your application owns visual
components, styling, data loading, and persistence. A form definition selects
registered controls by name. It does not embed a design system.

## Package entry points

| Import | Purpose |
| --- | --- |
| `fokit` | React form kits, native controls, generated forms, hooks, and shared types |
| `fokit/core` | React-free stores, definitions, paths, UI resolution, and value helpers |
| `fokit/server` | Bounded `FormData` parsing and Standard Schema validation |
| `fokit/react19` | `ActionForm` and `ActionSubmit` for React 19 |
| `fokit/layout.css` | Optional structural grid and spacing CSS |

The main JavaScript entry does not import CSS. Import the structural stylesheet
when you need it:

```ts
import "fokit/layout.css"
```

## Stable defaults

- Omitted slots use unstyled, semantic markup. Built-in array actions use
  English labels.
- Validation defaults are `mode: "submit"`, `revalidateMode: "change"`, and
  `asyncDebounceMs: 0`.
- `parseFormData` defaults are `maxEntries: 1_000`, `maxPathLength: 1_024`,
  `maxDepth: 32`, and `maxArrayIndex: 10_000`.

Apply request, multipart, file-count, and file-size limits before you call
`parseFormData`.

## Agent skill

Install the Fokit skill with [skills](https://github.com/vercel-labs/skills):

```sh
npx skills add r13v/fokit --skill fokit
```

## Documentation

- [LLM documentation index](https://r13v.github.io/fokit/llms.txt)
- [Full documentation for LLMs](https://r13v.github.io/fokit/llms-full.txt)
- [Get started](https://r13v.github.io/fokit/get-started)
- [Build a production form](https://r13v.github.io/fokit/guides/tutorial)
- [Validation and errors](https://r13v.github.io/fokit/guides/validation)
- [React 19 Actions](https://r13v.github.io/fokit/guides/react-19-actions)
- [API reference](https://r13v.github.io/fokit/api)
- [Fokit specification](docs/SPEC.md)
- [Architecture map](docs/ARCHITECTURE.md)
- [Styling boundary](docs/adr/0001-styling-and-layout-boundary.md)
- [Russian tutorial](docs/tutorial.ru.md)
- [Architecture decisions](docs/adr/)
- [Release process](docs/releasing.md)

Canonical, typechecked examples live in
[`form-kit.tsx`](docs-site/src/snippets/form-kit.tsx),
[`basic-form.tsx`](docs-site/src/snippets/basic-form.tsx), and
[`server-action.ts`](docs-site/src/snippets/server-action.ts).

## Kudos

Kudos to [Evgeniy Ivaha](https://github.com/ivahaev) for the idea and the
example implementation.
