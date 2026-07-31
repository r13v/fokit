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
	AnyUiPresentation,
	CoreUiPresentation,
	GridColumns,
	GridSpan,
	Resolvable,
	UiPresentation,
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

export type ResolveUiOptions<
	Context = unknown,
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
> = {
	readonly previous?: ResolvedUiState<Context, RenderComponent, Presentation>
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

export type ResolvedFieldNode<
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
> = ResolvedNodeBase<Context> & {
	readonly kind: "field"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly control: string
	readonly label?: Presentation["content"]
	readonly description?: Presentation["content"]
	readonly slotOptions?: Presentation["fieldSlotOptions"]
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
	Presentation extends UiPresentation = CoreUiPresentation,
> = ResolvedNodeBase<Context> & {
	readonly kind: "section"
	readonly title?: Presentation["content"]
	readonly description?: Presentation["content"]
	readonly slotOptions?: Presentation["sectionSlotOptions"]
	readonly columns: GridColumns
	readonly children: readonly ResolvedUiNode<
		Context,
		RenderComponent,
		Presentation
	>[]
}

export type ResolvedArrayNode<
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
> = ResolvedNodeBase<Context> & {
	readonly kind: "array"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly label?: Presentation["content"]
	readonly description?: Presentation["content"]
	readonly slotOptions?: Presentation["arraySlotOptions"]
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly ResolvedRelativeUiNode<Context, Presentation>[]
	readonly itemChildren: readonly (readonly ResolvedRelativeUiNode<
		Context,
		Presentation
	>[])[]
}

export type ResolvedRelativeUiNode<
	Context = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
> =
	| ResolvedArrayNode<Context, Presentation>
	| ResolvedFieldNode<Context, Presentation>
	| ResolvedSectionNode<Context, never, Presentation>

export type ResolvedUiNode<
	Context = unknown,
	RenderComponent = unknown,
	Presentation extends UiPresentation = CoreUiPresentation,
> =
	| ResolvedArrayNode<Context, Presentation>
	| ResolvedFieldNode<Context, Presentation>
	| ([RenderComponent] extends [never]
			? never
			: ResolvedRenderNode<Context, RenderComponent>)
	| ResolvedSectionNode<Context, RenderComponent, Presentation>

export type ResolvedUiState<
	Context = unknown,
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
> = {
	readonly context: Readonly<Context>
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly ui: readonly ResolvedUiNode<Context, RenderComponent, Presentation>[]
	readonly nodes: readonly ResolvedUiNode<
		Context,
		RenderComponent,
		Presentation
	>[]
	readonly nodesById: Readonly<
		Record<string, ResolvedUiNode<Context, RenderComponent, Presentation>>
	>
	readonly fieldsByPath: Readonly<
		Record<string, ResolvedFieldNode<Context, Presentation>>
	>
	readonly arraysByPath: Readonly<
		Record<string, ResolvedArrayNode<Context, Presentation>>
	>
	readonly computedCache: ResolvedComputedCache
}

type ResolveState<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
> = {
	readonly values: unknown
	readonly context: Context
	readonly previousCache: ResolvedComputedCache
	readonly computedCache: Record<string, ResolvedComputedEntry>
	readonly nodes: ResolvedUiNode<Context, RenderComponent, Presentation>[]
	readonly nodesById: Record<
		string,
		ResolvedUiNode<Context, RenderComponent, Presentation>
	>
	readonly fieldsByPath: Record<
		string,
		ResolvedFieldNode<Context, Presentation>
	>
	readonly arraysByPath: Record<
		string,
		ResolvedArrayNode<Context, Presentation>
	>
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
	Presentation extends UiPresentation = AnyUiPresentation,
>(
	definition: NormalizedFormDefinition<
		Schema,
		undefined,
		RenderComponent,
		Presentation
	>,
	values: FormInput<Schema>,
	context: Context,
	options: ResolveUiOptions<Context, RenderComponent, Presentation> = {},
): ResolvedUiState<Context, RenderComponent, Presentation> {
	const state: ResolveState<Context, RenderComponent, Presentation> = {
		values,
		context,
		previousCache: options.previous?.computedCache ?? {},
		computedCache: Object.create(null) as Record<string, ResolvedComputedEntry>,
		nodes: [],
		nodesById: Object.create(null) as Record<
			string,
			ResolvedUiNode<Context, RenderComponent, Presentation>
		>,
		fieldsByPath: Object.create(null) as Record<
			string,
			ResolvedFieldNode<Context, Presentation>
		>,
		arraysByPath: Object.create(null) as Record<
			string,
			ResolvedArrayNode<Context, Presentation>
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

function resolveNodes<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	nodes: readonly NormalizedUiNode<RenderComponent, Presentation>[],
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
	scope: ResolveScope,
): readonly ResolvedUiNode<Context, RenderComponent, Presentation>[] {
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
	) as readonly ResolvedUiNode<Context, RenderComponent, Presentation>[]
}

function resolveField<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: NormalizedFieldNode<Presentation>,
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedFieldNode<Context, Presentation> {
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
		slotOptions: resolveOptional(
			`${resolvedParent.id}:slotOptions`,
			node.slotOptions,
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

function resolveSection<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: NormalizedSectionNode<RenderComponent, Presentation>,
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedSectionNode<Context, RenderComponent, Presentation> {
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
		slotOptions: resolveOptional(
			`${resolvedParent.id}:slotOptions`,
			node.slotOptions,
			state,
			scope,
		),
		columns: node.columns,
		children,
	})

	registerResolvedNode(resolved, state, scope)
	return resolved
}

function resolveArray<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: NormalizedArrayNode<Presentation>,
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedArrayNode<Context, Presentation> {
	const resolvedParent = resolveParent(node, state, parent, scope)
	const path = joinScopedPath(scope.pathPrefix, node.path)
	const children = resolveNodes(
		node.children,
		state,
		resolvedParent,
		templateScope,
	) as readonly ResolvedRelativeUiNode<Context, Presentation>[]
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
		slotOptions: resolveOptional(
			`${resolvedParent.id}:slotOptions`,
			node.slotOptions,
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

function resolveArrayItemChildren<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: NormalizedArrayNode<Presentation>,
	path: string,
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
): readonly (readonly ResolvedRelativeUiNode<Context, Presentation>[])[] {
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
			}) as readonly ResolvedRelativeUiNode<Context, Presentation>[]
		}),
	)
}

function resolveRender<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: NormalizedRenderNode<RenderComponent>,
	state: ResolveState<Context, RenderComponent, Presentation>,
	parent: ParentState,
	scope: ResolveScope,
): ResolvedRenderNode<Context, RenderComponent> {
	const resolved = Object.freeze({
		...resolveParent(node, state, parent, scope),
		kind: "render" as const,
		component: node.component,
	})

	registerResolvedNode(
		resolved as ResolvedUiNode<Context, RenderComponent, Presentation>,
		state,
		scope,
	)
	return resolved
}

function resolveParent<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node:
		| NormalizedArrayNode<Presentation>
		| NormalizedFieldNode<Presentation>
		| NormalizedRenderNode<RenderComponent>
		| NormalizedSectionNode<RenderComponent, Presentation>,
	state: ResolveState<Context, RenderComponent, Presentation>,
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

function resolveWithDefault<
	Value,
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	key: string,
	value: Resolvable<Value> | undefined,
	defaultValue: Value,
	state: ResolveState<Context, RenderComponent, Presentation>,
	scope: ResolveScope,
): Value {
	if (value === undefined) {
		return defaultValue
	}

	return resolveResolvable(key, value, state, scope)
}

function resolveOptional<
	Value,
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context, RenderComponent, Presentation>,
	scope: ResolveScope,
): Value | undefined {
	if (value === undefined) {
		return undefined
	}

	return resolveResolvable(key, value, state, scope)
}

function resolveResolvable<
	Value,
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	key: string,
	value: Resolvable<Value> | undefined,
	state: ResolveState<Context, RenderComponent, Presentation>,
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

function createUiResolverTracker<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	state: ResolveState<Context, RenderComponent, Presentation>,
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

function dependenciesEqual<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	previous: readonly ResolvedComputedDependency[],
	state: ResolveState<Context, RenderComponent, Presentation>,
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

function registerResolvedNode<
	Context,
	RenderComponent,
	Presentation extends UiPresentation,
>(
	node: ResolvedUiNode<Context, RenderComponent, Presentation>,
	state: ResolveState<Context, RenderComponent, Presentation>,
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
