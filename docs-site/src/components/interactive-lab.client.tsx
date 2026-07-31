"use client"

import {
	ChevronDownIcon,
	ChevronUpIcon,
	TrashIcon,
} from "@heroicons/react/24/outline"
import {
	type ArrayItemSlotProps,
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

const kit = createFormKit({
	controls: nativeControls,
	slots: {
		...createDefaultSlots({
			i18n: {
				arrayAdd: "Add contact",
			},
		}),
		ArrayItem: ContactArrayItemSlot,
	},
})

function ContactArrayItemSlot({
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
	const position = index + 1
	const moveUpLabel = `Move contact ${position} up`
	const moveDownLabel = `Move contact ${position} down`
	const removeLabel = `Remove contact ${position}`
	const actionsDisabled = disabled || readOnly

	return (
		<div {...rootProps}>
			{children}
			<fieldset
				aria-label={`Contact ${position} actions`}
				className="fokit-lab__array-actions"
			>
				<span aria-hidden="true" className="fokit-lab__array-actions-label">
					Contact {position}
				</span>
				<button
					aria-label={moveUpLabel}
					className="fokit-lab__array-action"
					disabled={actionsDisabled || !canMoveUp}
					title={moveUpLabel}
					type="button"
					onClick={() => move(index - 1)}
				>
					<ChevronUpIcon aria-hidden="true" />
				</button>
				<button
					aria-label={moveDownLabel}
					className="fokit-lab__array-action"
					disabled={actionsDisabled || !canMoveDown}
					title={moveDownLabel}
					type="button"
					onClick={() => move(index + 1)}
				>
					<ChevronDownIcon aria-hidden="true" />
				</button>
				<button
					aria-label={removeLabel}
					className="fokit-lab__array-action"
					disabled={actionsDisabled}
					title={removeLabel}
					type="button"
					onClick={remove}
				>
					<TrashIcon aria-hidden="true" />
				</button>
			</fieldset>
		</div>
	)
}

const profileDefinition = kit.defineForm(profileSchema)({
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

export function InteractiveLabClient() {
	const [lastSubmit, setLastSubmit] = useState(
		"Submit the form to see the result.",
	)

	return (
		<section
			aria-labelledby="interactive-fokit-lab"
			className="fokit-lab"
			data-testid="lab"
		>
			<p className="fokit-lab__kicker">Interactive lab</p>
			<p className="fokit-lab__summary">
				Edit the generated form. Compare its values, visible issues, and
				FormData. All panels use the same Fokit instance.
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
				<span>Submission result</span>
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
				<InspectorPanel title="Visible issues">
					<pre data-testid="lab-issues">
						<code>
							{issueLines.length === 0
								? "No visible issues"
								: issueLines.join("\n")}
						</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title="Current FormData">
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
