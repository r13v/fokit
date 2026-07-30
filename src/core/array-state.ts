import type {
	NormalizedArrayNode,
	NormalizedFormDefinition,
	NormalizedRelativeUiNode,
} from "./definition.js"
import {
	formatPath,
	type PathInput,
	type PathSegments,
	parsePath,
} from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import { createSetChange, type NormalizedValueChange } from "./transaction.js"
import { cloneValue, getPathValue } from "./value.js"

export type ArrayRowState = {
	readonly keys: readonly string[]
	readonly baselineKeys: readonly string[]
	readonly nextKeyIndex: number
}

export type ArrayRowsState = Readonly<Record<string, ArrayRowState>>

export type ArrayCommand =
	| {
			readonly type: "append"
			readonly hasValue: boolean
			readonly value: unknown
	  }
	| {
			readonly type: "insert"
			readonly index: number
			readonly hasValue: boolean
			readonly value: unknown
	  }
	| {
			readonly type: "remove"
			readonly index: number
	  }
	| {
			readonly type: "move"
			readonly from: number
			readonly to: number
	  }

export type ArrayCommandChange = {
	readonly changes: readonly NormalizedValueChange[]
	readonly previousKeys: readonly string[]
	readonly nextKeys: readonly string[]
	readonly rowState: ArrayRowState
}

export function createArrayRowsState<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
): ArrayRowsState {
	const rowsByPath = Object.create(null) as Record<string, ArrayRowState>

	for (const array of Object.values(definition.arraysByPath)) {
		addConcreteArrayRowStates(rowsByPath, array, values, array.path)
	}

	return freezeArrayRowsState(rowsByPath)
}

function addConcreteArrayRowStates(
	rowsByPath: Record<string, ArrayRowState>,
	array: NormalizedArrayNode,
	values: unknown,
	path: string,
): void {
	const value = getPathValue(values, path)
	const length = Array.isArray(value) ? value.length : 0
	rowsByPath[path] = createInitialRowState(path, length)

	if (!Array.isArray(value)) {
		return
	}

	for (const index of value.keys()) {
		addRelativeArrayRowStates(
			rowsByPath,
			array.children,
			values,
			`${path}.${index}`,
		)
	}
}

function addRelativeArrayRowStates(
	rowsByPath: Record<string, ArrayRowState>,
	nodes: readonly NormalizedRelativeUiNode[],
	values: unknown,
	scopePath: string,
): void {
	for (const node of nodes) {
		if (node.kind === "section") {
			addRelativeArrayRowStates(rowsByPath, node.children, values, scopePath)
			continue
		}

		if (node.kind === "array") {
			addConcreteArrayRowStates(
				rowsByPath,
				node,
				values,
				`${scopePath}.${node.path}`,
			)
		}
	}
}

export function createArrayCommandChange(
	path: string,
	node: NormalizedArrayNode,
	values: unknown,
	rowsState: ArrayRowsState,
	command: ArrayCommand,
): ArrayCommandChange | undefined {
	const currentValue = getPathValue(values, path)
	if (!Array.isArray(currentValue)) {
		throw new TypeError(`Array path "${path}" does not resolve to an array`)
	}

	const existingRowState =
		rowsState[path] ?? createInitialRowState(path, currentValue.length)
	const previousRowState = reconcileRowState(
		path,
		existingRowState,
		currentValue.length,
	)
	const previousKeys = previousRowState.keys.slice(0, currentValue.length)
	const result = applyArrayCommand(
		path,
		node,
		currentValue,
		previousRowState,
		command,
	)

	if (result === undefined) {
		return undefined
	}

	return Object.freeze({
		changes: Object.freeze([createSetChange(path, result.values)]),
		previousKeys: Object.freeze(previousKeys),
		nextKeys: result.rowState.keys,
		rowState: result.rowState,
	})
}

export function replaceArrayRowState(
	rowsState: ArrayRowsState,
	path: string,
	rowState: ArrayRowState,
): ArrayRowsState {
	return freezeArrayRowsState({
		...rowsState,
		[path]: rowState,
	})
}

export function reindexArrayRowsState(
	rowsState: ArrayRowsState,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
): ArrayRowsState {
	let changed = false
	const nextRowsState = Object.create(null) as Record<string, ArrayRowState>

	for (const [path, rowState] of Object.entries(rowsState)) {
		const nextPath = reindexArrayPath(path, arrayPath, previousKeys, nextKeys)
		if (nextPath === undefined) {
			changed = true
			continue
		}

		changed ||= nextPath !== path
		nextRowsState[nextPath] = rowState
	}

	return changed ? freezeArrayRowsState(nextRowsState) : rowsState
}

export function reindexTouchedArrayPaths(
	touchedPaths: ReadonlySet<string>,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
): ReadonlySet<string> {
	if (touchedPaths.size === 0) {
		return touchedPaths
	}

	let changed = false
	const nextTouchedPaths = new Set<string>()

	for (const touchedPath of touchedPaths) {
		const nextPath = reindexArrayPath(
			touchedPath,
			arrayPath,
			previousKeys,
			nextKeys,
		)

		if (nextPath === undefined) {
			changed = true
			continue
		}

		changed ||= nextPath !== touchedPath
		nextTouchedPaths.add(nextPath)
	}

	return changed ? nextTouchedPaths : touchedPaths
}

export function reindexArrayPath(
	path: string,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
): string | undefined {
	const pathSegments = parsePath(path)
	const arraySegments = parsePath(arrayPath)

	if (!startsWithSegments(pathSegments, arraySegments)) {
		return path
	}

	if (pathSegments.length === arraySegments.length) {
		return path
	}

	const previousIndex = pathSegments[arraySegments.length]
	if (typeof previousIndex !== "number") {
		return path
	}

	const key = previousKeys[previousIndex]
	if (key === undefined) {
		return undefined
	}

	const nextIndex = nextKeys.indexOf(key)
	if (nextIndex === -1) {
		return undefined
	}

	return formatPath([
		...arraySegments,
		nextIndex,
		...pathSegments.slice(arraySegments.length + 1),
	])
}

export function isKnownArrayDescendantFieldPath<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	path: PathInput,
): boolean {
	const segments = parsePath(path)

	for (const array of Object.values(definition.arraysByPath)) {
		if (!startsWithSegments(segments, array.pathSegments)) {
			continue
		}

		if (segments.length <= array.pathSegments.length + 1) {
			continue
		}

		const rowIndex = segments[array.pathSegments.length]
		if (typeof rowIndex !== "number") {
			continue
		}

		const value = getPathValue(values, array.path)
		if (!Array.isArray(value) || rowIndex >= value.length) {
			continue
		}

		if (
			hasRelativeFieldPath(
				array.children,
				segments.slice(array.pathSegments.length + 1),
			)
		) {
			return true
		}
	}

	return false
}

export function findArrayNodeForPath<Schema extends StandardSchema>(
	definition: NormalizedFormDefinition<Schema>,
	path: PathInput,
): NormalizedArrayNode | undefined {
	const segments = parsePath(path)

	for (const array of Object.values(definition.arraysByPath)) {
		const match = findArrayNodeInTree(array, segments)
		if (match !== undefined) {
			return match
		}
	}

	return undefined
}

function findArrayNodeInTree(
	array: NormalizedArrayNode,
	segments: PathSegments,
): NormalizedArrayNode | undefined {
	if (sameSegments(array.pathSegments, segments)) {
		return array
	}

	if (!startsWithSegments(segments, array.pathSegments)) {
		return undefined
	}

	const rowIndex = segments[array.pathSegments.length]
	if (typeof rowIndex !== "number") {
		return undefined
	}

	return findRelativeArrayNode(
		array.children,
		segments.slice(array.pathSegments.length + 1),
	)
}

function findRelativeArrayNode(
	nodes: readonly NormalizedRelativeUiNode[],
	segments: PathSegments,
): NormalizedArrayNode | undefined {
	for (const node of nodes) {
		if (node.kind === "section") {
			const match = findRelativeArrayNode(node.children, segments)
			if (match !== undefined) {
				return match
			}
			continue
		}

		if (
			node.kind !== "array" ||
			!startsWithSegments(segments, node.pathSegments)
		) {
			continue
		}

		if (sameSegments(node.pathSegments, segments)) {
			return node
		}

		const rowIndex = segments[node.pathSegments.length]
		if (typeof rowIndex !== "number") {
			continue
		}

		const match = findRelativeArrayNode(
			node.children,
			segments.slice(node.pathSegments.length + 1),
		)
		if (match !== undefined) {
			return match
		}
	}

	return undefined
}

function applyArrayCommand(
	path: string,
	node: NormalizedArrayNode,
	currentValue: readonly unknown[],
	rowState: ArrayRowState,
	command: ArrayCommand,
):
	| { readonly values: readonly unknown[]; readonly rowState: ArrayRowState }
	| undefined {
	switch (command.type) {
		case "append": {
			const nextKey = createRowKey(path, rowState.nextKeyIndex)
			return {
				values: [...currentValue, createArrayItem(node, command)],
				rowState: freezeArrayRowState({
					keys: [...rowState.keys, nextKey],
					baselineKeys: rowState.baselineKeys,
					nextKeyIndex: rowState.nextKeyIndex + 1,
				}),
			}
		}
		case "insert": {
			assertArrayIndex(command.index, currentValue.length, {
				allowEnd: true,
				label: "insert index",
			})
			const nextKey = createRowKey(path, rowState.nextKeyIndex)
			return {
				values: [
					...currentValue.slice(0, command.index),
					createArrayItem(node, command),
					...currentValue.slice(command.index),
				],
				rowState: freezeArrayRowState({
					keys: [
						...rowState.keys.slice(0, command.index),
						nextKey,
						...rowState.keys.slice(command.index),
					],
					baselineKeys: rowState.baselineKeys,
					nextKeyIndex: rowState.nextKeyIndex + 1,
				}),
			}
		}
		case "remove":
			assertArrayIndex(command.index, currentValue.length, {
				allowEnd: false,
				label: "remove index",
			})
			return {
				values: [
					...currentValue.slice(0, command.index),
					...currentValue.slice(command.index + 1),
				],
				rowState: freezeArrayRowState({
					keys: [
						...rowState.keys.slice(0, command.index),
						...rowState.keys.slice(command.index + 1),
					],
					baselineKeys: rowState.baselineKeys,
					nextKeyIndex: rowState.nextKeyIndex,
				}),
			}
		case "move":
			assertArrayIndex(command.from, currentValue.length, {
				allowEnd: false,
				label: "move source index",
			})
			assertArrayIndex(command.to, currentValue.length, {
				allowEnd: false,
				label: "move destination index",
			})
			if (command.from === command.to) {
				return undefined
			}
			return {
				values: moveArrayItem(currentValue, command.from, command.to),
				rowState: freezeArrayRowState({
					keys: moveArrayItem(rowState.keys, command.from, command.to),
					baselineKeys: rowState.baselineKeys,
					nextKeyIndex: rowState.nextKeyIndex,
				}),
			}
		default:
			throw new TypeError("Unsupported array command")
	}
}

function createArrayItem(
	node: NormalizedArrayNode,
	command: {
		readonly hasValue?: boolean
		readonly value?: unknown
	},
): unknown {
	if (command.hasValue === true) {
		return cloneValue(command.value)
	}

	const itemDefault =
		typeof node.itemDefault === "function"
			? node.itemDefault()
			: node.itemDefault

	return cloneValue(itemDefault)
}

function createInitialRowState(path: string, length: number): ArrayRowState {
	const keys = Array.from({ length }, (_value, index) =>
		createRowKey(path, index),
	)

	return freezeArrayRowState({
		keys,
		baselineKeys: keys,
		nextKeyIndex: length,
	})
}

function reconcileRowState(
	path: string,
	rowState: ArrayRowState,
	length: number,
): ArrayRowState {
	if (rowState.keys.length === length) {
		return rowState
	}

	const keys = rowState.keys.slice(0, length)
	let nextKeyIndex = rowState.nextKeyIndex

	while (keys.length < length) {
		keys.push(createRowKey(path, nextKeyIndex))
		nextKeyIndex += 1
	}

	return freezeArrayRowState({
		keys,
		baselineKeys: rowState.baselineKeys,
		nextKeyIndex,
	})
}

function createRowKey(path: string, index: number): string {
	return `${path}:${index}`
}

function hasRelativeFieldPath(
	nodes: readonly NormalizedRelativeUiNode[],
	segments: PathSegments,
): boolean {
	for (const node of nodes) {
		if (node.kind === "field" && sameSegments(node.pathSegments, segments)) {
			return true
		}

		if (
			node.kind === "section" &&
			hasRelativeFieldPath(node.children, segments)
		) {
			return true
		}

		if (node.kind === "array" && hasNestedArrayFieldPath(node, segments)) {
			return true
		}
	}

	return false
}

function hasNestedArrayFieldPath(
	node: NormalizedArrayNode,
	segments: PathSegments,
): boolean {
	if (
		segments.length <= node.pathSegments.length + 1 ||
		!startsWithSegments(segments, node.pathSegments)
	) {
		return false
	}

	const rowIndex = segments[node.pathSegments.length]
	return (
		typeof rowIndex === "number" &&
		hasRelativeFieldPath(
			node.children,
			segments.slice(node.pathSegments.length + 1),
		)
	)
}

function assertArrayIndex(
	index: number,
	length: number,
	options: {
		readonly allowEnd: boolean
		readonly label: string
	},
): void {
	if (!Number.isSafeInteger(index) || index < 0) {
		throw new TypeError(`${options.label} must be a safe non-negative integer`)
	}

	const max = options.allowEnd ? length : length - 1
	if (index > max) {
		throw new TypeError(`${options.label} ${index} is out of range`)
	}
}

function moveArrayItem<Item>(
	items: readonly Item[],
	from: number,
	to: number,
): readonly Item[] {
	const next = items.slice()
	const [item] = next.splice(from, 1)
	if (item === undefined) {
		throw new TypeError(`Array index ${from} is out of range`)
	}
	next.splice(to, 0, item)
	return next
}

function freezeArrayRowsState(
	rowsState: Record<string, ArrayRowState>,
): ArrayRowsState {
	return Object.freeze(rowsState)
}

function freezeArrayRowState(rowState: {
	readonly keys: readonly string[]
	readonly baselineKeys: readonly string[]
	readonly nextKeyIndex: number
}): ArrayRowState {
	return Object.freeze({
		keys: Object.freeze([...rowState.keys]),
		baselineKeys: Object.freeze([...rowState.baselineKeys]),
		nextKeyIndex: rowState.nextKeyIndex,
	})
}

function startsWithSegments(
	segments: PathSegments,
	prefix: PathSegments,
): boolean {
	return (
		segments.length >= prefix.length &&
		prefix.every((segment, index) => segment === segments[index])
	)
}

function sameSegments(left: PathSegments, right: PathSegments): boolean {
	return (
		left.length === right.length &&
		left.every((segment, index) => segment === right[index])
	)
}
