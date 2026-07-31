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
	if (form.focusFirstError()) {
		return
	}

	formElement
		?.querySelector<HTMLElement>(
			'[data-fp-node="error-message"][tabindex="-1"]',
		)
		?.focus()
}
