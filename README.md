# Form, Please

<p align="center">
  <img src="docs-site/public/brand/form-please-logo.png" alt="Form, Please logo: Hermes Conrad holding a 'Form, Please' coffee mug" width="220" />
</p>

Form, Please turns a Standard Schema and a typed UI definition into a React
form. TanStack Form owns state, validation, subscriptions, and array updates.
Your controls and slots own the rendered design system.

React 18 and React 19 are supported.

## Install

```sh
npm install form-please @tanstack/react-form zod
```

Form, Please accepts any Standard Schema implementation. This example uses Zod.

## Create a form

```tsx
import { nativeFormKit as kit } from "form-please/preset-native"
import { z } from "zod"

const contactSchema = z
	.object({
		email: z.string().email("Enter a valid email"),
	})
	.transform((input) => ({ ...input, normalizedEmail: input.email.trim() }))

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

export function ContactForm() {
	const form = kit.useForm(contactForm, {
		defaultValues: { email: "" },
		onSubmit({ value }) {
			console.log(value.normalizedEmail)
		},
	})

	return (
		<kit.AutoForm form={form}>
			<kit.Submit>Send</kit.Submit>
		</kit.AutoForm>
	)
}
```

Use `form.api.Field`, `form.api.FormGroup`, and `form.api.Subscribe` for direct
TanStack Form composition.

## Runtime behavior

- The Standard Schema validates on submit, then on change after the first
  submit.
- A successful submit parses the schema a second time to obtain transformed
  output. This follows the TanStack Form recommendation and does not add a
  validation cache.
- UI resolvers receive the complete deeply readonly schema input and runtime
  context. They must be synchronous.
- Hidden fields preserve their values.
- Array rows use index identity and TanStack bracket paths.
- Invalid submit focuses the first invalid visible generated control that can
  receive focus, or a focusable error summary when no generated control can.
- A definition is fixed for the `useForm` hook lifetime. Use a React `key` to
  remount with another definition.

## Package entries

| Import | Purpose |
| --- | --- |
| `form-please` | Form-kit construction, controls, resources, and shared types |
| `form-please/default-slots` | Accessible structural slots and localization types |
| `form-please/native-controls` | Native HTML controls and option types |
| `form-please/preset-native` | Ready-to-use native form kit |
| `form-please/preset-mui` | Material UI 9 form-kit factory |
| `form-please/layout.css` | Optional structural grid and spacing CSS |

The main JavaScript entry does not import CSS.

```ts
import "form-please/layout.css"
```

The Material UI preset requires `@mui/material`, `@emotion/react`, and
`@emotion/styled`.

## Resources

`ResourceState`, `matchResource`, and `fromResource` map application-owned
request state into synchronous form UI. Form, Please does not own fetching,
caching, cancellation, or retries.

## Documentation

- [Get started](https://r13v.github.io/form-please/get-started)
- [API reference](https://r13v.github.io/form-please/api)
- [Shadcn registry adapter](https://r13v.github.io/form-please/examples/shadcn-valibot)
- [Architecture map](docs/ARCHITECTURE.md)
- [LLM documentation index](https://r13v.github.io/form-please/llms.txt)
- [Full documentation for LLMs](https://r13v.github.io/form-please/llms-full.txt)

The physical, typechecked example lives in
[`profile-form.tsx`](docs-site/src/snippets/profile-form.tsx).

## Kudos

Kudos to [Evgeniy Ivaha](https://github.com/ivahaev) for the idea and the
example implementation.
