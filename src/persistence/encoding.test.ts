import { describe, expect, it } from "vitest"
import { createDateCodec, createFileCodec } from "./codecs.js"
import {
	decodePersistenceEnvelope,
	encodePersistenceEnvelope,
	normalizePersistenceCodecs,
	type PersistenceCodec,
} from "./encoding.js"

describe("persistence encoding", () => {
	it("round-trips structural values and registered asynchronous codecs", async () => {
		const upper: PersistenceCodec<{ kind: "upper"; value: string }> = {
			tag: "upper",
			canEncode: (value): value is { kind: "upper"; value: string } =>
				typeof value === "object" &&
				value !== null &&
				"kind" in value &&
				value.kind === "upper",
			encode: async (value) => value.value,
			decode: async (value) => ({ kind: "upper", value: String(value) }),
		}
		const codecs = normalizePersistenceCodecs([createDateCodec(), upper])
		const envelope = await encodePersistenceEnvelope(
			{
				missing: undefined,
				list: [null, true, 4, "value"],
				when: new Date("2026-08-01T00:00:00.000Z"),
				custom: { kind: "upper", value: "Ada" },
			},
			{ version: 3, mode: "document", codecs },
		)

		const decoded = await decodePersistenceEnvelope(envelope, {
			version: 3,
			mode: "document",
			codecs,
		})
		expect(decoded.migrated).toBe(false)
		expect(decoded.value).toEqual({
			missing: undefined,
			list: [null, true, 4, "value"],
			when: new Date("2026-08-01T00:00:00.000Z"),
			custom: { kind: "upper", value: "Ada" },
		})
	})

	it("rejects cycles, opaque leaves, invalid tags, and unsupported protocols at their boundary", async () => {
		await expect(
			encodePersistenceEnvelope(
				{ values: { when: new Date() }, rowIdentity: {} },
				{ version: 1, mode: "document", codecs: [] },
			),
		).rejects.toThrow(/"when".*Date/i)

		const cyclic: { child?: unknown } = {}
		cyclic.child = cyclic
		await expect(
			encodePersistenceEnvelope(cyclic, {
				version: 1,
				mode: "document",
				codecs: [],
			}),
		).rejects.toThrow(/child.*cyclic/i)

		expect(() =>
			normalizePersistenceCodecs([{ ...createDateCodec(), tag: "" }]),
		).toThrow(/non-empty/i)
		expect(() =>
			normalizePersistenceCodecs([createDateCodec(), createDateCodec()]),
		).toThrow(/duplicate/i)
		await expect(
			decodePersistenceEnvelope(
				{
					protocol: "other",
					protocolVersion: 1,
					version: 1,
					mode: "document",
					payload: { type: "null" },
				},
				{ version: 1, mode: "document", codecs: [] },
			),
		).rejects.toThrow(/protocol identifier/i)
	})

	it("migrates untrusted JSON before codec decoding", async () => {
		const oldEnvelope = await encodePersistenceEnvelope(
			{ oldName: "Ada" },
			{ version: 1, mode: "document", codecs: [] },
		)
		const currentEnvelope = await encodePersistenceEnvelope(
			{ name: "Ada" },
			{ version: 2, mode: "document", codecs: [] },
		)
		const currentPayload = (currentEnvelope as { payload: never }).payload
		const migrated = await decodePersistenceEnvelope(oldEnvelope, {
			version: 2,
			mode: "document",
			codecs: [],
			migrate: (payload, from, to) => {
				expect(payload).toBeTypeOf("object")
				expect([from, to]).toEqual([1, 2])
				return currentPayload
			},
		})

		expect(migrated).toEqual({ value: { name: "Ada" }, migrated: true })
	})

	it("encodes File metadata and enforces the source size limit", async () => {
		const codec = createFileCodec({ maxSize: 3 })
		const file = new File([new Uint8Array([1, 2, 3])], "a.bin", {
			type: "application/octet-stream",
			lastModified: 123,
		})
		const payload = await codec.encode(file)
		const decoded = await codec.decode(payload)
		expect(decoded).toBeInstanceOf(File)
		expect(decoded.name).toBe("a.bin")
		expect([...new Uint8Array(await decoded.arrayBuffer())]).toEqual([1, 2, 3])
		await expect(
			codec.encode(new File([new Uint8Array(4)], "large.bin")),
		).rejects.toThrow(/exceeds.*3 bytes/i)

		const smallCodec = createFileCodec({ maxSize: 2 })
		expect(() =>
			smallCodec.decode({
				content: "!!!!!!!!",
				name: "oversized.bin",
				type: "application/octet-stream",
				lastModified: 123,
			}),
		).toThrow(/exceeds.*2 bytes/i)
		expect(() =>
			smallCodec.decode({
				content: "AQID",
				name: "decoded-too-large.bin",
				type: "application/octet-stream",
				lastModified: 123,
			}),
		).toThrow(/exceeds.*2 bytes/i)
	})
})
