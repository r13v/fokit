import type { FormMetadata } from "./metadata.js"
import type { ResolvedUiState } from "./resolve-ui.js"
import { cloneValue, isDirtyEqual } from "./value.js"

export type FormIssue = {
	readonly path?: string
	readonly code?: string
	readonly message: string
	readonly source: "manual" | "schema" | "server"
}

export type FormErrors = {
	readonly form: readonly FormIssue[]
	readonly fields: ReadonlyMap<string, readonly FormIssue[]>
}

export type ValidationStatus = "invalid" | "unvalidated" | "valid"

export type FormState<Input> = {
	readonly values: Input
	readonly errors: FormErrors
	readonly isDirty: boolean
	readonly isTouched: boolean
	readonly isValidating: boolean
	readonly isSubmitting: boolean
	readonly validationStatus: ValidationStatus
	readonly submitCount: number
}

export type FormSnapshot<Input, Context = unknown> = FormState<Input> & {
	readonly context: Readonly<Context>
	readonly resolvedUi: ResolvedUiState<Context>
	readonly metadata: FormMetadata
}

const emptyIssues = Object.freeze([]) as readonly FormIssue[]
const emptyFieldIssues = createEmptyReadonlyMap<string, readonly FormIssue[]>()
const emptyErrors = Object.freeze({
	form: emptyIssues,
	fields: emptyFieldIssues,
}) satisfies FormErrors

export type CreateFormSnapshotOptions<Input, Context> = {
	readonly values: Input
	readonly baselineValues: Input
	readonly context: Context
	readonly resolvedUi: ResolvedUiState<Context>
	readonly metadata: FormMetadata
	readonly isTouched: boolean
}

export function createFormSnapshot<Input, Context>({
	values,
	baselineValues,
	context,
	resolvedUi,
	metadata,
	isTouched,
}: CreateFormSnapshotOptions<Input, Context>): FormSnapshot<Input, Context> {
	return Object.freeze({
		values,
		errors: emptyErrors,
		isDirty: !isDirtyEqual(values, baselineValues),
		isTouched,
		isValidating: false,
		isSubmitting: false,
		validationStatus: "unvalidated" as const,
		submitCount: 0,
		context,
		resolvedUi,
		metadata,
	})
}

export function cloneAndFreezeValue<Value>(value: Value): Value {
	return freezeSnapshotValue(cloneValue(value))
}

function freezeSnapshotValue<Value>(value: Value): Value {
	return freezePlainContainers(value, new WeakSet()) as Value
}

function freezePlainContainers(value: unknown, seen: WeakSet<object>): unknown {
	if (Array.isArray(value)) {
		if (seen.has(value)) {
			return value
		}
		seen.add(value)
		for (const item of value) {
			freezePlainContainers(item, seen)
		}
		seen.delete(value)
		return Object.freeze(value)
	}

	if (isPlainObject(value)) {
		if (seen.has(value)) {
			return value
		}
		seen.add(value)
		for (const key of Object.keys(value)) {
			freezePlainContainers(value[key], seen)
		}
		seen.delete(value)
		return Object.freeze(value)
	}

	return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function createEmptyReadonlyMap<K, V>(): ReadonlyMap<K, V> {
	return Object.freeze({
		size: 0,
		get: (_key: K) => undefined,
		has: (_key: K) => false,
		forEach: () => undefined,
		entries: function* emptyEntries(): IterableIterator<[K, V]> {},
		keys: function* emptyKeys(): IterableIterator<K> {},
		values: function* emptyValues(): IterableIterator<V> {},
		[Symbol.iterator]: function* emptyIterator(): IterableIterator<[K, V]> {},
		[Symbol.toStringTag]: "Map",
	}) as unknown as ReadonlyMap<K, V>
}
