import type { StandardSchemaV1 } from "@standard-schema/spec"

import { type FormIssue, normalizeStandardSchemaIssue } from "./issues.js"
import type { FormOutput, StandardSchema } from "./standard-schema.js"

export type ValidationMode = "blur" | "change" | "submit"

export type ValidationOptions = {
	readonly mode: ValidationMode
	readonly revalidateMode: ValidationMode
	readonly asyncDebounceMs?: number
}

export type ValidationResult<Output> =
	| {
			readonly success: true
			readonly value: Output
	  }
	| {
			readonly success: false
			readonly issues: readonly FormIssue[]
	  }

const defaultValidationOptions = Object.freeze({
	mode: "submit",
	revalidateMode: "change",
	asyncDebounceMs: 0,
}) satisfies ValidationOptions

export function normalizeValidationOptions(
	options: Partial<ValidationOptions> | undefined,
): ValidationOptions {
	const mode = options?.mode ?? defaultValidationOptions.mode
	const revalidateMode =
		options?.revalidateMode ?? defaultValidationOptions.revalidateMode
	const asyncDebounceMs =
		options?.asyncDebounceMs ?? defaultValidationOptions.asyncDebounceMs

	if (!isValidationMode(mode)) {
		throw new TypeError(`Unsupported validation mode "${String(mode)}"`)
	}

	if (!isValidationMode(revalidateMode)) {
		throw new TypeError(
			`Unsupported revalidation mode "${String(revalidateMode)}"`,
		)
	}

	if (!Number.isSafeInteger(asyncDebounceMs) || asyncDebounceMs < 0) {
		throw new TypeError(
			"validation.asyncDebounceMs must be a safe non-negative integer",
		)
	}

	return Object.freeze({
		mode,
		revalidateMode,
		asyncDebounceMs,
	})
}

export function runStandardSchemaValidation<Schema extends StandardSchema>(
	schema: Schema,
	value: unknown,
	signal: AbortSignal,
):
	| Promise<StandardSchemaV1.Result<FormOutput<Schema>>>
	| StandardSchemaV1.Result<FormOutput<Schema>> {
	const validate = schema["~standard"]?.validate
	if (typeof validate !== "function") {
		throw new TypeError("Form schema must implement Standard Schema validate")
	}

	return validate(value, {
		libraryOptions: { signal },
	}) as
		| Promise<StandardSchemaV1.Result<FormOutput<Schema>>>
		| StandardSchemaV1.Result<FormOutput<Schema>>
}

export function normalizeValidationResult<Output>(
	result: StandardSchemaV1.Result<Output>,
): ValidationResult<Output> {
	if (result.issues !== undefined) {
		return Object.freeze({
			success: false,
			issues: Object.freeze(
				result.issues.map((issue) => normalizeStandardSchemaIssue(issue)),
			),
		})
	}

	return Object.freeze({
		success: true,
		value: result.value,
	})
}

export function isPromiseLike<Value>(
	value: unknown,
): value is PromiseLike<Value> {
	return (value !== null && typeof value === "object") ||
		typeof value === "function"
		? typeof (value as { readonly then?: unknown }).then === "function"
		: false
}

function isValidationMode(mode: unknown): mode is ValidationMode {
	return mode === "blur" || mode === "change" || mode === "submit"
}
