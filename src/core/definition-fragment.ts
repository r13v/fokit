import { isPlainObject } from "./object.js"
import { formatPath } from "./path.js"

const fieldResolverKeys = [
	"label",
	"description",
	"slotOptions",
	"required",
	"disabled",
	"readOnly",
	"visible",
	"options",
] as const

const sectionResolverKeys = [
	"title",
	"description",
	"slotOptions",
	"disabled",
	"readOnly",
	"visible",
] as const

const arrayResolverKeys = [
	"label",
	"description",
	"slotOptions",
	"disabled",
	"readOnly",
	"visible",
] as const

const renderResolverKeys = ["disabled", "readOnly", "visible"] as const

export function scopeDefinitionFragment(
	scopePath: string,
	nodes: readonly unknown[],
): readonly unknown[] {
	const scope = formatPath(scopePath)
	if (!Array.isArray(nodes)) {
		throw new TypeError("Definition fragment nodes must be an array")
	}

	return Object.freeze(nodes.map((node) => scopeNode(scope, node)))
}

function scopeNode(scope: string, node: unknown): unknown {
	if (!isPlainObject(node)) {
		throw new TypeError("Definition fragment node must be an object")
	}

	switch (node.kind) {
		case "field":
			return scopePathNode(scope, node, fieldResolverKeys)
		case "section":
			return {
				...scopeResolvers(scope, node, sectionResolverKeys),
				children: scopeDefinitionFragment(
					scope,
					normalizeChildren(node.children, "section"),
				),
			}
		case "array":
			return scopePathNode(scope, node, arrayResolverKeys)
		case "render":
			return scopeResolvers(scope, node, renderResolverKeys)
		default:
			throw new TypeError(
				`Unknown definition fragment node kind "${String(node.kind)}"`,
			)
	}
}

function scopePathNode(
	scope: string,
	node: Record<string, unknown>,
	resolverKeys: readonly string[],
): Record<string, unknown> {
	if (typeof node.path !== "string") {
		throw new TypeError("Definition fragment node path must be a string")
	}

	return {
		...scopeResolvers(scope, node, resolverKeys),
		path: formatPath(`${scope}.${node.path}`),
	}
}

function scopeResolvers(
	scope: string,
	node: Record<string, unknown>,
	resolverKeys: readonly string[],
): Record<string, unknown> {
	const scoped = { ...node }
	for (const key of resolverKeys) {
		const value = node[key]
		if (typeof value === "function") {
			scoped[key] = createScopedResolver(
				scope,
				value as (...args: never[]) => unknown,
			)
		}
	}
	return scoped
}

function createScopedResolver(
	scope: string,
	resolver: (...args: never[]) => unknown,
): (values: Readonly<Record<string, unknown>>, details: unknown) => unknown {
	return (values, details) => {
		const tracker = createScopedValues(scope, values)
		try {
			return resolver(tracker.values as never, details as never)
		} finally {
			tracker.revoke()
		}
	}
}

function createScopedValues(
	scope: string,
	values: Readonly<Record<string, unknown>>,
): {
	readonly values: Readonly<Record<string, unknown>>
	readonly revoke: () => void
} {
	const rejectMutation = (): never => {
		throw new TypeError("UI resolver values are read-only")
	}
	const read = (property: PropertyKey): unknown => {
		if (typeof property !== "string") {
			throw new TypeError("UI resolver values must be accessed by a field path")
		}

		return values[formatPath(`${scope}.${property}`)]
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

	return { values: proxy, revoke }
}

function normalizeChildren(
	children: unknown,
	nodeKind: "section",
): readonly unknown[] {
	if (!Array.isArray(children)) {
		throw new TypeError(`${nodeKind} children must be an array`)
	}

	return children
}
