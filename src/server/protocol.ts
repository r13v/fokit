import type { SubmissionIssue } from "../core/form-result.js"

export const fpArrayMarkerName = "__fp.array"
export const invalidFormDataCode = "invalid_form_data"

export type ParseFormDataOptions = {
	readonly maxEntries?: number
	readonly maxPathLength?: number
	readonly maxDepth?: number
	readonly maxArrayIndex?: number
}

export type ResolvedParseFormDataOptions = {
	readonly maxEntries: number
	readonly maxPathLength: number
	readonly maxDepth: number
	readonly maxArrayIndex: number
}

const defaultParseFormDataOptions = Object.freeze({
	maxEntries: 1_000,
	maxPathLength: 1_024,
	maxDepth: 32,
	maxArrayIndex: 10_000,
}) satisfies ResolvedParseFormDataOptions

export function resolveParseFormDataOptions(
	options: ParseFormDataOptions = {},
): ResolvedParseFormDataOptions {
	return Object.freeze({
		maxEntries: normalizeLimit(
			options.maxEntries,
			defaultParseFormDataOptions.maxEntries,
			"maxEntries",
		),
		maxPathLength: normalizeLimit(
			options.maxPathLength,
			defaultParseFormDataOptions.maxPathLength,
			"maxPathLength",
		),
		maxDepth: normalizeLimit(
			options.maxDepth,
			defaultParseFormDataOptions.maxDepth,
			"maxDepth",
		),
		maxArrayIndex: normalizeLimit(
			options.maxArrayIndex,
			defaultParseFormDataOptions.maxArrayIndex,
			"maxArrayIndex",
		),
	})
}

export function createInvalidFormDataIssue(): SubmissionIssue {
	return Object.freeze({
		source: "server",
		code: invalidFormDataCode,
		message: "Invalid form data",
	})
}

function normalizeLimit(
	value: number | undefined,
	defaultValue: number,
	name: string,
): number {
	const resolved = value ?? defaultValue
	if (!Number.isSafeInteger(resolved) || resolved < 0) {
		throw new TypeError(`${name} must be a safe non-negative integer`)
	}

	return resolved
}
