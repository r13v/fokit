"use client"

import type { FormResult } from "../core/form-result.js"
import {
	type ActionSubmissionAttempt,
	applyActionResult,
	type FormStore,
} from "../core/form-store.js"
import type { StandardSchema } from "../core/standard-schema.js"

export function syncActionResult<
	Schema extends StandardSchema,
	Context = unknown,
>(
	form: FormStore<Schema, Context>,
	result: FormResult,
	attempt?: ActionSubmissionAttempt<Schema>,
	formElement?: HTMLFormElement,
): void {
	attempt?.finish()
	applyActionResult(form, result, {
		input: attempt?.input,
		changedPaths: attempt === undefined ? undefined : [...attempt.changedPaths],
		recordSubmit: attempt === undefined && result.status === "error",
	})

	if (result.status === "error") {
		queueMicrotask(() => {
			focusActionIssues(form, formElement)
		})
	}
}

function focusActionIssues<Schema extends StandardSchema, Context>(
	form: FormStore<Schema, Context>,
	formElement: HTMLFormElement | undefined,
): void {
	const snapshot = form.getSnapshot()
	for (const [path, issues] of snapshot.displayErrors.fields) {
		if (issues.length === 0 || !isFocusableIssuePath(snapshot, path)) {
			continue
		}

		form.focus(path)
		return
	}

	formElement
		?.querySelector<HTMLElement>(
			'[data-fokit-node="error-message"][tabindex="-1"]',
		)
		?.focus()
}

function isFocusableIssuePath<Context>(
	snapshot: ReturnType<FormStore<StandardSchema, Context>["getSnapshot"]>,
	path: string,
): boolean {
	const field = snapshot.resolvedUi.fieldsByPath[path]
	return field?.visible === true && !field.disabled && !field.readOnly
}
