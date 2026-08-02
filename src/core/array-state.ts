import type {
	NormalizedArrayNode,
	NormalizedRelativeUiNode,
	RuntimeNormalizedFormDefinition,
} from "./definition.js"
import type { RowIdentityChange } from "./form-events.js"
import {
	formatPath,
	type PathInput,
	type PathSegments,
	parsePath,
} from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import { createSetChange, type NormalizedValueChange } from "./transaction.js"
import { cloneValue, getPathValue } from "./value.js"

const rowIdentityStateBrand: unique symbol = Symbol("form-please.rowIdentity")

type RowIdentityEntry = {
	readonly keys: readonly string[]
	readonly nextKeyIndex: number
}

export type RowIdentityState = {
	readonly [rowIdentityStateBrand]: true
}

type RowIdentityEntries = Readonly<Record<string, RowIdentityEntry>>

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
	readonly rowIdentity: RowIdentityEntry
}

export function createRowIdentityState<Schema extends StandardSchema>(
	definition: RuntimeNormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
): RowIdentityState {
	const rowsByPath = Object.create(null) as Record<string, RowIdentityEntry>

	for (const array of Object.values(definition.arraysByPath)) {
		addConcreteArrayRowStates(rowsByPath, array, values, array.path)
	}

	return freezeRowIdentityState(rowsByPath)
}

function addConcreteArrayRowStates(
	rowsByPath: Record<string, RowIdentityEntry>,
	array: NormalizedArrayNode,
	values: unknown,
	path: string,
): void {
	const value = getPathValue(values, path)
	const length = Array.isArray(value) ? value.length : 0
	rowsByPath[path] = createInitialRowIdentity(path, length)

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
	rowsByPath: Record<string, RowIdentityEntry>,
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
	rowIdentity: RowIdentityState,
	command: ArrayCommand,
): ArrayCommandChange | undefined {
	const currentValue = getPathValue(values, path)
	if (!Array.isArray(currentValue)) {
		throw new TypeError(`Array path "${path}" does not resolve to an array`)
	}

	const existingRowState =
		rowIdentityEntries(rowIdentity)[path] ?? createInitialRowIdentity(path, 0)
	const reservedKeys = collectRowIdentityKeys(rowIdentity)
	const previousRowState = reconcileRowState(
		path,
		existingRowState,
		currentValue.length,
		reservedKeys,
	)
	const previousKeys = previousRowState.keys.slice(0, currentValue.length)
	const result = applyArrayCommand(
		path,
		node,
		currentValue,
		previousRowState,
		command,
		reservedKeys,
	)

	if (result === undefined) {
		return undefined
	}

	return Object.freeze({
		changes: Object.freeze([createSetChange(path, result.values)]),
		previousKeys: Object.freeze(previousKeys),
		nextKeys: result.rowIdentity.keys,
		rowIdentity: result.rowIdentity,
	})
}

export function replaceRowIdentity(
	rowIdentity: RowIdentityState,
	path: string,
	entry: RowIdentityEntry,
): RowIdentityState {
	return freezeRowIdentityState({
		...rowIdentityEntries(rowIdentity),
		[path]: entry,
	})
}

export function reindexRowIdentity(
	rowIdentity: RowIdentityState,
	arrayPath: string,
	previousKeys: readonly string[],
	nextKeys: readonly string[],
): RowIdentityState {
	let changed = false
	const nextRowsState = Object.create(null) as Record<string, RowIdentityEntry>

	for (const [path, rowState] of Object.entries(
		rowIdentityEntries(rowIdentity),
	)) {
		const nextPath = reindexArrayPath(path, arrayPath, previousKeys, nextKeys)
		if (nextPath === undefined) {
			changed = true
			continue
		}

		changed ||= nextPath !== path
		nextRowsState[nextPath] = rowState
	}

	return changed ? freezeRowIdentityState(nextRowsState) : rowIdentity
}

export function getRowIdentityKeys(
	rowIdentity: RowIdentityState,
	path: string,
): readonly string[] | undefined {
	return rowIdentityEntries(rowIdentity)[path]?.keys
}

export function getRowIdentityNextKeyIndex(
	rowIdentity: RowIdentityState,
	path: string,
): number | undefined {
	return rowIdentityEntries(rowIdentity)[path]?.nextKeyIndex
}

export function createRowIdentityStateFromEntries(
	entries: readonly {
		readonly path: string
		readonly keys: readonly string[]
		readonly nextKeyIndex: number
	}[],
): RowIdentityState {
	const rowsByPath = Object.create(null) as Record<string, RowIdentityEntry>
	for (const entry of entries) {
		const path = formatPath(entry.path)
		if (rowsByPath[path] !== undefined) {
			throw new TypeError(`Duplicate row identity path "${path}"`)
		}
		rowsByPath[path] = createRowIdentityEntry(
			path,
			entry.keys,
			entry.nextKeyIndex,
		)
	}
	return freezeRowIdentityState(rowsByPath)
}

export function cloneRowIdentityState(
	rowIdentity: RowIdentityState,
): RowIdentityState {
	return createRowIdentityStateFromEntries(
		Object.entries(rowIdentityEntries(rowIdentity)).map(([path, entry]) => ({
			path,
			keys: entry.keys,
			nextKeyIndex: entry.nextKeyIndex,
		})),
	)
}

export function reconcileRowIdentityState<Schema extends StandardSchema>(
	definition: RuntimeNormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	previous: RowIdentityState,
): RowIdentityState {
	const initial = createRowIdentityState(definition, values)
	const previousEntries = rowIdentityEntries(previous)
	const nextEntries = Object.create(null) as Record<string, RowIdentityEntry>
	const reservedKeys = collectRowIdentityKeys(previous)

	for (const [path, entry] of Object.entries(rowIdentityEntries(initial))) {
		nextEntries[path] = reconcileRowState(
			path,
			previousEntries[path] ?? createInitialRowIdentity(path, 0),
			entry.keys.length,
			reservedKeys,
		)
	}

	return freezeRowIdentityState(nextEntries)
}

export function createRowIdentityChanges(
	previous: RowIdentityState,
	next: RowIdentityState,
): readonly RowIdentityChange[] {
	const previousEntries = rowIdentityEntries(previous)
	const nextEntries = rowIdentityEntries(next)
	const changes: RowIdentityChange[] = []

	for (const path of Object.keys(previousEntries)) {
		if (nextEntries[path] === undefined) {
			changes.push(Object.freeze({ type: "array/deleted", path }))
		}
	}

	for (const [path, entry] of Object.entries(nextEntries)) {
		const previousEntry = previousEntries[path]
		if (
			previousEntry !== undefined &&
			previousEntry.nextKeyIndex === entry.nextKeyIndex &&
			previousEntry.keys.length === entry.keys.length &&
			previousEntry.keys.every((key, index) => key === entry.keys[index])
		) {
			continue
		}

		changes.push(
			Object.freeze({
				type: "array/replaced",
				path,
				keys: entry.keys,
				nextKeyIndex: entry.nextKeyIndex,
			}),
		)
	}

	return Object.freeze(changes)
}

export function reconcileRowIdentityPaths(
	paths: Iterable<string>,
	previous: RowIdentityState,
	next: RowIdentityState,
): ReadonlySet<string> {
	const originalPaths = [...paths]
	const previousEntries = rowIdentityEntries(previous)
	const nextEntries = rowIdentityEntries(next)
	const orderedPaths = Object.keys(previousEntries).sort(
		(left, right) => parsePath(left).length - parsePath(right).length,
	)
	const result = new Set<string>()

	for (const originalPath of originalPaths) {
		let path: string | undefined = originalPath
		for (const previousArrayPath of orderedPaths) {
			if (path === undefined) break
			const currentArrayPath = reconcileParentArrayPath(
				previousArrayPath,
				previousEntries,
				nextEntries,
				orderedPaths,
			)
			if (currentArrayPath === undefined) continue
			path = reindexArrayPath(
				path,
				currentArrayPath,
				previousEntries[previousArrayPath]?.keys ?? [],
				nextEntries[currentArrayPath]?.keys ?? [],
			)
		}
		if (path !== undefined) result.add(path)
	}

	if (
		paths instanceof Set &&
		result.size === paths.size &&
		[...result].every((path) => paths.has(path))
	) {
		return paths
	}

	return result
}

function reconcileParentArrayPath(
	path: string,
	previousEntries: RowIdentityEntries,
	nextEntries: RowIdentityEntries,
	orderedPaths: readonly string[],
): string | undefined {
	let reconciled: string | undefined = path
	for (const parentPath of orderedPaths) {
		if (parentPath === path || reconciled === undefined) break
		const nextParentPath = reconcileParentArrayPath(
			parentPath,
			previousEntries,
			nextEntries,
			orderedPaths,
		)
		if (nextParentPath === undefined) continue
		reconciled = reindexArrayPath(
			reconciled,
			parentPath,
			previousEntries[parentPath]?.keys ?? [],
			nextEntries[nextParentPath]?.keys ?? [],
		)
	}
	return reconciled
}

export function reduceRowIdentity(
	rowIdentity: RowIdentityState,
	changes: readonly RowIdentityChange[],
): RowIdentityState {
	if (changes.length === 0) {
		return rowIdentity
	}

	const entries = Object.create(null) as Record<string, RowIdentityEntry>
	for (const [path, entry] of Object.entries(rowIdentityEntries(rowIdentity))) {
		entries[path] = entry
	}

	for (const change of changes) {
		applyRowIdentityChange(entries, change)
	}

	return freezeRowIdentityState(entries)
}

export function validateRowIdentity(
	rowIdentity: RowIdentityState,
	values: unknown,
): void {
	const allKeys = new Set<string>()
	for (const [path, entry] of Object.entries(rowIdentityEntries(rowIdentity))) {
		const value = getPathValue(values, path)
		if (!Array.isArray(value)) {
			throw new TypeError(`Row identity path "${path}" is not an array`)
		}
		if (value.length !== entry.keys.length) {
			throw new TypeError(`Row identity at "${path}" does not match its array`)
		}
		for (const key of entry.keys) {
			if (allKeys.has(key)) {
				throw new TypeError(`Duplicate row identity key "${key}"`)
			}
			allKeys.add(key)
		}
	}
}

export function validateRestoredRowIdentity<Schema extends StandardSchema>(
	definition: RuntimeNormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	rowIdentity: RowIdentityState,
): void {
	validateRowIdentity(rowIdentity, values)
	const expectedEntries = rowIdentityEntries(
		createRowIdentityState(definition, values),
	)
	const entries = rowIdentityEntries(rowIdentity)

	for (const path of Object.keys(expectedEntries)) {
		const entry = entries[path]
		if (entry === undefined) {
			throw new TypeError(`Row identity is missing array path "${path}"`)
		}
		if (entry.nextKeyIndex === Number.MAX_SAFE_INTEGER) {
			throw new TypeError(
				`Row identity counter at "${path}" must reserve a safe successor`,
			)
		}
	}

	for (const path of Object.keys(entries)) {
		if (expectedEntries[path] === undefined) {
			throw new TypeError(`Row identity has unexpected array path "${path}"`)
		}
	}
}

function applyRowIdentityChange(
	entries: Record<string, RowIdentityEntry>,
	change: RowIdentityChange,
): void {
	switch (change.type) {
		case "array/initialized":
		case "array/replaced":
			entries[change.path] = createRowIdentityEntry(
				change.path,
				change.keys,
				change.nextKeyIndex,
			)
			return
		case "array/inserted": {
			const entry = requireRowIdentityEntry(entries, change.path)
			if (change.nextKeyIndex !== entry.nextKeyIndex + 1) {
				throw new TypeError(
					"Inserted row identity must advance the key counter exactly once",
				)
			}
			assertArrayIndex(change.index, entry.keys.length, {
				allowEnd: true,
				label: "row identity insert index",
			})
			entries[change.path] = createRowIdentityEntry(
				change.path,
				[
					...entry.keys.slice(0, change.index),
					change.key,
					...entry.keys.slice(change.index),
				],
				change.nextKeyIndex,
			)
			return
		}
		case "array/removed": {
			const entry = requireRowIdentityEntry(entries, change.path)
			assertExpectedKey(entry, change.index, change.key)
			entries[change.path] = createRowIdentityEntry(
				change.path,
				[
					...entry.keys.slice(0, change.index),
					...entry.keys.slice(change.index + 1),
				],
				entry.nextKeyIndex,
			)
			return
		}
		case "array/moved": {
			const entry = requireRowIdentityEntry(entries, change.path)
			assertExpectedKey(entry, change.from, change.key)
			assertArrayIndex(change.to, entry.keys.length, {
				allowEnd: false,
				label: "row identity move destination",
			})
			entries[change.path] = createRowIdentityEntry(
				change.path,
				moveArrayItem(entry.keys, change.from, change.to),
				entry.nextKeyIndex,
			)
			return
		}
		case "array/path-reindexed": {
			const entry = requireRowIdentityEntry(entries, change.previousPath)
			if (entries[change.path] !== undefined) {
				throw new TypeError(`Row identity path "${change.path}" already exists`)
			}
			delete entries[change.previousPath]
			entries[change.path] = entry
			return
		}
		case "array/paths-reindexed": {
			const movedEntries = change.paths.map(({ previousPath, path }) => ({
				path,
				entry: requireRowIdentityEntry(entries, previousPath),
			}))
			for (const { previousPath } of change.paths) {
				delete entries[previousPath]
			}
			for (const { path, entry } of movedEntries) {
				if (entries[path] !== undefined) {
					throw new TypeError(`Row identity path "${path}" already exists`)
				}
				entries[path] = entry
			}
			return
		}
		case "array/deleted":
			delete entries[change.path]
			return
	}
}

function createRowIdentityEntry(
	path: string,
	keys: readonly string[],
	nextKeyIndex: number,
): RowIdentityEntry {
	if (!Number.isSafeInteger(nextKeyIndex) || nextKeyIndex < keys.length) {
		throw new TypeError("Row identity counter must cover every assigned key")
	}
	if (new Set(keys).size !== keys.length) {
		throw new TypeError("Row identity keys must be unique")
	}
	const generatedKeyPrefix = `${path}:`
	for (const key of keys) {
		if (!key.startsWith(generatedKeyPrefix)) continue
		const suffix = key.slice(generatedKeyPrefix.length)
		const index = Number(suffix)
		if (
			Number.isSafeInteger(index) &&
			index >= 0 &&
			String(index) === suffix &&
			index >= nextKeyIndex
		) {
			throw new TypeError(
				"Row identity counter must exceed every generated key index",
			)
		}
	}
	return freezeRowIdentityEntry({ keys, nextKeyIndex })
}

function requireRowIdentityEntry(
	entries: Readonly<Record<string, RowIdentityEntry>>,
	path: string,
): RowIdentityEntry {
	const entry = entries[path]
	if (entry === undefined) {
		throw new TypeError(`Unknown row identity path "${path}"`)
	}
	return entry
}

function assertExpectedKey(
	entry: RowIdentityEntry,
	index: number,
	key: string,
): void {
	assertArrayIndex(index, entry.keys.length, {
		allowEnd: false,
		label: "row identity index",
	})
	if (entry.keys[index] !== key) {
		throw new TypeError(`Row identity key "${key}" is not at index ${index}`)
	}
}

function reindexArrayPath(
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
	definition: RuntimeNormalizedFormDefinition<Schema>,
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
	definition: RuntimeNormalizedFormDefinition<Schema>,
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
	rowState: RowIdentityEntry,
	command: ArrayCommand,
	reservedKeys: Set<string>,
):
	| {
			readonly values: readonly unknown[]
			readonly rowIdentity: RowIdentityEntry
	  }
	| undefined {
	switch (command.type) {
		case "append": {
			const allocated = allocateRowKey(
				path,
				rowState.nextKeyIndex,
				reservedKeys,
			)
			return {
				values: [...currentValue, createArrayItem(node, command)],
				rowIdentity: freezeRowIdentityEntry({
					keys: [...rowState.keys, allocated.key],
					nextKeyIndex: allocated.nextKeyIndex,
				}),
			}
		}
		case "insert": {
			assertArrayIndex(command.index, currentValue.length, {
				allowEnd: true,
				label: "insert index",
			})
			const allocated = allocateRowKey(
				path,
				rowState.nextKeyIndex,
				reservedKeys,
			)
			return {
				values: [
					...currentValue.slice(0, command.index),
					createArrayItem(node, command),
					...currentValue.slice(command.index),
				],
				rowIdentity: freezeRowIdentityEntry({
					keys: [
						...rowState.keys.slice(0, command.index),
						allocated.key,
						...rowState.keys.slice(command.index),
					],
					nextKeyIndex: allocated.nextKeyIndex,
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
				rowIdentity: freezeRowIdentityEntry({
					keys: [
						...rowState.keys.slice(0, command.index),
						...rowState.keys.slice(command.index + 1),
					],
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
				rowIdentity: freezeRowIdentityEntry({
					keys: moveArrayItem(rowState.keys, command.from, command.to),
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

function createInitialRowIdentity(
	path: string,
	length: number,
): RowIdentityEntry {
	const keys = Array.from({ length }, (_value, index) =>
		createRowKey(path, index),
	)

	return freezeRowIdentityEntry({
		keys,
		nextKeyIndex: length,
	})
}

function reconcileRowState(
	path: string,
	rowState: RowIdentityEntry,
	length: number,
	reservedKeys: Set<string> = new Set(rowState.keys),
): RowIdentityEntry {
	if (rowState.keys.length === length) {
		return rowState
	}

	const keys = rowState.keys.slice(0, length)
	let nextKeyIndex = rowState.nextKeyIndex

	while (keys.length < length) {
		const allocated = allocateRowKey(path, nextKeyIndex, reservedKeys)
		keys.push(allocated.key)
		nextKeyIndex = allocated.nextKeyIndex
	}

	return freezeRowIdentityEntry({
		keys,
		nextKeyIndex,
	})
}

function createRowKey(path: string, index: number): string {
	return `${path}:${index}`
}

function allocateRowKey(
	path: string,
	nextKeyIndex: number,
	reservedKeys: Set<string>,
): { readonly key: string; readonly nextKeyIndex: number } {
	let index = nextKeyIndex
	let key = createRowKey(path, index)
	while (reservedKeys.has(key)) {
		if (index >= Number.MAX_SAFE_INTEGER) {
			throw new TypeError("Row identity counter has no safe successor")
		}
		index += 1
		key = createRowKey(path, index)
	}
	if (index >= Number.MAX_SAFE_INTEGER) {
		throw new TypeError("Row identity counter has no safe successor")
	}
	reservedKeys.add(key)
	return Object.freeze({ key, nextKeyIndex: index + 1 })
}

function collectRowIdentityKeys(rowIdentity: RowIdentityState): Set<string> {
	const keys = new Set<string>()
	for (const entry of Object.values(rowIdentityEntries(rowIdentity))) {
		for (const key of entry.keys) keys.add(key)
	}
	return keys
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
	next.splice(to, 0, item as Item)
	return next
}

function freezeRowIdentityState(
	rowsState: Record<string, RowIdentityEntry>,
): RowIdentityState {
	return Object.freeze(rowsState) as unknown as RowIdentityState
}

function freezeRowIdentityEntry(rowState: {
	readonly keys: readonly string[]
	readonly nextKeyIndex: number
}): RowIdentityEntry {
	return Object.freeze({
		keys: Object.freeze([...rowState.keys]),
		nextKeyIndex: rowState.nextKeyIndex,
	})
}

function rowIdentityEntries(rowIdentity: RowIdentityState): RowIdentityEntries {
	return rowIdentity as unknown as RowIdentityEntries
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
