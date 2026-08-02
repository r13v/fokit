import type { ControlRegistry } from "./control-types.js"
import { hasOwn, isPlainObject } from "./object.js"
import type { PathSegments } from "./path.js"
import { formatPath, parsePath } from "./path.js"
import type { FormInput, StandardSchema } from "./standard-schema.js"
import {
	normalizeGridScale,
	validateClassName,
	validateGridColumns,
	validateGridSpan,
} from "./structural-presentation.js"
import type {
	AnyUiPresentation,
	CoreUiPresentation,
	DefaultGridValue,
	GridColumns,
	GridSpan,
	Resolvable,
	UiNode,
	UiPresentation,
	ValuePolicy,
} from "./ui-types.js"
import { cloneValue } from "./value.js"

type NodeKind = "array" | "field" | "render" | "section"
type NodeScope = {
	readonly idPrefix: string
	readonly pathScope: string
	readonly relative: boolean
}

type NormalizationState<
	RenderComponent,
	Presentation extends UiPresentation,
> = {
	readonly controls: ControlRegistry
	readonly grid: readonly number[]
	readonly nodeIds: Set<string>
	readonly pathsByScope: Map<string, Set<string>>
	readonly nodes: NormalizedUiNode<RenderComponent, Presentation>[]
	readonly nodesById: Record<
		string,
		NormalizedUiNode<RenderComponent, Presentation>
	>
	readonly fieldsByPath: Record<string, NormalizedFieldNode<Presentation>>
	readonly arraysByPath: Record<string, NormalizedArrayNode<Presentation>>
}

type RawFieldNode = Record<string, unknown> & {
	readonly kind: "field"
	readonly id?: unknown
	readonly path?: unknown
	readonly control?: unknown
	readonly label?: unknown
	readonly description?: unknown
	readonly slotOptions?: unknown
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
	readonly slotOptions?: unknown
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
	readonly slotOptions?: unknown
	readonly visible?: unknown
	readonly disabled?: unknown
	readonly readOnly?: unknown
	readonly className?: unknown
	readonly span?: unknown
	readonly itemDefault?: unknown
	readonly children?: unknown
}

type RawRenderNode = Record<string, unknown> & {
	readonly kind: "render"
	readonly id?: unknown
	readonly component?: unknown
	readonly visible?: unknown
	readonly disabled?: unknown
	readonly readOnly?: unknown
}

type NormalizedNodeBase = {
	readonly id: string
	readonly kind: NodeKind
	readonly parentId?: string
	readonly scopePath: string
	readonly className?: Resolvable<string>
	readonly span?: Resolvable<GridSpan>
	readonly visible?: Resolvable<boolean>
	readonly disabled?: Resolvable<boolean>
	readonly readOnly?: Resolvable<boolean>
}

export type NormalizedFieldNode<
	Presentation extends UiPresentation = AnyUiPresentation,
> = NormalizedNodeBase & {
	readonly kind: "field"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly control: string
	readonly label?: Resolvable<Presentation["content"]>
	readonly description?: Resolvable<Presentation["content"]>
	readonly slotOptions?: Resolvable<Presentation["fieldSlotOptions"]>
	readonly required?: Resolvable<boolean>
	readonly valuePolicy: ValuePolicy
	readonly options?: Resolvable<unknown>
}

export type NormalizedRenderNode<Component = unknown> = NormalizedNodeBase & {
	readonly kind: "render"
	readonly component: Component
}

export type NormalizedSectionNode<
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
> = NormalizedNodeBase & {
	readonly kind: "section"
	readonly title?: Resolvable<Presentation["content"]>
	readonly description?: Resolvable<Presentation["content"]>
	readonly slotOptions?: Resolvable<Presentation["sectionSlotOptions"]>
	readonly columns: Resolvable<GridColumns>
	readonly children: readonly NormalizedUiNode<RenderComponent, Presentation>[]
}

export type NormalizedArrayNode<
	Presentation extends UiPresentation = AnyUiPresentation,
> = NormalizedNodeBase & {
	readonly kind: "array"
	readonly path: string
	readonly pathSegments: PathSegments
	readonly label?: Resolvable<Presentation["content"]>
	readonly description?: Resolvable<Presentation["content"]>
	readonly slotOptions?: Resolvable<Presentation["arraySlotOptions"]>
	readonly itemDefault: unknown | (() => unknown)
	readonly children: readonly NormalizedRelativeUiNode<Presentation>[]
}

export type NormalizedRelativeUiNode<
	Presentation extends UiPresentation = AnyUiPresentation,
> =
	| NormalizedArrayNode<Presentation>
	| NormalizedFieldNode<Presentation>
	| NormalizedSectionNode<never, Presentation>

export type NormalizedUiNode<
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
> =
	| NormalizedArrayNode<Presentation>
	| NormalizedFieldNode<Presentation>
	| ([RenderComponent] extends [never]
			? never
			: NormalizedRenderNode<RenderComponent>)
	| NormalizedSectionNode<RenderComponent, Presentation>

export type FormDefinition<
	Schema extends StandardSchema = StandardSchema,
	Controls extends ControlRegistry = ControlRegistry,
	Context = unknown,
	RenderComponent = never,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> = {
	readonly schema: Schema
	readonly ui: readonly UiNode<
		FormInput<Schema>,
		Controls,
		Context,
		RenderComponent,
		Presentation,
		NoInfer<Grid>
	>[]
}

export type NormalizeDefinitionInput<
	Schema extends StandardSchema,
	Controls extends ControlRegistry,
	Context,
	RenderComponent = never,
	Presentation extends UiPresentation = CoreUiPresentation,
	Grid extends number = DefaultGridValue,
> = FormDefinition<
	Schema,
	Controls,
	Context,
	RenderComponent,
	Presentation,
	Grid
> & {
	readonly controls: Controls
	readonly grid?: readonly Grid[]
}

declare const requiredControls: unique symbol
declare const requiredContext: unique symbol
declare const requiredPresentation: unique symbol
declare const requiredGrid: unique symbol

type DefinitionControlRequirement<
	RequiredControls extends ControlRegistry | undefined,
> = [RequiredControls] extends [ControlRegistry]
	? string extends keyof Extract<RequiredControls, ControlRegistry>
		? object
		: {
				readonly [requiredControls]?: Extract<
					keyof Extract<RequiredControls, ControlRegistry>,
					string
				>
			}
	: object

type DefinitionPresentationRequirement<Presentation extends UiPresentation> = {
	readonly [requiredPresentation]?: Presentation
}

type DefinitionContextRequirement<RequiredContext> = {
	readonly [requiredContext]?: (context: RequiredContext) => void
}

type DefinitionGridRequirement<RequiredGrid extends number> = {
	readonly [requiredGrid]?: RequiredGrid
}

export type RuntimeNormalizedFormDefinition<
	Schema extends StandardSchema = StandardSchema,
	RequiredControls extends ControlRegistry | undefined = undefined,
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
	RequiredGrid extends number = number,
> = {
	readonly schema: Schema
	readonly grid: readonly number[]
	readonly ui: readonly NormalizedUiNode<RenderComponent, Presentation>[]
	readonly nodes: readonly NormalizedUiNode<RenderComponent, Presentation>[]
	readonly nodesById: Readonly<
		Record<string, NormalizedUiNode<RenderComponent, Presentation>>
	>
	readonly fieldsByPath: Readonly<
		Record<string, NormalizedFieldNode<Presentation>>
	>
	readonly arraysByPath: Readonly<
		Record<string, NormalizedArrayNode<Presentation>>
	>
} & DefinitionControlRequirement<RequiredControls> &
	DefinitionPresentationRequirement<Presentation> &
	DefinitionGridRequirement<RequiredGrid>

export type NormalizedFormDefinition<
	Schema extends StandardSchema = StandardSchema,
	RequiredControls extends ControlRegistry | undefined = undefined,
	RenderComponent = unknown,
	Presentation extends UiPresentation = AnyUiPresentation,
	RequiredContext = unknown,
	RequiredGrid extends number = number,
> = RuntimeNormalizedFormDefinition<
	Schema,
	RequiredControls,
	RenderComponent,
	Presentation,
	RequiredGrid
> &
	DefinitionContextRequirement<RequiredContext>

export function normalizeDefinition<
	Schema extends StandardSchema,
	Controls extends ControlRegistry,
	Context = unknown,
	RenderComponent = never,
	Presentation extends UiPresentation = CoreUiPresentation,
	const Grid extends number = DefaultGridValue,
>(
	input: NormalizeDefinitionInput<
		Schema,
		Controls,
		Context,
		RenderComponent,
		Presentation,
		Grid
	>,
): NormalizedFormDefinition<
	Schema,
	Controls,
	RenderComponent,
	Presentation,
	Context,
	Grid
> {
	const grid = normalizeGridScale(input.grid, "normalizeDefinition")
	const state: NormalizationState<RenderComponent, Presentation> = {
		controls: input.controls,
		grid,
		nodeIds: new Set(),
		pathsByScope: new Map(),
		nodes: [],
		nodesById: Object.create(null) as Record<
			string,
			NormalizedUiNode<RenderComponent, Presentation>
		>,
		fieldsByPath: Object.create(null) as Record<
			string,
			NormalizedFieldNode<Presentation>
		>,
		arraysByPath: Object.create(null) as Record<
			string,
			NormalizedArrayNode<Presentation>
		>,
	}

	const ui = normalizeChildren(input.ui as readonly unknown[], state, {
		idPrefix: "",
		pathScope: "",
		relative: false,
	})

	return Object.freeze({
		schema: input.schema,
		grid,
		ui,
		nodes: Object.freeze([...state.nodes]),
		nodesById: Object.freeze({ ...state.nodesById }),
		fieldsByPath: Object.freeze({ ...state.fieldsByPath }),
		arraysByPath: Object.freeze({ ...state.arraysByPath }),
	}) as NormalizedFormDefinition<
		Schema,
		Controls,
		RenderComponent,
		Presentation,
		Context,
		Grid
	>
}

function normalizeChildren<
	RenderComponent,
	Presentation extends UiPresentation,
>(
	nodes: readonly unknown[],
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId?: string,
	parentColumns?: Resolvable<GridColumns>,
): readonly NormalizedUiNode<RenderComponent, Presentation>[] {
	if (!Array.isArray(nodes)) {
		throw new TypeError("UI children must be an array")
	}

	return Object.freeze(
		nodes.map((node) =>
			normalizeNode(node, state, scope, parentId, parentColumns),
		),
	)
}

function normalizeNode<RenderComponent, Presentation extends UiPresentation>(
	node: unknown,
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: Resolvable<GridColumns> | undefined,
): NormalizedUiNode<RenderComponent, Presentation> {
	if (!isPlainObject(node)) {
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
		case "render":
			return normalizeRender(
				node as RawRenderNode,
				state,
				scope,
				parentId,
			) as NormalizedUiNode<RenderComponent, Presentation>
		default:
			throw new TypeError(`Unknown UI node kind "${String(node.kind)}"`)
	}
}

function normalizeField<RenderComponent, Presentation extends UiPresentation>(
	node: RawFieldNode,
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: Resolvable<GridColumns> | undefined,
): NormalizedFieldNode<Presentation> {
	const path = normalizeNodePath(node.path, scope.relative)
	const id = normalizeNodeId(node.id ?? joinId(scope.idPrefix, path), "field")
	registerPath(path, state, scope)
	registerNodeId(id, state)
	const span = normalizeSpan(node.span, parentColumns, "field", state.grid)
	const valuePolicy = normalizeValuePolicy(node.valuePolicy)
	const control = normalizeControl(node.control, state.controls)
	const normalized: NormalizedFieldNode<Presentation> = deepFreezePlainExcept(
		{
			id,
			kind: "field",
			parentId,
			scopePath: scope.pathScope,
			path,
			pathSegments: parsePath(path),
			control,
			label: asResolvable<Presentation["content"]>(node.label),
			description: asResolvable<Presentation["content"]>(node.description),
			slotOptions: asResolvable<Presentation["fieldSlotOptions"]>(
				node.slotOptions,
			),
			required: asResolvable<boolean>(node.required),
			disabled: asResolvable<boolean>(node.disabled),
			readOnly: asResolvable<boolean>(node.readOnly),
			visible: asResolvable<boolean>(node.visible),
			valuePolicy,
			className: normalizeClassName(node.className),
			span,
			options: asResolvable<unknown>(node.options),
		},
		["label", "description", "slotOptions"],
	)

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	if (!scope.relative) {
		state.fieldsByPath[path] = normalized
	}

	return normalized
}

function normalizeSection<RenderComponent, Presentation extends UiPresentation>(
	node: RawSectionNode,
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: Resolvable<GridColumns> | undefined,
): NormalizedSectionNode<RenderComponent, Presentation> {
	const id = normalizeNodeId(node.id, "section")
	registerNodeId(id, state)
	const columns = normalizeColumns(node.columns, state.grid)
	const span = normalizeSpan(node.span, parentColumns, "section", state.grid)
	const children = normalizeChildren(
		normalizeChildArray(node.children, "section"),
		state,
		scope,
		id,
		columns,
	)
	const normalized: NormalizedSectionNode<RenderComponent, Presentation> =
		deepFreezePlainExcept(
			{
				id,
				kind: "section",
				parentId,
				scopePath: scope.pathScope,
				title: asResolvable<Presentation["content"]>(node.title),
				description: asResolvable<Presentation["content"]>(node.description),
				slotOptions: asResolvable<Presentation["sectionSlotOptions"]>(
					node.slotOptions,
				),
				disabled: asResolvable<boolean>(node.disabled),
				readOnly: asResolvable<boolean>(node.readOnly),
				visible: asResolvable<boolean>(node.visible),
				className: normalizeClassName(node.className),
				columns,
				span,
				children,
			},
			["title", "description", "slotOptions", "children"],
		)

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	return normalized
}

function normalizeArray<RenderComponent, Presentation extends UiPresentation>(
	node: RawArrayNode,
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId: string | undefined,
	parentColumns: Resolvable<GridColumns> | undefined,
): NormalizedArrayNode<Presentation> {
	const path = normalizeNodePath(node.path, scope.relative)
	const id = normalizeNodeId(node.id ?? joinId(scope.idPrefix, path), "array")
	registerPath(path, state, scope)
	registerNodeId(id, state)
	const span = normalizeSpan(node.span, parentColumns, "array", state.grid)
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
	) as readonly NormalizedRelativeUiNode<Presentation>[]
	const normalized: NormalizedArrayNode<Presentation> = deepFreezePlainExcept(
		{
			id,
			kind: "array",
			parentId,
			scopePath: scope.pathScope,
			path,
			pathSegments: parsePath(path),
			label: asResolvable<Presentation["content"]>(node.label),
			description: asResolvable<Presentation["content"]>(node.description),
			slotOptions: asResolvable<Presentation["arraySlotOptions"]>(
				node.slotOptions,
			),
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
		},
		["label", "description", "slotOptions", "children"],
	)

	state.nodes.push(normalized)
	state.nodesById[id] = normalized
	if (!scope.relative) {
		state.arraysByPath[path] = normalized
	}

	return normalized
}

function normalizeRender<RenderComponent, Presentation extends UiPresentation>(
	node: RawRenderNode,
	state: NormalizationState<RenderComponent, Presentation>,
	scope: NodeScope,
	parentId: string | undefined,
): NormalizedRenderNode<RenderComponent> {
	if (scope.relative) {
		throw new TypeError("Render nodes are not allowed inside arrays")
	}

	const id = normalizeNodeId(node.id, "render")
	registerNodeId(id, state)
	if (node.component === undefined) {
		throw new TypeError(`Render node "${id}" requires a component`)
	}

	const normalized = Object.freeze({
		id,
		kind: "render" as const,
		parentId,
		scopePath: scope.pathScope,
		component: node.component as RenderComponent,
		visible: asResolvable<boolean>(node.visible),
		disabled: asResolvable<boolean>(node.disabled),
		readOnly: asResolvable<boolean>(node.readOnly),
	})

	const normalizedUiNode = normalized as NormalizedUiNode<
		RenderComponent,
		Presentation
	>
	state.nodes.push(normalizedUiNode)
	state.nodesById[id] = normalizedUiNode
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

function registerNodeId<RenderComponent, Presentation extends UiPresentation>(
	id: string,
	state: NormalizationState<RenderComponent, Presentation>,
): void {
	if (state.nodeIds.has(id)) {
		throw new TypeError(`Duplicate node ID "${id}"`)
	}

	state.nodeIds.add(id)
}

function registerPath<RenderComponent, Presentation extends UiPresentation>(
	path: string,
	state: NormalizationState<RenderComponent, Presentation>,
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

function normalizeColumns(
	columns: unknown,
	grid: readonly number[],
): Resolvable<GridColumns> {
	if (columns === undefined) {
		return 1
	}

	if (typeof columns === "function") {
		return columns as Resolvable<GridColumns>
	}

	return validateGridColumns(columns, grid)
}

function normalizeSpan(
	span: unknown,
	parentColumns: Resolvable<GridColumns> | undefined,
	nodeKind: NodeKind,
	grid: readonly number[],
): Resolvable<GridSpan> | undefined {
	if (span === undefined) {
		if (parentColumns === undefined) {
			return undefined
		}
		return nodeKind === "field" ? 1 : "full"
	}

	if (typeof span === "function") {
		return span as Resolvable<GridSpan>
	}

	return validateGridSpan(
		span,
		grid,
		typeof parentColumns === "function" ? undefined : parentColumns,
	)
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

function normalizeClassName(
	className: unknown,
): Resolvable<string> | undefined {
	if (className === undefined) {
		return undefined
	}

	if (typeof className === "function") {
		return className as Resolvable<string>
	}

	return validateClassName(className)
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

	if (!isPlainObject(value)) {
		return value
	}

	for (const key of Object.keys(value)) {
		deepFreezePlain(value[key])
	}

	return Object.freeze(value)
}

function deepFreezePlainExcept<Value extends Record<string, unknown>>(
	value: Value,
	opaqueKeys: readonly (keyof Value)[],
): Value {
	const opaque = new Set<PropertyKey>(opaqueKeys)
	for (const key of Object.keys(value)) {
		if (!opaque.has(key)) {
			deepFreezePlain(value[key])
		}
	}
	return Object.freeze(value)
}
