import {
	type FormInstance,
	useArrayField,
	useForm,
	useFormState,
	useValue,
} from "fokit"

import {
	defaultCountries,
	kit,
	type ProfileContext,
	type ProfileInput,
	type ProfileOutput,
	profileDefinition,
	type profileSchema,
} from "./form-kit.js"

const defaultValues = {
	name: "Ada Lovelace",
	kind: "person",
	country: "GB",
	newsletter: true,
	contacts: [{ email: "ada@example.test" }],
} satisfies ProfileInput

const context = {
	countries: defaultCountries,
	locked: false,
} satisfies ProfileContext

type ProfileForm = FormInstance<typeof profileSchema, ProfileContext>

export function ProfileEditor({
	onSaved = () => undefined,
}: {
	readonly onSaved?: (profile: ProfileOutput) => void
}) {
	const form = useForm(profileDefinition, {
		defaultValues,
		context,
		validation: {
			mode: "blur",
			revalidateMode: "change",
		},
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
			void event.source
		},
		onSubmit({ value }) {
			onSaved(value)
		},
	})

	return (
		<kit.Form form={form} className="profile-form">
			<kit.Fields />
			<ProfileStatus form={form} />
			<ContactToolbar form={form} />
			<kit.Submit>Save profile</kit.Submit>
		</kit.Form>
	)
}

function ProfileStatus({ form }: { readonly form: ProfileForm }) {
	const kind = useValue(form, "kind")
	const state = useFormState(form, (snapshot) => ({
		dirty: snapshot.isDirty,
		touched: snapshot.isTouched,
		validationStatus: snapshot.validationStatus,
		formErrors: snapshot.displayErrors.form.length,
	}))

	return (
		<output aria-live="polite">
			{kind} profile, dirty {String(state.dirty)}, touched{" "}
			{String(state.touched)}, validation {state.validationStatus}, form errors{" "}
			{state.formErrors}
		</output>
	)
}

function ContactToolbar({ form }: { readonly form: ProfileForm }) {
	const contacts = useArrayField(form, "contacts")

	return (
		<div>
			<button
				type="button"
				onClick={() => contacts.append({ email: "", label: undefined })}
			>
				Add contact manually
			</button>
			<output>
				Stable rows: {contacts.items.map((item) => item.key).join(", ")}
			</output>
		</div>
	)
}
