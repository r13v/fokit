"use client"

import {
	computed,
	createDefaultSlots,
	createFormKit,
	type FormInput,
	type FormOutput,
	nativeControls,
	useFormContext,
	useFormState,
} from "fokit"
import { type ReactNode, useEffect, useMemo, useState } from "react"
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

const defaultValues = {
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

type ProfileInput = FormInput<typeof profileSchema>

const kit = createFormKit({
	controls: nativeControls,
	slots: createDefaultSlots({
		i18n: {
			arrayAdd: "Add contact",
			arrayRemove: ({ position }) => `Remove contact ${position}`,
			arrayMoveUp: ({ position }) => `Move contact ${position} up`,
			arrayMoveDown: ({ position }) => `Move contact ${position} down`,
		},
	}),
})

const profileDefinition = kit.defineForm({
	schema: profileSchema,
	ui: [
		{
			kind: "section",
			id: "account",
			title: "Profile",
			description: "A compact account form rendered from AutoForm.",
			columns: 2,
			children: [
				{
					kind: "field",
					path: "name",
					control: "text",
					label: "Name",
					description: "Required before a classic submit can succeed.",
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
					visible: computed<
						readonly ["accountType"],
						boolean,
						unknown,
						ProfileInput
					>(
						["accountType"] as const,
						({ accountType }) => accountType === "company",
					),
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
					description: "PNG files stay native in FormData.",
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
			description: "Array rows keep stable keys while values reorder.",
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

export function InteractiveLabClient() {
	const [lastSubmit, setLastSubmit] = useState("No submission yet")

	return (
		<section
			aria-labelledby="interactive-fokit-lab"
			className="fokit-lab"
			data-testid="lab"
		>
			<p className="fokit-lab__kicker">Live public package</p>
			<p className="fokit-lab__summary">
				Edit the generated form, then compare values, exposed issues, and native
				FormData from the same Fokit instance.
			</p>
			<kit.AutoForm
				className="fokit-lab__form"
				defaultValues={defaultValues}
				definition={profileDefinition}
				id="interactive-fokit-lab-form"
				onSubmit={({ value }) => {
					setLastSubmit(formatSavedMessage(value))
				}}
				style={{
					"--fokit-array-item-gap": "0.85rem",
					"--fokit-column-gap": "1rem",
					"--fokit-row-gap": "0.95rem",
					"--fokit-stack-gap": "1rem",
				}}
				validation={{
					mode: "blur",
					revalidateMode: "change",
				}}
			>
				<div className="fokit-lab__actions">
					<kit.Submit className="fokit-lab__primary">Save profile</kit.Submit>
					<button className="fokit-lab__secondary" type="reset">
						Reset lab
					</button>
				</div>
				<LabInspector lastSubmit={lastSubmit} />
			</kit.AutoForm>
		</section>
	)
}

function LabInspector({ lastSubmit }: { readonly lastSubmit: string }) {
	const form = useFormContext()
	const snapshot = useFormState(form, (state) => state)
	const [formDataLines, setFormDataLines] = useState<readonly string[]>([])
	const issueLines = useMemo(() => formatIssues(snapshot), [snapshot])
	const rowKeys =
		snapshot.metadata.arraysByPath.contacts?.items
			.map((item) => item.key)
			.join(", ") ?? ""

	useEffect(() => {
		const element = document.getElementById("interactive-fokit-lab-form")
		const nextLines =
			element instanceof HTMLFormElement
				? formatFormData(new FormData(element))
				: []

		setFormDataLines((currentLines) =>
			linesEqual(currentLines, nextLines) ? currentLines : nextLines,
		)
	})

	return (
		<section className="fokit-lab__inspector" aria-label="Lab inspector">
			<div className="fokit-lab__submit-state">
				<span>Last submit</span>
				<output data-testid="lab-submission">{lastSubmit}</output>
			</div>
			<div className="fokit-lab__inspector-grid">
				<InspectorPanel title="Values">
					<pre data-testid="lab-values">
						<code>{JSON.stringify(snapshot.values, null, 2)}</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title="State">
					<dl className="fokit-lab__state-list">
						<div>
							<dt>Dirty</dt>
							<dd data-testid="lab-dirty">{String(snapshot.isDirty)}</dd>
						</div>
						<div>
							<dt>Touched</dt>
							<dd>{String(snapshot.isTouched)}</dd>
						</div>
						<div>
							<dt>Validation</dt>
							<dd>{snapshot.validationStatus}</dd>
						</div>
						<div>
							<dt>Submits</dt>
							<dd>{snapshot.submitCount}</dd>
						</div>
						<div>
							<dt>Rows</dt>
							<dd>{rowKeys}</dd>
						</div>
					</dl>
				</InspectorPanel>
				<InspectorPanel title="Exposed issues">
					<pre data-testid="lab-issues">
						<code>
							{issueLines.length === 0
								? "No exposed issues"
								: issueLines.join("\n")}
						</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title="Native FormData">
					<pre data-testid="lab-form-data">
						<code>{formDataLines.join("\n")}</code>
					</pre>
				</InspectorPanel>
			</div>
		</section>
	)
}

function InspectorPanel({
	title,
	children,
}: {
	readonly title: string
	readonly children: ReactNode
}) {
	return (
		<section className="fokit-lab__panel">
			<h3>{title}</h3>
			{children}
		</section>
	)
}

function formatSavedMessage(value: FormOutput<typeof profileSchema>): string {
	return `Saved ${value.name} with ${value.contactCount} ${
		value.contactCount === 1 ? "contact" : "contacts"
	}.`
}

function linesEqual(
	left: readonly string[],
	right: readonly string[],
): boolean {
	if (left.length !== right.length) {
		return false
	}

	return left.every((value, index) => value === right[index])
}

function formatIssues(snapshot: {
	readonly displayErrors: {
		readonly form: readonly { readonly message: string }[]
		readonly fields: ReadonlyMap<
			string,
			readonly { readonly message: string }[]
		>
	}
}): string[] {
	const lines: string[] = []

	for (const issue of snapshot.displayErrors.form) {
		lines.push(`form: ${issue.message}`)
	}

	for (const [path, issues] of snapshot.displayErrors.fields) {
		for (const issue of issues) {
			lines.push(`${path}: ${issue.message}`)
		}
	}

	return lines
}

function formatFormData(formData: FormData): string[] {
	const lines: string[] = []
	for (const [name, value] of formData.entries()) {
		lines.push(`${name}=${formatEntryValue(value)}`)
	}
	return lines.sort((left, right) => (left < right ? -1 : Number(left > right)))
}

function formatEntryValue(value: FormDataEntryValue): string {
	if (typeof File !== "undefined" && value instanceof File) {
		return `File(${value.name})`
	}

	return String(value)
}
