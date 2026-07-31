"use client"

import {
	createDefaultSlots,
	createFormKit,
	type FormInput,
	type FormOutput,
	nativeControls,
} from "fokit"
import { useState } from "react"
import { z } from "zod"

const profileSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		accountType: z.enum(["personal", "company"]),
		companyName: z.string().optional(),
		country: z.string().min(2, "Choose a country"),
		newsletter: z.boolean(),
		avatar: z
			.custom<File | undefined>(
				(value) =>
					value === undefined ||
					(typeof File !== "undefined" && value instanceof File),
				"Choose a browser File",
			)
			.optional(),
		contacts: z
			.array(
				z.object({
					email: z.string().email("Use a valid email"),
					label: z.string().optional(),
				}),
			)
			.min(1, "Add at least one contact"),
	})
	.superRefine((value, context) => {
		if (
			value.accountType === "company" &&
			(value.companyName ?? "").trim().length === 0
		) {
			context.addIssue({
				code: "custom",
				message: "Company name is required",
				path: ["companyName"],
			})
		}
	})
	.transform((value) => ({
		...value,
		companyName:
			value.companyName === undefined || value.companyName.trim() === ""
				? undefined
				: value.companyName.trim(),
		contactCount: value.contacts.length,
	}))

export type ProfileOutput = FormOutput<typeof profileSchema>

export const defaultValues = {
	name: "Ada Lovelace",
	accountType: "personal",
	country: "GB",
	newsletter: true,
	contacts: [{ email: "ada@example.com", label: "primary" }],
} satisfies FormInput<typeof profileSchema>

const countryOptions = [
	{ value: "GB", label: "United Kingdom" },
	{ value: "US", label: "United States" },
	{ value: "NL", label: "Netherlands" },
]

export const kit = createFormKit({
	controls: nativeControls,
	slots: createDefaultSlots({
		i18n: {
			arrayAdd: "Add contact",
			arrayMoveDown: ({ position }) => `Move contact ${position} down`,
			arrayMoveUp: ({ position }) => `Move contact ${position} up`,
			arrayRemove: ({ position }) => `Remove contact ${position}`,
		},
	}),
})

export const profileDefinition = kit.defineForm(profileSchema)({
	ui: [
		{
			kind: "section",
			id: "account",
			title: "Profile",
			description: "Edit a personal or company profile.",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
					required: true,
					options: {
						placeholder: "Enter your name",
						autoComplete: "name",
					},
				},
				{
					kind: "field",
					path: "accountType",
					control: "select",
					label: "Account type",
					required: true,
					options: {
						options: [
							{ value: "personal", label: "Personal" },
							{ value: "company", label: "Company" },
						],
					},
				},
				{
					kind: "field",
					path: "companyName",
					control: "text",
					label: "Company name",
					visible: ({ accountType }) => accountType === "company",
					valuePolicy: "unset",
					options: {
						placeholder: "Compiler Labs",
						autoComplete: "organization",
					},
				},
				{
					kind: "field",
					path: "country",
					control: "select",
					label: "Country",
					required: true,
					options: {
						options: countryOptions,
					},
				},
				{
					kind: "field",
					path: "newsletter",
					control: "checkbox",
					label: "Receive product news",
				},
				{
					kind: "field",
					path: "avatar",
					control: "file",
					label: "Avatar",
					description: "Choose a PNG file. Fokit keeps it in FormData.",
					options: {
						accept: "image/png",
					},
				},
			],
		},
		{
			kind: "array",
			path: "contacts",
			label: "Contacts",
			description:
				"Add or reorder contacts. Fokit keeps each row with its state.",
			itemDefault: {
				email: "",
				label: undefined,
			},
			children: [
				{
					kind: "field",
					path: "email",
					control: "text",
					label: "Email",
					required: true,
					options: {
						type: "email",
						placeholder: "ada@example.com",
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
						placeholder: "primary",
					},
				},
			],
		},
	],
})

export function ProfileForm() {
	const [saved, setSaved] = useState<ProfileOutput>()

	return (
		<>
			<kit.AutoForm
				definition={profileDefinition}
				defaultValues={defaultValues}
				onSubmit={({ value }) => setSaved(value)}
			>
				<kit.Submit>Save profile</kit.Submit>
			</kit.AutoForm>
			<pre aria-live="polite">
				{saved === undefined
					? "Submit the form to see typed output."
					: JSON.stringify(saved, null, 2)}
			</pre>
		</>
	)
}
