// biome-ignore-all lint/correctness/noUnusedVariables: Named regions are consumed independently by the documentation.
"use client"

import { createFormKit, type FormInput } from "form-please"
import { createDefaultSlots } from "form-please/default-slots"
import { createNativeControls } from "form-please/native-controls"
import { z } from "zod"

const kit = createFormKit({
	controls: createNativeControls(),
	slots: createDefaultSlots(),
})

// [!region define-array]
const contactsSchema = z.object({
	contacts: z
		.array(
			z.object({
				id: z.string(),
				email: z.email("Enter a valid email"),
				label: z.string().optional(),
			}),
		)
		.min(1, "Add at least one contact"),
})

const contactDefaultValues = {
	contacts: [{ id: "contact-1", email: "ada@example.com", label: "Primary" }],
} satisfies FormInput<typeof contactsSchema>

const contactsDefinition = kit.defineForm(contactsSchema, {
	ui: [
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			description: "Add, reorder, or remove contacts.",
			itemDefault: () => ({
				id: crypto.randomUUID(),
				email: "",
				label: undefined,
			}),
			children: [
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Email",
					required: true,
				},
				{
					kind: "field",
					path: "label",
					control: "text",
					label: "Label",
				},
			],
		},
	],
})
// [!endregion define-array]

// [!region nested-array]
const conferenceSchema = z.object({
	speakers: z.array(
		z.object({
			name: z.string(),
			sessions: z.array(z.object({ title: z.string() })),
		}),
	),
})

const conferenceDefinition = kit.defineForm(conferenceSchema, {
	ui: [
		{
			kind: "array",
			path: "speakers",
			label: "Speakers",
			itemDefault: { name: "", sessions: [] },
			children: [
				{ kind: "field", path: "name", control: "text", label: "Name" },
				{
					kind: "array",
					path: "sessions",
					label: "Sessions",
					itemDefault: { title: "" },
					children: [
						{
							kind: "field",
							path: "title",
							control: "text",
							label: "Title",
						},
					],
				},
			],
		},
	],
})
// [!endregion nested-array]

// [!region array-validation]
const uniqueContactsSchema = z
	.object({
		contacts: z
			.array(z.object({ email: z.email("Enter a valid email") }))
			.min(1, "Add at least one contact"),
	})
	.superRefine(({ contacts }, context) => {
		const seen = new Set<string>()

		for (const [index, contact] of contacts.entries()) {
			const email = contact.email.toLowerCase()
			if (seen.has(email)) {
				context.addIssue({
					code: "custom",
					message: "Use a unique email",
					path: ["contacts", index, "email"],
				})
			}
			seen.add(email)
		}
	})
// [!endregion array-validation]

function createContact() {
	return {
		id: crypto.randomUUID(),
		email: "",
		label: undefined,
	}
}

// [!region custom-operations]
export function ContactsForm() {
	const form = kit.useForm(contactsDefinition, {
		defaultValues: contactDefaultValues,
	})
	const Field = form.api.Field

	return (
		<kit.Form form={form}>
			<kit.Fields />

			<Field name="contacts" mode="array">
				{(field) => (
					<fieldset>
						<legend>Contact actions</legend>
						<button
							type="button"
							onClick={() => field.insertValue(0, createContact())}
						>
							Add primary contact
						</button>
						<button
							disabled={field.state.value.length < 2}
							type="button"
							onClick={() => field.moveValue(field.state.value.length - 1, 0)}
						>
							Move last contact first
						</button>
						<button
							disabled={field.state.value.length === 0}
							type="button"
							onClick={() => field.clearValues()}
						>
							Remove all contacts
						</button>
					</fieldset>
				)}
			</Field>

			<kit.Submit>Save contacts</kit.Submit>
		</kit.Form>
	)
}
// [!endregion custom-operations]
