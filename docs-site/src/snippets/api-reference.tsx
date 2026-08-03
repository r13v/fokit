// biome-ignore-all lint/correctness/noUnusedImports: Named regions are consumed independently by the documentation.
// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import {
	type ControlProps,
	createFormKit,
	defineControl,
	type FormInput,
	type FormOutput,
	fromResource,
	matchResource,
	type RenderNode,
	type RenderNodeProps,
	type ResourceState,
	type UiResolver,
} from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { createMuiFormKit } from "form-please/preset-mui"
import { nativeFormKit } from "form-please/preset-native"
import { z } from "zod"

// [!region define-control]
type UppercaseOptions = {
	readonly placeholder?: string
}

function UppercaseControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<string | undefined, UppercaseOptions>) {
	return (
		<input
			aria-describedby={input["aria-describedby"]}
			aria-invalid={meta.invalid || undefined}
			disabled={disabled}
			id={input.id}
			name={input.name}
			onBlur={blur}
			onChange={(event) =>
				setValue(event.currentTarget.value.toUpperCase() || undefined)
			}
			placeholder={options.placeholder}
			readOnly={readOnly}
			ref={input.ref}
			required={required}
			value={value ?? ""}
		/>
	)
}

const uppercase = defineControl<string | undefined, UppercaseOptions>({
	component: UppercaseControl,
})
// [!endregion define-control]

// [!region create-form-kit]
const kit = createFormKit({
	controls: {
		...createNativeControls(),
		uppercase,
	},
	slots: createDefaultSlots(),
	grid: [1, 2, 4],
})
// [!endregion create-form-kit]

// [!region native-factories]
const nativeControls = createNativeControls()
const localizedDefaultSlots = createDefaultSlots({
	i18n: {
		arrayAdd: "Add another item",
		arrayRemove: ({ position }) => `Remove item ${position}`,
	},
})
const localizedNativeKit = createFormKit({
	controls: nativeControls,
	slots: localizedDefaultSlots,
})
// [!endregion native-factories]

// [!region default-slot-i18n]
const fullyLocalizedSlots = createDefaultSlots({
	i18n: {
		arrayAdd: ({ label }) => {
			if (typeof label === "string") return `Add ${label}`
			return "Add item"
		},
		arrayRemove: ({ position }) => `Remove item ${position}`,
		arrayMoveUp: ({ position }) => `Move item ${position} up`,
		arrayMoveDown: ({ position }) => `Move item ${position} down`,
	},
})
// [!endregion default-slot-i18n]

// [!region native-preset]
const readyNativeKit = nativeFormKit
// [!endregion native-preset]

// [!region native-control-options]
const preferencesSchema = z.object({
	email: z.string().optional(),
	plan: z.enum(["solo", "team"]).optional(),
	seats: z.number().optional(),
	newsletter: z.boolean(),
})

const preferencesDefinition = nativeFormKit.defineForm(preferencesSchema, {
	ui: [
		{
			kind: "field",
			path: "email",
			control: "text",
			label: "Email",
			options: { type: "email", autoComplete: "email" },
		},
		{
			kind: "field",
			path: "plan",
			control: "select",
			label: "Plan",
			options: {
				emptyOption: { label: "Select a plan" },
				options: [
					{ value: "solo", label: "Solo" },
					{ value: "team", label: "Team" },
				],
			},
		},
		{
			kind: "field",
			path: "seats",
			control: "number",
			label: "Seats",
			options: { min: 1, max: 100, step: 1 },
		},
		{
			kind: "field",
			path: "newsletter",
			control: "checkbox",
			label: "Send product news",
		},
	],
})
// [!endregion native-control-options]

// [!region mui-preset]
const muiKit = createMuiFormKit({
	i18n: {
		addItem: "Add item",
		removeItem: (position) => `Remove item ${position}`,
		moveItemUp: (position) => `Move item ${position} up`,
		moveItemDown: (position) => `Move item ${position} down`,
		chooseFile: "Choose file",
	},
})
// [!endregion mui-preset]

// [!region mui-fields]
const muiSettingsSchema = z.object({
	role: z.string().optional(),
	topics: z.array(z.string()),
	notifications: z.boolean(),
	priority: z.number(),
})

const muiSettingsDefinition = muiKit.defineForm(muiSettingsSchema, {
	ui: [
		{
			kind: "field",
			path: "role",
			control: "select",
			label: "Role",
			options: {
				displayEmpty: true,
				choices: [
					{ value: "developer", label: "Developer" },
					{ value: "designer", label: "Designer" },
				],
			},
		},
		{
			kind: "field",
			path: "topics",
			control: "autocomplete-multiple",
			label: "Topics",
			options: { options: ["React", "TypeScript", "Accessibility"] },
		},
		{
			kind: "field",
			path: "notifications",
			control: "switch",
			label: "Notifications",
		},
		{
			kind: "field",
			path: "priority",
			control: "slider",
			label: "Priority",
			options: { min: 0, max: 10, step: 1 },
		},
	],
})
// [!endregion mui-fields]

const profileSchema = z.object({
	name: z.string().trim().min(1),
	yearsOfExperience: z
		.string()
		.regex(/^\d+$/)
		.transform((value) => Number(value)),
	plan: z.enum(["solo", "team"]),
	teamName: z.string().optional(),
	country: z.string().optional(),
	speakers: z.array(z.object({ name: z.string() })),
})

type CountryResource = ResourceState<readonly string[], Error>
type ProfileContext = {
	readonly countries: CountryResource
	readonly canEditPlan: boolean
}
type ProfileInput = FormInput<typeof profileSchema>

// [!region render-node]
function TeamHint({ disabled, readOnly }: RenderNodeProps) {
	return (
		<p
			data-disabled={disabled || undefined}
			data-readonly={readOnly || undefined}
		>
			Team accounts can invite additional collaborators.
		</p>
	)
}

const teamHint = {
	kind: "render",
	id: "team-hint",
	component: TeamHint,
	visible: (values) => values.plan === "team",
} satisfies RenderNode<ProfileInput, ProfileContext>
// [!endregion render-node]

// [!region resource-resolver]
const selectCountries: UiResolver<
	CountryResource,
	ProfileInput,
	ProfileContext
> = (_values, { context }) => context.countries

const countryDescription = fromResource(selectCountries, {
	pending: () => "Loading countries",
	success: ({ value }, values) =>
		`${value.length} countries available for the ${values.plan} plan`,
	error: ({ error }) => error.message,
})
// [!endregion resource-resolver]

// [!region context-kit]
const profileKit = kit.forContext<ProfileContext>()
// [!endregion context-kit]

// [!region define-form]
const profileDefinition = profileKit.defineForm(profileSchema, {
	ui: [
		{
			kind: "section",
			id: "identity",
			title: "Profile",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "uppercase",
					label: "Display name",
					options: { placeholder: "ADA" },
					required: true,
				},
				{
					kind: "field",
					path: "yearsOfExperience",
					control: "text",
					label: "Years of experience",
				},
				{
					kind: "field",
					path: "plan",
					control: "select",
					label: "Plan",
					readOnly: (_values, { context }) => !context.canEditPlan,
					options: {
						options: [
							{ value: "solo", label: "Solo" },
							{ value: "team", label: "Team" },
						],
					},
				},
				{
					kind: "field",
					path: "teamName",
					control: "text",
					label: "Team name",
					visible: (values) => values.plan === "team",
				},
				teamHint,
				{
					kind: "field",
					path: "country",
					control: "text",
					label: "Country",
					description: countryDescription,
				},
			],
		},
		{
			kind: "array",
			path: "speakers",
			label: "Speakers",
			itemDefault: { name: "" },
			children: [
				{ kind: "field", path: "name", control: "text", label: "Name" },
			],
		},
	],
})
// [!endregion define-form]

const defaultValues = {
	name: "",
	yearsOfExperience: "0",
	plan: "solo",
	teamName: undefined,
	country: undefined,
	speakers: [],
} satisfies ProfileInput

async function saveProfile(_value: FormOutput<typeof profileSchema>) {}

// [!region use-form]
function ProfileEditor({ context }: { readonly context: ProfileContext }) {
	const form = profileKit.useForm(profileDefinition, {
		defaultValues,
		context,
		onSubmit: async ({ value, input, form }) => {
			// `input.yearsOfExperience` is a string from TanStack Form.
			// `value.yearsOfExperience` is the transformed number.
			await saveProfile(value)
			form.api.reset(input)
		},
	})

	return (
		<profileKit.AutoForm form={form}>
			<profileKit.Submit>Save profile</profileKit.Submit>
		</profileKit.AutoForm>
	)
}
// [!endregion use-form]

// [!region form-wide-state]
function ProfileReview({ context }: { readonly context: ProfileContext }) {
	const form = profileKit.useForm(profileDefinition, {
		defaultValues,
		context,
		readOnly: true,
	})

	return (
		<profileKit.Form form={form} aria-label="Profile review">
			<profileKit.Fields />
			<button type="reset">Restore initial values</button>
			<profileKit.Submit disabled>Save profile</profileKit.Submit>
		</profileKit.Form>
	)
}
// [!endregion form-wide-state]

// [!region manual-composition]
function ProfileWithCustomSummary({
	context,
}: {
	readonly context: ProfileContext
}) {
	const form = profileKit.useForm(profileDefinition, {
		defaultValues,
		context,
	})
	const Field = form.api.Field
	const FormGroup = form.api.FormGroup
	const Subscribe = form.api.Subscribe

	return (
		<profileKit.Form form={form}>
			<profileKit.Fields />
			<Field name="plan">
				{(field) => <output>Selected plan: {field.state.value}</output>}
			</Field>
			<FormGroup name="speakers">
				{(group) => <output>Array path: {group.name}</output>}
			</FormGroup>
			<Subscribe selector={(state) => state.isDirty}>
				{(isDirty) => {
					if (isDirty) return <output>Unsaved changes</output>
					return <output>Saved</output>
				}}
			</Subscribe>
			<profileKit.Submit>Save profile</profileKit.Submit>
		</profileKit.Form>
	)
}
// [!endregion manual-composition]

// [!region resources]
function describeCountries(countries: CountryResource) {
	return matchResource(countries, {
		pending: () => "Loading",
		success: ({ value }) => `${value.length} loaded`,
		error: ({ error }) => error.message,
	})
}
// [!endregion resources]

// [!region resource-states]
const pendingCountries: CountryResource = { status: "pending" }
const loadedCountries: CountryResource = {
	status: "success",
	value: ["Canada", "Japan"],
}
const failedCountries: CountryResource = {
	status: "error",
	error: new Error("Country list is unavailable"),
}
// [!endregion resource-states]
