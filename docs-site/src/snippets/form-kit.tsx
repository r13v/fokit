import {
	type ArrayItemSlotProps,
	type ArraySlotProps,
	type ControlProps,
	computed,
	createFormKit,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldSlotProps,
	type FormInput,
	type FormOutput,
	type SectionSlotProps,
} from "fokit"
import { z } from "zod"

export type SelectOption = {
	readonly value: string
	readonly label: string
}

export type TextOptions = {
	readonly placeholder?: string
	readonly autoComplete?: string
}

export type SelectOptions = {
	readonly options: readonly SelectOption[]
}

export type ProfileContext = {
	readonly countries: readonly SelectOption[]
	readonly locked: boolean
}

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

export type ProfileInput = FormInput<typeof profileSchema>
export type ProfileOutput = FormOutput<typeof profileSchema>

export const defaultCountries = [
	{ value: "GB", label: "United Kingdom" },
	{ value: "US", label: "United States" },
	{ value: "NL", label: "Netherlands" },
] as const satisfies readonly SelectOption[]

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
	}: ControlProps<string | undefined, TextOptions>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				autoComplete={options.autoComplete}
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

export const selectControl = defineControl<
	string,
	SelectOptions,
	ProfileContext
>({
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
	}: ControlProps<string, SelectOptions, ProfileContext>) {
		return (
			<select
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				aria-readonly={readOnly || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					if (readOnly) {
						event.preventDefault()
						event.currentTarget.value = value
						return
					}

					setValue(event.currentTarget.value)
				}}
				onKeyDown={(event) => {
					if (readOnly && isSelectMutationKey(event.key)) {
						preventReadOnlyEvent(event)
					}
				}}
				onMouseDown={(event) => {
					if (readOnly) {
						preventReadOnlyEvent(event)
					}
				}}
				ref={input.ref}
				required={required}
				value={value}
			>
				{options.options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return [{ name, value }]
		},
	},
})

export const checkboxControl = defineControl<boolean>({
	component({
		value,
		setValue,
		blur,
		input,
		meta,
		disabled,
		readOnly,
	}: ControlProps<boolean>) {
		return (
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				aria-readonly={readOnly || undefined}
				checked={value}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					if (readOnly) {
						event.preventDefault()
						event.currentTarget.checked = value
						return
					}

					setValue(event.currentTarget.checked)
				}}
				onClick={(event) => {
					if (readOnly) {
						preventReadOnlyEvent(event)
					}
				}}
				onKeyDown={(event) => {
					if (readOnly && isActivationKey(event.key)) {
						preventReadOnlyEvent(event)
					}
				}}
				ref={input.ref}
				type="checkbox"
				value="true"
			/>
		)
	},
	formData: {
		mode: "native",
		serialize(value, { name }) {
			return [{ name, value: value ? "true" : "false" }]
		},
	},
})

function preventReadOnlyEvent(event: {
	preventDefault(): void
	stopPropagation(): void
}) {
	event.preventDefault()
	event.stopPropagation()
}

function isSelectMutationKey(key: string) {
	return [
		" ",
		"Enter",
		"ArrowDown",
		"ArrowUp",
		"End",
		"Home",
		"PageDown",
		"PageUp",
	].includes(key)
}

function isActivationKey(key: string) {
	return key === " " || key === "Enter"
}

function FieldSlot({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	control,
	errors,
	disabled,
	readOnly,
	required,
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
			<div
				data-disabled={disabled || undefined}
				data-readonly={readOnly || undefined}
				data-required={required || undefined}
			>
				{control}
			</div>
			{errors}
		</div>
	)
}

function SectionSlot({
	rootProps,
	layoutProps,
	title,
	description,
	children,
}: SectionSlotProps) {
	return (
		<section {...rootProps}>
			{title === undefined ? null : <h2>{title}</h2>}
			{description === undefined ? null : <p>{description}</p>}
			<div {...layoutProps}>{children}</div>
		</section>
	)
}

function ArraySlotComponent({
	rootProps,
	label,
	labelProps,
	description,
	descriptionProps,
	errors,
	invalid,
	canAdd,
	add,
	children,
}: ArraySlotProps) {
	return (
		<div {...rootProps}>
			{label === undefined ? null : <div {...labelProps}>{label}</div>}
			{description === undefined ? null : (
				<p {...descriptionProps}>{description}</p>
			)}
			{errors}
			<div data-invalid={invalid || undefined}>{children}</div>
			<button disabled={!canAdd} type="button" onClick={add}>
				Add contact
			</button>
		</div>
	)
}

function ArrayItemSlot({
	rootProps,
	index,
	disabled,
	readOnly,
	canMoveUp,
	canMoveDown,
	remove,
	move,
	children,
}: ArrayItemSlotProps) {
	return (
		<div {...rootProps}>
			{children}
			<button
				disabled={disabled || readOnly || !canMoveUp}
				type="button"
				onClick={() => move(index - 1)}
			>
				Move up
			</button>
			<button
				disabled={disabled || readOnly || !canMoveDown}
				type="button"
				onClick={() => move(index + 1)}
			>
				Move down
			</button>
			<button disabled={disabled || readOnly} type="button" onClick={remove}>
				Remove
			</button>
		</div>
	)
}

function ErrorMessageSlot({ rootProps, issue }: ErrorMessageSlotProps) {
	return <p {...rootProps}>{issue.message}</p>
}

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

const profileKindOptions = [
	{ value: "person", label: "Person" },
	{ value: "company", label: "Company" },
] as const satisfies readonly SelectOption[]

export const profileDefinition = kit.defineForm<ProfileContext>()({
	schema: profileSchema,
	ui: [
		{
			kind: "section",
			id: "profile",
			title: "Profile",
			description: "The fields your product needs to save.",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
					description: "Use the public display name.",
					required: true,
					options: {
						placeholder: "Ada Lovelace",
						autoComplete: "name",
					},
				},
				{
					kind: "field",
					path: "kind",
					control: "select",
					label: "Profile type",
					required: true,
					options: {
						options: profileKindOptions,
					},
				},
				{
					kind: "field",
					path: "companyName",
					control: "text",
					label: "Company name",
					visible: computed<
						readonly ["kind"],
						boolean,
						ProfileContext,
						ProfileInput
					>(["kind"] as const, ({ kind }) => kind === "company"),
					valuePolicy: "unset",
					options: {
						placeholder: "Analytical Engines Ltd.",
					},
				},
				{
					kind: "field",
					path: "country",
					control: "select",
					label: "Country",
					required: true,
					options: computed<
						readonly ["kind"],
						SelectOptions,
						ProfileContext,
						ProfileInput
					>(["kind"] as const, (_values, { context }) => ({
						options: context.countries,
					})),
				},
				{
					kind: "field",
					path: "newsletter",
					control: "checkbox",
					label: "Receive product news",
				},
			],
		},
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			description: "Add one or more reachable email addresses.",
			itemDefault: {
				email: "",
			},
			children: [
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Email",
					required: true,
					options: {
						placeholder: "ada@example.test",
						autoComplete: "email",
					},
				},
				{
					kind: "field",
					path: "label",
					control: "text",
					label: "Label",
					valuePolicy: "unset",
					options: {
						placeholder: "work",
					},
				},
			],
		},
	],
})
