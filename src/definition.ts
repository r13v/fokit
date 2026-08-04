import type {
	ControlDefinitionRegistry,
	FormDefinition,
	FormInput,
	NormalizedNode,
	StandardSchema,
} from "./types.js"

/** A supported UI node discriminator. */
type NodeKind = "array" | "field" | "render" | "section"
/** A normalized node used by the definition resolver. */
type RuntimeNode = NormalizedNode & {
	/** Preserves normalized node properties without widening their contracts. */
	readonly [key: string]: unknown
	/** The node category used by resolution. */
	readonly kind: NodeKind
	/** Normalized child templates for sections and arrays. */
	readonly children?: readonly RuntimeNode[]
}

/** A normalized UI node with all dynamic properties resolved. */
export type ResolvedNode = {
	/** Preserves resolved node properties for runtime renderers. */
	readonly [key: string]: unknown
	/** The unique runtime ID, including any array item prefix. */
	readonly id: string
	/** The node category used by the renderer. */
	readonly kind: NodeKind
	/** The absolute input path for a field or array node. */
	readonly path?: string
	/** Whether the renderer includes this node. */
	readonly visible: boolean
	/** Whether user interaction with this node is disabled. */
	readonly disabled: boolean
	/** Whether value changes in this node are read-only. */
	readonly readOnly: boolean
	/** The runtime context supplied to controls and render nodes. */
	readonly context: unknown
	/** Resolved section children. */
	readonly children?: readonly ResolvedNode[]
	/** Resolved child nodes for each current array item. */
	readonly itemChildren?: readonly (readonly ResolvedNode[])[]
}

/** The root UI tree and flat index produced by definition resolution. */
export type ResolvedDefinition = {
	/** Resolved root nodes in render order. */
	readonly ui: readonly ResolvedNode[]
	/** All resolved nodes in depth-first order. */
	readonly nodes: readonly ResolvedNode[]
}

/** The default column and span scale for a form kit. */
const defaultGrid = Object.freeze([1, 2, 3, 4])
/** Path segments rejected to prevent prototype traversal. */
const reservedSegments = new Set(["__proto__", "constructor", "prototype"])

/** Validates, sorts, and freezes a form kit grid scale. */
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

/** Validates and freezes a user-authored form definition. */
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

/** Validates and normalizes one nested list of UI nodes. */
function normalizeNodes(
	source: readonly unknown[],
	state: {
		/** Controls available to field nodes. */
		readonly controls: ControlDefinitionRegistry
		/** Scoped IDs already claimed by normalized nodes. */
		readonly ids: Set<string>
		/** Flat destination for normalized nodes. */
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

/** Resolves all dynamic definition values for the current input and context. */
export function resolveDefinition<Schema extends StandardSchema, Context>(
	definition: FormDefinition<Schema>,
	values: FormInput<Schema>,
	context: Context,
	options: {
		/** Disables all nodes in the resolved definition. */
		readonly disabled?: boolean
		/** Makes all nodes in the resolved definition read-only. */
		readonly readOnly?: boolean
	},
): ResolvedDefinition {
	const resolvedNodes: ResolvedNode[] = []
	const resolveNodes = (
		nodes: readonly RuntimeNode[],
		pathPrefix: string,
		idPrefix: string,
		parent: {
			/** Whether the parent is visible. */
			readonly visible: boolean
			/** Whether the parent is disabled. */
			readonly disabled: boolean
			/** Whether the parent is read-only. */
			readonly readOnly: boolean
			/** The parent grid column count, when it defines a grid. */
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
											`${path}.${index}`,
											`${idPrefix}${idPrefix.length === 0 ? "" : "."}${path}.${index}`,
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

/** Resolves a value or uses its default when it is absent. */
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

/** Resolves a synchronous UI value when it is a function. */
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
			details: {
				/** The readonly runtime context for the resolver. */
				readonly context: Readonly<Context>
			},
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

/** Reads a value from an object by a validated dot path. */
function getPathValue(value: unknown, path: string): unknown {
	let current = value
	for (const segment of path.split(".")) {
		if (current === null || typeof current !== "object") {
			return undefined
		}
		current = (current as Record<string, unknown>)[segment]
	}
	return current
}

/** Validates a relative field or array path. */
function normalizePath(value: unknown): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError("Field and array paths must be non-empty strings")
	}
	if (!/^[^.[\]]+(?:\.[^.[\]]+)*$/.test(value)) {
		throw new TypeError(`Path "${value}" uses invalid React Hook Form syntax`)
	}
	const segments = value.split(".")
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

/** Validates a non-empty UI node ID. */
function normalizeId(value: unknown): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new TypeError("UI node ids must be non-empty strings")
	}
	return value
}

/** Joins a path scope and relative path. */
function joinPath(prefix: string, path: string): string {
	if (prefix.length === 0) {
		return path
	}
	return `${prefix}.${path}`
}

/** Validates a section column count against the kit grid. */
function validateColumns(value: unknown, grid: readonly number[]): number {
	if (typeof value !== "number" || !grid.includes(value)) {
		throw new TypeError(`Section layout columns must use the kit grid`)
	}
	return value
}

/** Validates a node span against the kit grid and its parent grid. */
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

/** Asserts that a value implements the Standard Schema validation contract. */
function assertStandardSchema(value: unknown): asserts value is StandardSchema {
	if (
		!isRecord(value) ||
		!isRecord(value["~standard"]) ||
		typeof value["~standard"].validate !== "function"
	) {
		throw new TypeError("Form schema must implement Standard Schema validate")
	}
}

/** Tests whether a value is a non-array object record. */
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
}
