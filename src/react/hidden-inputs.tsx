"use client"

import type {
	FormDataEntrySpec,
	FormInput,
	ResolvedArrayNode,
	ResolvedFieldNode,
	ResolvedSectionNode,
	ResolvedUiNode,
	StandardSchema,
} from "../core/index.js"
import { formatPath, getPathValue, parsePath } from "../core/index.js"
import type { ControlDefinitionRegistry } from "./control.js"
import { useFormState } from "./hooks.js"
import type { FormInstance } from "./use-form.js"

type HiddenInputsProps<Schema extends StandardSchema, Context> = {
	readonly form: FormInstance<Schema, Context>
	readonly controls: ControlDefinitionRegistry
	readonly compatibilityOwner?: string
}

type HiddenInputEntry = {
	readonly key: string
	readonly name: string
	readonly value: string
}

type HiddenEntryState = {
	readonly controls: ControlDefinitionRegistry
	readonly values: unknown
	readonly entries: HiddenInputEntry[]
}

type FormDataCompatibilityOptions = {
	readonly owner: string
	readonly rejectUnavailable: boolean
}

const fokitArrayMarkerName = "__fokit.array"

export function HiddenInputs<Schema extends StandardSchema, Context>({
	form,
	controls,
	compatibilityOwner = "Classic form",
}: HiddenInputsProps<Schema, Context>) {
	const entries = useFormState(form, (snapshot) => {
		if (!snapshot.resolvedUi.disabled) {
			assertFormDataCompatible(snapshot, controls, {
				owner: compatibilityOwner,
				rejectUnavailable: false,
			})
		}

		return createHiddenInputEntries(
			snapshot.values,
			snapshot.resolvedUi.ui,
			controls,
		)
	})

	return (
		<>
			{entries.map((entry) => (
				<input
					key={entry.key}
					name={entry.name}
					type="hidden"
					value={entry.value}
				/>
			))}
		</>
	)
}

export function assertFormDataCompatible<Context>(
	snapshot: ReturnType<FormInstance<StandardSchema, Context>["getSnapshot"]>,
	controls: ControlDefinitionRegistry,
	options: FormDataCompatibilityOptions,
): void {
	for (const field of Object.values(snapshot.resolvedUi.fieldsByPath)) {
		if (!hasPathValue(snapshot.values, field.path)) {
			continue
		}

		const value = getPathValue(snapshot.values, field.path)
		const control = controls[field.control]
		if (control === undefined) {
			throw new TypeError(`Unknown control "${field.control}"`)
		}

		if (options.rejectUnavailable && control.formData.mode === "none") {
			throw new TypeError(
				`${options.owner} cannot submit field "${field.path}" because control "${field.control}" uses FormData mode "none"`,
			)
		}

		if (
			control.formData.mode === "native" &&
			(!field.visible || field.disabled) &&
			control.formData.serialize === undefined &&
			value !== undefined
		) {
			throw new TypeError(
				`${options.owner} cannot preserve field "${field.path}" while it is invisible or disabled without a serializer`,
			)
		}
	}
}

function createHiddenInputEntries(
	values: FormInput<StandardSchema>,
	nodes: readonly ResolvedUiNode[],
	controls: ControlDefinitionRegistry,
): readonly HiddenInputEntry[] {
	const state: HiddenEntryState = {
		controls,
		values,
		entries: [],
	}

	appendNodeEntries(nodes, "", state)
	return Object.freeze([...state.entries])
}

function appendNodeEntries(
	nodes: readonly ResolvedUiNode[],
	pathPrefix: string,
	state: HiddenEntryState,
): void {
	for (const node of nodes) {
		switch (node.kind) {
			case "field":
				appendFieldEntries(node, pathPrefix, state)
				break
			case "render":
				break
			case "section":
				appendSectionEntries(node, pathPrefix, state)
				break
			case "array":
				appendArrayEntries(node, pathPrefix, state)
				break
			default:
				throw new TypeError("Unknown resolved UI node kind")
		}
	}
}

function appendFieldEntries(
	node: ResolvedFieldNode,
	pathPrefix: string,
	state: HiddenEntryState,
): void {
	const path = joinPath(pathPrefix, node.path)
	if (!hasPathValue(state.values, path)) {
		return
	}

	const control = state.controls[node.control]
	if (control === undefined) {
		throw new TypeError(`Unknown control "${node.control}"`)
	}

	const formData = control.formData
	const serialize =
		formData.mode === "hidden"
			? formData.serialize
			: formData.mode === "native" && (!node.visible || node.disabled)
				? formData.serialize
				: undefined

	if (serialize === undefined) {
		return
	}

	appendSerializedEntries(
		serialize(getPathValue(state.values, path) as never, {
			path,
			name: path,
			options: (node.options ?? {}) as never,
			context: node.context as never,
		}),
		state,
	)
}

function appendSectionEntries(
	node: ResolvedSectionNode,
	pathPrefix: string,
	state: HiddenEntryState,
): void {
	appendNodeEntries(node.children, pathPrefix, state)
}

function appendArrayEntries(
	node: ResolvedArrayNode,
	pathPrefix: string,
	state: HiddenEntryState,
): void {
	const path = joinPath(pathPrefix, node.path)
	if (!hasPathValue(state.values, path)) {
		return
	}

	const value = getPathValue(state.values, path)
	if (!Array.isArray(value)) {
		throw new TypeError(`Array path "${path}" does not resolve to an array`)
	}

	pushHiddenInputEntry(state, fokitArrayMarkerName, path)

	for (const children of node.itemChildren) {
		appendNodeEntries(children, "", state)
	}
}

function appendSerializedEntries(
	entries: readonly FormDataEntrySpec[],
	state: HiddenEntryState,
): void {
	for (const entry of entries) {
		if (entry.kind === "array") {
			pushHiddenInputEntry(state, fokitArrayMarkerName, formatPath(entry.name))
			continue
		}

		pushHiddenInputEntry(state, formatPath(entry.name), entry.value)
	}
}

function joinPath(prefix: string, path: string): string {
	return prefix.length === 0
		? formatPath(path)
		: formatPath(`${prefix}.${path}`)
}

function pushHiddenInputEntry(
	state: HiddenEntryState,
	name: string,
	value: string,
): void {
	state.entries.push({
		key: `${state.entries.length}:${name}:${value}`,
		name,
		value,
	})
}

function hasPathValue(value: unknown, path: string): boolean {
	let current = value

	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			if (
				typeof segment !== "number" ||
				segment >= current.length ||
				!Object.hasOwn(current, segment)
			) {
				return false
			}
			current = current[segment]
			continue
		}

		if (isPlainObject(current)) {
			if (typeof segment !== "string" || !Object.hasOwn(current, segment)) {
				return false
			}
			current = current[segment]
			continue
		}

		return false
	}

	return true
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}
