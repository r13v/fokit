import { hasOwn, isPlainObject } from "./object.js"
import type { PathInput, PathSegment } from "./path.js"
import { parsePath } from "./path.js"

export function cloneValue<Value>(value: Value): Value {
	return cloneValueInternal(value, new WeakSet()) as Value
}

export function cloneMutableValueLeaves<Value>(value: Value): Value {
	return cloneMutableValueLeavesInternal(value, new WeakSet()) as Value
}

export function getPathValue(value: unknown, path: PathInput): unknown {
	let current = value

	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			if (typeof segment !== "number" || segment >= current.length) {
				return undefined
			}
			current = current[segment]
			continue
		}

		if (isPlainObject(current)) {
			if (typeof segment !== "string" || !hasOwn(current, segment)) {
				return undefined
			}
			current = current[segment]
			continue
		}

		return undefined
	}

	return current
}

export function hasPathValue(value: unknown, path: PathInput): boolean {
	let current = value

	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			if (
				typeof segment !== "number" ||
				segment >= current.length ||
				!hasOwn(current, segment)
			) {
				return false
			}
			current = current[segment]
			continue
		}

		if (isPlainObject(current)) {
			if (typeof segment !== "string" || !hasOwn(current, segment)) {
				return false
			}
			current = current[segment]
			continue
		}

		return false
	}

	return true
}

export function setPathValue<Value>(
	value: Value,
	path: PathInput,
	nextValue: unknown,
): Value {
	const segments = parsePath(path)
	const next = setAt(value, segments, 0, nextValue)

	return next as Value
}

export function unsetPathValue<Value>(value: Value, path: PathInput): Value {
	const segments = parsePath(path)
	const next = unsetAt(value, segments, 0)

	return next as Value
}

export function mergePathValue<Value>(
	value: Value,
	path: PathInput,
	patch: unknown,
): Value {
	const current = getPathValue(value, path)
	const merged = mergeValue(current, patch, new WeakSet())

	return setPathValue(value, path, merged)
}

export function isDirtyEqual(left: unknown, right: unknown): boolean {
	return isDirtyEqualInternal(left, right, new WeakMap())
}

function cloneValueInternal(value: unknown, seen: WeakSet<object>): unknown {
	if (value instanceof Date) {
		return new Date(value.getTime())
	}

	if (value instanceof RegExp) {
		const cloned = new RegExp(value.source, value.flags)
		cloned.lastIndex = value.lastIndex
		return cloned
	}

	if (Array.isArray(value)) {
		ensureAcyclic(value, seen)
		const cloned = value.map((item) => cloneValueInternal(item, seen))
		seen.delete(value)
		return cloned
	}

	if (isPlainObject(value)) {
		ensureAcyclic(value, seen)
		const cloned = createPlainClone(value)
		for (const key of Object.keys(value)) {
			defineDataProperty(cloned, key, cloneValueInternal(value[key], seen))
		}
		seen.delete(value)
		return cloned
	}

	return value
}

function cloneMutableValueLeavesInternal(
	value: unknown,
	seen: WeakSet<object>,
): unknown {
	if (value instanceof Date) {
		return new Date(value.getTime())
	}

	if (value instanceof RegExp) {
		const cloned = new RegExp(value.source, value.flags)
		cloned.lastIndex = value.lastIndex
		return cloned
	}

	if (Array.isArray(value)) {
		ensureAcyclic(value, seen)
		let changed = false
		const cloned = value.map((item) => {
			const clonedItem = cloneMutableValueLeavesInternal(item, seen)
			changed ||= clonedItem !== item
			return clonedItem
		})
		seen.delete(value)
		return changed ? cloned : value
	}

	if (isPlainObject(value)) {
		ensureAcyclic(value, seen)
		let changed = false
		const cloned = createPlainClone(value)
		for (const key of Object.keys(value)) {
			const clonedChild = cloneMutableValueLeavesInternal(value[key], seen)
			changed ||= clonedChild !== value[key]
			defineDataProperty(cloned, key, clonedChild)
		}
		seen.delete(value)
		return changed ? cloned : value
	}

	return value
}

function setAt(
	current: unknown,
	segments: readonly PathSegment[],
	index: number,
	nextValue: unknown,
): unknown {
	if (index === segments.length) {
		return isDirtyEqual(current, nextValue) ? current : cloneValue(nextValue)
	}

	const segment = segments[index]
	const child = getWritableChild(current, segment, segments[index + 1])
	const nextChild = setAt(child, segments, index + 1, nextValue)

	if (nextChild === child) {
		return current
	}

	if (Array.isArray(current)) {
		const next = current.slice()
		next[segment as number] = nextChild
		return next
	}

	if (isPlainObject(current)) {
		return { ...current, [segment]: nextChild }
	}

	throw new TypeError("Cannot set through a non-container value")
}

function unsetAt(
	current: unknown,
	segments: readonly PathSegment[],
	index: number,
): unknown {
	if (index === segments.length - 1) {
		return unsetChild(current, segments[index])
	}

	const segment = segments[index]
	const child = getExistingChild(current, segment)
	const nextChild = unsetAt(child, segments, index + 1)

	if (nextChild === child) {
		return current
	}

	if (Array.isArray(current)) {
		const next = current.slice()
		next[segment as number] = nextChild
		return next
	}

	if (isPlainObject(current)) {
		return { ...current, [segment]: nextChild }
	}

	throw new TypeError("Cannot unset through a non-container value")
}

function unsetChild(current: unknown, segment: PathSegment): unknown {
	if (Array.isArray(current)) {
		if (typeof segment !== "number") {
			throw new TypeError("Cannot use an object path segment on an array")
		}
		if (segment >= current.length || current[segment] === undefined) {
			return current
		}
		const next = current.slice()
		next[segment] = undefined
		return next
	}

	if (!isPlainObject(current)) {
		throw new TypeError("Cannot unset through a non-container value")
	}

	if (typeof segment !== "string") {
		throw new TypeError("Cannot use an array index on an object")
	}

	if (!hasOwn(current, segment)) {
		return current
	}

	const next = { ...current }
	delete next[segment]
	return next
}

function mergeValue(
	current: unknown,
	patch: unknown,
	seen: WeakSet<object>,
): unknown {
	if (!isPlainObject(current) || !isPlainObject(patch)) {
		return isDirtyEqual(current, patch)
			? current
			: cloneValueInternal(patch, seen)
	}

	ensureAcyclic(patch, seen)
	let changed = false
	const next = createPlainClone(current)

	for (const key of Object.keys(current)) {
		defineDataProperty(next, key, current[key])
	}

	for (const key of Object.keys(patch)) {
		const currentChild = current[key]
		const nextChild = mergeValue(currentChild, patch[key], seen)
		defineDataProperty(next, key, nextChild)
		changed ||= nextChild !== currentChild
	}

	seen.delete(patch)
	return changed ? next : current
}

function getWritableChild(
	current: unknown,
	segment: PathSegment,
	nextSegment: PathSegment | undefined,
): unknown {
	if (Array.isArray(current)) {
		if (typeof segment !== "number") {
			throw new TypeError("Cannot use an object path segment on an array")
		}
		if (segment >= current.length) {
			throw new TypeError("Cannot create sparse array values")
		}
		return current[segment]
	}

	if (isPlainObject(current)) {
		if (typeof segment !== "string") {
			throw new TypeError("Cannot use an array index on an object")
		}
		if (hasOwn(current, segment)) {
			return current[segment]
		}
		return typeof nextSegment === "number" ? [] : {}
	}

	throw new TypeError("Cannot set through a non-container value")
}

function getExistingChild(current: unknown, segment: PathSegment): unknown {
	if (Array.isArray(current)) {
		if (typeof segment !== "number") {
			throw new TypeError("Cannot use an object path segment on an array")
		}
		if (segment >= current.length) {
			throw new TypeError("Cannot traverse outside an array")
		}
		return current[segment]
	}

	if (isPlainObject(current)) {
		if (typeof segment !== "string") {
			throw new TypeError("Cannot use an array index on an object")
		}
		if (!hasOwn(current, segment)) {
			return undefined
		}
		return current[segment]
	}

	throw new TypeError("Cannot unset through a non-container value")
}

function isDirtyEqualInternal(
	left: unknown,
	right: unknown,
	seen: WeakMap<object, WeakSet<object>>,
): boolean {
	if (Object.is(left, right)) {
		return true
	}

	if (left instanceof Date && right instanceof Date) {
		return Object.is(left.getTime(), right.getTime())
	}

	if (left instanceof RegExp && right instanceof RegExp) {
		return (
			left.source === right.source &&
			left.flags === right.flags &&
			left.lastIndex === right.lastIndex
		)
	}

	if (Array.isArray(left) && Array.isArray(right)) {
		ensurePairAcyclic(left, right, seen)
		const equal =
			left.length === right.length &&
			left.every((item, index) =>
				isDirtyEqualInternal(item, right[index], seen),
			)
		seen.get(left)?.delete(right)
		return equal
	}

	if (isPlainObject(left) && isPlainObject(right)) {
		ensurePairAcyclic(left, right, seen)
		const leftKeys = Object.keys(left)
		const rightKeys = Object.keys(right)
		const equal =
			leftKeys.length === rightKeys.length &&
			leftKeys.every(
				(key) =>
					hasOwn(right, key) &&
					isDirtyEqualInternal(left[key], right[key], seen),
			)
		seen.get(left)?.delete(right)
		return equal
	}

	return false
}

function ensureAcyclic(value: object, seen: WeakSet<object>): void {
	if (seen.has(value)) {
		throw new TypeError("Form values must be acyclic")
	}
	seen.add(value)
}

function ensurePairAcyclic(
	left: object,
	right: object,
	seen: WeakMap<object, WeakSet<object>>,
): void {
	const rightValues = seen.get(left)
	if (rightValues?.has(right)) {
		throw new TypeError("Form values must be acyclic")
	}

	if (rightValues) {
		rightValues.add(right)
		return
	}

	seen.set(left, new WeakSet([right]))
}

function createPlainClone(
	value: Record<string, unknown>,
): Record<string, unknown> {
	return Object.getPrototypeOf(value) === null ? Object.create(null) : {}
}

function defineDataProperty(
	target: Record<string, unknown>,
	key: string,
	value: unknown,
): void {
	Object.defineProperty(target, key, {
		value,
		enumerable: true,
		configurable: true,
		writable: true,
	})
}
