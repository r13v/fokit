import type { PathInput } from "./path.js"
import { formatPath, isDescendantPath, isSamePath } from "./path.js"
import type { CanonicalArrayIndex, FieldPath } from "./path-types.js"
import { isDirtyEqual, setPathValue, unsetPathValue } from "./value.js"

type Primitive = bigint | boolean | null | number | string | symbol | undefined
type FileListLike = {
	readonly length: number
	item(index: number): unknown
}
type NativeLeaf = Blob | Date | File | FileListLike | RegExp
type CallableLeaf = (...args: never[]) => unknown
type Leaf = CallableLeaf | NativeLeaf | Primitive
type ArrayIndex = CanonicalArrayIndex

type StrictSegmentValue<
	Value,
	Segment extends string,
> = Segment extends ArrayIndex
	? NonNullable<Value> extends readonly (infer Item)[]
		? Item
		: never
	: Segment extends keyof NonNullable<Value>
		? NonNullable<Value>[Segment]
		: never

type StrictPathValue<
	Value,
	Path extends string,
> = Path extends `${infer Segment}.${infer Rest}`
	? StrictPathValue<StrictSegmentValue<Value, Segment>, Rest>
	: StrictSegmentValue<Value, Path>

export type OptionalFieldPath<Value> =
	FieldPath<Value> extends infer Path
		? Path extends FieldPath<Value>
			? undefined extends StrictPathValue<Value, Path>
				? Path
				: never
			: never
		: never

export type FormDeepPartial<Value> = Value extends Leaf
	? Value
	: Value extends readonly unknown[]
		? Value
		: Value extends object
			? {
					readonly [Key in keyof Value]?: FormDeepPartial<Value[Key]>
				}
			: Value

type RawValueChange =
	| {
			readonly type: "set"
			readonly path: string
			readonly value: unknown
	  }
	| {
			readonly type: "unset"
			readonly path: string
	  }

export type ValueChange<Input = never> = [Input] extends [never]
	? RawValueChange
	:
			| {
					readonly type: "set"
					readonly path: FieldPath<Input>
					readonly value: unknown
			  }
			| {
					readonly type: "unset"
					readonly path: OptionalFieldPath<Input>
			  }

export type NormalizedValueChange = RawValueChange

export type ApplyValueChangesResult<Value> = {
	readonly values: Value
	readonly changes: readonly NormalizedValueChange[]
}

const numericLikePattern = /^[+-]?\d+(?:e[+-]?\d+)?$/i
const bracketPattern = /[[\]]/
const unsafePropertySegments = new Set([
	"__proto__",
	"constructor",
	"prototype",
])

export function createSetChange(
	path: PathInput,
	value: unknown,
): NormalizedValueChange {
	return Object.freeze({
		type: "set",
		path: formatPath(path),
		value,
	})
}

export function createUnsetChange(path: PathInput): NormalizedValueChange {
	return Object.freeze({
		type: "unset",
		path: formatPath(path),
	})
}

export function createDeepPartialChanges(
	patch: unknown,
): readonly NormalizedValueChange[] {
	if (!isPlainObject(patch)) {
		throw new TypeError("setValues expects a plain object patch")
	}

	const changes: NormalizedValueChange[] = []
	collectDeepPartialChanges(patch, "", changes)
	return Object.freeze(changes)
}

function normalizeValueChanges(
	changes: readonly ValueChange[],
): readonly NormalizedValueChange[] {
	if (!Array.isArray(changes)) {
		throw new TypeError("Value changes must be an array")
	}

	let normalized: NormalizedValueChange[] = []
	for (const change of changes) {
		normalized = appendCompactedChange(normalized, normalizeValueChange(change))
	}

	return Object.freeze(normalized)
}

export function applyValueChanges<Value>(
	values: Value,
	changes: readonly ValueChange[] | readonly NormalizedValueChange[],
): ApplyValueChangesResult<Value> {
	const normalized = normalizeValueChanges(changes as readonly ValueChange[])
	let nextValues = values
	const applied: NormalizedValueChange[] = []

	for (const change of normalized) {
		const changedValues = applyValueChange(nextValues, change)
		if (isDirtyEqual(changedValues, nextValues)) {
			continue
		}

		nextValues = changedValues
		applied.push(change)
	}

	if (isDirtyEqual(nextValues, values)) {
		return {
			values,
			changes: Object.freeze([]),
		}
	}

	return {
		values: nextValues,
		changes: Object.freeze(applied),
	}
}

function normalizeValueChange(change: ValueChange): NormalizedValueChange {
	if (!isPlainObject(change)) {
		throw new TypeError("Value change must be an object")
	}

	if (change.type === "set") {
		return createSetChange(change.path, change.value)
	}

	if (change.type === "unset") {
		return createUnsetChange(change.path)
	}

	const unsupported = change as { readonly type?: unknown }
	throw new TypeError(
		`Unsupported value change type "${String(unsupported.type)}"`,
	)
}

function applyValueChange<Value>(
	values: Value,
	change: NormalizedValueChange,
): Value {
	switch (change.type) {
		case "set":
			return setPathValue(values, change.path, change.value)
		case "unset":
			return unsetPathValue(values, change.path)
		default:
			throw new TypeError("Unsupported normalized value change")
	}
}

function appendCompactedChange(
	changes: readonly NormalizedValueChange[],
	change: NormalizedValueChange,
): NormalizedValueChange[] {
	return [
		...changes.filter(
			(existing) =>
				!isSamePath(existing.path, change.path) &&
				!isDescendantPath(existing.path, change.path),
		),
		change,
	]
}

function collectDeepPartialChanges(
	patch: Record<string, unknown>,
	parentPath: string,
	changes: NormalizedValueChange[],
): void {
	for (const key of Object.keys(patch)) {
		validatePatchSegment(key, parentPath.length === 0)
		const path = parentPath.length === 0 ? key : `${parentPath}.${key}`
		const value = patch[key]

		if (isPlainObject(value)) {
			collectDeepPartialChanges(value, path, changes)
			continue
		}

		changes.push(createSetChange(path, value))
	}
}

function validatePatchSegment(segment: string, topLevel: boolean): void {
	if (segment.length === 0) {
		throw new TypeError("setValues patch keys must not be empty")
	}

	if (segment.includes(".")) {
		throw new TypeError(`setValues patch key "${segment}" contains a dot`)
	}

	if (bracketPattern.test(segment)) {
		throw new TypeError(
			`setValues patch key "${segment}" uses unsupported bracket syntax`,
		)
	}

	if (unsafePropertySegments.has(segment)) {
		throw new TypeError(`setValues patch key "${segment}" is reserved`)
	}

	if (topLevel && segment === "__fokit") {
		throw new TypeError("setValues patch top-level __fokit key is reserved")
	}

	if (numericLikePattern.test(segment)) {
		throw new TypeError(`setValues patch key "${segment}" cannot be an index`)
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}
