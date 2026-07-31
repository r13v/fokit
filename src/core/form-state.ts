import type { DisplayFormErrors, FormErrors } from "./issues.js"
import type { FormMetadata } from "./metadata.js"
import { isPlainObject } from "./object.js"
import type { ResolvedUiState } from "./resolve-ui.js"
import { cloneValue, isDirtyEqual } from "./value.js"

export type {
	DisplayFormErrors,
	FormErrors,
	FormIssue,
	ImperativeFormIssue,
} from "./issues.js"

export type ValidationStatus = "invalid" | "unvalidated" | "valid"

export type FormState<Input> = {
	readonly values: Input
	readonly errors: FormErrors
	readonly displayErrors: DisplayFormErrors
	readonly isDirty: boolean
	readonly isTouched: boolean
	readonly isValidating: boolean
	readonly isSubmitting: boolean
	readonly validationStatus: ValidationStatus
	readonly submitCount: number
}

export type FormSnapshot<Input, Context = unknown> = FormState<Input> & {
	readonly context: Readonly<Context>
	readonly resolvedUi: ResolvedUiState<Context>
	readonly metadata: FormMetadata
}

export type CreateFormSnapshotOptions<Input, Context> = {
	readonly values: Input
	readonly baselineValues: Input
	readonly context: Context
	readonly displayErrors: DisplayFormErrors
	readonly errors: FormErrors
	readonly resolvedUi: ResolvedUiState<Context>
	readonly metadata: FormMetadata
	readonly isTouched: boolean
	readonly isValidating: boolean
	readonly isSubmitting: boolean
	readonly validationStatus: ValidationStatus
	readonly submitCount: number
}

export function createFormSnapshot<Input, Context>({
	values,
	baselineValues,
	context,
	displayErrors,
	errors,
	resolvedUi,
	metadata,
	isTouched,
	isValidating,
	isSubmitting,
	validationStatus,
	submitCount,
}: CreateFormSnapshotOptions<Input, Context>): FormSnapshot<Input, Context> {
	return Object.freeze({
		values,
		errors,
		displayErrors,
		isDirty: !isDirtyEqual(values, baselineValues),
		isTouched,
		isValidating,
		isSubmitting,
		validationStatus,
		submitCount,
		context,
		resolvedUi,
		metadata,
	})
}

export function cloneAndFreezeValue<Value>(value: Value): Value {
	return freezeFormValue(cloneValue(value))
}

export function freezeFormValue<Value>(value: Value): Value {
	return freezePlainContainers(value, new WeakSet()) as Value
}

function freezePlainContainers(value: unknown, seen: WeakSet<object>): unknown {
	if (Array.isArray(value)) {
		if (seen.has(value)) {
			return value
		}
		seen.add(value)
		for (const item of value) {
			freezePlainContainers(item, seen)
		}
		seen.delete(value)
		return Object.freeze(value)
	}

	if (isPlainObject(value)) {
		if (seen.has(value)) {
			return value
		}
		seen.add(value)
		for (const key of Object.keys(value)) {
			freezePlainContainers(value[key], seen)
		}
		seen.delete(value)
		return Object.freeze(value)
	}

	return value
}
