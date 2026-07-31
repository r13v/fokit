"use client"

import { useCallback } from "react"

import type { StandardSchema } from "../core/index.js"
import type { RuntimeFormKitSlots } from "./create-form-kit.js"
import { useFormIdPrefix } from "./form-context.js"
import { useFormState } from "./hooks.js"
import { createErrorMessageRootProps } from "./structural-props.js"
import type { AnyFormInstance } from "./use-form.js"

export type ErrorSummaryProps<Schema extends StandardSchema, Context> = {
	readonly form: AnyFormInstance<Schema, Context>
	readonly slots: RuntimeFormKitSlots
}

export function ErrorSummary<Schema extends StandardSchema, Context>({
	form,
	slots,
}: ErrorSummaryProps<Schema, Context>) {
	const idPrefix = useFormIdPrefix()
	const issues = useFormState(
		form,
		(snapshot) => snapshot.displayErrors.summary,
	)
	const firstSummaryRef = useCallback((element: HTMLElement | null) => {
		if (element !== null && typeof element.focus !== "function") {
			throw new TypeError("Fokit summary error root must be focusable")
		}
	}, [])
	const ErrorMessage = slots.ErrorMessage

	return (
		<>
			{issues.map((issue, index) => (
				<ErrorMessage
					issue={issue}
					key={`${issue.source}:${issue.path ?? "form"}:${issue.message}`}
					rootProps={createErrorMessageRootProps({
						id: `${idPrefix}-summary-error-${index}`,
						path: issue.path,
						...(index === 0
							? {
									tabIndex: -1,
									ref: firstSummaryRef,
								}
							: {}),
					})}
				/>
			))}
		</>
	)
}
