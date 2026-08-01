import { formatPath, type PathSegments, parsePath } from "../core/path.js"

export type JsonValue =
	| null
	| boolean
	| number
	| string
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue }

export type PersistenceCodec<Value = unknown> = Readonly<{
	tag: string
	canEncode(value: unknown): value is Value
	encode(value: Value): JsonValue | Promise<JsonValue>
	decode(value: JsonValue): Value | Promise<Value>
}>

export type PersistenceMigration = (
	payload: JsonValue,
	fromVersion: number,
	toVersion: number,
) => JsonValue | Promise<JsonValue>

export type PersistenceMode = "document" | "history"

const FORM_PERSISTENCE_PROTOCOL = "form-please/persistence" as const
const FORM_PERSISTENCE_PROTOCOL_VERSION = 1 as const

type EncodedNode =
	| { readonly type: "null" }
	| { readonly type: "boolean"; readonly value: boolean }
	| { readonly type: "number"; readonly value: number }
	| { readonly type: "string"; readonly value: string }
	| { readonly type: "undefined" }
	| { readonly type: "array"; readonly items: readonly EncodedNode[] }
	| {
			readonly type: "object"
			readonly entries: readonly (readonly [string, EncodedNode])[]
	  }
	| {
			readonly type: "codec"
			readonly tag: string
			readonly value: JsonValue
	  }

type PersistenceEnvelope = Readonly<{
	protocol: typeof FORM_PERSISTENCE_PROTOCOL
	protocolVersion: typeof FORM_PERSISTENCE_PROTOCOL_VERSION
	version: number
	mode: PersistenceMode
	payload: JsonValue
}>

export async function encodePersistenceEnvelope(
	value: unknown,
	options: Readonly<{
		version: number
		mode: PersistenceMode
		codecs: readonly PersistenceCodec[]
	}>,
): Promise<JsonValue> {
	return Object.freeze({
		protocol: FORM_PERSISTENCE_PROTOCOL,
		protocolVersion: FORM_PERSISTENCE_PROTOCOL_VERSION,
		version: options.version,
		mode: options.mode,
		payload: (await encodeNode(
			value,
			options.codecs,
			[],
			new WeakSet(),
		)) as JsonValue,
	})
}

export async function decodePersistenceEnvelope(
	input: unknown,
	options: Readonly<{
		version: number
		mode: PersistenceMode
		codecs: readonly PersistenceCodec[]
		migrate?: PersistenceMigration
	}>,
): Promise<Readonly<{ value: unknown; migrated: boolean }>> {
	assertJsonValue(input, "Persistence envelope")
	const envelope = readEnvelope(input)
	if (envelope.mode !== options.mode) {
		throw new TypeError(
			`Persisted form mode ${envelope.mode} does not match configured ${options.mode} mode`,
		)
	}

	let payload = envelope.payload
	const migrated = envelope.version !== options.version
	if (migrated) {
		if (options.migrate === undefined) {
			throw new TypeError(
				`Persisted form data version ${envelope.version} requires a migration to version ${options.version}`,
			)
		}
		payload = await options.migrate(
			envelope.payload,
			envelope.version,
			options.version,
		)
		assertJsonValue(payload, "Migrated persistence payload")
	}

	return Object.freeze({
		value: await decodeNode(payload, options.codecs, []),
		migrated,
	})
}

export function normalizePersistenceCodecs(
	codecs: readonly PersistenceCodec[] | undefined,
): readonly PersistenceCodec[] {
	if (codecs === undefined) return Object.freeze([])
	if (!Array.isArray(codecs)) {
		throw new TypeError("Persistence codecs must be an array")
	}
	const tags = new Set<string>()
	return Object.freeze(
		codecs.map((codec, index) => {
			if (typeof codec !== "object" || codec === null) {
				throw new TypeError(
					`Persistence codec at index ${index} must be an object`,
				)
			}
			if (typeof codec.tag !== "string" || codec.tag.length === 0) {
				throw new TypeError("Persistence codec tags must be non-empty strings")
			}
			if (tags.has(codec.tag)) {
				throw new TypeError(`Duplicate persistence codec tag "${codec.tag}"`)
			}
			if (
				typeof codec.canEncode !== "function" ||
				typeof codec.encode !== "function" ||
				typeof codec.decode !== "function"
			) {
				throw new TypeError(
					`Persistence codec "${codec.tag}" must define canEncode, encode, and decode`,
				)
			}
			tags.add(codec.tag)
			return Object.freeze(codec)
		}),
	)
}

function readEnvelope(input: JsonValue): PersistenceEnvelope {
	const envelope = readObject(input, "Persistence envelope")
	if (envelope.protocol !== FORM_PERSISTENCE_PROTOCOL) {
		throw new TypeError("Unsupported persistence protocol identifier")
	}
	if (envelope.protocolVersion !== FORM_PERSISTENCE_PROTOCOL_VERSION) {
		throw new TypeError(
			`Unsupported persistence protocol version ${String(envelope.protocolVersion)}`,
		)
	}
	const version = envelope.version
	if (
		typeof version !== "number" ||
		!Number.isSafeInteger(version) ||
		version < 0
	) {
		throw new TypeError(
			"Persistence application version must be a non-negative integer",
		)
	}
	if (envelope.mode !== "document" && envelope.mode !== "history") {
		throw new TypeError("Persistence mode must be document or history")
	}
	if (!("payload" in envelope)) {
		throw new TypeError("Persistence envelope is missing its payload")
	}
	return envelope as unknown as PersistenceEnvelope
}

async function encodeNode(
	value: unknown,
	codecs: readonly PersistenceCodec[],
	path: PathSegments,
	ancestors: WeakSet<object>,
): Promise<EncodedNode> {
	if (value === null) return { type: "null" }
	if (value === undefined) return { type: "undefined" }
	if (typeof value === "boolean") return { type: "boolean", value }
	if (typeof value === "string") return { type: "string", value }
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw unsupported(path, "non-finite number")
		return { type: "number", value }
	}

	for (const codec of codecs) {
		if (!codec.canEncode(value)) continue
		const encoded = await codec.encode(value)
		assertJsonValue(encoded, `Persistence codec "${codec.tag}" output`)
		return { type: "codec", tag: codec.tag, value: encoded }
	}

	if (typeof value !== "object") throw unsupported(path, typeof value)
	if (ancestors.has(value)) throw unsupported(path, "cyclic value")
	ancestors.add(value)
	try {
		if (Array.isArray(value)) {
			return {
				type: "array",
				items: await Promise.all(
					value.map((item, index) =>
						encodeNode(item, codecs, [...path, index], ancestors),
					),
				),
			}
		}

		const prototype = Object.getPrototypeOf(value)
		if (prototype !== Object.prototype && prototype !== null) {
			throw unsupported(path, value.constructor?.name ?? "opaque object")
		}
		const entries: (readonly [string, EncodedNode])[] = []
		for (const key of Object.keys(value).sort()) {
			entries.push([
				key,
				await encodeNode(
					(value as Record<string, unknown>)[key],
					codecs,
					encodedChildPath(value as Record<string, unknown>, key, path),
					ancestors,
				),
			])
		}
		return { type: "object", entries }
	} finally {
		ancestors.delete(value)
	}
}

function encodedChildPath(
	parent: Record<string, unknown>,
	key: string,
	path: PathSegments,
): PathSegments {
	if (key === "values" && "rowIdentity" in parent) return []
	if (
		key === "value" &&
		parent.type === "set" &&
		typeof parent.path === "string"
	) {
		return parsePath(parent.path)
	}
	return [...path, key]
}

async function decodeNode(
	input: JsonValue,
	codecs: readonly PersistenceCodec[],
	path: PathSegments,
): Promise<unknown> {
	const node = readObject(
		input,
		`Encoded persistence value at ${pathLabel(path)}`,
	)
	switch (node.type) {
		case "null":
			return null
		case "undefined":
			return undefined
		case "boolean":
			if (typeof node.value !== "boolean") throw malformed(path)
			return node.value
		case "number":
			if (typeof node.value !== "number" || !Number.isFinite(node.value)) {
				throw malformed(path)
			}
			return node.value
		case "string":
			if (typeof node.value !== "string") throw malformed(path)
			return node.value
		case "array":
			if (!Array.isArray(node.items)) throw malformed(path)
			return Promise.all(
				node.items.map((item, index) =>
					decodeNode(item, codecs, [...path, index]),
				),
			)
		case "object": {
			if (!Array.isArray(node.entries)) throw malformed(path)
			const result = Object.create(null) as Record<string, unknown>
			for (const entry of node.entries) {
				if (
					!Array.isArray(entry) ||
					entry.length !== 2 ||
					typeof entry[0] !== "string" ||
					entry[0] in result
				) {
					throw malformed(path)
				}
				result[entry[0]] = await decodeNode(entry[1], codecs, [
					...path,
					entry[0],
				])
			}
			return result
		}
		case "codec": {
			if (typeof node.tag !== "string" || !("value" in node)) {
				throw malformed(path)
			}
			const codec = codecs.find((candidate) => candidate.tag === node.tag)
			if (codec === undefined) {
				throw new TypeError(
					`Unknown persistence codec tag "${node.tag}" at ${pathLabel(path)}`,
				)
			}
			return codec.decode(node.value)
		}
		default:
			throw malformed(path)
	}
}

function assertJsonValue(
	value: unknown,
	label: string,
): asserts value is JsonValue {
	const ancestors = new WeakSet<object>()
	const visit = (candidate: unknown): void => {
		if (
			candidate === null ||
			typeof candidate === "boolean" ||
			typeof candidate === "string"
		) {
			return
		}
		if (typeof candidate === "number" && Number.isFinite(candidate)) return
		if (typeof candidate !== "object")
			throw new TypeError(`${label} must be JSON`)
		if (ancestors.has(candidate))
			throw new TypeError(`${label} must be acyclic JSON`)
		ancestors.add(candidate)
		try {
			if (Array.isArray(candidate)) {
				for (const item of candidate) visit(item)
				return
			}
			const prototype = Object.getPrototypeOf(candidate)
			if (prototype !== Object.prototype && prototype !== null) {
				throw new TypeError(`${label} must be JSON`)
			}
			for (const item of Object.values(candidate)) visit(item)
		} finally {
			ancestors.delete(candidate)
		}
	}
	visit(value)
}

function readObject(
	value: JsonValue,
	label: string,
): Record<string, JsonValue> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TypeError(`${label} must be an object`)
	}
	return value as Record<string, JsonValue>
}

function unsupported(path: PathSegments, kind: string): TypeError {
	return new TypeError(
		`Unsupported persistence value at ${pathLabel(path)}: ${kind}`,
	)
}

function malformed(path: PathSegments): TypeError {
	return new TypeError(
		`Malformed encoded persistence value at ${pathLabel(path)}`,
	)
}

function pathLabel(path: PathSegments): string {
	return path.length === 0 ? '"<root>"' : `"${formatPath(path)}"`
}
