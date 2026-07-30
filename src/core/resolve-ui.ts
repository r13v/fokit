import type {
	NormalizedArrayNode,
	NormalizedFieldNode,
	NormalizedFormDefinition,
	NormalizedRenderNode,
	NormalizedSectionNode,
	NormalizedUiNode,
} from "./definition.js"
import type { PathSegments } from "./path.js"
import { formatPath, parsePath } from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import type {
	GridColumns,
	GridSpan,
	Resolvable,
	UiResolver,
	ValuePolicy,
} from "./ui-types.js"
import { getPathValue, isDirtyEqual } from "./value.js"

export type ResolvedComputedEntry = {
	readonly resolver: UiResolver<unknown>
	readonly context: unknown
	readonly dependencies: readonly ResolvedComputedDependency[]
	readonly value: unknown
}

type ResolvedComputedDependency = {
	readonly path: string
	readonly value: unknown
}

export type ResolvedComputedCache = Readonly<
	Record<string, ResolvedComputedEntry>
>

export type ResolveUiOptions<Context = unknown, RenderComponent = unknown> = {
	readonly previous?: ResolvedUiState<Context, RenderComponent>
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

export type ResolvedRenderNode<
	Context = unknown,
	RenderComponent = unknown,
> = ResolvedNodeBase<Context> & {
	readonly kind: "render"
	readonly component: RenderComponent
}

export type ResolvedSectionNode<
	Context = unknown,
	RenderComponent = unknown,
> = ResolvedNodeBase<Context> & {
	readonly kind: "section"
	readonly title?: string
	readonly description?: string
	readonly columns: GridColumns
	readonly children: readonly ResolvedUiNode<Context, RenderComponent>[]
}

export type ResolvedArrayNode<Context = unknown> = ResolvedNodeBase<Context> & {
	readonly kind: "array"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly label?: string
	readonly description?: string
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly ResolvedRelativeUiNode<Context>[]
	readonly itemChildren: readonly (readonly ResolvedRelativeUiNode<Context>[])[]
}

export type ResolvedRelativeUiNode<Context = unknown> =
	| ResolvedArrayNode<Context>
	| ResolvedFieldNode<Context>
	| ResolvedSectionNode<Context, never>

export type ResolvedUiNode<Context = unknown, RenderComponent = unknown> =
	| ResolvedArrayNode<Context>
	| ResolvedFieldNode<Context>
	| ([RenderComponent] extends [never]
			? never
			: ResolvedRenderNode<Context, RenderComponent>)
	| ResolvedSectionNode<Context, RenderComponent>

export type ResolvedUiState<Context = unknown, RenderComponent = unknown> = {
	readonly context: Readonly<Context>
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly ui: readonly ResolvedUiNode<Context, RenderComponent>[]
	readonly nodes: readonly ResolvedUiNode<Context, RenderComponent>[]
	readonly nodesById: Readonly<
		Record<string, ResolvedUiNode<Context, RenderComponent>>
	>
	readonly fieldsByPath: Readonly<Record<string, ResolvedFieldNode<Context>>>
	readonly arraysByPath: Readonly<Record<string, ResolvedArrayNode<Context>>>
	readonly computedCache: ResolvedComputedCache
}

type ResolveState<Context, RenderComponent> = {
	readonly values: unknown
	readonly context: Context
	readonly previousCache: ResolvedComputedCache
	readonly computedCache: Record<string, ResolvedComputedEntry>
	readonly nodes: ResolvedUiNode<Context, RenderComponent>[]
	readonly nodesById: Record<string, ResolvedUiNode<Context, RenderComponent>>
	readonly fieldsByPath: Record<string, ResolvedFieldNode<Context>>
	readonly arraysByPath: Record<string, ResolvedArrayNode<Context>>
}

type ParentState = {
	readonly visible: boolean
	readonly disabled: boolean
	readonly readOnly: boolean
}

type ResolveScope = {
	readonly pathPrefix: string
	readonly idPrefix: string
	readonly registerNodes: boolean
	readonly registerPaths: boolean
}

export function resolveUi<
	Schema extends StandardSchema,
	Context = unknown,
	RenderComponent = unknown,
>(
	definition: NormalizedFormDefinition<Schema, undefined, RenderComponent>,
	values: FormInput<Schema>,
	context: Context,
	options: ResolveUiOptions<Context, RenderComponent> = {},
): ResolvedUiState<Context, RenderComponent> {
	const state: ResolveState<Context, RenderComponent> = {
		values,
		context,
		previousCache: options.previous?.computedCache ?? {},
		computedCache: Object.create(null) as Record<string, ResolvedComputedEntry>,
		nodes: [],
		nodesById: Object.create(null) as Record<
			string,
			ResolvedUiNode<Context, RenderComponent>
		>,
		fieldsByPath: Object.create(null) as Record<
			string,
			ResolvedFieldNode<Context>
		>,
		arraysByPath: Object.create(null) as Record<
			string,
			ResolvedArrayNode<Context>
		>,
	}
	const rootDisabled = options.disabled === true
	const rootReadOnly = options.readOnly === true
	const ui = resolveNodes(
		definition.ui,
		state,
		{
			visible: true,
			disabled: rootDisabled,
			readOnly: rootReadOnly,
		},
		rootScope,
	)

	return Object.freeze({
		context,
		disabled: rootDisabled,
		readOnly: rootReadOnly,
		ui,
		nodes: Object.freeze([...state.nodes]),
		nodesById: Object.freeze({ ...state.nodesById }),
		fieldsByPath: Object.freeze({ ...state.fieldsByPath }),
		arraysByPath: Object.freeze({ ...state.arraysByPath }),
		computedCache: Object.freeze({ ...state.computedCache }),
	})
}

function resolveNodes<Context, RenderComponent>(
	nodes: readonly NormalizedUiNode<RenderComponent>[],
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): readonly ResolvedUiNode<Context, RenderComponent>[] {
	return Object.freeze(
		nodes.map((node) => {
			switch (node.kind) {
				case "field":
					return resolveField(node, state, parent, scope)
				case "section":
					return resolveSection(node, state, parent, scope)
				case "array":
					return resolveArray(node, state, parent, scope)
				case "render":
					return resolveRender(node, state, parent, scope)
				default:
					throw new TypeError("Unknown normalized UI node kind")
			}
		}),
	) as readonly ResolvedUiNode<Context, RenderComponent>[]
}

function resolveField<Context, RenderComponent>(
	node: NormalizedFieldNode,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedFieldNode<Context> {
	const resolvedParent = resolveParent(node, state, parent, scope)
	const path = joinScopedPath(scope.pathPrefix, node.path)
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "field" as const,
		path,
		pathSegments: parsePath(path),
		control: node.control,
		label: resolveOptional(
			`${resolvedParent.id}:label`,
			node.label,
			state,
			scope,
		),
		description: resolveOptional(
			`${resolvedParent.id}:description`,
			node.description,
			state,
			scope,
		),
		required: resolveWithDefault(
			`${resolvedParent.id}:required`,
			node.required,
			false,
			state,
			scope,
		),
		valuePolicy: node.valuePolicy,
		options: resolveOptional(
			`${resolvedParent.id}:options`,
			node.options,
			state,
			scope,
		),
	})

	registerResolvedNode(resolved, state, scope)
	if (scope.registerPaths) {
		state.fieldsByPath[path] = resolved
	}

	return resolved
}

function resolveSection<Context, RenderComponent>(
	node: NormalizedSectionNode<RenderComponent>,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedSectionNode<Context, RenderComponent> {
	const resolvedParent = resolveParent(node, state, parent, scope)
	const children = resolveNodes(node.children, state, resolvedParent, scope)
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "section" as const,
		title: resolveOptional(
			`${resolvedParent.id}:title`,
			node.title,
			state,
			scope,
		),
		description: resolveOptional(
			`${resolvedParent.id}:description`,
			node.description,
			state,
			scope,
		),
		columns: node.columns,
		children,
	})

	registerResolvedNode(resolved, state, scope)
	return resolved
}

function resolveArray<Context, RenderComponent>(
	node: NormalizedArrayNode,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedArrayNode<Context> {
	const resolvedParent = resolveParent(node, state, parent, scope)
	const path = joinScopedPath(scope.pathPrefix, node.path)
	const children = resolveNodes(
		node.children,
		state,
		resolvedParent,
		templateScope,
	) as readonly ResolvedRelativeUiNode<Context>[]
	const itemChildren = scope.registerPaths
		? resolveArrayItemChildren(node, path, state, resolvedParent)
		: Object.freeze([])
	const resolved = Object.freeze({
		...resolvedParent,
		kind: "array" as const,
		path,
		pathSegments: parsePath(path),
		label: resolveOptional(
			`${resolvedParent.id}:label`,
			node.label,
			state,
			scope,
		),
		description: resolveOptional(
			`${resolvedParent.id}:description`,
			node.description,
			state,
			scope,
		),
		itemDefault: node.itemDefault,
		children,
		itemChildren,
	})

	registerResolvedNode(resolved, state, scope)
	if (scope.registerPaths) {
		state.arraysByPath[path] = resolved
	}

	return resolved
}

function resolveArrayItemChildren<Context, RenderComponent>(
	node: NormalizedArrayNode,
	path: string,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
): readonly (readonly ResolvedRelativeUiNode<Context>[])[] {
	const value = getPathValue(state.values, path)
	if (!Array.isArray(value)) {
		return Object.freeze([])
	}

	return Object.freeze(
		value.map((_item, index) => {
			const itemPath = `${path}.${index}`
			return resolveNodes(node.children, state, parent, {
				pathPrefix: itemPath,
				idPrefix: itemPath,
				registerNodes: true,
				registerPaths: true,
			}) as readonly ResolvedRelativeUiNode<Context>[]
		}),
	)
}

function resolveRender<Context, RenderComponent>(
	node: NormalizedRenderNode<RenderComponent>,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedRenderNode<Context, RenderComponent> {
	const resolved = Object.freeze({
		...resolveParent(node, state, parent, scope),
		kind: "render" as const,
		component: node.component,
	})

	registerResolvedNode(
		resolved as ResolvedUiNode<Context, RenderComponent>,
		state,
		scope,
	)
	return resolved
}

function resolveParent<Context, RenderComponent>(
	node:
		| NormalizedArrayNode
		| NormalizedFieldNode
		| NormalizedRenderNode<RenderComponent>
		| NormalizedSectionNode<RenderComponent>,
	state: ResolveState<Context, RenderComponent>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedNodeBase<Context> {
	const id = joinScopedId(scope.idPrefix, node.id)

	return {
		id,
		parentId:
			node.parentId === undefined
				? undefined
				: joinScopedId(scope.idPrefix, node.parentId),
		scopePath:
			scope.pathPrefix.length === 0 ? node.scopePath : scope.pathPrefix,
		className: node.className,
		span: node.span,
		visible:
			parent.visible &&
			resolveWithDefault(`${id}:visible`, node.visible, true, state, scope),
		disabled:
			parent.disabled ||
			resolveWithDefault(`${id}:disabled`, node.disabled, false, state, scope),
		readOnly:
			parent.readOnly ||
			resolveWithDefault(`${id}:readOnly`, node.readOnly, false, state, scope),
		context: state.context,
	}
}

function resolveWithDefault<Value, Context, RenderComponent>(
	key: string,
	value: Resolvable<Value> | undefined,
	defaultValue: Value,
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): Value {
	if (value === undefined) {
		return defaultValue
	}

	return resolveResolvable(key, value, state, scope)
}

function resolveOptional<Value, Context, RenderComponent>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): Value | undefined {
	if (value === undefined) {
		return undefined
	}

	return resolveResolvable(key, value, state, scope)
}

function resolveResolvable<Value, Context, RenderComponent>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): Value {
	if (typeof value !== "function") {
		return value as Value
	}

	const previous = state.previousCache[key]
	if (
		previous !== undefined &&
		previous.resolver === value &&
		Object.is(previous.context, state.context) &&
		dependenciesEqual(previous.dependencies, state, scope)
	) {
		state.computedCache[key] = previous
		return previous.value as Value
	}

	const resolver = value as (
		values: Readonly<Record<string, unknown>>,
		details: { readonly context: Readonly<Context> },
	) => Value
	const tracker = createUiResolverTracker(state, scope)
	let resolved: Value
	try {
		const candidate = resolver(tracker.values, {
			context: state.context as Readonly<Context>,
		})
		if (isPromiseLike(candidate)) {
			throw new TypeError("UI resolvers must be synchronous")
		}
		resolved = candidate
	} finally {
		tracker.revoke()
	}
	const entry = Object.freeze({
		resolver: value as UiResolver<unknown>,
		context: state.context,
		dependencies: Object.freeze(
			tracker.paths.map((path) =>
				Object.freeze({
					path,
					value: getPathValue(
						state.values,
						joinScopedPath(scope.pathPrefix, path),
					),
				}),
			),
		),
		value: resolved,
	})
	state.computedCache[key] = entry

	return resolved as Value
}

function createUiResolverTracker<Context, RenderComponent>(
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): {
	readonly values: Readonly<Record<string, unknown>>
	readonly paths: readonly string[]
	readonly revoke: () => void
} {
	const paths: string[] = []
	const seen = new Set<string>()
	const rejectMutation = (): never => {
		throw new TypeError("UI resolver values are read-only")
	}
	const read = (property: PropertyKey): unknown => {
		if (typeof property !== "string") {
			throw new TypeError("UI resolver values must be accessed by a field path")
		}

		const path = formatPath(property)
		if (!seen.has(path)) {
			seen.add(path)
			paths.push(path)
		}

		return getPathValue(state.values, joinScopedPath(scope.pathPrefix, path))
	}
	const { proxy, revoke } = Proxy.revocable(
		Object.create(null) as Record<string, unknown>,
		{
			defineProperty: rejectMutation,
			deleteProperty: rejectMutation,
			get: (_target, property) => read(property),
			getOwnPropertyDescriptor: (_target, property) => ({
				configurable: true,
				enumerable: true,
				value: read(property),
				writable: false,
			}),
			has: (_target, property) => {
				read(property)
				return true
			},
			ownKeys: () => {
				throw new TypeError(
					"UI resolver values cannot be enumerated; read field paths explicitly",
				)
			},
			preventExtensions: rejectMutation,
			set: rejectMutation,
			setPrototypeOf: rejectMutation,
		},
	)

	return {
		values: proxy,
		paths,
		revoke,
	}
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		((typeof value === "object" && value !== null) ||
			typeof value === "function") &&
		typeof (value as { readonly then?: unknown }).then === "function"
	)
}

function dependenciesEqual<Context, RenderComponent>(
	previous: readonly ResolvedComputedDependency[],
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): boolean {
	return previous.every((dependency) =>
		isDirtyEqual(
			dependency.value,
			getPathValue(
				state.values,
				joinScopedPath(scope.pathPrefix, dependency.path),
			),
		),
	)
}

function registerResolvedNode<Context, RenderComponent>(
	node: ResolvedUiNode<Context, RenderComponent>,
	state: ResolveState<Context, RenderComponent>,
	scope: ResolveScope,
): void {
	if (!scope.registerNodes) {
		return
	}

	state.nodes.push(node)
	state.nodesById[node.id] = node
}

function joinScopedPath(prefix: string, path: string): string {
	return prefix.length === 0
		? formatPath(path)
		: formatPath(`${prefix}.${path}`)
}

function joinScopedId(prefix: string, id: string): string {
	return prefix.length === 0 ? id : `${prefix}.${id}`
}

const rootScope = Object.freeze({
	pathPrefix: "",
	idPrefix: "",
	registerNodes: true,
	registerPaths: true,
}) satisfies ResolveScope

const templateScope = Object.freeze({
	pathPrefix: "",
	idPrefix: "",
	registerNodes: false,
	registerPaths: false,
}) satisfies ResolveScope
