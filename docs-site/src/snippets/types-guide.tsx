// biome-ignore-all lint/correctness/noUnusedImports: Named regions are consumed independently by the documentation.
// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import {
	type ArrayFieldPath,
	type ControlContextOf,
	type ControlOptionsOf,
	type ControlProps,
	type ControlValueOf,
	type CreateFormKitOptions,
	createFormKit,
	type DefineControlInput,
	defineControl,
	type ErrorMessageSlotProps,
	type FieldPath,
	type FormBinding,
	type FormInput,
	type FormKitSlots,
	type FormOutput,
	type FormPleaseStyle,
	type PathValue,
	type ResourceState,
	type UiNode,
	type UseFormOptions,
} from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { nativeFormKit } from "form-please/preset-native"
import { z } from "zod"

const profileSchema = z.object({
	name: z.string().min(1),
	age: z
		.string()
		.regex(/^\d+$/)
		.transform((value) => Number(value)),
	contacts: z.array(z.object({ email: z.string().email() })),
})

// [!region schema-types]
type ProfileInput = FormInput<typeof profileSchema>
// { name: string; age: string; contacts: { email: string }[] }

type ProfileOutput = FormOutput<typeof profileSchema>
// { name: string; age: number; contacts: { email: string }[] }

const defaultValues = {
	name: "Ada Lovelace",
	age: "36",
	contacts: [{ email: "ada@example.com" }],
} satisfies ProfileInput
// [!endregion schema-types]

// [!region path-types]
const contactEmailPath = "contacts[0].email" satisfies FieldPath<ProfileInput>
const contactsPath = "contacts" satisfies ArrayFieldPath<ProfileInput>

type ContactEmail = PathValue<ProfileInput, "contacts[0].email">
// string

type FieldUpdate<Value, Path extends FieldPath<Value>> = {
	readonly path: Path
	readonly value: PathValue<Value, Path>
}

const emailUpdate = {
	path: "contacts[0].email",
	value: "grace@example.com",
} satisfies FieldUpdate<ProfileInput, "contacts[0].email">
// [!endregion path-types]

type ProfileContext = {
	readonly canEdit: boolean
}

const profileKit = nativeFormKit.forContext<ProfileContext>()

// [!region ui-types]
type ProfileNode = UiNode<
	ProfileInput,
	typeof profileKit.controls,
	ProfileContext
>

const profileUi = [
	{
		kind: "field",
		path: "name",
		control: "text",
		label: "Name",
		readOnly: (_values, { context }) => !context.canEdit,
	},
	{
		kind: "array",
		path: "contacts",
		label: "Contacts",
		itemDefault: { email: "" },
		children: [
			{
				kind: "field",
				path: "email",
				control: "text",
				label: "Email",
			},
		],
	},
] satisfies readonly ProfileNode[]

const profileDefinition = profileKit.defineForm(profileSchema, {
	ui: profileUi,
})
// [!endregion ui-types]

type MoneyOptions = {
	readonly min?: number
	readonly currencyLabel: string
}

type MoneyContext = {
	readonly locale: string
}

// [!region control-types]
function MoneyControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	context,
	disabled,
	readOnly,
	required,
}: ControlProps<number | undefined, MoneyOptions, MoneyContext>) {
	return (
		<>
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				lang={context.locale}
				min={options.min}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					const nextValue = event.currentTarget.valueAsNumber
					if (Number.isNaN(nextValue)) {
						setValue(undefined)
						return
					}
					setValue(nextValue)
				}}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				type="number"
				value={value ?? ""}
			/>
			<span aria-hidden="true">{options.currencyLabel}</span>
		</>
	)
}

const moneyInput = {
	component: MoneyControl,
} satisfies DefineControlInput<number | undefined, MoneyOptions, MoneyContext>

const money = defineControl<number | undefined, MoneyOptions, MoneyContext>(
	moneyInput,
)

type MoneyValue = ControlValueOf<typeof money> // number | undefined
type MoneyControlOptions = ControlOptionsOf<typeof money> // MoneyOptions
type RequiredContext = ControlContextOf<typeof money> // MoneyContext
// [!endregion control-types]

// [!region form-types]
const formOptions = {
	defaultValues,
	context: { canEdit: true },
	onSubmit: ({ input, value }) => {
		input.age.toUpperCase() // string
		value.age.toFixed(0) // number
	},
} satisfies UseFormOptions<typeof profileSchema, ProfileContext>

function ProfileForm() {
	const form: FormBinding<typeof profileSchema, ProfileContext> =
		profileKit.useForm(profileDefinition, formOptions)

	return (
		<profileKit.AutoForm aria-label="Profile" form={form}>
			<profileKit.Submit>Save profile</profileKit.Submit>
		</profileKit.AutoForm>
	)
}
// [!endregion form-types]

// [!region slot-types]
function ErrorMessage({ rootProps, issue }: ErrorMessageSlotProps) {
	return (
		<p {...rootProps} role="alert">
			{issue.path !== undefined && `${issue.path}: `}
			{issue.message}
		</p>
	)
}

const controls = createNativeControls()
const slots = {
	...createDefaultSlots(),
	ErrorMessage,
} satisfies FormKitSlots

const kitOptions = {
	controls,
	slots,
	grid: [1, 2, 4],
} satisfies CreateFormKitOptions<typeof controls>

const customKit = createFormKit(kitOptions)

const formStyle = {
	"--fp-row-gap": "1rem",
} satisfies FormPleaseStyle
// [!endregion slot-types]

// [!region resource-type]
type Countries = ResourceState<readonly string[], Error>

function countryCount(resource: Countries) {
	if (resource.status !== "success") return 0
	return resource.value.length
}
// [!endregion resource-type]
