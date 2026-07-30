"use client"

import {
	createFormKit,
	type FormInput,
	type FormOutput,
	nativeControls,
} from "fokit"
import { z } from "zod"

// [!region schema]
export const profileSchema = z
	.object({
		name: z.string().min(1, "Name is required"),
		accountType: z.enum(["personal", "company"]),
		companyName: z.string().optional(),
		newsletter: z.boolean(),
		contacts: z
			.array(
				z.object({
					email: z.string().email("Enter a valid email"),
					label: z.string().optional(),
				}),
			)
			.min(1, "Add at least one contact"),
	})
	.superRefine((value, context) => {
		if (
			value.accountType === "company" &&
			(value.companyName ?? "").trim() === ""
		) {
			context.addIssue({
				code: "custom",
				path: ["companyName"],
				message: "Company name is required",
			})
		}
	})
	.transform((value) => ({
		...value,
		companyName: value.companyName?.trim() || undefined,
		contactCount: value.contacts.length,
	}))

export type ProfileInput = FormInput<typeof profileSchema>
export type ProfileOutput = FormOutput<typeof profileSchema>
// [!endregion schema]

// [!region kit]
export const kit = createFormKit({
	controls: nativeControls,
})
// [!endregion kit]

// [!region definition]
export const profileDefinition = kit.defineForm(profileSchema)((computed) => ({
	ui: [
		{
			kind: "section",
			id: "profile",
			title: "Profile",
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
					visible: computed(
						["accountType"],
						({ accountType }) => accountType === "company",
					),
					valuePolicy: "unset",
					options: {
						autoComplete: "organization",
					},
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
}))

export const defaultValues = {
	name: "Ada Lovelace",
	accountType: "personal",
	companyName: undefined,
	newsletter: true,
	contacts: [{ email: "ada@example.com", label: "primary" }],
} satisfies ProfileInput
// [!endregion definition]
