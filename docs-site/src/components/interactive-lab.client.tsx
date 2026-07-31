"use client"

import { useFormContext, useFormState } from "fokit"
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

function formatSavedMessage(value: ProfileOutput): string {
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
