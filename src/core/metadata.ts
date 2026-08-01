import {
	createRowIdentityState,
	getRowIdentityKeys,
	type RowIdentityState,
} from "./array-state.js"
import type {
	NormalizedArrayNode,
	NormalizedFormDefinition,
	NormalizedRelativeUiNode,
} from "./definition.js"
import type { FormDocument } from "./form-model.js"
import {
	formatPath,
	type PathSegment,
	parsePath,
	pathsOverlap,
} from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import { getPathValue, isDirtyEqual } from "./value.js"

export type FieldMetadata = {
	readonly dirty: boolean
	readonly touched: boolean
	readonly validating: boolean
}

export type ArrayItemMetadata = FieldMetadata & {
	readonly key: string
	readonly index: number
}

export type ArrayMetadata = FieldMetadata & {
	readonly items: readonly ArrayItemMetadata[]
}

export type FormMetadata = {
	readonly fieldsByPath: Readonly<Record<string, FieldMetadata>>
	readonly arraysByPath: Readonly<Record<string, ArrayMetadata>>
}

export type MetadataState = {
	readonly touchedPaths: ReadonlySet<string>
	readonly rowIdentity: RowIdentityState
	readonly baselineRowIdentity: RowIdentityState
}

export type CreateMetadataStateOptions = {
	readonly touchedPaths?: Iterable<string>
	readonly rowIdentity?: RowIdentityState
	readonly baselineRowIdentity?: RowIdentityState
}

type MetadataDerivationState = {
	readonly touchedPaths: ReadonlySet<string>
	readonly rowIdentity: RowIdentityState
	readonly baselineRowIdentity: RowIdentityState
}

const emptyRowIdentity = Object.freeze(Object.create(null)) as RowIdentityState

export function createMetadataState(
	options: CreateMetadataStateOptions = {},
): MetadataState {
	return Object.freeze({
		touchedPaths: new Set(options.touchedPaths),
		rowIdentity: options.rowIdentity ?? emptyRowIdentity,
		baselineRowIdentity: options.baselineRowIdentity ?? emptyRowIdentity,
	})
}

export function createInitialMetadataState<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
): MetadataState {
	const rowIdentity = createRowIdentityState(definition, values)
	return createMetadataState({ rowIdentity, baselineRowIdentity: rowIdentity })
}

export function touchMetadataPath(
	state: MetadataState,
	path: string,
): MetadataState {
	const touchedPaths = addTouchedPath(state.touchedPaths, path)
	if (touchedPaths === state.touchedPaths) {
		return state
	}

	return createMetadataState({
		touchedPaths,
		rowIdentity: state.rowIdentity,
		baselineRowIdentity: state.baselineRowIdentity,
	})
}

export function addTouchedPath(
	touchedPaths: ReadonlySet<string>,
	path: string,
): ReadonlySet<string> {
	const canonicalPath = formatPath(path)
	if (touchedPaths.has(canonicalPath)) {
		return touchedPaths
	}

	return new Set([...touchedPaths, canonicalPath])
}

export function deriveFormMetadata<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	document: FormDocument<FormInput<Schema>>,
	baselineDocument: FormDocument<FormInput<Schema>>,
	touchedPaths: ReadonlySet<string>,
	isValidating = false,
): FormMetadata {
	const values = document.values
	const baselineValues = baselineDocument.values
	const state: MetadataDerivationState = {
		touchedPaths,
		rowIdentity: document.rowIdentity,
		baselineRowIdentity: baselineDocument.rowIdentity,
	}
	const fieldsByPath = Object.create(null) as Record<string, FieldMetadata>
	for (const path of Object.keys(definition.fieldsByPath)) {
		fieldsByPath[path] = createFieldMetadata(
			path,
			values,
			baselineValues,
			state,
			false,
			isValidating,
		)
	}

	const arraysByPath = Object.create(null) as Record<string, ArrayMetadata>
	for (const path of Object.keys(definition.arraysByPath)) {
		const array = definition.arraysByPath[path]
		arraysByPath[path] = createArrayMetadata(
			path,
			values,
			baselineValues,
			state,
			isValidating,
		)
		addArrayChildMetadata(
			array,
			fieldsByPath,
			arraysByPath,
			values,
			baselineValues,
			state,
			isValidating,
		)
	}

	return Object.freeze({
		fieldsByPath: Object.freeze(fieldsByPath),
		arraysByPath: Object.freeze(arraysByPath),
	})
}

function addArrayChildMetadata(
	array: NormalizedArrayNode,
	fieldsByPath: Record<string, FieldMetadata>,
	arraysByPath: Record<string, ArrayMetadata>,
	values: unknown,
	baselineValues: unknown,
	state: MetadataDerivationState,
	isValidating: boolean,
): void {
	const value = getPathValue(values, array.path)
	if (!Array.isArray(value)) {
		return
	}

	for (const index of value.keys()) {
		addRelativeMetadata(
			array.children,
			`${array.path}.${index}`,
			fieldsByPath,
			arraysByPath,
			values,
			baselineValues,
			state,
			isValidating,
		)
	}
}

function addRelativeMetadata(
	nodes: readonly NormalizedRelativeUiNode[],
	scopePath: string,
	fieldsByPath: Record<string, FieldMetadata>,
	arraysByPath: Record<string, ArrayMetadata>,
	values: unknown,
	baselineValues: unknown,
	state: MetadataDerivationState,
	isValidating: boolean,
): void {
	for (const node of nodes) {
		if (node.kind === "section") {
			addRelativeMetadata(
				node.children,
				scopePath,
				fieldsByPath,
				arraysByPath,
				values,
				baselineValues,
				state,
				isValidating,
			)
			continue
		}

		const path = `${scopePath}.${node.path}`
		if (node.kind === "field") {
			fieldsByPath[path] = createFieldMetadata(
				path,
				values,
				baselineValues,
				state,
				false,
				isValidating,
			)
			continue
		}

		arraysByPath[path] = createArrayMetadata(
			path,
			values,
			baselineValues,
			state,
			isValidating,
		)
		addArrayChildMetadata(
			{ ...node, path },
			fieldsByPath,
			arraysByPath,
			values,
			baselineValues,
			state,
			isValidating,
		)
	}
}

function createArrayMetadata(
	path: string,
	values: unknown,
	baselineValues: unknown,
	state: MetadataDerivationState,
	isValidating: boolean,
): ArrayMetadata {
	const fieldMetadata = createFieldMetadata(
		path,
		values,
		baselineValues,
		state,
		true,
		isValidating,
	)

	return Object.freeze({
		...fieldMetadata,
		items: createArrayItemMetadata(
			path,
			values,
			baselineValues,
			state,
			isValidating,
		),
	})
}

function createArrayItemMetadata(
	path: string,
	values: unknown,
	baselineValues: unknown,
	state: MetadataDerivationState,
	isValidating: boolean,
): readonly ArrayItemMetadata[] {
	const value = getPathValue(values, path)
	if (!Array.isArray(value)) {
		return Object.freeze([])
	}

	const baselinePath = createBaselinePath(path, state)
	const baselineValue =
		baselinePath === undefined
			? undefined
			: getPathValue(baselineValues, baselinePath)
	const baselineArray = Array.isArray(baselineValue) ? baselineValue : []
	const keys =
		getRowIdentityKeys(state.rowIdentity, path) ??
		createFallbackRowKeys(path, value.length)
	const baselineKeys =
		getRowIdentityKeys(state.baselineRowIdentity, baselinePath ?? path) ??
		createFallbackRowKeys(path, baselineArray.length)

	return Object.freeze(
		value.map((item, index) => {
			const key = keys[index] ?? `${path}:${index}`
			const baselineIndex = baselineKeys.indexOf(key)
			const baselineItem =
				baselineIndex === -1 ? undefined : baselineArray[baselineIndex]

			return Object.freeze({
				key,
				index,
				dirty: baselineIndex === -1 || !isDirtyEqual(item, baselineItem),
				touched: isArrayItemTouched(path, index, state),
				validating: isValidating,
			})
		}),
	)
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
	state: MetadataDerivationState,
	includeDescendants: boolean,
	isValidating: boolean,
): FieldMetadata {
	const baselinePath = createBaselinePath(path, state)
	return Object.freeze({
		dirty:
			baselinePath === undefined ||
			!isDirtyEqual(
				getPathValue(values, path),
				getPathValue(baselineValues, baselinePath),
			),
		touched: isPathTouched(path, state, includeDescendants),
		validating: isValidating,
	})
}

function createBaselinePath(
	path: string,
	state: MetadataDerivationState,
): string | undefined {
	const segments = parsePath(path)
	const baselineSegments: PathSegment[] = []

	for (let index = 0; index < segments.length; index++) {
		const segment = segments[index] as PathSegment
		baselineSegments.push(segment)

		const currentArrayPath = formatPath(segments.slice(0, index + 1))
		const baselineArrayPath = formatPath(baselineSegments)
		const rowIndex = segments[index + 1]
		if (typeof rowIndex !== "number") {
			continue
		}

		const key = getRowIdentityKeys(state.rowIdentity, currentArrayPath)?.[
			rowIndex
		]
		if (key === undefined) {
			return undefined
		}

		const baselineIndex =
			getRowIdentityKeys(state.baselineRowIdentity, baselineArrayPath)?.indexOf(
				key,
			) ?? -1
		if (baselineIndex === -1) {
			return undefined
		}

		baselineSegments.push(baselineIndex)
		index += 1
	}

	return formatPath(baselineSegments)
}

function isPathTouched(
	path: string,
	state: MetadataDerivationState,
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

function isArrayItemTouched(
	arrayPath: string,
	index: number,
	state: MetadataDerivationState,
): boolean {
	const itemPath = `${arrayPath}.${index}`
	return [...state.touchedPaths].some((touchedPath) =>
		pathsOverlap(itemPath, touchedPath),
	)
}

function createFallbackRowKeys(
	path: string,
	length: number,
): readonly string[] {
	return Object.freeze(
		Array.from({ length }, (_value, index) => `${path}:${index}`),
	)
}
