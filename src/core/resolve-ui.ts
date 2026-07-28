import type { Computed } from "./computed.js"
import { isComputed } from "./computed.js"
import type {
	NormalizedArrayNode,
	NormalizedFieldNode,
	NormalizedFormDefinition,
	NormalizedSectionNode,
	NormalizedUiNode,
} from "./definition.js"
import type { PathSegments } from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import type {
	GridColumns,
	GridSpan,
	Resolvable,
	ValuePolicy,
} from "./ui-types.js"
import { getPathValue, isDirtyEqual } from "./value.js"

export type ResolvedComputedEntry = {
	readonly computed: Computed<unknown>
	readonly context: unknown
	readonly dependencies: readonly unknown[]
	readonly value: unknown
}

export type ResolvedComputedCache = Readonly<
	Record<string, ResolvedComputedEntry>
>

export type ResolveUiOptions<Context = unknown> = {
	readonly previous?: ResolvedUiState<Context>
	readonly disabled?: boolean
	readonly readOnly?: boolean
}

type ResolvedNodeBase<Context> = {
	readonly id: string
	readonly parentId?: string
	readonly scopePath: string
	readonly className?: string
	readonly span?: GridSpan
	readonly visible: boolean
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly context: Readonly<Context>
}

export type ResolvedFieldNode<Context = unknown> = ResolvedNodeBase<Context> & {
	readonly kind: "field"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly control: string
	readonly label?: string
	readonly description?: string
	readonly required: boolean
	readonly valuePolicy: ValuePolicy
	readonly options?: unknown
}

export type ResolvedSectionNode<Context = unknown> =
	ResolvedNodeBase<Context> & {
		readonly kind: "section"
		readonly title?: string
		readonly description?: string
		readonly columns: GridColumns
		readonly children: readonly ResolvedUiNode<Context>[]
	}

export type ResolvedArrayNode<Context = unknown> = ResolvedNodeBase<Context> & {
	readonly kind: "array"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly label?: string
	readonly description?: string
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly ResolvedUiNode<Context>[]
}

export type ResolvedUiNode<Context = unknown> =
	| ResolvedArrayNode<Context>
	| ResolvedFieldNode<Context>
	| ResolvedSectionNode<Context>

export type ResolvedUiState<Context = unknown> = {
	readonly context: Readonly<Context>
	readonly ui: readonly ResolvedUiNode<Context>[]
	readonly nodes: readonly ResolvedUiNode<Context>[]
	readonly nodesById: Readonly<Record<string, ResolvedUiNode<Context>>>
	readonly fieldsByPath: Readonly<Record<string, ResolvedFieldNode<Context>>>
	readonly arraysByPath: Readonly<Record<string, ResolvedArrayNode<Context>>>
	readonly computedCache: ResolvedComputedCache
}

type ResolveState<Context> = {
	readonly values: unknown
	readonly context: Context
	readonly previousCache: ResolvedComputedCache
	readonly computedCache: Record<string, ResolvedComputedEntry>
	readonly nodes: ResolvedUiNode<Context>[]
	readonly nodesById: Record<string, ResolvedUiNode<Context>>
	readonly fieldsByPath: Record<string, ResolvedFieldNode<Context>>
	readonly arraysByPath: Record<string, ResolvedArrayNode<Context>>
}

type ParentState = {
	readonly visible: boolean
	readonly disabled: boolean
	readonly readOnly: boolean
}

export function resolveUi<Schema extends StandardSchema, Context = unknown>(
	definition: NormalizedFormDefinition<Schema>,
	values: FormInput<Schema>,
	context: Context,
	options: ResolveUiOptions<Context> = {},
): ResolvedUiState<Context> {
	const state: ResolveState<Context> = {
		values,
		context,
		previousCache: options.previous?.computedCache ?? {},
		computedCache: Object.create(null) as Record<string, ResolvedComputedEntry>,
		nodes: [],
		nodesById: Object.create(null) as Record<string, ResolvedUiNode<Context>>,
		fieldsByPath: Object.create(null) as Record<
			string,
			ResolvedFieldNode<Context>
		>,
		arraysByPath: Object.create(null) as Record<
			string,
			ResolvedArrayNode<Context>
		>,
	}
	const ui = resolveNodes(definition.ui, state, {
		visible: true,
		disabled: options.disabled === true,
		readOnly: options.readOnly === true,
	})

	return Object.freeze({
		context,
		ui,
		nodes: Object.freeze([...state.nodes]),
		nodesById: Object.freeze({ ...state.nodesById }),
		fieldsByPath: Object.freeze({ ...state.fieldsByPath }),
		arraysByPath: Object.freeze({ ...state.arraysByPath }),
		computedCache: Object.freeze({ ...state.computedCache }),
	})
}

function resolveNodes<Context>(
	nodes: readonly NormalizedUiNode[],
	state: ResolveState<Context>,
	parent: ParentState,
): readonly ResolvedUiNode<Context>[] {
	return Object.freeze(
		nodes.map((node) => {
			switch (node.kind) {
				case "field":
					return resolveField(node, state, parent)
				case "section":
					return resolveSection(node, state, parent)
				case "array":
					return resolveArray(node, state, parent)
				default:
					throw new TypeError("Unknown normalized UI node kind")
			}
		}),
	)
}

function resolveField<Context>(
	node: NormalizedFieldNode,
	state: ResolveState<Context>,
	parent: ParentState,
): ResolvedFieldNode<Context> {
	const resolvedParent = resolveParent(node, state, parent)
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "field" as const,
		path: node.path,
		pathSegments: node.pathSegments,
		control: node.control,
		label: resolveOptional(`${node.id}:label`, node.label, state),
		description: resolveOptional(
			`${node.id}:description`,
			node.description,
			state,
		),
		required: resolveWithDefault(
			`${node.id}:required`,
			node.required,
			false,
			state,
		),
		valuePolicy: node.valuePolicy,
		options: resolveOptional(`${node.id}:options`, node.options, state),
	})

	registerResolvedNode(resolved, state)
	if (node.scopePath.length === 0) {
		state.fieldsByPath[node.path] = resolved
	}

	return resolved
}

function resolveSection<Context>(
	node: NormalizedSectionNode,
	state: ResolveState<Context>,
	parent: ParentState,
): ResolvedSectionNode<Context> {
	const resolvedParent = resolveParent(node, state, parent)
	const children = resolveNodes(node.children, state, resolvedParent)
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "section" as const,
		title: resolveOptional(`${node.id}:title`, node.title, state),
		description: resolveOptional(
			`${node.id}:description`,
			node.description,
			state,
		),
		columns: node.columns,
		children,
	})

	registerResolvedNode(resolved, state)
	return resolved
}

function resolveArray<Context>(
	node: NormalizedArrayNode,
	state: ResolveState<Context>,
	parent: ParentState,
): ResolvedArrayNode<Context> {
	const resolvedParent = resolveParent(node, state, parent)
	const children = resolveNodes(node.children, state, resolvedParent)
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "array" as const,
		path: node.path,
		pathSegments: node.pathSegments,
		label: resolveOptional(`${node.id}:label`, node.label, state),
		description: resolveOptional(
			`${node.id}:description`,
			node.description,
			state,
		),
		itemDefault: node.itemDefault,
		children,
	})

	registerResolvedNode(resolved, state)
	if (node.scopePath.length === 0) {
		state.arraysByPath[node.path] = resolved
	}

	return resolved
}

function resolveParent<Context>(
	node: NormalizedArrayNode | NormalizedFieldNode | NormalizedSectionNode,
	state: ResolveState<Context>,
	parent: ParentState,
): ResolvedNodeBase<Context> {
	return {
		id: node.id,
		parentId: node.parentId,
		scopePath: node.scopePath,
		className: node.className,
		span: node.span,
		visible:
			parent.visible &&
			resolveWithDefault(`${node.id}:visible`, node.visible, true, state),
		disabled:
			parent.disabled ||
			resolveWithDefault(`${node.id}:disabled`, node.disabled, false, state),
		readOnly:
			parent.readOnly ||
			resolveWithDefault(`${node.id}:readOnly`, node.readOnly, false, state),
		context: state.context,
	}
}

function resolveWithDefault<Value, Context>(
	key: string,
	value: Resolvable<Value> | undefined,
	defaultValue: Value,
	state: ResolveState<Context>,
): Value {
	if (value === undefined) {
		return defaultValue
	}

	return resolveResolvable(key, value, state)
}

function resolveOptional<Value, Context>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context>,
): Value | undefined {
	if (value === undefined) {
		return undefined
	}

	return resolveResolvable(key, value, state)
}

function resolveResolvable<Value, Context>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context>,
): Value {
	if (!isComputed(value)) {
		return value as Value
	}

	const dependencyValues = value.dependencies.map((dependency) =>
		getPathValue(state.values, dependency),
	)
	const previous = state.previousCache[key]
	if (
		previous !== undefined &&
		previous.computed === value &&
		Object.is(previous.context, state.context) &&
		dependenciesEqual(previous.dependencies, dependencyValues)
	) {
		state.computedCache[key] = previous
		return previous.value as Value
	}

	const values = Object.create(null) as Record<string, unknown>
	for (const [index, dependency] of value.dependencies.entries()) {
		values[dependency] = dependencyValues[index]
	}

	const resolver = value.resolver as (
		values: Readonly<Record<string, unknown>>,
		details: { readonly context: Readonly<Context> },
	) => Value
	const resolved = resolver(Object.freeze(values), {
		context: state.context as Readonly<Context>,
	})
	const entry = Object.freeze({
		computed: value as Computed<unknown>,
		context: state.context,
		dependencies: Object.freeze([...dependencyValues]),
		value: resolved,
	})
	state.computedCache[key] = entry

	return resolved as Value
}

function dependenciesEqual(
	previous: readonly unknown[],
	next: readonly unknown[],
): boolean {
	return (
		previous.length === next.length &&
		previous.every((value, index) => isDirtyEqual(value, next[index]))
	)
}

function registerResolvedNode<Context>(
	node: ResolvedUiNode<Context>,
	state: ResolveState<Context>,
): void {
	state.nodes.push(node)
	state.nodesById[node.id] = node
}
