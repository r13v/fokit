import type { JsonValue, PersistenceCodec } from "./encoding.js"

export function createDateCodec(tag = "date"): PersistenceCodec<Date> {
	return Object.freeze({
		tag,
		canEncode: (value: unknown): value is Date => value instanceof Date,
		encode: (value) => value.toISOString(),
		decode: (value) => {
			if (typeof value !== "string") {
				throw new TypeError("Date persistence payload must be a string")
			}
			const date = new Date(value)
			if (Number.isNaN(date.getTime())) {
				throw new TypeError("Date persistence payload must be a valid ISO date")
			}
			return date
		},
	})
}

export type CreateFileCodecOptions = Readonly<{
	tag?: string
	maxSize?: number
}>

export function createFileCodec(
	options: CreateFileCodecOptions = {},
): PersistenceCodec<File> {
	const maxSize = options.maxSize ?? 10 * 1024 * 1024
	if (!Number.isSafeInteger(maxSize) || maxSize < 0) {
		throw new TypeError("File codec maxSize must be a non-negative integer")
	}
	return Object.freeze({
		tag: options.tag ?? "file",
		canEncode: (value: unknown): value is File =>
			typeof File !== "undefined" && value instanceof File,
		encode: async (value) => {
			if (value.size > maxSize) {
				throw new TypeError(
					`File "${value.name}" exceeds the persistence limit of ${maxSize} bytes`,
				)
			}
			return Object.freeze({
				content: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
				name: value.name,
				type: value.type,
				lastModified: value.lastModified,
			})
		},
		decode: (value) => {
			const payload = readFilePayload(value)
			if (typeof File === "undefined") {
				throw new TypeError("File persistence decoding requires the File API")
			}
			return new File([base64ToBytes(payload.content).buffer], payload.name, {
				type: payload.type,
				lastModified: payload.lastModified,
			})
		},
	})
}

function readFilePayload(value: JsonValue): {
	content: string
	name: string
	type: string
	lastModified: number
} {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new TypeError("File persistence payload must be an object")
	}
	const payload = value as Record<string, JsonValue>
	if (
		typeof payload.content !== "string" ||
		typeof payload.name !== "string" ||
		typeof payload.type !== "string" ||
		!Number.isSafeInteger(payload.lastModified) ||
		(payload.lastModified as number) < 0
	) {
		throw new TypeError("File persistence payload is invalid")
	}
	return payload as {
		content: string
		name: string
		type: string
		lastModified: number
	}
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ""
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
	}
	return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
	let binary: string
	try {
		binary = atob(value)
	} catch {
		throw new TypeError("File persistence content must be valid base64")
	}
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}
