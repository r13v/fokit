"use client"

import { useFormContext, useFormState } from "form-please"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
	defaultValues,
	kit,
	type ProfileOutput,
	profileDefinition,
} from "../snippets/lab-profile-form"

export function InteractiveLabClient() {
	const [lastSubmit, setLastSubmit] = useState(
		"Submit the form to see the result.",
	)

	return (
		<section
			aria-labelledby="interactive-form-please-lab"
			className="form-please-lab"
			data-testid="lab"
		>
			<p className="form-please-lab__kicker">Interactive lab</p>
			<p className="form-please-lab__summary">
				Edit the generated form. Compare its values, visible issues, and
				FormData. All panels use the same Form, Please instance.
			</p>
			<kit.AutoForm
				className="form-please-lab__form"
				defaultValues={defaultValues}
				definition={profileDefinition}
				id="interactive-form-please-lab-form"
				onSubmit={({ value }) => {
					setLastSubmit(formatSavedMessage(value))
				}}
				style={{
					"--fp-array-item-gap": "0.85rem",
					"--fp-column-gap": "1rem",
					"--fp-row-gap": "0.95rem",
					"--fp-stack-gap": "1rem",
				}}
				validation={{
					mode: "blur",
					revalidateMode: "change",
				}}
			>
				<div className="form-please-lab__actions">
					<kit.Submit className="form-please-lab__primary">
						Save profile
					</kit.Submit>
					<button className="form-please-lab__secondary" type="reset">
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
	let issueOutput = issueLines.join("\n")
	if (issueLines.length === 0) issueOutput = "No visible issues"

	useEffect(() => {
		const element = document.getElementById("interactive-form-please-lab-form")
		let nextLines: readonly string[] = []
		if (element instanceof HTMLFormElement) {
			nextLines = formatFormData(new FormData(element))
		}

		setFormDataLines((currentLines) => {
			if (linesEqual(currentLines, nextLines)) return currentLines
			return nextLines
		})
	})

	return (
		<section className="form-please-lab__inspector" aria-label="Lab inspector">
			<div className="form-please-lab__submit-state">
				<span>Submission result</span>
				<output data-testid="lab-submission">{lastSubmit}</output>
			</div>
			<div className="form-please-lab__inspector-grid">
				<InspectorPanel title="Values">
					<pre data-testid="lab-values">
						<code>{JSON.stringify(snapshot.values, null, 2)}</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title="State">
					<dl className="form-please-lab__state-list">
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
						<code>{issueOutput}</code>
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
		<section className="form-please-lab__panel">
			<h3>{title}</h3>
			{children}
		</section>
	)
}

function formatSavedMessage(value: ProfileOutput): string {
	let contactNoun = "contacts"
	if (value.contactCount === 1) contactNoun = "contact"
	return `Saved ${value.name} with ${value.contactCount} ${contactNoun}.`
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
	return lines.sort((left, right) => {
		if (left < right) return -1
		return Number(left > right)
	})
}

function formatEntryValue(value: FormDataEntryValue): string {
	if (typeof File !== "undefined" && value instanceof File) {
		return `File(${value.name})`
	}

	return String(value)
}
