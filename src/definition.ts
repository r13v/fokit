import type {
	ControlDefinitionRegistry,
	FormDefinition,
	FormInput,
	NormalizedNode,
	StandardSchema,
} from "./types.js"

type NodeKind = "array" | "field" | "render" | "section"
type RuntimeNode = NormalizedNode & {
	readonly [key: string]: unknown
	readonly kind: NodeKind
	readonly children?: readonly RuntimeNode[]
}

export type ResolvedNode = {
	readonly [key: string]: unknown
	readonly id: string
	readonly kind: NodeKind
	readonly path?: string
	readonly visible: boolean
	readonly disabled: boolean
	readonly readOnly: boolean
	readonly context: unknown
	readonly children?: readonly ResolvedNode[]
	readonly itemChildren?: readonly (readonly ResolvedNode[])[]
}

export type ResolvedDefinition = {
	readonly ui: readonly ResolvedNode[]
	readonly nodes: readonly ResolvedNode[]
}

const defaultGrid = Object.freeze([1, 2, 3, 4])
const reservedSegments = new Set(["__proto__", "constructor", "prototype"])

export function normalizeGrid(
	grid: readonly unknown[] | undefined,
	owner: "createFormKit",
): readonly number[] {
	if (grid === undefined) {
		return defaultGrid
	}
	if (!Array.isArray(grid) || grid.length === 0) {
		throw new TypeError(`${owner} grid must be a non-empty array`)
	}

	const unique = new Set<number>()
	for (const value of grid) {
		if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
			throw new TypeError(`${owner} grid values must be positive integers`)
		}
		if (unique.has(value)) {
			throw new TypeError(`${owner} grid cannot contain duplicate ${value}`)
		}
		unique.add(value)
	}
	if (!unique.has(1)) {
		throw new TypeError(`${owner} grid must include 1`)
	}

	return Object.freeze([...unique].sort((left, right) => left - right))
}

export function normalizeDefinition<Schema extends StandardSchema>(
	schema: Schema,
	source: unknown,
	controls: ControlDefinitionRegistry,
	grid: readonly number[],
): FormDefinition<Schema> {
	assertStandardSchema(schema)
	if (!isRecord(source) || !Array.isArray(source.ui)) {
		throw new TypeError("Form definition must contain a ui array")
	}

	const state = {
		controls,
		ids: new Set<string>(),
		nodes: [] as RuntimeNode[],
	}
	const ui = normalizeNodes(source.ui, state, "", undefined)

	return Object.freeze({
		schema,
		grid,
		ui,
		nodes: Object.freeze([...state.nodes]),
	}) as FormDefinition<Schema>
}

function normalizeNodes(
	source: readonly unknown[],
	state: {
		readonly controls: ControlDefinitionRegistry
		readonly ids: Set<string>
		readonly nodes: RuntimeNode[]
	},
	scopePath: string,
	parentId: string | undefined,
): readonly RuntimeNode[] {
	return Object.freeze(
		source.map((candidate) => {
			if (!isRecord(candidate)) {
				throw new TypeError("UI nodes must be objects")
			}
			const kind = candidate.kind
			if (
				kind !== "array" &&
				kind !== "field" &&
				kind !== "render" &&
				kind !== "section"
			) {
				throw new TypeError(`Unknown UI node kind "${String(kind)}"`)
			}

			const path =
				kind === "field" || kind === "array"
					? normalizePath(candidate.path)
					: undefined
			if (kind === "field") {
				if (
					typeof candidate.control !== "string" ||
					!Object.hasOwn(state.controls, candidate.control)
				) {
					throw new TypeError(`Unknown control "${String(candidate.control)}"`)
				}
			}
			if (kind === "array" && !("itemDefault" in candidate)) {
				throw new TypeError(`Array "${path}" requires itemDefault`)
			}

			const fallbackId =
				path === undefined ? `${kind}:${state.nodes.length}` : `${kind}:${path}`
			const id = normalizeId(candidate.id ?? fallbackId)
			const scopedId = scopePath.length === 0 ? id : `${scopePath}:${id}`
			if (state.ids.has(scopedId)) {
				throw new TypeError(`Duplicate UI node id "${id}"`)
			}
			state.ids.add(scopedId)

			const rawChildren = candidate.children
			if (
				(kind === "array" || kind === "section") &&
				!Array.isArray(rawChildren)
			) {
				throw new TypeError(`${kind} node "${id}" requires children`)
			}
			const childScope =
				kind === "array" && path !== undefined
					? joinPath(scopePath, path)
					: scopePath
			const children = Array.isArray(rawChildren)
				? normalizeNodes(rawChildren, state, childScope, id)
				: undefined
			const node = Object.freeze({
				...candidate,
				id,
				kind,
				...(path === undefined ? {} : { path }),
				...(parentId === undefined ? {} : { parentId }),
				scopePath,
				...(children === undefined ? {} : { children }),
			}) as RuntimeNode
			state.nodes.push(node)
			return node
		}),
	)
}

export function resolveDefinition<Schema extends StandardSchema, Context>(
	definition: FormDefinition<Schema>,
	values: FormInput<Schema>,
	context: Context,
	options: { readonly disabled?: boolean; readonly readOnly?: boolean },
): ResolvedDefinition {
	const resolvedNodes: ResolvedNode[] = []
	const resolveNodes = (
		nodes: readonly RuntimeNode[],
		pathPrefix: string,
		idPrefix: string,
		parent: {
			readonly visible: boolean
			readonly disabled: boolean
			readonly readOnly: boolean
			readonly columns?: number
		},
	): readonly ResolvedNode[] =>
		Object.freeze(
			nodes.map((node) => {
				const { children: _templateChildren, ...nodeShell } = node
				const id = idPrefix.length === 0 ? node.id : `${idPrefix}.${node.id}`
				const visible =
					parent.visible &&
					resolveValue(node.visible, true, values, pathPrefix, context)
				const disabled =
					parent.disabled ||
					resolveValue(node.disabled, false, values, pathPrefix, context)
				const readOnly =
					parent.readOnly ||
					resolveValue(node.readOnly, false, values, pathPrefix, context)
				const common = {
					...nodeShell,
					id,
					visible,
					disabled,
					readOnly,
					context,
					className: resolveOptional(
						node.className,
						values,
						pathPrefix,
						context,
					),
					span: validateSpan(
						resolveOptional(node.span, values, pathPrefix, context),
						definition.grid,
						parent.columns,
					),
				}

				let resolved: ResolvedNode
				switch (node.kind) {
					case "field": {
						const path = joinPath(pathPrefix, String(node.path))
						resolved = Object.freeze({
							...common,
							path,
							label: resolveOptional(node.label, values, pathPrefix, context),
							description: resolveOptional(
								node.description,
								values,
								pathPrefix,
								context,
							),
							slotOptions: resolveOptional(
								node.slotOptions,
								values,
								pathPrefix,
								context,
							),
							required: resolveValue(
								node.required,
								false,
								values,
								pathPrefix,
								context,
							),
							options: resolveOptional(
								node.options,
								values,
								pathPrefix,
								context,
							),
						})
						break
					}
					case "section": {
						const columns = validateColumns(
							resolveValue(node.columns, 1, values, pathPrefix, context),
							definition.grid,
						)
						const children = resolveNodes(
							node.children ?? [],
							pathPrefix,
							idPrefix,
							{ visible, disabled, readOnly, columns },
						)
						resolved = Object.freeze({
							...common,
							columns,
							title: resolveOptional(node.title, values, pathPrefix, context),
							description: resolveOptional(
								node.description,
								values,
								pathPrefix,
								context,
							),
							slotOptions: resolveOptional(
								node.slotOptions,
								values,
								pathPrefix,
								context,
							),
							children,
						})
						break
					}
					case "array": {
						const path = joinPath(pathPrefix, String(node.path))
						const arrayValue = getPathValue(values, path)
						const itemChildren = Array.isArray(arrayValue)
							? Object.freeze(
									arrayValue.map((_item, index) =>
										resolveNodes(
											node.children ?? [],
											`${path}[${index}]`,
											`${idPrefix}${idPrefix.length === 0 ? "" : "."}${path}[${index}]`,
											{ visible, disabled, readOnly },
										),
									),
								)
							: Object.freeze([])
						resolved = Object.freeze({
							...common,
							path,
							label: resolveOptional(node.label, values, pathPrefix, context),
							description: resolveOptional(
								node.description,
								values,
								pathPrefix,
								context,
							),
							slotOptions: resolveOptional(
								node.slotOptions,
								values,
								pathPrefix,
								context,
							),
							itemChildren,
						})
						break
					}
					case "render":
						resolved = Object.freeze(common)
						break
				}
				resolvedNodes.push(resolved)
				return resolved
			}),
		)

	const ui = resolveNodes(definition.ui as readonly RuntimeNode[], "", "", {
		visible: true,
		disabled: options.disabled === true,
		readOnly: options.readOnly === true,
	})
	return Object.freeze({ ui, nodes: Object.freeze(resolvedNodes) })
}

function resolveValue<Value, Context>(
	value: unknown,
	fallback: Value,
	values: unknown,
	pathPrefix: string,
	context: Context,
): Value {
	return value === undefined
		? fallback
		: (resolveOptional(value, values, pathPrefix, context) as Value)
}

function resolveOptional<Context>(
	value: unknown,
	values: unknown,
	_pathPrefix: string,
	context: Context,
): unknown {
	if (typeof value !== "function") {
		return value
	}
	const result = (
		value as (
			resolverValues: unknown,
			details: { readonly context: Readonly<Context> },
		) => unknown
	)(values, { context })
	if (
		result !== null &&
		(typeof result === "object" || typeof result === "function") &&
		"then" in result &&
		typeof result.then === "function"
	) {
		throw new TypeError("UI resolvers must be synchronous")
	}
	return result
}

function getPathValue(value: unknown, path: string): unknown {
	let current = value
	for (const segment of path.replaceAll(/\[(\d+)\]/g, ".$1").split(".")) {
		if (current === null || typeof current !== "object") {
			return undefined
		}
		current = (current as Record<string, unknown>)[segment]
	}
	return current
}

function normalizePath(value: unknown): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError("Field and array paths must be non-empty strings")
	}
	if (!/^[^.[\]]+(?:(?:\.[^.[\]]+)|(?:\[(?:0|[1-9]\d*)\]))*$/.test(value)) {
		throw new TypeError(`Path "${value}" uses invalid TanStack path syntax`)
	}
	const segments = value.replaceAll(/\[(\d+)\]/g, ".$1").split(".")
	for (const [index, segment] of segments.entries()) {
		if (segment.length === 0 || reservedSegments.has(segment)) {
			throw new TypeError(`Path "${value}" contains an invalid segment`)
		}
		if (index === 0 && /^\d+$/.test(segment)) {
			throw new TypeError(`Path "${value}" starts with an array index`)
		}
	}
	return value
}

function normalizeId(value: unknown): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError("UI node ids must be non-empty strings")
	}
	return value
}

function joinPath(prefix: string, path: string): string {
	if (prefix.length === 0) {
		return path
	}
	return path.startsWith("[") ? `${prefix}${path}` : `${prefix}.${path}`
}

function validateColumns(value: unknown, grid: readonly number[]): number {
	if (typeof value !== "number" || !grid.includes(value)) {
		throw new TypeError(`Section layout columns must use the kit grid`)
	}
	return value
}

function validateSpan(
	value: unknown,
	grid: readonly number[],
	parentColumns?: number,
): number | "full" | undefined {
	if (value === undefined || value === "full") {
		return value
	}
	if (
		typeof value !== "number" ||
		!grid.includes(value) ||
		(parentColumns !== undefined && value > parentColumns)
	) {
		throw new TypeError("Layout span must use the kit grid")
	}
	return value
}

function assertStandardSchema(value: unknown): asserts value is StandardSchema {
	if (
		!isRecord(value) ||
		!isRecord(value["~standard"]) ||
		typeof value["~standard"].validate !== "function"
	) {
		throw new TypeError("Form schema must implement Standard Schema validate")
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}
