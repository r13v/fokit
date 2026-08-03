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
	type ResourceState,
	type UiResolver,
} from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { nativeFormKit } from "form-please/preset-native"
import { useState } from "react"
import { z } from "zod"

const profileSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	email: z.email(),
	department: z.string().optional(),
})

type Profile = z.input<typeof profileSchema>

const profileDefinition = nativeFormKit.defineForm(profileSchema, {
	ui: [
		{ kind: "field", path: "name", control: "text", label: "Name" },
		{
			kind: "field",
			path: "email",
			control: "text",
			label: "Email",
			options: { type: "email" },
		},
		{
			kind: "field",
			path: "department",
			control: "text",
			label: "Department",
		},
	],
})

const emptyProfile = {
	id: "profile-1",
	name: "",
	email: "",
	department: undefined,
} satisfies Profile

// [!region composition]
function ProfileForm() {
	const form = nativeFormKit.useForm(profileDefinition, {
		defaultValues: emptyProfile,
	})
	const Field = form.api.Field
	const Subscribe = form.api.Subscribe

	return (
		<nativeFormKit.Form form={form}>
			<nativeFormKit.Fields />
			<Field name="email">
				{(field) => <output>Current email: {field.state.value}</output>}
			</Field>
			<button
				type="button"
				onClick={() => form.api.setFieldValue("department", "Research")}
			>
				Use Research department
			</button>
			<Subscribe selector={(state) => state.isDirty}>
				{(isDirty) => {
					if (isDirty) return <output>Unsaved changes</output>
					return <output>No changes</output>
				}}
			</Subscribe>
			<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
		</nativeFormKit.Form>
	)
}
// [!endregion composition]

// [!region edit-baseline]
function ProfileScreen({ profile }: { readonly profile: Profile | undefined }) {
	if (profile === undefined) return <p>Loading…</p>
	return <ProfileEditor key={profile.id} profile={profile} />
}

function ProfileEditor({ profile }: { readonly profile: Profile }) {
	const form = nativeFormKit.useForm(profileDefinition, {
		defaultValues: profile,
	})
	return (
		<nativeFormKit.AutoForm form={form}>
			<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
		</nativeFormKit.AutoForm>
	)
}
// [!endregion edit-baseline]

async function updateProfile(profile: Profile): Promise<Profile> {
	return profile
}

function getRequestErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	return "The profile could not be saved"
}

// [!region async-submit]
function SavingProfile({ profile }: { readonly profile: Profile }) {
	const [requestError, setRequestError] = useState<string>()
	const form = nativeFormKit.useForm(profileDefinition, {
		defaultValues: profile,
		onSubmit: async ({ value, form }) => {
			setRequestError(undefined)
			try {
				const saved = await updateProfile(value)
				form.api.reset(saved)
			} catch (error) {
				setRequestError(getRequestErrorMessage(error))
			}
		},
	})
	const Subscribe = form.api.Subscribe

	return (
		<nativeFormKit.AutoForm form={form}>
			{requestError !== undefined && <p role="alert">{requestError}</p>}
			<Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => {
					if (isSubmitting) {
						return <output aria-live="polite">Saving…</output>
					}
					return <output aria-live="polite">Ready</output>
				}}
			</Subscribe>
			<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
		</nativeFormKit.AutoForm>
	)
}
// [!endregion async-submit]

// [!region reset-baseline]
function ResettableProfile({ profile }: { readonly profile: Profile }) {
	const form = nativeFormKit.useForm(profileDefinition, {
		defaultValues: profile,
		onSubmit: async ({ value, form }) => {
			const saved = await updateProfile(value)
			form.api.reset(saved)
		},
	})
	const Subscribe = form.api.Subscribe

	return (
		<nativeFormKit.AutoForm form={form}>
			<Subscribe selector={(state) => state.isDirty}>
				{(isDirty) => (
					<button disabled={!isDirty} type="reset">
						Discard changes
					</button>
				)}
			</Subscribe>
			<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
		</nativeFormKit.AutoForm>
	)
}
// [!endregion reset-baseline]

const normalizedProfileSchema = z.object({
	id: z.string(),
	name: z.string().trim().min(1),
	email: z.email().transform((email) => email.toLowerCase()),
})

type NormalizedProfileInput = FormInput<typeof normalizedProfileSchema>
type NormalizedProfileOutput = FormOutput<typeof normalizedProfileSchema>

const normalizedProfileDefinition = nativeFormKit.defineForm(
	normalizedProfileSchema,
	{
		ui: [
			{ kind: "field", path: "name", control: "text", label: "Name" },
			{
				kind: "field",
				path: "email",
				control: "text",
				label: "Email",
				options: { type: "email" },
			},
		],
	},
)

async function saveNormalizedProfile(
	profile: NormalizedProfileOutput,
): Promise<NormalizedProfileInput> {
	return profile
}

// [!region parsed-output]
function NormalizedProfileEditor({
	profile,
}: {
	readonly profile: NormalizedProfileInput
}) {
	const form = nativeFormKit.useForm(normalizedProfileDefinition, {
		defaultValues: profile,
		onSubmit: async ({ value, form }) => {
			// value has trimmed names and lower-case email addresses.
			const savedInput = await saveNormalizedProfile(value)
			// reset requires schema input, not transformed schema output.
			form.api.reset(savedInput)
		},
	})

	return (
		<nativeFormKit.AutoForm form={form}>
			<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
		</nativeFormKit.AutoForm>
	)
}
// [!endregion parsed-output]

type DepartmentOption = {
	readonly value: string
	readonly label: string
}
type DepartmentResource = ResourceState<readonly DepartmentOption[], Error>
type DirectoryContext = {
	readonly departments: DepartmentResource
}
type DirectoryInput = z.input<typeof profileSchema>

const selectDepartments: UiResolver<
	DepartmentResource,
	DirectoryInput,
	DirectoryContext
> = (_values, { context }) => context.departments

const departmentDescription = fromResource(selectDepartments, {
	pending: () => "Loading departments",
	success: ({ value }) => `${value.length} departments available`,
	error: ({ error }) => error.message,
})

const departmentOptions = fromResource(selectDepartments, {
	pending: () => ({
		emptyOption: { label: "Loading departments" },
		options: [],
	}),
	success: ({ value }) => ({
		emptyOption: { label: "Select a department" },
		options: value,
	}),
	error: () => ({
		emptyOption: { label: "Departments unavailable" },
		options: [],
	}),
})

const directoryKit = nativeFormKit.forContext<DirectoryContext>()

// [!region context-resource]
const directoryDefinition = directoryKit.defineForm(profileSchema, {
	ui: [
		{ kind: "field", path: "name", control: "text", label: "Name" },
		{
			kind: "field",
			path: "department",
			control: "select",
			label: "Department",
			description: departmentDescription,
			options: departmentOptions,
			disabled: (_values, { context }) =>
				context.departments.status !== "success",
		},
	],
})

function DirectoryProfile({ context }: { readonly context: DirectoryContext }) {
	const form = directoryKit.useForm(directoryDefinition, {
		defaultValues: emptyProfile,
		context,
	})
	return <directoryKit.AutoForm form={form} />
}
// [!endregion context-resource]

type ProfileMode = "edit" | "read-only" | "disabled"

// [!region form-modes]
function ProfileByMode({
	profile,
	mode,
}: {
	readonly profile: Profile
	readonly mode: ProfileMode
}) {
	const form = nativeFormKit.useForm(profileDefinition, {
		defaultValues: profile,
		disabled: mode === "disabled",
		readOnly: mode === "read-only",
	})

	return (
		<nativeFormKit.AutoForm form={form}>
			{mode === "edit" && (
				<nativeFormKit.Submit>Save profile</nativeFormKit.Submit>
			)}
		</nativeFormKit.AutoForm>
	)
}
// [!endregion form-modes]

type CurrencyOptions = {
	readonly currency: string
}

function CurrencyControl({
	value,
	setValue,
	blur,
	input,
	meta,
	options,
	disabled,
	readOnly,
	required,
}: ControlProps<number | undefined, CurrencyOptions>) {
	return (
		<div>
			<span aria-hidden="true">{options.currency}</span>
			<input
				aria-describedby={input["aria-describedby"]}
				aria-invalid={meta.invalid || undefined}
				disabled={disabled}
				id={input.id}
				name={input.name}
				onBlur={blur}
				onChange={(event) => {
					if (event.currentTarget.value === "") {
						setValue(undefined)
						return
					}
					setValue(event.currentTarget.valueAsNumber)
				}}
				readOnly={readOnly}
				ref={input.ref}
				required={required}
				type="number"
				value={value ?? ""}
			/>
		</div>
	)
}

// [!region accessible-control]
const currency = defineControl<number | undefined, CurrencyOptions>({
	component: CurrencyControl,
})

const billingKit = createFormKit({
	controls: { ...createNativeControls(), currency },
	slots: createDefaultSlots(),
})
// [!endregion accessible-control]
