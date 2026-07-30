import type { ControlRegistry } from "./control-types.js"
import type { PathSegments } from "./path.js"
import { formatPath, parsePath } from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import type {
	GridColumns,
	GridSpan,
	Resolvable,
	UiNode,
	ValuePolicy,
} from "./ui-types.js"
import { cloneValue } from "./value.js"

type NodeKind = "array" | "field" | "section"
type NoInferValue<Value> = [Value][Value extends unknown ? 0 : never]
type NodeScope = {
	readonly idPrefix: string
	readonly pathScope: string
	readonly relative: boolean
}

type NormalizationState = {
	readonly controls: ControlRegistry
	readonly nodeIds: Set<string>
	readonly pathsByScope: Map<string, Set<string>>
	readonly nodes: NormalizedUiNode[]
	readonly nodesById: Record<string, NormalizedUiNode>
	readonly fieldsByPath: Record<string, NormalizedFieldNode>
	readonly arraysByPath: Record<string, NormalizedArrayNode>
}

type RawFieldNode = Record<string, unknown> & {
	readonly kind: "field"
	readonly id?: unknown
	readonly path?: unknown
	readonly control?: unknown
	readonly label?: unknown
	readonly description?: unknown
	readonly required?: unknown
	readonly disabled?: unknown
	readonly readOnly?: unknown
	readonly visible?: unknown
	readonly valuePolicy?: unknown
	readonly className?: unknown
	readonly span?: unknown
	readonly options?: unknown
}

type RawSectionNode = Record<string, unknown> & {
	readonly kind: "section"
	readonly id?: unknown
	readonly title?: unknown
	readonly description?: unknown
	readonly visible?: unknown
	readonly disabled?: unknown
	readonly readOnly?: unknown
	readonly className?: unknown
	readonly columns?: unknown
	readonly span?: unknown
	readonly children?: unknown
}

type RawArrayNode = Record<string, unknown> & {
	readonly kind: "array"
	readonly id?: unknown
	readonly path?: unknown
	readonly label?: unknown
	readonly description?: unknown
	readonly visible?: unknown
	readonly disabled?: unknown
	readonly readOnly?: unknown
	readonly className?: unknown
	readonly span?: unknown
	readonly itemDefault?: unknown
	readonly children?: unknown
}

type NormalizedNodeBase = {
	readonly id: string
	readonly kind: NodeKind
	readonly parentId?: string
	readonly scopePath: string
	readonly className?: string
	readonly span?: GridSpan
	readonly visible?: Resolvable<boolean>
	readonly disabled?: Resolvable<boolean>
	readonly readOnly?: Resolvable<boolean>
}

export type NormalizedFieldNode = NormalizedNodeBase & {
	readonly kind: "field"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly control: string
	readonly label?: Resolvable<string>
	readonly description?: Resolvable<string>
	readonly required?: Resolvable<boolean>
	readonly valuePolicy: ValuePolicy
	readonly options?: Resolvable<unknown>
}

export type NormalizedSectionNode = NormalizedNodeBase & {
	readonly kind: "section"
	readonly title?: Resolvable<string>
	readonly description?: Resolvable<string>
	readonly columns: GridColumns
	readonly children: readonly NormalizedUiNode[]
}

export type NormalizedArrayNode = NormalizedNodeBase & {
	readonly kind: "array"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly label?: Resolvable<string>
	readonly description?: Resolvable<string>
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly NormalizedUiNode[]
}

export type NormalizedUiNode =
	| NormalizedArrayNode
	| NormalizedFieldNode
	| NormalizedSectionNode

export type FormDefinition<
	Schema extends StandardSchema = StandardSchema,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
> = {
	readonly schema: Schema
	readonly ui: readonly UiNode<
		FormInput<NoInferValue<Schema>>,
		Controls,
		Context
	>[]
}

export type NormalizeDefinitionInput<
	Schema extends StandardSchema,
	Controls extends ControlRegistry,
	Context,
> = FormDefinition<Schema, Controls, Context> & {
	readonly controls: Controls
}

export type NormalizedFormDefinition<
	Schema extends StandardSchema = StandardSchema,
> = {
	readonly schema: Schema
	readonly ui: readonly NormalizedUiNode[]
	readonly nodes: readonly NormalizedUiNode[]
	readonly nodesById: Readonly<Record<string, NormalizedUiNode>>
	readonly fieldsByPath: Readonly<Record<string, NormalizedFieldNode>>
	readonly arraysByPath: Readonly<Record<string, NormalizedArrayNode>>
}

export function normalizeDefinition<
	Schema extends StandardSchema,
	Controls extends ControlRegistry,
	Context = unknown,
>(
	input: NormalizeDefinitionInput<Schema, Controls, Context>,
): NormalizedFormDefinition<Schema> {
	const state: NormalizationState = {
		controls: input.controls,
		nodeIds: new Set(),
		pathsByScope: new Map(),
		nodes: [],
		nodesById: Object.create(null) as Record<string, NormalizedUiNode>,
		fieldsByPath: Object.create(null) as Record<string, NormalizedFieldNode>,
		arraysByPath: Object.create(null) as Record<string, NormalizedArrayNode>,
	}

	const ui = normalizeChildren(input.ui as readonly unknown[], state, {
		idPrefix: "",
		pathScope: "",
		relative: false,
	})

	return Object.freeze({
		schema: input.schema,
		ui,
		nodes: Object.freeze([...state.nodes]),
		nodesById: Object.freeze({ ...state.nodesById }),
		fieldsByPath: Object.freeze({ ...state.fieldsByPath }),
		arraysByPath: Object.freeze({ ...state.arraysByPath }),
	}) as NormalizedFormDefinition<Schema>
}

function normalizeChildren(
	nodes: readonly unknown[],
	state: NormalizationState,
	scope: NodeScope,
	parentId?: string,
	parentColumns?: GridColumns,
): readonly NormalizedUiNode[] {
	if (!Array.isArray(nodes)) {
		throw new TypeError("UI children must be an array")
	}

	return Object.freeze(
		nodes.map((node) =>
			normalizeNode(node, state, scope, parentId, parentColumns),
		),
	)
}

function normalizeNode(
	node: unknown,
	state: NormalizationState,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: GridColumns | undefined,
): NormalizedUiNode {
	if (!isObjectRecord(node)) {
		throw new TypeError("UI node must be an object")
	}

	switch (node.kind) {
		case "field":
			return normalizeField(
				node as RawFieldNode,
				state,
				scope,
				parentId,
				parentColumns,
			)
		case "section":
			return normalizeSection(
				node as RawSectionNode,
				state,
				scope,
				parentId,
				parentColumns,
			)
		case "array":
			return normalizeArray(
				node as RawArrayNode,
				state,
				scope,
				parentId,
				parentColumns,
			)
		default:
			throw new TypeError(`Unknown UI node kind "${String(node.kind)}"`)
	}
}

function normalizeField(
	node: RawFieldNode,
	state: NormalizationState,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: GridColumns | undefined,
): NormalizedFieldNode {
	const path = normalizeNodePath(node.path, scope.relative)
	const id = normalizeNodeId(node.id ?? joinId(scope.idPrefix, path), "field")
	registerPath(path, state, scope)
	registerNodeId(id, state)
	const span = normalizeSpan(node.span, parentColumns, "field")
	const valuePolicy = normalizeValuePolicy(node.valuePolicy)
	const control = normalizeControl(node.control, state.controls)
	const normalized: NormalizedFieldNode = deepFreezePlain({
		id,
		kind: "field",
		parentId,
		scopePath: scope.pathScope,
		path,
		pathSegments: parsePath(path),
		control,
		label: asResolvable<string>(node.label),
		description: asResolvable<string>(node.description),
		required: asResolvable<boolean>(node.required),
		disabled: asResolvable<boolean>(node.disabled),
		readOnly: asResolvable<boolean>(node.readOnly),
		visible: asResolvable<boolean>(node.visible),
		valuePolicy,
		className: normalizeClassName(node.className),
		span,
		options: asResolvable<unknown>(node.options),
	})

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	if (!scope.relative) {
		state.fieldsByPath[path] = normalized
	}

	return normalized
}

function normalizeSection(
	node: RawSectionNode,
	state: NormalizationState,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: GridColumns | undefined,
): NormalizedSectionNode {
	const id = normalizeNodeId(node.id, "section")
	registerNodeId(id, state)
	const columns = normalizeColumns(node.columns)
	const span = normalizeSpan(node.span, parentColumns, "section")
	const children = normalizeChildren(
		normalizeChildArray(node.children, "section"),
		state,
		scope,
		id,
		columns,
	)
	const normalized: NormalizedSectionNode = deepFreezePlain({
		id,
		kind: "section",
		parentId,
		scopePath: scope.pathScope,
		title: asResolvable<string>(node.title),
		description: asResolvable<string>(node.description),
		disabled: asResolvable<boolean>(node.disabled),
		readOnly: asResolvable<boolean>(node.readOnly),
		visible: asResolvable<boolean>(node.visible),
		className: normalizeClassName(node.className),
		columns,
		span,
		children,
	})

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	return normalized
}

function normalizeArray(
	node: RawArrayNode,
	state: NormalizationState,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: GridColumns | undefined,
): NormalizedArrayNode {
	const path = normalizeNodePath(node.path, scope.relative)
	const id = normalizeNodeId(node.id ?? joinId(scope.idPrefix, path), "array")
	registerPath(path, state, scope)
	registerNodeId(id, state)
	const span = normalizeSpan(node.span, parentColumns, "array")
	const childScope = {
		idPrefix: id,
		pathScope: joinPathScope(scope.pathScope, path),
		relative: true,
	}
	const children = normalizeChildren(
		normalizeChildArray(node.children, "array"),
		state,
		childScope,
		id,
	)
	const normalized: NormalizedArrayNode = deepFreezePlain({
		id,
		kind: "array",
		parentId,
		scopePath: scope.pathScope,
		path,
		pathSegments: parsePath(path),
		label: asResolvable<string>(node.label),
		description: asResolvable<string>(node.description),
		disabled: asResolvable<boolean>(node.disabled),
		readOnly: asResolvable<boolean>(node.readOnly),
		visible: asResolvable<boolean>(node.visible),
		className: normalizeClassName(node.className),
		span,
		itemDefault:
			typeof node.itemDefault === "function"
				? node.itemDefault
				: deepFreezePlain(cloneValue(node.itemDefault)),
		children,
	})

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	if (!scope.relative) {
		state.arraysByPath[path] = normalized
	}

	return normalized
}

function normalizeNodePath(path: unknown, relative: boolean): string {
	if (typeof path !== "string") {
		throw new TypeError("Path must be a string")
	}

	try {
		return formatPath(path)
	} catch (error) {
		if (relative) {
			throw new TypeError(`Invalid relative path "${path}"`, {
				cause: error,
			})
		}
		throw error
	}
}

function normalizeNodeId(id: unknown, nodeKind: NodeKind): string {
	if (typeof id !== "string" || id.length === 0) {
		throw new TypeError(`${nodeKind} node ID must be a non-empty string`)
	}

	if (/[\t\n\f\r ]/.test(id)) {
		throw new TypeError(`${nodeKind} node ID "${id}" must not contain spaces`)
	}

	return id
}

function registerNodeId(id: string, state: NormalizationState): void {
	if (state.nodeIds.has(id)) {
		throw new TypeError(`Duplicate node ID "${id}"`)
	}

	state.nodeIds.add(id)
}

function registerPath(
	path: string,
	state: NormalizationState,
	scope: NodeScope,
): void {
	const scopeKey = scope.pathScope
	const paths = state.pathsByScope.get(scopeKey) ?? new Set<string>()

	if (paths.has(path)) {
		throw new TypeError(`Duplicate path "${path}"`)
	}

	paths.add(path)
	state.pathsByScope.set(scopeKey, paths)
}

function normalizeControl(control: unknown, controls: ControlRegistry): string {
	if (typeof control !== "string") {
		throw new TypeError("Field control must be a string")
	}

	if (!hasOwn(controls, control)) {
		throw new TypeError(`Unknown control "${control}"`)
	}

	return control
}

function normalizeColumns(columns: unknown): GridColumns {
	if (columns === undefined) {
		return 1
	}

	if (columns === 1 || columns === 2 || columns === 3 || columns === 4) {
		return columns
	}

	throw new TypeError("Section layout columns must be 1, 2, 3, or 4")
}

function normalizeSpan(
	span: unknown,
	parentColumns: GridColumns | undefined,
	nodeKind: NodeKind,
): GridSpan | undefined {
	if (span === undefined) {
		if (parentColumns === undefined) {
			return undefined
		}
		return nodeKind === "field" ? 1 : "full"
	}

	if (span !== "full" && span !== 1 && span !== 2 && span !== 3 && span !== 4) {
		throw new TypeError("Layout span must be 1, 2, 3, 4, or full")
	}

	if (parentColumns !== undefined && typeof span === "number") {
		if (span > parentColumns) {
			throw new TypeError(
				`Layout span ${span} exceeds parent columns ${parentColumns}`,
			)
		}
	}

	return span
}

function normalizeValuePolicy(valuePolicy: unknown): ValuePolicy {
	if (valuePolicy === undefined) {
		return "preserve"
	}

	if (valuePolicy === "preserve" || valuePolicy === "unset") {
		return valuePolicy
	}

	throw new TypeError(`Unsupported valuePolicy "${String(valuePolicy)}"`)
}

function asResolvable<Value>(value: unknown): Resolvable<Value> | undefined {
	return value as Resolvable<Value> | undefined
}

function normalizeClassName(className: unknown): string | undefined {
	if (className === undefined) {
		return undefined
	}

	if (typeof className !== "string") {
		throw new TypeError("className must be a string")
	}

	return className
}

function normalizeChildArray(
	children: unknown,
	nodeKind: "array" | "section",
): readonly unknown[] {
	if (!Array.isArray(children)) {
		throw new TypeError(`${nodeKind} children must be an array`)
	}

	return children
}

function joinId(prefix: string, id: string): string {
	return prefix.length === 0 ? id : `${prefix}.${id}`
}

function joinPathScope(scope: string, path: string): string {
	return scope.length === 0 ? path : `${scope}.${path}`
}

function deepFreezePlain<Value>(value: Value): Value {
	if (Array.isArray(value)) {
		for (const item of value) {
			deepFreezePlain(item)
		}
		return Object.freeze(value)
	}

	if (!isObjectRecord(value)) {
		return value
	}

	for (const key of Object.keys(value)) {
		deepFreezePlain(value[key])
	}

	return Object.freeze(value)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(Object.getPrototypeOf(value) === Object.prototype ||
			Object.getPrototypeOf(value) === null)
	)
}

function hasOwn<Value extends object>(value: Value, key: PropertyKey): boolean {
	return Object.hasOwn(value, key)
}
