# Getting started

Fokit is for teams that want schema-validated forms without surrendering the
application design system. You bring controls and slots; Fokit supplies the
typed form store, generated rendering, native FormData parity, validation, and
submission wiring.

## Install

```sh
npm install fokit zod
npm install react react-dom
```

React is a peer dependency with the range `^18.0.0 || ^19.0.0`. The examples
use Zod, but Fokit accepts any schema that implements Standard Schema.

## Import paths

```ts
import { createFormKit, defineControl, useForm } from "fokit"
import { computed, createFormStore } from "fokit/core"
import { parseFormData } from "fokit/server"
import { ActionForm, ActionSubmit } from "fokit/react19"
import "fokit/layout.css"
```

Use `fokit` for React 18-compatible forms. Use `fokit/react19` only in React 19
client code that submits through Actions. Use `fokit/server` in server code.
The CSS file is opt-in and only adds structure.

## The first form

1. Create controls with `defineControl`.
2. Create all five structural slots.
3. Build a kit with `createFormKit`.
4. Define a schema-backed form.
5. Render `kit.AutoForm` or compose `kit.Form` and `kit.Fields`.

The complete reference kit is in `examples/form-kit.tsx`; the complete classic
React form is in `examples/basic-form.tsx`.

```tsx
import { kit, profileDefinition } from "../examples/form-kit.js"

export function ProfileForm() {
	return (
		<kit.AutoForm
			definition={profileDefinition}
			defaultValues={{
				name: "Ada Lovelace",
				kind: "person",
				country: "GB",
				newsletter: true,
				contacts: [{ email: "ada@example.test" }],
			}}
			context={{
				countries: [{ value: "GB", label: "United Kingdom" }],
				locked: false,
			}}
			onSubmit={({ value }) => {
				void value.contactCount
			}}
		>
			<kit.Submit>Save profile</kit.Submit>
		</kit.AutoForm>
	)
}
```

## Runtime context and dynamic options

Use a computed `options` value and read
runtime context:

```ts
options: computed<readonly ["kind"], SelectOptions, ProfileContext, ProfileInput>(
	["kind"] as const,
	(_values, { context }) => ({ options: context.countries }),
)
```

When React replaces the `context` object, Fokit recomputes UI state without
marking values dirty. If the new UI hides a field with `valuePolicy: "unset"`,
Fokit commits that value-policy change as its own value transaction.

## Visibility and value policy

Hidden fields default to `valuePolicy: "preserve"`. The value stays in the
store and, when a serializer exists, can still be represented in FormData.

Use `valuePolicy: "unset"` only for optional paths. When the effective UI hides
that field, Fokit removes its value and records the change before subscribers
see the final state.

Disabled and read-only state are UI state, not data loss. Disabled native
controls need a serializer if an Action form must preserve their value while
they are disabled or invisible.

## Deterministic transactions

All value commands in one batch become one atomic transaction. `beforeUpdate`
can accept, cancel, or replace the proposed changes; `onUpdate` observes the
committed transaction exactly once.

```ts
const form = useForm(profileDefinition, {
	defaultValues,
	context,
	beforeUpdate(event) {
		let changed = false
		const replacement = event.changes.map((change) => {
			if (
				change.type !== "set" ||
				change.path !== "name" ||
				typeof change.value !== "string"
			) {
				return change
			}

			const value = change.value.trimStart()
			changed ||= value !== change.value
			return { ...change, value }
		})

		return changed ? replacement : undefined
	},
	onUpdate(event) {
		void event.values
	},
})
```

## Submission modes

Classic React 18-compatible submission uses `kit.Form`, `kit.AutoForm`, and
`onSubmit`. Fokit validates the store snapshot first, captures native
`FormData`, exposes schema errors, and calls `onSubmit` with typed output.

React 19 Actions use `ActionForm` and `ActionSubmit` from `fokit/react19`.
The native Action remains on the form; validation is server-first through
`parseFormData`, and returned `FormResult` objects are synchronized back into
the hydrated form.

## FormData rules

Every control declares one FormData mode:

- `native`: the visual control emits its own native entry.
- `hidden`: Fokit renders hidden inputs from the serializer.
- `none`: the value is unavailable to Action forms.

Serializers return value entries or array markers. Fokit reserves only
`__fokit.array`; applications should send native `FormData` to
`parseFormData` instead of using `Object.fromEntries`.

Action forms fail before dispatch when an active field cannot be represented:
a `mode: "none"` control is active, or an invisible/disabled native control has
no serializer for preservation.

## Product boundary

Fokit focuses on typed form infrastructure and leaves schema-to-UI inference,
remote JSON form definitions, visual builders, themes, wizards, autosave, async
option loading, devtools, React Native support, and middleware/plugin pipelines
to application code built around its store and slots.
