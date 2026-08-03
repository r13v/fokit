"use client"

import { type ReactNode, useEffect, useState } from "react"
import {
	defaultValues,
	kit,
	type ProfileInput,
	type ProfileOutput,
	profileDefinition,
} from "../snippets/lab-profile-form"

export function InteractiveLabClient() {
	const [lastSubmit, setLastSubmit] = useState(
		"Submit the form to see the result.",
	)
	const form = kit.useForm(profileDefinition, {
		defaultValues,
		onSubmit: ({ value }) => setLastSubmit(formatSavedMessage(value)),
	})

	return (
		<section
			aria-labelledby="interactive-form-please-lab"
			className="form-please-complex form-please-lab"
			data-testid="lab"
		>
			<p className="form-please-lab__kicker">Interactive lab</p>
			<p className="form-please-lab__summary">
				Edit the generated form. Compare its values and visible issues with a
				diagnostic browser FormData snapshot. Submission uses the TanStack
				values.
			</p>
			<kit.AutoForm
				className="form-please-lab__form"
				form={form}
				id="interactive-form-please-lab-form"
				style={{
					"--fp-array-item-gap": "0.85rem",
					"--fp-column-gap": "1rem",
					"--fp-row-gap": "0.95rem",
					"--fp-stack-gap": "1rem",
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
				<form.api.Subscribe
					selector={(state) => ({
						errors: state.errors,
						isDirty: state.isDirty,
						isTouched: state.isTouched,
						isValidating: state.isValidating,
						submissionAttempts: state.submissionAttempts,
						values: state.values,
					})}
				>
					{(snapshot) => (
						<LabInspector lastSubmit={lastSubmit} snapshot={snapshot} />
					)}
				</form.api.Subscribe>
			</kit.AutoForm>
		</section>
	)
}

function LabInspector({
	lastSubmit,
	snapshot,
}: {
	readonly lastSubmit: string
	readonly snapshot: {
		readonly errors: readonly unknown[]
		readonly isDirty: boolean
		readonly isTouched: boolean
		readonly isValidating: boolean
		readonly submissionAttempts: number
		readonly values: ProfileInput
	}
}) {
	const [formDataLines, setFormDataLines] = useState<readonly string[]>([])
	let issueOutput = JSON.stringify(snapshot.errors, null, 2)
	if (snapshot.errors.length === 0) issueOutput = "No visible issues"
	let validationStatus = "idle"
	if (snapshot.isValidating) validationStatus = "validating"

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
							<dd>{validationStatus}</dd>
						</div>
						<div>
							<dt>Submits</dt>
							<dd>{snapshot.submissionAttempts}</dd>
						</div>
						<div>
							<dt>Rows</dt>
							<dd>{snapshot.values.contacts.length}</dd>
						</div>
					</dl>
				</InspectorPanel>
				<InspectorPanel title="Visible issues">
					<pre data-testid="lab-issues">
						<code>{issueOutput}</code>
					</pre>
				</InspectorPanel>
				<InspectorPanel title="Browser FormData (diagnostic)">
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
