# Controls and slots

Fokit does not ship themed controls. A form kit is the application's design
system adapter: controls own native elements, and slots own structural markup.

The full reference implementation is `examples/form-kit.tsx`.

## Controls

`defineControl` binds a value type, option type, optional runtime context type,
React component, and FormData policy.

```tsx
export const textControl = defineControl<string | undefined, TextOptions>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		options,
		disabled,
		readOnly,
		required,
	}) {
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
				required={required}
				value={value ?? ""}
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return value === undefined ? [] : [{ name, value }]
		},
	},
})
```

Controls must preserve:

- `input.id`, `input.name`, `input.ref`, and `input["aria-describedby"]`;
- `blur` on native blur;
- `setValue` on value changes;
- `disabled`, `readOnly`, and `required`;
- `meta.invalid` and `meta.displayErrors` for accessible invalid state.

## FormData modes

Use `mode: "native"` when the visual element emits usable native FormData. Add
`serialize` when the value must also be preserved while hidden or disabled.

Use `mode: "hidden"` when the visual control cannot emit a native entry, such
as a segmented control or custom date picker. A serializer is required.

Use `mode: "none"` for client-only values. An active `mode: "none"` field is
valid in classic React submission but incompatible with `ActionForm`.

Serializer entries are:

```ts
{ name: "contacts.0.email", value: "ada@example.test" }
{ kind: "array", name: "contacts" }
```

Fokit normalizes paths and renders array markers as `__fokit.array`.

## Slots

Every kit needs five slots:

- `Field`
- `Section`
- `Array`
- `ArrayItem`
- `ErrorMessage`

Each slot must spread `rootProps` on exactly one root element. `Field` must
connect `labelProps` and `descriptionProps`; `Section` must spread
`layoutProps` around its children; array slots should expose add, remove, and
move controls using the provided actions.

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

`ErrorMessage` receives normalized issue objects. Its `rootProps` include the
data attributes and focus target Fokit needs for submit focus fallback.

## Kit creation

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

`kit.defineForm` validates control names, paths, duplicate IDs, layout ranges,
and value policies. `kit.AutoForm` and `kit.Fields` render the same normalized
definition over the same store contract.
