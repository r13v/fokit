import type { NormalizedFormDefinition } from "./definition.js"
import { formatPath, pathsOverlap } from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import { getPathValue, isDirtyEqual } from "./value.js"

export type FieldMetadata = {
	readonly dirty: boolean
	readonly touched: boolean
	readonly validating: boolean
}

export type FormMetadata = {
	readonly fieldsByPath: Readonly<Record<string, FieldMetadata>>
	readonly arraysByPath: Readonly<Record<string, FieldMetadata>>
}

export type MetadataState = {
	readonly touchedPaths: ReadonlySet<string>
}

export function createMetadataState(): MetadataState {
	return Object.freeze({
		touchedPaths: new Set<string>(),
	})
}

export function touchMetadataPath(
	state: MetadataState,
	path: string,
): MetadataState {
	const canonicalPath = formatPath(path)
	if (state.touchedPaths.has(canonicalPath)) {
		return state
	}

	const touchedPaths = new Set(state.touchedPaths)
	touchedPaths.add(canonicalPath)

	return Object.freeze({
		touchedPaths,
	})
}

export function deriveFormMetadata<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	baselineValues: FormInput<Schema>,
	state: MetadataState,
): FormMetadata {
	const fieldsByPath = Object.create(null) as Record<string, FieldMetadata>
	for (const path of Object.keys(definition.fieldsByPath)) {
		fieldsByPath[path] = createFieldMetadata(
			path,
			values,
			baselineValues,
			state,
			false,
		)
	}

	const arraysByPath = Object.create(null) as Record<string, FieldMetadata>
	for (const path of Object.keys(definition.arraysByPath)) {
		arraysByPath[path] = createFieldMetadata(
			path,
			values,
			baselineValues,
			state,
			true,
		)
	}

	return Object.freeze({
		fieldsByPath: Object.freeze(fieldsByPath),
		arraysByPath: Object.freeze(arraysByPath),
	})
}

export function isFormMetadataTouched(metadata: FormMetadata): boolean {
	return (
		Object.values(metadata.fieldsByPath).some((field) => field.touched) ||
		Object.values(metadata.arraysByPath).some((array) => array.touched)
	)
}

function createFieldMetadata(
	path: string,
	values: unknown,
	baselineValues: unknown,
	state: MetadataState,
	includeDescendants: boolean,
): FieldMetadata {
	return Object.freeze({
		dirty: !isDirtyEqual(
			getPathValue(values, path),
			getPathValue(baselineValues, path),
		),
		touched: isPathTouched(path, state, includeDescendants),
		validating: false,
	})
}

function isPathTouched(
	path: string,
	state: MetadataState,
	includeDescendants: boolean,
): boolean {
	if (state.touchedPaths.has(path)) {
		return true
	}

	return (
		includeDescendants &&
		[...state.touchedPaths].some((touchedPath) =>
			pathsOverlap(path, touchedPath),
		)
	)
}
