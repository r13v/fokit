import type { FormDataEntrySpec } from "../core/index.js"

type FormDataDetails = { readonly name: string }

export function serializeOptionalString(
	value: string | undefined,
	details: FormDataDetails,
): readonly FormDataEntrySpec[] {
	return value === undefined ? [] : [{ name: details.name, value }]
}

export function serializeOptionalNumber(
	value: number | undefined,
	details: FormDataDetails,
): readonly FormDataEntrySpec[] {
	return value === undefined || Number.isNaN(value)
		? []
		: [{ name: details.name, value: String(value) }]
}

export function serializeBoolean(
	value: boolean,
	details: FormDataDetails,
): readonly FormDataEntrySpec[] {
	return [{ name: details.name, value: String(value) }]
}

export function serializeStringArray(
	value: readonly string[],
	details: FormDataDetails,
): readonly FormDataEntrySpec[] {
	return [
		{ kind: "array", name: details.name },
		...value.map((item) => ({ name: details.name, value: item })),
	]
}

export function serializeNumberArray(
	value: readonly number[],
	details: FormDataDetails,
): readonly FormDataEntrySpec[] {
	return [
		{ kind: "array", name: details.name },
		...value.map((item) => ({ name: details.name, value: String(item) })),
	]
}
