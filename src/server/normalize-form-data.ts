import type { SubmissionIssue } from "../core/form-result.js"
import {
	formatPath,
	type PathSegment,
	type PathSegments,
	parsePath,
} from "../core/path.js"
import {
	createInvalidFormDataIssue,
	fpArrayMarkerName,
	type ParseFormDataOptions,
	type ResolvedParseFormDataOptions,
	resolveParseFormDataOptions,
} from "./protocol.js"

export type NormalizeFormDataResult =
	| {
			readonly success: true
			readonly value: Record<string, unknown>
	  }
	| {
			readonly success: false
			readonly issues: readonly SubmissionIssue[]
	  }

type ValueEntry = {
	readonly path: string
	readonly segments: PathSegments
	readonly values: FormDataEntryValue[]
}

type TrieKind = "array" | "object"
type TerminalKind = "array" | "scalar"

type TrieNode = {
	kind?: TrieKind
	terminal?: TerminalKind
	readonly children: Map<PathSegment, TrieNode>
	markedArray?: boolean
	value?: FormDataEntryValue | readonly FormDataEntryValue[]
}

export function normalizeFormData(
	formData: FormData,
	options?: ParseFormDataOptions,
): NormalizeFormDataResult {
	const resolvedOptions = resolveParseFormDataOptions(options)

	try {
		const normalizedEntries = collectEntries(formData, resolvedOptions)
		const root = buildTrie(normalizedEntries, resolvedOptions)
		validateArrayIndexes(root)

		return Object.freeze({
			success: true,
			value: materializeObject(root),
		})
	} catch {
		return Object.freeze({
			success: false,
			issues: Object.freeze([createInvalidFormDataIssue()]),
		})
	}
}

function collectEntries(
	formData: FormData,
	options: ResolvedParseFormDataOptions,
): {
	readonly valuesByPath: ReadonlyMap<string, ValueEntry>
	readonly arrayMarkers: ReadonlySet<string>
} {
	const valuesByPath = new Map<string, ValueEntry>()
	const arrayMarkers = new Set<string>()
	let entryCount = 0

	for (const [name, value] of formData.entries()) {
		entryCount += 1
		if (entryCount > options.maxEntries) {
			throw new TypeError("FormData contains too many entries")
		}

		if (name === fpArrayMarkerName) {
			addArrayMarker(value, arrayMarkers, options)
			continue
		}

		if (isReservedMetadataName(name)) {
			throw new TypeError("FormData contains unknown Form Please metadata")
		}

		const segments = parseFormDataPath(name, options)
		const path = formatPath(segments, { maxIndex: options.maxArrayIndex })
		const entry = valuesByPath.get(path)
		if (entry === undefined) {
			valuesByPath.set(path, {
				path,
				segments,
				values: [value],
			})
			continue
		}

		entry.values.push(value)
	}

	return {
		valuesByPath,
		arrayMarkers,
	}
}

function addArrayMarker(
	value: FormDataEntryValue,
	arrayMarkers: Set<string>,
	options: ResolvedParseFormDataOptions,
): void {
	if (typeof value !== "string") {
		throw new TypeError("Form Please array marker values must be strings")
	}

	const segments = parseFormDataPath(value, options)
	const path = formatPath(segments, { maxIndex: options.maxArrayIndex })
	if (arrayMarkers.has(path)) {
		throw new TypeError("Duplicate Form Please array marker")
	}
	arrayMarkers.add(path)
}

function parseFormDataPath(
	path: string,
	options: ResolvedParseFormDataOptions,
): PathSegments {
	if (path.length > options.maxPathLength) {
		throw new TypeError("FormData path exceeds maximum length")
	}

	const segments = parsePath(path, { maxIndex: options.maxArrayIndex })
	if (segments.length > options.maxDepth) {
		throw new TypeError("FormData path exceeds maximum depth")
	}

	return segments
}

function buildTrie(
	entries: {
		readonly valuesByPath: ReadonlyMap<string, ValueEntry>
		readonly arrayMarkers: ReadonlySet<string>
	},
	options: ResolvedParseFormDataOptions,
): TrieNode {
	const root = createTrieNode("object")

	for (const path of entries.arrayMarkers) {
		const segments = parsePath(path, { maxIndex: options.maxArrayIndex })
		const node = ensurePath(root, segments)
		ensureNodeKind(node, "array")
		node.markedArray = true
	}

	for (const entry of entries.valuesByPath.values()) {
		const markedArray = entries.arrayMarkers.has(entry.path)
		const terminal = markedArray || entry.values.length > 1 ? "array" : "scalar"
		const value =
			terminal === "array" ? Object.freeze([...entry.values]) : entry.values[0]
		const node = ensurePath(root, entry.segments)

		if (node.children.size > 0) {
			throw new TypeError("FormData mixes scalar and nested values")
		}

		if (node.kind !== undefined && !node.markedArray) {
			throw new TypeError("FormData mixes scalar and nested values")
		}

		if (node.kind === "array" && node.children.size > 0) {
			throw new TypeError("FormData mixes indexed and repeated arrays")
		}

		if (node.terminal !== undefined) {
			throw new TypeError("Duplicate FormData terminal")
		}

		node.terminal = terminal
		node.value = value
	}

	return root
}

function ensurePath(root: TrieNode, segments: PathSegments): TrieNode {
	let node = root

	for (const [index, segment] of segments.entries()) {
		if (node.terminal !== undefined) {
			throw new TypeError("FormData mixes scalar and nested values")
		}

		const nextSegment = segments[index + 1]
		let child = node.children.get(segment)
		if (child === undefined) {
			child = createTrieNode()
			node.children.set(segment, child)
		}

		if (nextSegment !== undefined) {
			ensureNodeKind(
				child,
				typeof nextSegment === "number" ? "array" : "object",
			)
		}

		node = child
	}

	return node
}

function validateArrayIndexes(node: TrieNode): void {
	if (
		node.kind === "array" &&
		node.children.size > 0 &&
		node.terminal !== undefined
	) {
		throw new TypeError("FormData mixes indexed and repeated arrays")
	}

	if (node.kind === "array") {
		const indexes = [...node.children.keys()]
		if (!indexes.every((index): index is number => typeof index === "number")) {
			throw new TypeError("FormData array contains object keys")
		}

		indexes.sort((left, right) => left - right)
		for (const [expected, actual] of indexes.entries()) {
			if (actual !== expected) {
				throw new TypeError("FormData array indexes must be contiguous")
			}
		}
	} else {
		for (const key of node.children.keys()) {
			if (typeof key === "number") {
				throw new TypeError("FormData object contains array indexes")
			}
		}
	}

	for (const child of node.children.values()) {
		validateArrayIndexes(child)
	}
}

function materializeValue(node: TrieNode): unknown {
	if (node.terminal === "scalar") {
		return node.value
	}

	if (node.terminal === "array") {
		return Object.freeze([...(node.value as readonly FormDataEntryValue[])])
	}

	if (node.kind === "array") {
		const values: unknown[] = []
		const indexes = [...node.children.keys()].sort((left, right) => {
			return (left as number) - (right as number)
		})
		for (const index of indexes) {
			values.push(materializeValue(node.children.get(index) as TrieNode))
		}
		return Object.freeze(values)
	}

	return materializeObject(node)
}

function materializeObject(node: TrieNode): Record<string, unknown> {
	const value = Object.create(null) as Record<string, unknown>

	for (const [key, child] of node.children) {
		value[String(key)] = materializeValue(child)
	}

	return value
}

function ensureNodeKind(node: TrieNode, kind: TrieKind): void {
	if (node.terminal !== undefined) {
		throw new TypeError("FormData mixes scalar and nested values")
	}

	if (node.kind !== undefined && node.kind !== kind) {
		throw new TypeError("FormData mixes object and array shapes")
	}

	node.kind = kind
}

function createTrieNode(kind?: TrieKind): TrieNode {
	return {
		kind,
		children: new Map(),
	}
}

function isReservedMetadataName(name: string): boolean {
	return name === "__fp" || name.startsWith("__fp.")
}
