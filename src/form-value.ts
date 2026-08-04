/** Clones editable form data while preserving browser-owned leaf values. */
export function cloneFormValue<Value>(value: Value): Value {
	if (value instanceof Date) return new Date(value) as Value
	if (value instanceof Set) return new Set(value) as Value
	if (typeof Blob !== "undefined" && value instanceof Blob) return value
	if (typeof FileList !== "undefined" && value instanceof FileList) return value
	if (Array.isArray(value)) {
		return value.map((item) => cloneFormValue(item)) as Value
	}
	if (isPlainObject(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, cloneFormValue(item)]),
		) as Value
	}
	return value
}

/** Tests whether a value is a plain object that can be cloned by entries. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === null || prototype === Object.prototype
}
