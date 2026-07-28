# Tutorial: build a Fokit profile form

This tutorial takes about 15 minutes. It builds one profile form with a schema,
application-owned controls, all five slots, generated fields, validation,
classic React submission, conditional UI, arrays, manual subscriptions, server
FormData parsing, React 19 Actions, and optional layout CSS.

The complete code is split across:

- `examples/form-kit.tsx`
- `examples/basic-form.tsx`
- `examples/server-action.ts`

## 1. Install

After the reviewed v1 release is published:

```sh
npm install fokit zod
npm install react react-dom
```

The current npm `fokit@0.0.1` package is only a pre-implementation placeholder.
Use the repository build or reviewed release artifact until the release task
verifies npm and GitHub Pages.

## 2. Define the schema

Fokit reads input and output types from Standard Schema. Zod works because it
implements that contract.

```ts
export const profileSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		kind: z.enum(["person", "company"]),
		companyName: z.string().optional(),
		country: z.string().min(2, "Choose a country"),
		newsletter: z.boolean(),
		contacts: z.array(
			z.object({
				email: z.string().email("Use a valid email"),
				label: z.string().optional(),
			}),
		),
	})
	.transform((input) => ({
		...input,
		contactCount: input.contacts.length,
	}))
```

`FormInput<typeof profileSchema>` is the editable store shape. The submit
handler receives the transformed output with `contactCount`.

## 3. Own the controls

Controls are ordinary React components. Fokit gives each control typed value,
metadata, ARIA wiring, and a FormData policy.

```tsx
export const textControl = defineControl<string | undefined, TextOptions>({
	component({ value, setValue, blur, input, meta, options, disabled, readOnly }) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => setValue(event.currentTarget.value)}
				placeholder={options.placeholder}
				readOnly={readOnly}
				ref={input.ref}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize: (value, { name }) =>
			value === undefined ? [] : [{ name, value }],
	},
})
```

Preserve `input.id`, `input.name`, `input.ref`, and
`input["aria-describedby"]`. Set `aria-invalid` from `meta.invalid`, call
`blur` on native blur, and call `setValue` on edits.

## 4. Own all five slots

A kit needs `Field`, `Section`, `Array`, `ArrayItem`, and `ErrorMessage`.
Slots spread Fokit props onto your markup and classes.

```tsx
function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
}: FieldSlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : (
				<label {...labelProps} htmlFor={labelProps.htmlFor}>
					{label}
				</label>
			)}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{control}
			{errors}
		</div>
	)
}
```

The full slot set in `examples/form-kit.tsx` keeps root prop preservation,
labels, descriptions, errors, array add/remove/move buttons, and generated
layout props intact.

## 5. Create the kit and definition

```ts
export const kit = createFormKit({
	controls: {
		text: textControl,
		select: selectControl,
		checkbox: checkboxControl,
	},
	slots: {
		Field: FieldSlot,
		Section: SectionSlot,
		Array: ArraySlotComponent,
		ArrayItem: ArrayItemSlot,
		ErrorMessage: ErrorMessageSlot,
	},
})
```

The form definition binds schema paths to controls:

```ts
export const profileDefinition = kit.defineForm<ProfileContext>()({
	schema: profileSchema,
	ui: [
		{
			kind: "field",
			path: "name",
			control: "text",
			label: "Name",
			required: true,
		},
		{
			kind: "field",
			path: "companyName",
			control: "text",
			label: "Company name",
			visible: computed(["kind"] as const, ({ kind }) => kind === "company"),
			valuePolicy: "unset",
		},
	],
})
```

`valuePolicy: "unset"` is allowed only for optional paths. When the field is no
longer visible, Fokit removes the value in the same transaction model as user
edits.

## 6. Dynamic options are computed options

There is no separate `dynamicOptions` API. Put a computed value in `options`
and read runtime context.

```ts
options: computed<readonly ["kind"], SelectOptions, ProfileContext, ProfileInput>(
	["kind"] as const,
	(_values, { context }) => ({ options: context.countries }),
)
```

Replacing context recomputes UI without marking the form dirty. If the new UI
triggers `valuePolicy: "unset"`, Fokit commits that value change separately.

## 7. Render AutoForm

`kit.AutoForm` creates the form store, renders all generated fields, validates
on submit by default, and calls `onSubmit` with typed output.

```tsx
<kit.AutoForm
	definition={profileDefinition}
	defaultValues={defaultValues}
	context={context}
	validation={{ mode: "blur", revalidateMode: "change" }}
	onSubmit={({ value, formData }) => {
		void value.contactCount
		void formData
	}}
>
	<kit.Submit>Save profile</kit.Submit>
</kit.AutoForm>
```

Use this for the common generated form path.

## 8. Compose manually when needed

Manual composition uses the same instance:

```tsx
const form = useForm(profileDefinition, {
	defaultValues,
	context,
	onSubmit({ value }) {
		void value.contactCount
	},
})

return (
	<kit.Form form={form}>
		<kit.Fields />
		<ProfileStatus form={form} />
		<kit.Submit>Save profile</kit.Submit>
	</kit.Form>
)
```

Use `useValue`, `useField`, `useArrayField`, and `useFormState` for granular
subscriptions. Array bindings expose stable row keys, so generated rows keep
identity through append, insert, remove, and move.

## 9. Use transactions deliberately

`beforeUpdate` sees the complete proposed transaction. Return `false` to
cancel it, return replacement changes to rewrite it, or return `undefined` to
accept it. `onUpdate` runs once after commit.

```ts
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
}
```

Value-policy changes, array commands, reset, and manual commands all use the
same deterministic transaction pipeline.

## 10. Parse FormData on the server

Send native `FormData` to `parseFormData`. It rejects unsafe paths and reserved
metadata before schema validation.

```ts
const result = await parseFormData(formData, profileActionSchema)

if (!result.success) {
	return result.reply()
}

return { status: "success", reset: "submitted" }
```

Fokit uses dot paths and array markers named `__fokit.array`. Do not decode
submission data with `Object.fromEntries`; repeated values and array markers
carry structure.

## 11. Use React 19 Actions separately

React 19 Actions are isolated:

```tsx
import { ActionForm, ActionSubmit } from "fokit/react19"

<ActionForm
	action={saveProfileAction}
	defaultValues={defaultValues}
	definition={profileDefinition}
	kit={kit}
	result={state}
>
	<ActionSubmit>Save profile</ActionSubmit>
</ActionForm>
```

Action forms are server-first. Fokit does not run client validation before
dispatch. The server Action returns a serializable `FormResult`, and the
hydrated form applies those errors or reset instructions.

`ActionForm` throws before dispatch if an active value cannot be represented in
FormData: `mode: "none"` controls are active, or hidden/disabled native
controls lack serializers.

## 12. Add layout only when wanted

```ts
import "fokit/layout.css"
```

The stylesheet uses `@layer fokit`, `:where(...)`, container queries, and four
spacing variables. It does not style colors, type, borders, focus rings, or
controls.

## 13. Test the examples

This repository typechecks copyable examples with:

```sh
npm run test:docs
```

Run `npm run check` and `npm run knip` before reporting documentation changes
done.

## What v1 intentionally does not include

V1 does not include schema-to-UI inference, a visual builder, remote JSON form
definitions, a theme, middleware chains, wizards, autosave, async option
loading, devtools, or React Native support. Keep those in application code
until they are concrete.
